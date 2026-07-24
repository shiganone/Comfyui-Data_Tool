import copy
import numpy as np
import torch
import math
import re
import colorsys

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    print("\n⚠️ [Data_Tool Warning] 未检测到 OpenCV (cv2) 库，通用型pose渲染已降级为纯 Numpy 慢速模式！建议在环境内执行 pip install opencv-python 以获得极致渲染速度。\n")

from ..utils import any_type, calculate_slice_indices, validate_compatibility, parse_color


# ================= 🚀 2D Pose 分辨率重映射节点 =================
class RescaleKeypoints:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "keypoints": ("POSE_KEYPOINT", {"tooltip": "输入的 OpenPose 数据"}),
                "width": ("INT", {"default": 512, "min": 64, "max": 8192, "tooltip": "目标画布宽度"}),
                "height": ("INT", {"default": 512, "min": 64, "max": 8192, "tooltip": "目标画布高度"}),
                "resize_mode": (["拉伸 (Stretch)", "自适应 (Fit)", "裁切 (Crop)", "保持 (Keep)", "对齐高度 (Fit Height)", "对齐宽度 (Fit Width)"], {"default": "自适应 (Fit)", "tooltip": "分辨率不符时的缩放策略"}),
                "alignment": (["居中 (Center)", "上对齐 (Top)", "下对齐 (Bottom)", "左对齐 (Left)", "右对齐 (Right)", "左上 (Top-Left)", "右上 (Top-Right)", "左下 (Bottom-Left)", "右下 (Bottom-Right)"], {"default": "居中 (Center)", "tooltip": "自适应/保持模式下的画面对齐方式"}),
                "offset_x": ("INT", {"default": 0, "min": -8192, "max": 8192, "step": 1, "tooltip": "整体X轴平移量"}),
                "offset_y": ("INT", {"default": 0, "min": -8192, "max": 8192, "step": 1, "tooltip": "整体Y轴平移量"}),
                "output_absolute": ("BOOLEAN", {"default": True, "tooltip": "True输出绝对像素，False输出0~1相对坐标"}),
            }
        }
    RETURN_TYPES = ("POSE_KEYPOINT",)
    FUNCTION = "process"
    CATEGORY = "Data_Tool/Data_Pose"

    def process(self, keypoints, width, height, resize_mode, alignment, offset_x, offset_y, output_absolute):
        new_keypoints = copy.deepcopy(keypoints)

        if not isinstance(new_keypoints, list):
            if isinstance(new_keypoints, dict) and "people" in new_keypoints:
                new_keypoints =[new_keypoints]
            else:
                return (new_keypoints,)

        for frame in new_keypoints:
            w_orig = float(frame.get('canvas_width', width))
            h_orig = float(frame.get('canvas_height', height))
            if w_orig <= 0 or h_orig <= 0: w_orig, h_orig = width, height

            # 1. 确定缩放比例
            if "拉伸" in resize_mode or "Stretch" in resize_mode:
                scale_x, scale_y = width / w_orig, height / h_orig
            elif "对齐高度" in resize_mode or "Fit Height" in resize_mode:
                scale_x, scale_y = height / h_orig, height / h_orig
            elif "对齐宽度" in resize_mode or "Fit Width" in resize_mode:
                scale_x, scale_y = width / w_orig, width / w_orig
            elif "裁切" in resize_mode or "Crop" in resize_mode:
                scale = max(width / w_orig, height / h_orig)
                scale_x, scale_y = scale, scale
            elif "自适应" in resize_mode or "Fit" in resize_mode:
                scale = min(width / w_orig, height / h_orig)
                scale_x, scale_y = scale, scale
            else: # 保持 Keep
                scale_x, scale_y = 1.0, 1.0

            scaled_w, scaled_h = w_orig * scale_x, h_orig * scale_y
            rem_w, rem_h = width - scaled_w, height - scaled_h
            
            # 2. 确定九宫格对齐偏移量
            align_x, align_y = 0.0, 0.0
            if "拉伸" not in resize_mode and "Stretch" not in resize_mode:
                if "居中" in alignment or "Center" in alignment:
                    align_x, align_y = rem_w / 2.0, rem_h / 2.0
                elif "左对齐" in alignment or "Left" in alignment:
                    align_x, align_y = 0.0, rem_h / 2.0
                elif "右对齐" in alignment or "Right" in alignment:
                    align_x, align_y = rem_w, rem_h / 2.0
                elif "上对齐" in alignment or "Top" in alignment:
                    align_x, align_y = rem_w / 2.0, 0.0
                elif "下对齐" in alignment or "Bottom" in alignment:
                    align_x, align_y = rem_w / 2.0, rem_h
                elif "左上" in alignment or "Top-Left" in alignment:
                    align_x, align_y = 0.0, 0.0
                elif "右上" in alignment or "Top-Right" in alignment:
                    align_x, align_y = rem_w, 0.0
                elif "左下" in alignment or "Bottom-Left" in alignment:
                    align_x, align_y = 0.0, rem_h
                elif "右下" in alignment or "Bottom-Right" in alignment:
                    align_x, align_y = rem_w, rem_h

            final_shift_x = align_x + offset_x
            final_shift_y = align_y + offset_y

            # 3. 执行全量物理重映射
            for person in frame.get('people',[]):
                for k in['pose_keypoints_2d', 'face_keypoints_2d', 'hand_left_keypoints_2d', 'hand_right_keypoints_2d', 'foot_keypoints_2d']:
                    if k in person and person[k]:
                        pts = np.array(person[k]).reshape(-1, 3)
                        # 🔥 极度重要：只处理置信度>0的有效点，否则会把空白的(0,0,0)也平移到画面中央产生噪点！
                        valid = pts[:, 2] > 0
                        if not np.any(valid): continue

                        # 判定当前是否相对坐标
                        is_relative = np.max(pts[valid, :2]) <= 1.0

                        # A. 统一还原为绝对像素坐标
                        if is_relative:
                            pts[valid, 0] *= w_orig
                            pts[valid, 1] *= h_orig

                        # B. 应用缩放与平移矩阵
                        pts[valid, 0] = pts[valid, 0] * scale_x + final_shift_x
                        pts[valid, 1] = pts[valid, 1] * scale_y + final_shift_y

                        # C. 压回目标输出格式
                        if not output_absolute:
                            pts[valid, 0] /= float(width)
                            pts[valid, 1] /= float(height)

                        person[k] = pts.flatten().tolist()

            # 4. 强行覆写画布元数据
            frame['canvas_width'] = width
            frame['canvas_height'] = height

        return (new_keypoints,)


# ================= 🎯 关键点置信度修改器 =================
class KeypointConfidenceModifier:
    @classmethod
    def INPUT_TYPES(s):
        default_commands = "body:\nface:\nleft_hand:\nright_hand:\nfoot:"
        return {
            "required": {
                "keypoints": ("POSE_KEYPOINT", {"tooltip": "连入原始骨骼数据批次。"}),
                "start_index": ("INT", {"default": 0, "min": 0, "max": 100000, "step": 1}),
                "end_index": ("INT", {"default": -1, "min": -1, "max": 100000, "step": 1, "tooltip": "-1表示一直修改到最后一帧"}),
                "target_score": ("FLOAT", {"default": 0.0, "min": -0.01, "max": 1.0, "step": 0.01}),
                "modify_target": (["选定点 (Selected)", "未选定点 (Unselected)"], {"default": "选定点 (Selected)", "tooltip": "修改的对象是文本框中选定的点，还是没有被选定的点"}),
                "delete_mode": ("BOOLEAN", {"default": False, "tooltip": "开启后，直接删除目标点位数据"}),
                "edit_commands": ("STRING", {"multiline": True, "default": default_commands}),
            }
        }
        
    RETURN_TYPES = ("POSE_KEYPOINT",)
    FUNCTION = "modify"
    CATEGORY = "Data_Tool/Data_Pose"

    def modify(self, keypoints, start_index, end_index, target_score, delete_mode, modify_target, edit_commands):
        new_keypoints = copy.deepcopy(keypoints)
        if not isinstance(new_keypoints, list):
            new_keypoints = [new_keypoints] if (isinstance(new_keypoints, dict) and "people" in new_keypoints) else []

        if not new_keypoints: return (keypoints,)

        # --- 1. 定义快捷词典映射 ---
        map_body = {
            'nose': [0], '鼻子': [0], 'neck': [1], '脖颈': [1],
            'r_shoulder': [2], '右肩': [2], 'r_elbow': [3], '右肘': [3], 'r_wrist': [4], '右腕': [4],
            'l_shoulder': [5], '左肩': [5], 'l_elbow': [6], '左肘': [6], 'l_wrist': [7], '左腕': [7],
            'r_hip': [8], '右髋': [8], 'r_knee': [9], '右膝': [9], 'r_ankle': [10], '右踝': [10],
            'l_hip': [11], '左髋': [11], 'l_knee': [12], '左膝': [12], 'l_ankle': [13], '左踝': [13],
            'r_eye': [14], '右眼': [14], 'l_eye': [15], '左眼': [15], 'r_ear': [16], '右耳': [16], 'l_ear': [17], '左耳': [17]
        }
        map_face = {
            'face_contour': list(range(17)), '脸轮廓': list(range(17)),
            'l_eyebrow': list(range(17, 22)), '左眉': list(range(17, 22)),
            'r_eyebrow': list(range(22, 27)), '右眉': list(range(22, 27)),
            'eyebrow': list(range(17, 27)), '眉': list(range(17, 27)),
            'nose': list(range(27, 36)), '鼻子': list(range(27, 36)),
            'l_eye': list(range(36, 42)), '左眼': list(range(36, 42)),
            'r_eye': list(range(42, 48)), '右眼': list(range(42, 48)),
            'eye': list(range(36, 48)), '眼': list(range(36, 48)),
            'upper_lip': [48,49,50,51,52,53,54, 61,62,63], '上唇': [48,49,50,51,52,53,54, 61,62,63],
            'lower_lip': [55,56,57,58,59, 65,66,67], '下唇': [55,56,57,58,59, 65,66,67],
            'inner_lip': list(range(60, 68)), '嘴中线': list(range(60, 68)),
            'mouth': list(range(48, 68)), '嘴': list(range(48, 68)),
            'face': list(range(68)), '脸': list(range(68))
        }
        map_hand = {
            'hand': list(range(21)), '手': list(range(21)),
            'thumb': list(range(1, 5)), '拇指': list(range(1, 5)),
            'index': list(range(5, 9)), '食指': list(range(5, 9)),
            'middle': list(range(9, 13)), '中指': list(range(9, 13)),
            'ring': list(range(13, 17)), '无名指': list(range(13, 17)),
            'pinky': list(range(17, 21)), '小指': list(range(17, 21))
        }

        # --- 2. 高阶词法分析器 (Lexer) ---
        text = edit_commands.replace(":", ": ")
        text = text.replace(",", " ")
        tokens = text.split()
        
        valid_headers = {"body:", "face:", "left_hand:", "right_hand:", "foot:"}
        parsed_cmds = {k[:-1]: set() for k in valid_headers}
        current_cat = None

        for token in tokens:
            if token in valid_headers:
                current_cat = token[:-1]
            elif ":" in token:
                raise ValueError(f"语法错误 (Syntax Error): 发现无效的分类头 '{token}'，请检查拼写！")
            else:
                if current_cat is None: continue 
                parsed_cmds[current_cat].add(token.lower())

        # --- 3. 严格安检员 (Out-of-Bounds & Dictionary Validation) ---
        def extract_indices(token_set, mapping_dict, max_val, cat_name):
            idx_set = set()
            for t in token_set:
                if t.isdigit():
                    val = int(t)
                    if val <= max_val: 
                        idx_set.add(val)
                    else:
                        raise ValueError(f"越界错误 (Out of Bounds): [{cat_name}] 的索引 '{val}' 超出最大范围 {max_val}！")
                elif '-' in t and all(p.isdigit() for p in t.split('-')):
                    start_str, end_str = t.split('-')
                    val_s, val_e = int(start_str), int(end_str)
                    if val_s > val_e: val_s, val_e = val_e, val_s
                    if val_e <= max_val:
                        idx_set.update(range(val_s, val_e + 1))
                    else:
                        raise ValueError(f"越界错误 (Out of Bounds): [{cat_name}] 的范围索引 '{t}' 超出最大范围 {max_val}！")
                elif t in mapping_dict:
                    idx_set.update(mapping_dict[t])
                else:
                    raise ValueError(f"未知指令 (Unknown Command): '{t}' 在 [{cat_name}] 中未定义！请检查拼写。")
            return idx_set

        idx_body = extract_indices(parsed_cmds["body"], map_body, 17, "body")
        idx_face = extract_indices(parsed_cmds["face"], map_face, 67, "face")
        idx_l_hand = extract_indices(parsed_cmds["left_hand"], map_hand, 20, "left_hand")
        idx_r_hand = extract_indices(parsed_cmds["right_hand"], map_hand, 20, "right_hand")
        
        foot_tokens = parsed_cmds["foot"]

        # --- 4. 帧范围约束与定点修改 ---
        total_len = len(new_keypoints)
        s_idx = max(0, start_index)
        if end_index == -1:
            e_idx = total_len
        else:
            e_idx = min(total_len, end_index + 1)

        for i in range(s_idx, e_idx):
            frame = new_keypoints[i]
            for person in frame.get('people', []):
                
                # 🔥 升级版：加入选定/未选定目标取反逻辑
                def apply_score(arr_name, active_indices):
                    if arr_name not in person or not person[arr_name]: return
                    arr = np.array(person[arr_name]).reshape(-1, 3)
                    arr_len = len(arr)
                    
                    if "未选定" in modify_target or "Unselected" in modify_target:
                        final_targets = set(range(arr_len)) - active_indices
                    else:
                        final_targets = active_indices
                        
                    if not final_targets: return
                    
                    if delete_mode:
                        keep_idx = [idx for idx in range(arr_len) if idx not in final_targets]
                        arr = arr[keep_idx]
                    else:
                        for idx in final_targets:
                            if idx < arr_len: arr[idx, 2] = target_score
                    person[arr_name] = arr.flatten().tolist()

                apply_score('pose_keypoints_2d', idx_body)
                apply_score('face_keypoints_2d', idx_face)
                apply_score('hand_left_keypoints_2d', idx_l_hand)
                apply_score('hand_right_keypoints_2d', idx_r_hand)

                # 🔥 智能脚部独立处理
                if 'foot_keypoints_2d' in person and person['foot_keypoints_2d']:
                    foot_arr = np.array(person['foot_keypoints_2d']).reshape(-1, 3)
                    foot_len = len(foot_arr)
                    idx_foot = set()
                    
                    for t in foot_tokens:
                        if t.isdigit():
                            val = int(t)
                            if val < foot_len: 
                                idx_foot.add(val)
                            else:
                                raise ValueError(f"越界错误 (Out of Bounds): foot 的索引 '{val}' 超出当前模式的最大范围 {foot_len - 1}！")
                        elif '-' in t and all(p.isdigit() for p in t.split('-')):
                            start_str, end_str = t.split('-')
                            val_s, val_e = int(start_str), int(end_str)
                            if val_s > val_e: val_s, val_e = val_e, val_s
                            if val_e < foot_len:
                                idx_foot.update(range(val_s, val_e + 1))
                            else:
                                raise ValueError(f"越界错误 (Out of Bounds): foot 的范围索引 '{t}' 超出当前模式的最大范围 {foot_len - 1}！")
                        else:
                            if foot_len == 2: # ViTPose 单点
                                if t in ['l_toe', '左脚尖']: idx_foot.add(0)
                                elif t in ['r_toe', '右脚尖']: idx_foot.add(1)
                                elif t in ['toe', '脚尖']: idx_foot.update([0, 1])
                                elif t in ['l_heel', '左脚跟', 'r_heel', '右脚跟', 'heel', '脚跟']:
                                    raise ValueError(f"模式冲突 (Mode Error): 单点脚不支持【脚跟】指令，请使用'脚尖'或'toe'。")
                                else: raise ValueError(f"未知指令 (Unknown Command): 单点脚不支持 '{t}'")
                            elif foot_len == 6: # SDPose 三点
                                if t in ['l_toe', '左脚尖']: idx_foot.update([0, 1])
                                elif t in ['l_heel', '左脚跟']: idx_foot.add(2)
                                elif t in ['r_toe', '右脚尖']: idx_foot.update([3, 4])
                                elif t in ['r_heel', '右脚跟']: idx_foot.add(5)
                                elif t in ['toe', '脚尖']: idx_foot.update([0, 1, 3, 4])
                                elif t in ['heel', '脚跟']: idx_foot.update([2, 5])
                                else: raise ValueError(f"未知指令 (Unknown Command): 三点脚不支持 '{t}'")
                                
                    if "未选定" in modify_target or "Unselected" in modify_target:
                        final_targets_foot = set(range(foot_len)) - idx_foot
                    else:
                        final_targets_foot = idx_foot
                        
                    if final_targets_foot:
                        if delete_mode:
                            keep_idx = [idx for idx in range(foot_len) if idx not in final_targets_foot]
                            foot_arr = foot_arr[keep_idx]
                        else:
                            for idx in final_targets_foot:
                                if idx < foot_len: foot_arr[idx, 2] = target_score
                        person['foot_keypoints_2d'] = foot_arr.flatten().tolist()

        return (new_keypoints,)


# ================= ✋ 手部关键点距离过滤器 =================
class KeypointHandFilter:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "keypoints": ("POSE_KEYPOINT", {"tooltip": "输入的骨骼数据"}),
                "threshold": ("FLOAT", {"default": 50.0, "min": 0.0, "max": 1000.0, "step": 1.0, "tooltip": "限制距离：超出该距离的点将被清零"}),
            }
        }
    RETURN_TYPES = ("POSE_KEYPOINT",)
    FUNCTION = "process"
    CATEGORY = "Data_Tool/Data_Pose"

    def process(self, keypoints, threshold):
        new_keypoints = copy.deepcopy(keypoints)
        if not isinstance(new_keypoints, list):
            new_keypoints = [new_keypoints] if (isinstance(new_keypoints, dict) and "people" in new_keypoints) else []
        
        for frame in new_keypoints:
            for person in frame.get('people', []):
                for hand_key in ['hand_left_keypoints_2d', 'hand_right_keypoints_2d']:
                    if hand_key in person and person[hand_key]:
                        arr = np.array(person[hand_key]).reshape(-1, 3)
                        if len(arr) > 0 and arr[0, 2] > 0: # 确保根骨骼(0号点)存在且有效
                            root = arr[0, :2]
                            for i in range(1, len(arr)):
                                if arr[i, 2] > 0:
                                    dist = np.linalg.norm(arr[i, :2] - root)
                                    if dist > threshold:
                                        arr[i] = [0.0, 0.0, 0.0]
                        person[hand_key] = arr.flatten().tolist()
        return (new_keypoints,)


# ================= 🦶 SDPose脚部转ViTPose脚部 =================
class SDPoseToViTPoseFoot:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "keypoints": ("POSE_KEYPOINT", {"tooltip": "输入的骨骼数据"}),
                "score_method": (["最大 (Max)", "最小 (Min)", "平均 (Average)"], {"default": "最大 (Max)"}),
            }
        }
    RETURN_TYPES = ("POSE_KEYPOINT",)
    FUNCTION = "process"
    CATEGORY = "Data_Tool/Data_Pose"

    def process(self, keypoints, score_method):
        new_keypoints = copy.deepcopy(keypoints)
        if not isinstance(new_keypoints, list):
            new_keypoints = [new_keypoints] if (isinstance(new_keypoints, dict) and "people" in new_keypoints) else []
        
        for frame in new_keypoints:
            for person in frame.get('people', []):
                if 'foot_keypoints_2d' in person and person['foot_keypoints_2d']:
                    arr = np.array(person['foot_keypoints_2d']).reshape(-1, 3)
                    if len(arr) == 6: # 确认为 SDPose 的三点脚格式 (共 6 个点)
                        new_arr = np.zeros((2, 3), dtype=np.float32)
                        
                        # 左脚: 0, 1 是脚尖, 2 是脚跟
                        l_x = (arr[0, 0] + arr[1, 0]) / 2.0
                        l_y = (arr[0, 1] + arr[1, 1]) / 2.0
                        if "最大" in score_method or "Max" in score_method: l_c = max(arr[0, 2], arr[1, 2])
                        elif "最小" in score_method or "Min" in score_method: l_c = min(arr[0, 2], arr[1, 2])
                        else: l_c = (arr[0, 2] + arr[1, 2]) / 2.0
                        new_arr[0] = [l_x, l_y, l_c]
                        
                        # 右脚: 3, 4 是脚尖, 5 是脚跟
                        r_x = (arr[3, 0] + arr[4, 0]) / 2.0
                        r_y = (arr[3, 1] + arr[4, 1]) / 2.0
                        if "最大" in score_method or "Max" in score_method: r_c = max(arr[3, 2], arr[4, 2])
                        elif "最小" in score_method or "Min" in score_method: r_c = min(arr[3, 2], arr[4, 2])
                        else: r_c = (arr[3, 2] + arr[4, 2]) / 2.0
                        new_arr[1] = [r_x, r_y, r_c]
                        
                        person['foot_keypoints_2d'] = new_arr.flatten().tolist()
        return (new_keypoints,)


# ================= NLF 3D 骨架朝向提取器 =================
class NLF_Pose_Orientation:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "nlf_poses": ("NLFPRED", {"tooltip": "输入的 NLF 3D 骨架数据"}),
            }
        }
        
    RETURN_TYPES = ("ORIENTATION_DATA",)
    RETURN_NAMES = ("orientations",)
    FUNCTION = "extract"
    CATEGORY = "Data_Tool/Data_Pose"

    def extract(self, nlf_poses):
        frames = nlf_poses['joints3d_nonparam'][0]
        orientations = []
        
        for frame_t in frames:
            frame_np = frame_t.cpu().numpy() if isinstance(frame_t, torch.Tensor) else frame_t
            frame_ori = []
            
            for p in frame_np:
                if p.shape[0] < 24:
                    frame_ori.append([0.0, 0.0, 0.0, 0.0])
                    continue
                
                # --- 1. 胸腔计算 ---
                xm = (p[13] + p[14]) * 0.5  # 胸锁中点
                z1 = p[6]                   # 中脊椎
                v_down_chest = z1 - xm      # 下方向 (Y轴)
                v_right_chest = p[14] - p[13] # 左右向 (X轴，左向右)
                
                # --- 2. 骨盆计算 ---
                pelvis = p[0]               # 骨盆原点
                x3 = p[3]                   # 下脊椎
                v_down_pelvis = pelvis - x3 # 下方向 (Y轴)
                v_right_pelvis = p[2] - p[1]  # 左右向 (X轴，左髋向右髋)
                
                # --- 3. 欧拉角反推函数 ---
                def get_yaw_pitch(v_down, v_right):
                    n_down = np.linalg.norm(v_down)
                    n_right = np.linalg.norm(v_right)
                    if n_down < 1e-6 or n_right < 1e-6:
                        return 0.0, 0.0
                        
                    dir_down = v_down / n_down
                    dir_right = v_right / n_right
                    
                    # 叉乘求前向 (Z轴)
                    v_forward = np.cross(dir_right, dir_down)
                    n_forward = np.linalg.norm(v_forward)
                    if n_forward < 1e-6:
                        return 0.0, 0.0
                    dir_forward = v_forward / n_forward
                    
                    X, Y, Z = dir_forward[0], dir_forward[1], dir_forward[2]
                    
                    # 偏航角 (左右转): 0为正对镜头，180为背对
                    yaw = np.degrees(np.arctan2(X, -Z))
                    # 俯仰角 (前后倾): 正为后仰，负为前倾(弯腰)
                    pitch = np.degrees(np.arctan2(-Y, np.hypot(X, Z)))
                    
                    return yaw, pitch

                chest_yaw, chest_pitch = get_yaw_pitch(v_down_chest, v_right_chest)
                pelvis_yaw, pelvis_pitch = get_yaw_pitch(v_down_pelvis, v_right_pelvis)
                
                # 输出 [胸腔Yaw, 胸腔Pitch, 骨盆Yaw, 骨盆Pitch]
                frame_ori.append([float(chest_yaw), float(chest_pitch), float(pelvis_yaw), float(pelvis_pitch)])
                
            orientations.append(frame_ori)
            
        return (orientations,)


# ================= NLF 朝向解析器 (Orientation Parser) =================
class NLF_Orientation_Parser:
    @classmethod
    def INPUT_TYPES(s):
        directions = ["F", "B", "L", "R", "U", "D", "LF", "RF", "LB", "RB", "LU", "RU", "LD", "RD", "FU", "FD", "BU", "BD", "LFU", "RFU", "LBU", "RBU", "LFD", "RFD", "LBD", "RBD"]
        return {
            "required": {
                "orientations": ("ORIENTATION_DATA", {"tooltip": "输入的欧拉角朝向数据"}),
                "person_index": ("INT", {"default": -1, "min": -1, "max": 100, "step": 1, "tooltip": "-1为检查所有角色，>=0为仅检查指定角色"}),
                "body_part": (["胸腔 (Chest)", "骨盆 (Pelvis)", "平均 (Average)", "全部 (All)"], {"default": "胸腔 (Chest)"}),
                "default_direction": (directions, {"default": "F", "tooltip": "所有激活方向均超出引力半径时的保底默认方向"}),
                "yaw_capture_range": ("FLOAT", {"default": 90.0, "min": 1.0, "max": 360.0, "step": 1.0, "tooltip": "偏航角(左右)引力范围。自动除以2作为引力半径"}),
                "pitch_capture_range": ("FLOAT", {"default": 90.0, "min": 1.0, "max": 360.0, "step": 1.0, "tooltip": "俯仰角(上下)引力范围。自动除以2作为引力半径"}),
                "active_directions": ("STRING", {"multiline": True, "placeholder": "F, B, L, R, LF, RF, LB, RB", "tooltip": "激活参与捕获的方向标签"}),
            }
        }
        
    RETURN_TYPES = ("DIRECTION_LABELS",)
    RETURN_NAMES = ("labels_batch",)
    FUNCTION = "parse"
    CATEGORY = "Data_Tool/Data_Pose"

    def parse(self, orientations, person_index, body_part, default_direction, yaw_capture_range, pitch_capture_range, active_directions):
        # 1. 欧拉角转 3D 向量工具函数 (对齐我们的 X-Right, Y-Down, Z-Forward 坐标系)
        def euler_to_vec(yaw, pitch):
            y_rad = math.radians(yaw)
            p_rad = math.radians(pitch)
            cos_p = math.cos(p_rad)
            x = -math.sin(y_rad) * cos_p
            y = -math.sin(p_rad)
            z = -math.cos(y_rad) * cos_p
            return np.array([x, y, z])
            
        # 2. 动态构建 26 个物理方向的理想向量 (利用上述工具函数确保 100% 精度对称，无人工换算误差)
        dir_defs_angles = {
            'F': (0, 0), 'B': (180, 0), 'L': (-90, 0), 'R': (90, 0),
            'LF': (-45, 0), 'RF': (45, 0), 'LB': (-135, 0), 'RB': (135, 0),
            'U': (None, 90), 'D': (None, -90),
            'FU': (0, 45), 'FD': (0, -45), 'BU': (180, 45), 'BD': (180, -45),
            'LU': (-90, 45), 'LD': (-90, -45), 'RU': (90, 45), 'RD': (90, -45),
            'LFU': (-45, 45), 'LFD': (-45, -45), 'RFU': (45, 45), 'RFD': (45, -45),
            'LBU': (-135, 45), 'LBD': (-135, -45), 'RBU': (135, 45), 'RBD': (135, -45)
        }
        
        dir_vecs = {}
        for k, (dyaw, dpitch) in dir_defs_angles.items():
            yaw_val = dyaw if dyaw is not None else 0
            v = euler_to_vec(yaw_val, dpitch)
            dir_vecs[k] = v / np.linalg.norm(v)

        # 3. 角度映射表 (用于 1D 双环检测)
        dir_defs = {k: (v[0] if v[0] is not None else None, v[1]) for k, v in dir_defs_angles.items()}
        base_yaws = {'F': 0, 'RF': 45, 'R': 90, 'RB': 135, 'B': 180, 'LB': -135, 'L': -90, 'LF': -45}
        
        # 极点回退的绝对优先级
        up_prio = {'FU': 1, 'LFU': 2, 'RFU': 2, 'BU': 3, 'LBU': 4, 'RBU': 4, 'LU': 5, 'RU': 5}
        down_prio = {'FD': 1, 'LFD': 2, 'RFD': 2, 'BD': 3, 'LBD': 4, 'RBD': 4, 'LD': 5, 'RD': 5}

        # 提取文本框激活指令
        raw_tokens = re.split(r'[\s,]+', active_directions.strip().upper())
        active_set = set()
        for t in raw_tokens:
            if t in dir_defs: active_set.add(t)
        if not active_set: active_set.add(default_direction)

        # 智能划分双环引力半径
        yaw_radius = yaw_capture_range / 2.0
        pitch_radius = pitch_capture_range / 2.0

        def angle_diff(a, b):
            return abs((a - b + 180) % 360 - 180)

        # 🔥 正交双环解耦判定算法
        def match_dir(yaw, pitch):
            candidates = []
            
            # 直接遍历激活的方向，判断是否在双环引力半径内
            for d in active_set:
                dyaw, dpitch = dir_defs[d]
                
                # 检查俯仰角 (Pitch)
                p_diff = abs(pitch - dpitch)
                if p_diff > pitch_radius:
                    continue
                    
                # 检查偏航角 (Yaw)
                if dyaw is None: # 对于正上 U 和正下 D，Yaw无意义
                    y_diff = 0.0
                else:
                    y_diff = angle_diff(yaw, dyaw)
                    if y_diff > yaw_radius:
                        continue
                        
                candidates.append((d, y_diff, p_diff))
                
            if candidates:
                # 优先匹配综合距离中心点最近的方向 (欧氏距离平方)
                candidates.sort(key=lambda x: (x[1]**2 + x[2]**2))
                return candidates[0][0]

            # === 极点优先级保底 (Pole Fallback) ===
            pole_cands = []
            for d in active_set:
                dpitch = dir_defs[d][1]
                if abs(pitch - dpitch) <= pitch_radius:
                    pole_cands.append(d)

            if pole_cands:
                def get_prio(d_name):
                    return up_prio.get(d_name, 99) if pitch >= 0 else down_prio.get(d_name, 99)
                pole_cands.sort(key=lambda x: get_prio(x))
                return pole_cands[0]

            return default_direction

        # 4. 时序遍历与单帧去重
        out_batch = []
        check_chest = "胸腔" in body_part or "Chest" in body_part
        check_pelvis = "骨盆" in body_part or "Pelvis" in body_part
        check_average = "平均" in body_part or "Average" in body_part
        check_all = "全部" in body_part or "All" in body_part
        
        for frame_ori in orientations:
            frame_set = set() 
            
            for p_idx, ori in enumerate(frame_ori):
                if person_index != -1 and p_idx != person_index:
                    continue
                    
                chest_y, chest_p, pelvis_y, pelvis_p = ori
                
                if check_chest: 
                    frame_set.add(match_dir(chest_y, chest_p))
                elif check_pelvis: 
                    frame_set.add(match_dir(pelvis_y, pelvis_p))
                elif check_average:
                    # 🔥 智能 3D 空间劣弧插值算法 (slerp t=0.5 完美等价)
                    v_chest = euler_to_vec(chest_y, chest_p)
                    v_pelvis = euler_to_vec(pelvis_y, pelvis_p)
                    v_avg = v_chest + v_pelvis
                    norm = np.linalg.norm(v_avg)
                    if norm > 1e-6:
                        v_avg = v_avg / norm
                    else:
                        v_avg = v_chest # 极端完全相反状态下的防零安全锁
                    
                    # 逆向解析回欧拉角
                    X, Y, Z = v_avg[0], v_avg[1], v_avg[2]
                    yaw_avg = np.degrees(np.arctan2(-X, -Z))
                    pitch_avg = np.degrees(np.arctan2(-Y, np.hypot(X, Z)))
                    
                    frame_set.add(match_dir(yaw_avg, pitch_avg))
                elif check_all:
                    frame_set.add(match_dir(chest_y, chest_p))
                    frame_set.add(match_dir(pelvis_y, pelvis_p))
                    
            out_batch.append(list(frame_set))
            
        return (out_batch,)


# ================= 朝向修改器 (Direction Modifier) =================
class Direction_Modifier:
    @classmethod
    def INPUT_TYPES(s):
        directions = ["F", "B", "L", "R", "U", "D", "LF", "RF", "LB", "RB", "LU", "RU", "LD", "RD", "FU", "FD", "BU", "BD", "LFU", "RFU", "LBU", "RBU", "LFD", "RFD", "LBD", "RBD"]
        return {
            "required": {
                "labels_batch": ("DIRECTION_LABELS", {"tooltip": "输入的朝向标签批次数据"}),
                "target_direction": (directions, {"default": "L", "tooltip": "想要转换成的目标朝向"}),
                "source_directions": ("STRING", {"multiline": True, "default": "R", "tooltip": "将被替换的朝向标签，使用逗号或空格分隔\n例如输入 R, RF 会把数据里的 R 和 RF 都改成目标朝向"}),
            }
        }
        
    RETURN_TYPES = ("DIRECTION_LABELS",)
    RETURN_NAMES = ("labels_batch",)
    FUNCTION = "modify"
    CATEGORY = "Data_Tool/Data_Pose"
    DESCRIPTION = "拦截并修改指定朝向。同一帧内修改后若发生重复将自动去重。"

    def modify(self, labels_batch, target_direction, source_directions):
        # 解析需要被替换的源标签
        raw_tokens = re.split(r'[\s,]+', source_directions.strip().upper())
        source_set = set(t for t in raw_tokens if t)
        
        out_batch = []
        for frame_dirs in labels_batch:
            new_frame = set()  # 使用 set 自动去重
            
            for d in frame_dirs:
                if d in source_set:
                    # 如果匹配到需要替换的源标签，则添加目标标签
                    new_frame.add(target_direction)
                else:
                    # 否则保留原本标签
                    new_frame.add(d)
                    
            out_batch.append(list(new_frame))
            
        return (out_batch,)


# ================= Pose背景选项节点 =================
class PoseBackgroundOptions:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "bg_color": ("STRING", {"default": "0,0,0", "tooltip": "背景颜色。支持十六进制, RGB 或 十进制整数"}),
                "draw_only_bg": ("BOOLEAN", {"default": False, "tooltip": "仅渲染背景（生成纯剪影），不绘制彩色骨骼点线"}),

                "body_point_radius": ("INT", {"default": 0, "min": 0, "max": 200, "step": 1, "tooltip": "躯干点和连线的背景半径"}),
                "body_hull": ("BOOLEAN", {"default": False, "tooltip": "开启躯干内补 (基于锁骨及肩髋5点)"}),
                "body_infill_expand": ("INT", {"default": 0, "min": 0, "max": 200, "step": 1, "tooltip": "躯干内补向外扩的距离"}),
                
                "face_point_radius": ("INT", {"default": 0, "min": 0, "max": 200, "step": 1, "tooltip": "面部点的背景半径"}),
                "face_hull": ("BOOLEAN", {"default": False, "tooltip": "开启面部多边形内补"}),
                "face_infill_expand": ("INT", {"default": 0, "min": 0, "max": 200, "step": 1, "tooltip": "面部内补向外扩的距离"}),
                
                "hand_point_radius": ("INT", {"default": 0, "min": 0, "max": 200, "step": 1, "tooltip": "手部点和连线的背景半径"}),
                "hand_hull": ("BOOLEAN", {"default": False, "tooltip": "开启手部多边形内补 (左右手独立计算)"}),
                "hand_infill_expand": ("INT", {"default": 0, "min": 0, "max": 200, "step": 1, "tooltip": "手部内补向外扩的距离"}),
                
                "foot_point_radius": ("INT", {"default": 0, "min": 0, "max": 200, "step": 1, "tooltip": "脚部点和连线的背景半径"}),
                "foot_hull": ("BOOLEAN", {"default": False, "tooltip": "开启脚部多边形内补 (左右脚独立计算)"}),
                "foot_infill_expand": ("INT", {"default": 0, "min": 0, "max": 200, "step": 1, "tooltip": "脚部内补向外扩的距离"}),
            }
        }
    RETURN_TYPES = ("POSE_BACKGROUND",)
    FUNCTION = "get_options"
    CATEGORY = "Data_Tool/Data_Pose"

    def get_options(self, **kwargs):
        return (kwargs,)


# ================= 🎨 OpenCV 极速 + Numpy 保底 骨架渲染引擎 =================
class UniversalKeypointDraw:
    def __init__(self):
        self.hand_edges = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20]]
        self.body_limbSeq = [[2, 3], [2, 6], [3, 4], [4, 5], [6, 7], [7, 8], [2, 9], [9, 10], [10, 11], [2, 12], [12, 13], [13, 14], [2, 1], [1, 15], [15, 17], [1, 16], [16, 18]]
        self.colors = [[255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]]

        self.use_cv2 = HAS_CV2
        if HAS_CV2:
            self.cv2 = cv2

    def circle(self, canvas_np, center, radius, color):
        if self.use_cv2:
            self.cv2.circle(canvas_np, (int(center[0]), int(center[1])), int(radius), tuple(int(c) for c in color), thickness=-1)
        else:
            self._circle_numpy(canvas_np, center, radius, color)

    def line(self, canvas_np, pt1, pt2, color, thickness=1):
        if self.use_cv2:
            self.cv2.line(canvas_np, (int(pt1[0]), int(pt1[1])), (int(pt2[0]), int(pt2[1])), tuple(int(c) for c in color), thickness=int(thickness))
        else:
            self._line_numpy(canvas_np, pt1, pt2, color, thickness)

    def fillConvexPoly(self, canvas_np, pts, color):
        if self.use_cv2:
            self.cv2.fillConvexPoly(canvas_np, np.array(pts, dtype=np.int32), tuple(int(c) for c in color))
        else:
            self._fillConvexPoly_numpy(canvas_np, pts, color)

    def ellipse2Poly(self, center, axes, angle):
        if self.use_cv2:
            return self.cv2.ellipse2Poly((int(center[0]), int(center[1])), (int(axes[0]), int(axes[1])), int(angle), 0, 360, 1)
        else:
            return self._ellipse2Poly_numpy(center, axes, angle)
            
    # 🌟 新增：凸包算法 (Convex Hull) 接口
    def convexHull(self, pts):
        if len(pts) < 3: return pts
        if self.use_cv2:
            hull = self.cv2.convexHull(np.array(pts, dtype=np.float32))
            return [p[0].tolist() for p in hull]
        else:
            return self._convexHull_numpy(pts)

    # ---------------- 纯 Numpy 降级算法 ----------------
    @staticmethod
    def _circle_numpy(canvas_np, center, radius, color):
        cx, cy = center
        h, w = canvas_np.shape[:2]
        r_int = int(np.ceil(radius))
        y_min, y_max = max(0, cy - r_int), min(h, cy + r_int + 1)
        x_min, x_max = max(0, cx - r_int), min(w, cx + r_int + 1)
        if y_max <= y_min or x_max <= x_min: return
        y, x = np.ogrid[y_min:y_max, x_min:x_max]
        mask = (x - cx)**2 + (y - cy)**2 <= radius**2
        canvas_np[y_min:y_max, x_min:x_max][mask] = color

    @staticmethod
    def _line_numpy(canvas_np, pt1, pt2, color, thickness=1):
        x0, y0, x1, y1 = *pt1, *pt2
        h, w = canvas_np.shape[:2]
        dx, dy = abs(x1 - x0), abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err, x, y, line_points = dx - dy, x0, y0, []
        while True:
            line_points.append((x, y))
            if x == x1 and y == y1: break
            e2 = 2 * err
            if e2 > -dy: err, x = err - dy, x + sx
            if e2 < dx: err, y = err + dx, y + sy
            
        if thickness > 1:
            radius, r_int = (thickness / 2.0) + 0.5, int(np.ceil((thickness / 2.0) + 0.5))
            for px, py in line_points:
                y_min, y_max = max(0, py - r_int), min(h, py + r_int + 1)
                x_min, x_max = max(0, px - r_int), min(w, px + r_int + 1)
                if y_max > y_min and x_max > x_min:
                    yy, xx = np.ogrid[y_min:y_max, x_min:x_max]
                    canvas_np[y_min:y_max, x_min:x_max][(xx - px)**2 + (yy - py)**2 <= radius**2] = color
        else:
            pts = np.array(line_points)
            valid = (pts[:, 1] >= 0) & (pts[:, 1] < h) & (pts[:, 0] >= 0) & (pts[:, 0] < w)
            if (valid_pts := pts[valid]).size:
                canvas_np[valid_pts[:, 1], valid_pts[:, 0]] = color

    @staticmethod
    def _fillConvexPoly_numpy(canvas_np, pts, color):
        if len(pts) < 3: return
        pts = np.array(pts, dtype=np.int32)
        h, w = canvas_np.shape[:2]
        y_min, y_max = max(0, pts[:, 1].min()), min(h, pts[:, 1].max() + 1)
        x_min, x_max = max(0, pts[:, 0].min()), min(w, pts[:, 0].max() + 1)
        if y_max <= y_min or x_max <= x_min: return
        yy, xx = np.mgrid[y_min:y_max, x_min:x_max]
        mask = np.zeros((y_max - y_min, x_max - x_min), dtype=bool)
        for i in range(len(pts)):
            p1, p2 = pts[i], pts[(i + 1) % len(pts)]
            y1, y2 = p1[1], p2[1]
            if y1 == y2: continue
            if y1 > y2: p1, p2, y1, y2 = p2, p1, p2[1], p1[1]
            if not (edge_mask := (yy >= y1) & (yy < y2)).any(): continue
            mask ^= edge_mask & (xx >= p1[0] + (yy - y1) * (p2[0] - p1[0]) / (y2 - y1))
        canvas_np[y_min:y_max, x_min:x_max][mask] = color

    @staticmethod
    def _ellipse2Poly_numpy(center, axes, angle):
        axes = (axes[0] + 0.5, axes[1] + 0.5)
        angle_rad = math.radians(angle % 360)
        alpha, beta = math.cos(angle_rad), math.sin(angle_rad)
        pts, prev_pt = [], (float('inf'), float('inf'))
        for i in range(0, 361, 1):
            theta_rad = math.radians(i)
            x, y = axes[0] * math.cos(theta_rad), axes[1] * math.sin(theta_rad)
            pt = [int(round(center[0] + x * alpha - y * beta)), int(round(center[1] + x * beta + y * alpha))]
            if tuple(pt) != prev_pt:
                pts.append(pt)
                prev_pt = tuple(pt)
        return pts if len(pts) > 1 else [[center[0], center[1]], [center[0], center[1]]]
        
    # 🌟 新增：Numpy 保底凸包算法 (Jarvis March 卷包裹法，适用极少点位的高效方案)
    @staticmethod
    def _convexHull_numpy(pts):
        pts = list(set([tuple((p[0], p[1])) for p in pts])) # 去重
        if len(pts) < 3: return pts
        start = min(pts, key=lambda p: (p[0], p[1]))
        hull = []
        p = start
        while True:
            hull.append(p)
            q = pts[0]
            for r in pts:
                if q == p:
                    q = r
                    continue
                # 叉积计算方向
                val = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
                if val > 0:
                    q = r
                elif val == 0:
                    if math.hypot(r[0]-p[0], r[1]-p[1]) > math.hypot(q[0]-p[0], q[1]-p[1]):
                        q = r
            p = q
            if p == start:
                break
        return hull


# ================= 🎨 OpenCV 极速 + Numpy 保底 骨架渲染引擎 =================
class UniversalKeypointDraw:
    def __init__(self):
        self.hand_edges = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20]]
        self.body_limbSeq = [[2, 3], [2, 6], [3, 4], [4, 5], [6, 7], [7, 8], [2, 9], [9, 10], [10, 11], [2, 12], [12, 13], [13, 14], [2, 1], [1, 15], [15, 17], [1, 16], [16, 18]]
        
        # 🔥 优化1：颜色强制转为标准的 int 元组，彻底消灭渲染循环中的强转开销
        raw_colors = [[255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]]
        self.colors = [tuple(int(c) for c in color) for color in raw_colors]
        
        # 🔥 优化2：预先计算所有手部彩虹HSV色彩，拒绝内层循环的浮点与颜色运算
        self.hand_colors = []
        for ie in range(len(self.hand_edges)):
            r, g, b = colorsys.hsv_to_rgb(ie / float(len(self.hand_edges)), 1.0, 1.0)
            self.hand_colors.append((int(r * 255), int(g * 255), int(b * 255)))

        self.use_cv2 = HAS_CV2
        if HAS_CV2:
            self.cv2 = cv2

    def circle(self, canvas_np, center, radius, color):
        if self.use_cv2:
            self.cv2.circle(canvas_np, (int(center[0]), int(center[1])), int(radius), color, thickness=-1)
        else:
            self._circle_numpy(canvas_np, center, radius, color)

    def line(self, canvas_np, pt1, pt2, color, thickness=1):
        if self.use_cv2:
            self.cv2.line(canvas_np, (int(pt1[0]), int(pt1[1])), (int(pt2[0]), int(pt2[1])), color, thickness=int(thickness))
        else:
            self._line_numpy(canvas_np, pt1, pt2, color, thickness)

    def fillConvexPoly(self, canvas_np, pts, color):
        if self.use_cv2:
            self.cv2.fillConvexPoly(canvas_np, pts if isinstance(pts, np.ndarray) else np.array(pts, dtype=np.int32), color)
        else:
            self._fillConvexPoly_numpy(canvas_np, pts, color)

    def ellipse2Poly(self, center, axes, angle):
        if self.use_cv2:
            return self.cv2.ellipse2Poly((int(center[0]), int(center[1])), (int(axes[0]), int(axes[1])), int(angle), 0, 360, 1)
        else:
            return self._ellipse2Poly_numpy(center, axes, angle)
            
    def convexHull(self, pts):
        if len(pts) < 3: return pts
        if self.use_cv2:
            hull = self.cv2.convexHull(np.array(pts, dtype=np.float32))
            return [p[0].tolist() for p in hull]
        else:
            return self._convexHull_numpy(pts)

    # ---------------- 纯 Numpy 降级算法 ----------------
    @staticmethod
    def _circle_numpy(canvas_np, center, radius, color):
        cx, cy = center
        h, w = canvas_np.shape[:2]
        r_int = int(np.ceil(radius))
        y_min, y_max = max(0, cy - r_int), min(h, cy + r_int + 1)
        x_min, x_max = max(0, cx - r_int), min(w, cx + r_int + 1)
        if y_max <= y_min or x_max <= x_min: return
        y, x = np.ogrid[y_min:y_max, x_min:x_max]
        mask = (x - cx)**2 + (y - cy)**2 <= radius**2
        canvas_np[y_min:y_max, x_min:x_max][mask] = color

    @staticmethod
    def _line_numpy(canvas_np, pt1, pt2, color, thickness=1):
        x0, y0, x1, y1 = *pt1, *pt2
        h, w = canvas_np.shape[:2]
        dx, dy = abs(x1 - x0), abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err, x, y, line_points = dx - dy, x0, y0, []
        while True:
            line_points.append((x, y))
            if x == x1 and y == y1: break
            e2 = 2 * err
            if e2 > -dy: err, x = err - dy, x + sx
            if e2 < dx: err, y = err + dx, y + sy
            
        if thickness > 1:
            radius, r_int = (thickness / 2.0) + 0.5, int(np.ceil((thickness / 2.0) + 0.5))
            for px, py in line_points:
                y_min, y_max = max(0, py - r_int), min(h, py + r_int + 1)
                x_min, x_max = max(0, px - r_int), min(w, px + r_int + 1)
                if y_max > y_min and x_max > x_min:
                    yy, xx = np.ogrid[y_min:y_max, x_min:x_max]
                    canvas_np[y_min:y_max, x_min:x_max][(xx - px)**2 + (yy - py)**2 <= radius**2] = color
        else:
            pts = np.array(line_points)
            valid = (pts[:, 1] >= 0) & (pts[:, 1] < h) & (pts[:, 0] >= 0) & (pts[:, 0] < w)
            if (valid_pts := pts[valid]).size:
                canvas_np[valid_pts[:, 1], valid_pts[:, 0]] = color

    @staticmethod
    def _fillConvexPoly_numpy(canvas_np, pts, color):
        if len(pts) < 3: return
        pts = np.array(pts, dtype=np.int32)
        h, w = canvas_np.shape[:2]
        y_min, y_max = max(0, pts[:, 1].min()), min(h, pts[:, 1].max() + 1)
        x_min, x_max = max(0, pts[:, 0].min()), min(w, pts[:, 0].max() + 1)
        if y_max <= y_min or x_max <= x_min: return
        yy, xx = np.mgrid[y_min:y_max, x_min:x_max]
        mask = np.zeros((y_max - y_min, x_max - x_min), dtype=bool)
        for i in range(len(pts)):
            p1, p2 = pts[i], pts[(i + 1) % len(pts)]
            y1, y2 = p1[1], p2[1]
            if y1 == y2: continue
            if y1 > y2: p1, p2, y1, y2 = p2, p1, p2[1], p1[1]
            if not (edge_mask := (yy >= y1) & (yy < y2)).any(): continue
            mask ^= edge_mask & (xx >= p1[0] + (yy - y1) * (p2[0] - p1[0]) / (y2 - y1))
        canvas_np[y_min:y_max, x_min:x_max][mask] = color

    @staticmethod
    def _ellipse2Poly_numpy(center, axes, angle):
        axes = (axes[0] + 0.5, axes[1] + 0.5)
        angle_rad = math.radians(angle % 360)
        alpha, beta = math.cos(angle_rad), math.sin(angle_rad)
        pts, prev_pt = [], (float('inf'), float('inf'))
        for i in range(0, 361, 1):
            theta_rad = math.radians(i)
            x, y = axes[0] * math.cos(theta_rad), axes[1] * math.sin(theta_rad)
            pt = [int(round(center[0] + x * alpha - y * beta)), int(round(center[1] + x * beta + y * alpha))]
            if tuple(pt) != prev_pt:
                pts.append(pt)
                prev_pt = tuple(pt)
        return pts if len(pts) > 1 else [[center[0], center[1]], [center[0], center[1]]]
        
    @staticmethod
    def _convexHull_numpy(pts):
        pts = list(set([tuple((p[0], p[1])) for p in pts])) 
        if len(pts) < 3: return pts
        start = min(pts, key=lambda p: (p[0], p[1]))
        hull = []
        p = start
        while True:
            hull.append(p)
            q = pts[0]
            for r in pts:
                if q == p:
                    q = r
                    continue
                val = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
                if val > 0:
                    q = r
                elif val == 0:
                    if math.hypot(r[0]-p[0], r[1]-p[1]) > math.hypot(q[0]-p[0], q[1]-p[1]):
                        q = r
            p = q
            if p == start:
                break
        return hull


# ================= 🎥 通用型 Pose 渲染器 =================
class UniversalPoseRenderer:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "keypoints": ("POSE_KEYPOINT", {"tooltip": "输入的骨骼数据"}),
                "draw_body": ("BOOLEAN", {"default": True, "tooltip": "渲染身体点与骨架连线"}),
                "draw_hands": ("BOOLEAN", {"default": True, "tooltip": "渲染手部点与连线"}),
                "draw_face": ("BOOLEAN", {"default": True, "tooltip": "仅渲染面部白点"}),
                "draw_feet": ("BOOLEAN", {"default": True, "tooltip": "渲染脚部点"}),
                "connect_feet": ("BOOLEAN", {"default": True, "tooltip": "开启后，自动根据前后半段点位分别向左右脚踝连线"}),
                "score_threshold": ("FLOAT", {"default": 0.3, "min": 0.0, "max": 1.0, "step": 0.01}),
                "stick_width": ("INT", {"default": 4, "min": 1, "max": 20, "step": 1}),
                "face_point_size": ("INT", {"default": 3, "min": 1, "max": 10, "step": 1}),
            },
            "optional": {
                "background_image": ("IMAGE", {"tooltip": "可选的背景图片批次。若连入，则直接在这些图片上绘制。"}),
                "pose_background": ("POSE_BACKGROUND", {"tooltip": "接入pose背景选项节点进行精细化遮罩控制"})
            }
        }
    RETURN_TYPES = ("IMAGE", "MASK")
    FUNCTION = "render"
    CATEGORY = "Data_Tool/Data_Pose"

    def draw_person_pose(self, canvas, parsed_person, draw_pass, drawer, draw_body, draw_hands, draw_face, draw_feet, connect_feet, score_threshold, stick_width, face_point_size, bg_options, w, h):
        is_mask = (draw_pass == 'mask')
        
        b_pr, b_hull, b_hr = bg_options['body_point_radius'], bg_options['body_hull'], bg_options['body_infill_expand']
        f_pr, f_hull, f_hr = bg_options['face_point_radius'], bg_options['face_hull'], bg_options['face_infill_expand']
        h_pr, h_hull, h_hr = bg_options['hand_point_radius'], bg_options['hand_hull'], bg_options['hand_infill_expand']
        ft_pr, ft_hull, ft_hr = bg_options['foot_point_radius'], bg_options['foot_hull'], bg_options['foot_infill_expand']
        
        do_body_pts = (b_pr > 0) if is_mask else draw_body
        do_face_pts = (f_pr > 0) if is_mask else draw_face
        do_hand_pts = (h_pr > 0) if is_mask else draw_hands
        do_foot_pts = (ft_pr > 0) if is_mask else draw_feet
        
        curr_body_radius = 4 + b_pr if is_mask else 4
        curr_foot_radius = 4 + ft_pr if is_mask else 4
        curr_hand_line_thickness = 2 + h_pr * 2 if is_mask else 2
        curr_hand_point_radius = 4 + h_pr if is_mask else 4
        curr_face_point_size = face_point_size + f_pr if is_mask else face_point_size
        
        def get_color(default_color):
            return (255, 255, 255) if is_mask else default_color

        # 🔥 优化3：直接从预解析好的结构中极速读取
        body_kp, body_sc = parsed_person['body']
        foot_kp, foot_sc = parsed_person['foot']
        face_kp, face_sc = parsed_person['face']
        lhand_kp, lhand_sc = parsed_person['lhand']
        rhand_kp, rhand_sc = parsed_person['rhand']

        eps = 0.01

        # ================= 🛡️ 核心：多边形凸包内补及膨胀引擎 =================
        if is_mask:
            def draw_expanded_hull(pts, hull_flag, hull_radius):
                if not hull_flag or len(pts) == 0: return
                if len(pts) >= 3:
                    hull_pts = drawer.convexHull(pts)
                    if len(hull_pts) >= 3:
                        drawer.fillConvexPoly(canvas, hull_pts, (255, 255, 255))
                else:
                    hull_pts = pts 

                if hull_radius > 0:
                    for i in range(len(hull_pts)):
                        p1 = hull_pts[i]
                        p2 = hull_pts[(i + 1) % len(hull_pts)]
                        drawer.line(canvas, p1, p2, (255, 255, 255), thickness=hull_radius * 2)
                        drawer.circle(canvas, p1, hull_radius, (255, 255, 255))

            body_hull_pts = [body_kp[idx] for idx in [1, 2, 5, 8, 11] if idx < len(body_kp) and body_sc[idx] >= score_threshold]
            draw_expanded_hull(body_hull_pts, b_hull, b_hr)

            face_pts = [face_kp[i] for i in range(len(face_kp)) if face_sc[i] >= score_threshold]
            draw_expanded_hull(face_pts, f_hull, f_hr)

            lhand_pts = [lhand_kp[i] for i in range(len(lhand_kp)) if lhand_sc[i] >= score_threshold]
            rhand_pts = [rhand_kp[i] for i in range(len(rhand_kp)) if rhand_sc[i] >= score_threshold]
            draw_expanded_hull(lhand_pts, h_hull, h_hr)
            draw_expanded_hull(rhand_pts, h_hull, h_hr)

            mid_f = len(foot_kp) // 2
            lfoot_pts = [foot_kp[i] for i in range(mid_f) if foot_sc[i] >= score_threshold]
            rfoot_pts = [foot_kp[i] for i in range(mid_f, len(foot_kp)) if foot_sc[i] >= score_threshold]
            if len(body_kp) > 13 and body_sc[13] >= score_threshold: lfoot_pts.append(body_kp[13])
            if len(body_kp) > 10 and body_sc[10] >= score_threshold: rfoot_pts.append(body_kp[10])
            draw_expanded_hull(lfoot_pts, ft_hull, ft_hr)
            draw_expanded_hull(rfoot_pts, ft_hull, ft_hr)


        # ================= 1. 绘制身体点线 =================
        if do_body_pts and len(body_kp) > 0 and stick_width > 0:
            for i, limb in enumerate(drawer.body_limbSeq):
                idx1, idx2 = limb[0] - 1, limb[1] - 1
                if idx1 >= len(body_kp) or idx2 >= len(body_kp): continue
                if body_sc[idx1] < score_threshold or body_sc[idx2] < score_threshold: continue

                x1, y1 = body_kp[idx1][0], body_kp[idx1][1]
                x2, y2 = body_kp[idx2][0], body_kp[idx2][1]
                
                if is_mask:
                    drawer.line(canvas, (x1, y1), (x2, y2), get_color(drawer.colors[i % len(drawer.colors)]), thickness=curr_body_radius * 2)
                else:
                    length = math.hypot(x1 - x2, y1 - y2)
                    if length < 1: continue
                    angle = math.degrees(math.atan2(y1 - y2, x1 - x2))
                    polygon = drawer.ellipse2Poly((int((x1+x2)/2), int((y1+y2)/2)), (int(length/2), max(1, stick_width // 2)), int(angle))
                    drawer.fillConvexPoly(canvas, polygon, get_color(drawer.colors[i % len(drawer.colors)]))

            for i in range(len(body_kp)):
                if body_sc[i] < score_threshold: continue
                x, y = int(body_kp[i][0]), int(body_kp[i][1])
                if 0 <= x < w and 0 <= y < h:
                    drawer.circle(canvas, (x, y), curr_body_radius, get_color(drawer.colors[i % len(drawer.colors)]))

        # ================= 2. 绘制脚部点线 =================
        if do_foot_pts and len(foot_kp) > 0 and stick_width > 0:
            foot_len = len(foot_kp)
            mid = foot_len // 2  
            for i_f in range(foot_len):
                if foot_sc[i_f] < score_threshold: continue
                x, y = int(foot_kp[i_f][0]), int(foot_kp[i_f][1])
                if 0 <= x < w and 0 <= y < h:
                    color = get_color(drawer.colors[(18 + i_f) % len(drawer.colors)])
                    
                    if connect_feet and len(body_kp) > 13:
                        is_left = (i_f < mid)
                        ankle_idx = 13 if is_left else 10
                        if body_sc[ankle_idx] >= score_threshold:
                            ax, ay = int(body_kp[ankle_idx][0]), int(body_kp[ankle_idx][1])
                            if is_mask:
                                drawer.line(canvas, (x, y), (ax, ay), color, thickness=curr_foot_radius * 2)
                            else:
                                length = math.hypot(x - ax, y - ay)
                                if length >= 1:
                                    angle = math.degrees(math.atan2(y - ay, x - ax))
                                    polygon = drawer.ellipse2Poly((int((x+ax)/2), int((y+ay)/2)), (int(length/2), max(1, stick_width // 2)), int(angle))
                                    drawer.fillConvexPoly(canvas, polygon, color)
                    
                    drawer.circle(canvas, (x, y), curr_foot_radius, color)

        # ================= 3. 绘制手部点线 =================
        if do_hand_pts and stick_width > 0:
            for hand_kp, hand_sc in [(lhand_kp, lhand_sc), (rhand_kp, rhand_sc)]:
                if len(hand_kp) < 21: continue
                for ie, edge in enumerate(drawer.hand_edges):
                    idx1, idx2 = 92 + edge[0], 92 + edge[1]
                    if hand_sc[idx1 - 92] < score_threshold or hand_sc[idx2 - 92] < score_threshold: continue

                    x1, y1 = int(hand_kp[idx1 - 92][0]), int(hand_kp[idx1 - 92][1])
                    x2, y2 = int(hand_kp[idx2 - 92][0]), int(hand_kp[idx2 - 92][1])
                    if x1 > eps and y1 > eps and x2 > eps and y2 > eps:
                        if 0 <= x1 < w and 0 <= y1 < h and 0 <= x2 < w and 0 <= y2 < h:
                            color = drawer.hand_colors[ie]
                            if is_mask: color = (255, 255, 255)
                            drawer.line(canvas, (x1, y1), (x2, y2), color, thickness=curr_hand_line_thickness)

                for i in range(len(hand_kp)):
                    if hand_sc[i] < score_threshold: continue
                    x, y = int(hand_kp[i][0]), int(hand_kp[i][1])
                    if x > eps and y > eps and 0 <= x < w and 0 <= y < h:
                        drawer.circle(canvas, (x, y), curr_hand_point_radius, get_color((0, 0, 255)))

        # ================= 4. 绘制面部点 =================
        if do_face_pts and face_point_size > 0 and len(face_kp) > 0:
            for i in range(len(face_kp)):
                if face_sc[i] < score_threshold: continue
                x, y = int(face_kp[i][0]), int(face_kp[i][1])
                if x > eps and y > eps and 0 <= x < w and 0 <= y < h:
                    drawer.circle(canvas, (x, y), curr_face_point_size, get_color((255, 255, 255)))

    def render(self, keypoints, draw_body, draw_hands, draw_face, draw_feet, connect_feet, score_threshold, stick_width, face_point_size, background_image=None, pose_background=None):
        import numpy as np
        drawer = UniversalKeypointDraw()
        out_frames = []
        mask_frames = []

        if isinstance(keypoints, dict) and "people" in keypoints:
            keypoints = [keypoints]
        elif not isinstance(keypoints, list):
            print("UniversalPoseRenderer: 输入数据格式不正确，已回退为黑图。")
            return (torch.zeros((1, 64, 64, 3), dtype=torch.float32), torch.zeros((1, 64, 64), dtype=torch.float32))

        if background_image is not None:
            if len(keypoints) != background_image.shape[0]:
                raise ValueError(f"万能渲染器报错: 背景图像批次长度 ({background_image.shape[0]}) 与 骨骼批次长度 ({len(keypoints)}) 不一致！")
            
            if len(keypoints) > 0:
                h_kp = keypoints[0].get("canvas_height", 512)
                w_kp = keypoints[0].get("canvas_width", 512)
                img_h, img_w = background_image.shape[1], background_image.shape[2]
                if img_h != h_kp or img_w != w_kp:
                    raise ValueError(f"万能渲染器报错: 背景图像分辨率 ({img_w}x{img_h}) 与 骨骼画布分辨率 ({w_kp}x{h_kp}) 不一致！请使用 RescaleKeypoints 节点对齐骨骼分辨率，或者裁剪图像。")
            bg_np_batch = (background_image * 255.0).clamp(0, 255).to(torch.uint8).cpu().numpy()
        else:
            bg_np_batch = None
            
        if pose_background is None:
            pose_background = {
                'bg_color': "#000000", 'draw_only_bg': False,
                'body_point_radius': 0, 'body_hull': False, 'body_infill_expand': 0,
                'face_point_radius': 0, 'face_hull': False, 'face_infill_expand': 0,
                'hand_point_radius': 0, 'hand_hull': False, 'hand_infill_expand': 0,
                'foot_point_radius': 0, 'foot_hull': False, 'foot_infill_expand': 0,
            }
            
        bg_rgb = tuple(parse_color(pose_background.get('bg_color', "#000000")))
        draw_only_bg = pose_background.get('draw_only_bg', False)
        
        run_mask_pass = any(v > 0 or v is True for k, v in pose_background.items() if 'radius' in k or 'hull' in k or 'expand' in k)

        # 🔥 优化4：定义轻量化解析器，自动识别并还原相对坐标 (0~1) 为绝对坐标
        def parse_kp_fast(person, k, w, h):
            flat = person.get(k, [])
            if not flat: return np.zeros((0, 2), dtype=np.float32), np.zeros(0, dtype=np.float32)
            arr = np.array(flat, dtype=np.float32).reshape(-1, 3)
            valid = arr[:, 2] > 0
            if np.any(valid):
                max_val = np.max(arr[valid, :2])
                if max_val <= 1.0 and max_val > 0:
                    arr[valid, 0] *= float(w)
                    arr[valid, 1] *= float(h)
            return arr[:, :2], arr[:, 2]

        for f_idx, frame in enumerate(keypoints):
            h = frame.get("canvas_height", 512)
            w = frame.get("canvas_width", 512)
            
            # 🔥 预解析当前帧的所有角色数据，彻底消灭重复 Numpy reshape 开销
            parsed_people = []
            for person in frame.get("people", []):
                parsed_people.append({
                    'body': parse_kp_fast(person, 'pose_keypoints_2d', w, h),
                    'foot': parse_kp_fast(person, 'foot_keypoints_2d', w, h),
                    'face': parse_kp_fast(person, 'face_keypoints_2d', w, h),
                    'lhand': parse_kp_fast(person, 'hand_left_keypoints_2d', w, h),
                    'rhand': parse_kp_fast(person, 'hand_right_keypoints_2d', w, h)
                })
            
            if bg_np_batch is not None:
                canvas = bg_np_batch[f_idx].copy()
            else:
                canvas = np.zeros((h, w, 3), dtype=np.uint8)
                
            mask_canvas = np.zeros((h, w, 3), dtype=np.uint8)

            if run_mask_pass:
                for pp in parsed_people:
                    self.draw_person_pose(mask_canvas, pp, 'mask', drawer, draw_body, draw_hands, draw_face, draw_feet, connect_feet, score_threshold, stick_width, face_point_size, pose_background, w, h)
                
                mask_2d = mask_canvas[:, :, 0] > 0
                canvas[mask_2d] = bg_rgb
            else:
                mask_2d = np.zeros((h, w), dtype=bool)

            if not draw_only_bg:
                for pp in parsed_people:
                    self.draw_person_pose(canvas, pp, 'color', drawer, draw_body, draw_hands, draw_face, draw_feet, connect_feet, score_threshold, stick_width, face_point_size, pose_background, w, h)

            out_frames.append(canvas)
            mask_frames.append(mask_2d.astype(np.uint8) * 255)

        out_tensor = torch.from_numpy(np.stack(out_frames)).float() / 255.0
        mask_tensor = torch.from_numpy(np.stack(mask_frames)).float() / 255.0
        return (out_tensor, mask_tensor)


# ================= ✏️ 通用型 Pose 编辑器 (基础解析引擎) =================
class UniversalPoseEditor:
    @classmethod
    def INPUT_TYPES(s):
        # 提供一个标准单帧的初始空模版，防止初次加载时报错
        default_json = '{\n  "canvas_width": 512,\n  "canvas_height": 512,\n  "people": []\n}'
        return {
            "required": {
                "pose_json": ("STRING", {"multiline": True, "default": default_json, "tooltip": "在此输入合法的单帧 OpenPose JSON 格式字符串"}),
            },
            "optional": {
                "background_image": ("IMAGE", {"tooltip": "背景图片"}),
                "keypoint": ("POSE_KEYPOINT", {"tooltip": "输入关键点数据，可点击“更新关键点”按钮将其转换为JSON覆盖到文本框中"}),
            }
        }
        
    RETURN_TYPES = ("POSE_KEYPOINT",)
    # 🔥 必须设置为 True，否则 ComfyUI 不会把该节点的 {"ui": ...} 返回给前端
    OUTPUT_NODE = True 
    FUNCTION = "parse_pose"
    CATEGORY = "Data_Tool/Data_Pose"

    def parse_pose(self, pose_json, background_image=None, keypoint=None):
        import json
        import os
        import uuid
        import numpy as np
        import folder_paths
        from PIL import Image
        
        # 标准的默认空白画布结构，用于发生异常时进行软回退
        default_data = {"canvas_width": 512, "canvas_height": 512, "people": []}

        # 1. 软拦截：非法的 JSON 字符串
        try:
            if not pose_json or not pose_json.strip():
                data = default_data
            else:
                data = json.loads(pose_json)
        except json.JSONDecodeError as e:
            print(f"\n⚠️ [Data_Tool 警告] Pose编辑器: 文本框内容不是合法JSON。已静默回退为空白画布。")
            data = default_data

        # 2. 软拦截：多帧序列 (提取第一帧，绝不报错)
        if isinstance(data, list):
            if len(data) >= 1:
                if len(data) > 1:
                    print(f"\n⚠️ [Data_Tool 警告] Pose编辑器: 检测到序列批次输入！编辑器仅支持单帧，已自动截断保留第 0 帧。")
                data = data[0]
            else:
                data = default_data
        
        # 3. 软拦截：损坏的骨架字典
        if not isinstance(data, dict) or "people" not in data:
            print(f"\n⚠️ [Data_Tool 警告] Pose编辑器: 骨架结构损坏。已静默回退为空白画布。")
            data = default_data

        # ================= 底图张量跨端转换逻辑 =================
        ui_update = {}
        if background_image is not None:
            # 取批次的第 0 帧，剥离 Batch 维度: (1, H, W, C) -> (H, W, C)
            img_tensor = background_image[0]
            # 缩放至 0-255 并转为 uint8 格式
            img_np = (img_tensor.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
            pil_img = Image.fromarray(img_np)
            
            # 存入 ComfyUI 官方的 temp 临时文件夹中
            temp_dir = folder_paths.get_temp_directory()
            filename = f"pose_editor_bg_{uuid.uuid4().hex[:8]}.png"
            file_path = os.path.join(temp_dir, filename)
            pil_img.save(file_path)
            
            # 按照 ComfyUI PreviewImage 的 standard format 发送给前端
            ui_update["background_image"] = [{"filename": filename, "subfolder": "", "type": "temp"}]

        # ================= 输入 keypoint 覆盖文本框逻辑 =================
        if keypoint is not None:
            # keypoint 数据可能是单个 dict (含 people) 或者 list 的 dict
            kp_data = None
            if isinstance(keypoint, list):
                if len(keypoint) >= 1:
                    kp_data = keypoint[0]
            elif isinstance(keypoint, dict) and "people" in keypoint:
                kp_data = keypoint
            
            if kp_data is not None:
                try:
                    # 序列化为漂亮的 JSON 格式
                    ui_update["keypoint_json"] = json.dumps(kp_data, indent=2)
                except Exception as e:
                    print(f"⚠️ [Data_Tool 警告] keypoint序列化JSON失败: {e}")

        result_data = ([data],)
        
        if ui_update:
            return {"ui": ui_update, "result": result_data}
        else:
            return {"result": result_data}


NODE_CLASS_MAPPINGS = {
    "RescaleKeypoints": RescaleKeypoints,
    "KeypointConfidenceModifier": KeypointConfidenceModifier,
    "KeypointHandFilter": KeypointHandFilter,
    "SDPoseToViTPoseFoot": SDPoseToViTPoseFoot,
    "PoseBackgroundOptions": PoseBackgroundOptions,
    "UniversalPoseRenderer": UniversalPoseRenderer,
    "UniversalPoseEditor": UniversalPoseEditor,

    "NLF_Pose_Orientation": NLF_Pose_Orientation,
    "NLF_Orientation_Parser": NLF_Orientation_Parser,
    "Direction_Modifier": Direction_Modifier,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "RescaleKeypoints": "📐 关键点映射 Rescale Keypoints",
    "KeypointConfidenceModifier": "🎯 置信修改 Keypoint Confidence Modifier",
    "KeypointHandFilter": "✋ 手部过滤 Keypoint Hand Filter",
    "SDPoseToViTPoseFoot": "🦶 sd转vit脚 SDPose To ViTPose Foot",
    "PoseBackgroundOptions": "背景选项 Pose Background Options",
    "UniversalPoseRenderer": "🎥 姿态渲染 Universal Pose Renderer",
    "UniversalPoseEditor": "✏️ 姿态编辑 Universal Pose Editor",

    "NLF_Pose_Orientation": "🧭 NLF 骨骼朝向 Pose Orientation",
    "NLF_Orientation_Parser": "🧭 NLF 朝向解析 Orientation Parser",
    "Direction_Modifier": "🧭 朝向修改 Direction Modifier",
}