import copy
import numpy as np
import torch


# ================= 🚀 2D Pose 分辨率重映射节点 =================
class RescaleKeypoints:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "keypoints": ("POSE_KEYPOINT", {"tooltip": "输入的 OpenPose 数据"}),
                "width": ("INT", {"default": 512, "min": 64, "max": 8192, "tooltip": "目标画布宽度"}),
                "height": ("INT", {"default": 512, "min": 64, "max": 8192, "tooltip": "目标画布高度"}),
                "resize_mode": (["拉伸 (Stretch)", "自适应 (Fit)", "保持 (Keep)", "对齐高度 (Fit Height)", "对齐宽度 (Fit Width)"], {"default": "自适应 (Fit)", "tooltip": "分辨率不符时的缩放策略"}),
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
        import copy
        import numpy as np
        
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
        import math
        import re
        
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
class NLF_Direction_Modifier:
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
        import re
        
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


# ================= 🎨 OpenCV 极速 + Numpy 保底 骨架渲染引擎 =================
class UniversalKeypointDraw:
    def __init__(self):
        self.hand_edges = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20]]
        self.body_limbSeq = [[2, 3], [2, 6], [3, 4], [4, 5], [6, 7], [7, 8], [2, 9], [9, 10], [10, 11], [2, 12], [12, 13], [13, 14], [2, 1], [1, 15], [15, 17], [1, 16], [16, 18]]
        self.colors = [[255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]]

        # 🔥 智能探测系统：优先使用 C++ 级别的 OpenCV 进行极速硬件渲染
        try:
            import cv2
            self.cv2 = cv2
            self.use_cv2 = True
        except ImportError:
            self.use_cv2 = False
            print("\n⚠️ [Data_Tool Warning] 未检测到 OpenCV (cv2) 库，万能渲染器已降级为纯 Numpy 慢速模式！建议在环境内执行 pip install opencv-python 以获得极致渲染速度。\n")

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
        import math
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


# ================= 🎥 通用姿态渲染节点 =================
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
                "background_image": ("IMAGE", {"tooltip": "可选的背景图片批次。若连入，则直接在这些图片上绘制。"})
            }
        }
    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "render"
    CATEGORY = "Data_Tool/Data_Pose"

    def render(self, keypoints, draw_body, draw_hands, draw_face, draw_feet, connect_feet, score_threshold, stick_width, face_point_size, background_image=None):
        import math
        import colorsys
        drawer = UniversalKeypointDraw()
        out_frames = []

        if not keypoints:
            return (torch.zeros((1, 64, 64, 3), dtype=torch.float32),)

        # 🚨 严格安全防呆校验：背景图片的长度与分辨率
        bg_np_batch = None
        if background_image is not None:
            if len(keypoints) != background_image.shape[0]:
                raise ValueError(f"万能渲染器报错: 背景图像批次长度 ({background_image.shape[0]}) 与 骨骼批次长度 ({len(keypoints)}) 不一致！")
            
            if len(keypoints) > 0:
                h_kp = keypoints[0].get("canvas_height", 512)
                w_kp = keypoints[0].get("canvas_width", 512)
                img_h, img_w = background_image.shape[1], background_image.shape[2]
                if img_h != h_kp or img_w != w_kp:
                    raise ValueError(f"万能渲染器报错: 背景图像分辨率 ({img_w}x{img_h}) 与 骨骼画布分辨率 ({w_kp}x{h_kp}) 不一致！请使用 RescaleKeypoints 节点对齐骨骼分辨率，或者裁剪图像。")

            # 🔥 性能优化核心：脱离循环，利用 PyTorch 的 C++ 底层对整个批次进行向量化并发计算！
            # 一次性将整个 Tensor 批次乘以 255、截断并转为 uint8，最后只做一次 CPU 内存传输。
            bg_np_batch = (background_image * 255.0).clamp(0, 255).to(torch.uint8).cpu().numpy()

        for f_idx, frame in enumerate(keypoints):
            h = frame.get("canvas_height", 512)
            w = frame.get("canvas_width", 512)
            
            # 🎨 背景初始化：从一次性转换好的内存池中直接极速读取单帧
            if bg_np_batch is not None:
                canvas = bg_np_batch[f_idx].copy()
            else:
                canvas = np.zeros((h, w, 3), dtype=np.uint8)

            for person in frame.get("people", []):
                def parse_kp(k):
                    flat = person.get(k, [])
                    if not flat: return np.zeros((0, 2)), np.zeros(0)
                    arr = np.array(flat, dtype=np.float32).reshape(-1, 3)
                    return arr[:, :2], arr[:, 2]

                body_kp, body_sc = parse_kp('pose_keypoints_2d')
                foot_kp, foot_sc = parse_kp('foot_keypoints_2d')
                face_kp, face_sc = parse_kp('face_keypoints_2d')
                lhand_kp, lhand_sc = parse_kp('hand_left_keypoints_2d')
                rhand_kp, rhand_sc = parse_kp('hand_right_keypoints_2d')

                eps = 0.01

                # 1. 绘制身体
                if draw_body and len(body_kp) > 0:
                    for i, limb in enumerate(drawer.body_limbSeq):
                        idx1, idx2 = limb[0] - 1, limb[1] - 1
                        if idx1 >= len(body_kp) or idx2 >= len(body_kp): continue
                        if body_sc[idx1] < score_threshold or body_sc[idx2] < score_threshold: continue

                        # 🔥 修复了 X, Y 解包相反的错误
                        x1, y1 = body_kp[idx1][0], body_kp[idx1][1]
                        x2, y2 = body_kp[idx2][0], body_kp[idx2][1]
                        length = math.hypot(x1 - x2, y1 - y2)
                        if length < 1: continue

                        angle = math.degrees(math.atan2(y1 - y2, x1 - x2))
                        polygon = drawer.ellipse2Poly((int((x1+x2)/2), int((y1+y2)/2)), (int(length/2), stick_width), int(angle))
                        drawer.fillConvexPoly(canvas, polygon, drawer.colors[i % len(drawer.colors)])

                    for i in range(len(body_kp)):
                        if body_sc[i] < score_threshold: continue
                        x, y = int(body_kp[i][0]), int(body_kp[i][1])
                        if 0 <= x < w and 0 <= y < h:
                            drawer.circle(canvas, (x, y), 4, drawer.colors[i % len(drawer.colors)])

                # 2. 绘制脚部 (含自动脚踝连线引擎)
                if draw_feet and len(foot_kp) > 0:
                    foot_len = len(foot_kp)
                    mid = foot_len // 2  
                    for i_f in range(foot_len):
                        if foot_sc[i_f] < score_threshold: continue
                        x, y = int(foot_kp[i_f][0]), int(foot_kp[i_f][1])
                        if 0 <= x < w and 0 <= y < h:
                            color = drawer.colors[(18 + i_f) % len(drawer.colors)]
                            
                            # 🔥 升级：使用官方的椭圆算法绘制“中间粗两头细”的脚踝连线
                            if connect_feet and len(body_kp) > 13:
                                is_left = (i_f < mid)
                                ankle_idx = 13 if is_left else 10
                                if body_sc[ankle_idx] >= score_threshold:
                                    ax, ay = int(body_kp[ankle_idx][0]), int(body_kp[ankle_idx][1])
                                    length = math.hypot(x - ax, y - ay)
                                    if length >= 1:
                                        angle = math.degrees(math.atan2(y - ay, x - ax))
                                        polygon = drawer.ellipse2Poly((int((x+ax)/2), int((y+ay)/2)), (int(length/2), stick_width), int(angle))
                                        drawer.fillConvexPoly(canvas, polygon, color)
                            
                            # 画点压在连线上方更美观
                            drawer.circle(canvas, (x, y), 4, color)

                # 3. 绘制手部 (左右手复用)
                if draw_hands:
                    for hand_kp, hand_sc in [(lhand_kp, lhand_sc), (rhand_kp, rhand_sc)]:
                        if len(hand_kp) < 21: continue
                        for ie, edge in enumerate(drawer.hand_edges):
                            idx1, idx2 = edge[0], edge[1]
                            if hand_sc[idx1] < score_threshold or hand_sc[idx2] < score_threshold: continue

                            x1, y1 = int(hand_kp[idx1][0]), int(hand_kp[idx1][1])
                            x2, y2 = int(hand_kp[idx2][0]), int(hand_kp[idx2][1])
                            if x1 > eps and y1 > eps and x2 > eps and y2 > eps:
                                r, g, b = colorsys.hsv_to_rgb(ie / float(len(drawer.hand_edges)), 1.0, 1.0)
                                drawer.line(canvas, (x1, y1), (x2, y2), (int(r*255), int(g*255), int(b*255)), thickness=2)

                        for i in range(len(hand_kp)):
                            if hand_sc[i] < score_threshold: continue
                            x, y = int(hand_kp[i][0]), int(hand_kp[i][1])
                            if x > eps and y > eps and 0 <= x < w and 0 <= y < h:
                                drawer.circle(canvas, (x, y), 4, (0, 0, 255))

                # 4. 绘制面部
                if draw_face and len(face_kp) > 0:
                    for i in range(len(face_kp)):
                        if face_sc[i] < score_threshold: continue
                        x, y = int(face_kp[i][0]), int(face_kp[i][1])
                        if x > eps and y > eps and 0 <= x < w and 0 <= y < h:
                            drawer.circle(canvas, (x, y), face_point_size, (255, 255, 255))

            out_frames.append(canvas)

        out_tensor = torch.from_numpy(np.stack(out_frames)).float() / 255.0
        return (out_tensor,)


NODE_CLASS_MAPPINGS = {
    "RescaleKeypoints": RescaleKeypoints,
    "KeypointConfidenceModifier": KeypointConfidenceModifier,
    "KeypointHandFilter": KeypointHandFilter,
    "SDPoseToViTPoseFoot": SDPoseToViTPoseFoot,
    "UniversalPoseRenderer": UniversalPoseRenderer,

    "NLF_Pose_Orientation": NLF_Pose_Orientation,
    "NLF_Orientation_Parser": NLF_Orientation_Parser,
    "NLF_Direction_Modifier": NLF_Direction_Modifier,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "RescaleKeypoints": "📐 关键点映射 Rescale Keypoints",
    "KeypointConfidenceModifier": "🎯 置信修改 Keypoint Confidence Modifier",
    "KeypointHandFilter": "✋ 手部过滤 Keypoint Hand Filter",
    "SDPoseToViTPoseFoot": "🦶 sd转vit脚 SDPose To ViTPose Foot",
    "UniversalPoseRenderer": "🎥 姿态渲染 Universal Pose Renderer",

    "NLF_Pose_Orientation": "🧭 NLF 骨骼朝向 Pose Orientation",
    "NLF_Orientation_Parser": "🧭 NLF 朝向解析 Orientation Parser",
    "NLF_Direction_Modifier": "🧭 朝向修改 Direction Modifier",
}