import os
import re
import numpy as np
import folder_paths
import torch


# ================= 🧰 万能类型通配符 =================
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False
any_type = AnyType("IMAGE,MASK,LATENT,POSE_KEYPOINT,NLFPRED,*")


# ================= 🧮 通用时序切片数学引擎 =================
def calculate_slice_indices(total_len, start_index, length, reverse_direction):
    # 1. 负数索引转换
    start = start_index if start_index >= 0 else total_len + start_index
    
    # 2. 确定真实的切片范围
    if reverse_direction:
        if length <= 0:  # 0代表拉满，反向的拉满意味着从头(0)拉到start
            final_start = 0
            final_end = start + 1
        else:
            final_start = start - length + 1
            final_end = start + 1
    else:
        final_start = start
        if length <= 0:  # 0代表拉满，正向的拉满意味着从start拉到末尾
            final_end = total_len
        else:
            final_end = start + length
            
    # 3. 终极边界防御 (防止突破0和超出总长度引起的越界穿透)
    final_start = max(0, final_start)
    final_end = min(total_len, max(final_start, final_end))
    
    return final_start, final_end


# ================= 🎨 全局万能色彩解析器 (支持Hex/RGB/十进制) =================
def parse_color(color_str):
    c = color_str.strip()
    
    # 1. 解析十六进制 (Hex: #FFFFFF)
    if c.startswith('#'):
        c_hex = c.lstrip('#')
        if len(c_hex) == 3: # 支持缩写 #FFF -> #FFFFFF
            c_hex = ''.join([char*2 for char in c_hex])
        if not re.match(r'^[0-9a-fA-F]{6}$', c_hex):
            raise ValueError(f"色彩解析错误: 非法的十六进制颜色码 '{color_str}'。格式应为 #RRGGBB 或 #RGB")
        return [int(c_hex[i:i+2], 16) for i in (0, 2, 4)]
    
    # 2. 解析 RGB 字符串 (如 255, 0, 0)
    if ',' in c:
        c_clean = c.strip('()[]{}')
        parts = [p.strip() for p in c_clean.split(',')]
        if len(parts) >= 3:
            rgb_vals = []
            for p in parts[:3]:
                if not re.match(r'^-?\d+$', p):
                    raise ValueError(f"色彩解析错误: RGB通道存在非法字符 '{p}'")
                val = int(p)
                if val < 0:
                    raise ValueError(f"色彩解析错误: RGB通道值不能为负数 ({val})！")
                if val > 255: val = 255 # 自动截断上限
                rgb_vals.append(val)
            return rgb_vals
        raise ValueError(f"色彩解析错误: 非法的 RGB 颜色码 '{color_str}'。格式应为: 255, 255, 255")
    
    # 3. 解析十进制整数 (支持负号判定)
    if re.match(r'^-?\d+$', c):
        val = int(c)
        if val < 0:
            raise ValueError(f"色彩解析错误: 十进制颜色码不能为负数 ({val})！")
        if val > 16777215: val = 16777215 # 自动截断上限
        return [(val >> 16) & 255, (val >> 8) & 255, val & 255]
        
    raise ValueError(f"色彩解析错误: 无法解析的颜色格式 '{color_str}'。")


# ================= 🛡️ 全局内部严格校验引擎 =================
def validate_compatibility(base_data, new_data, error_prefix="批次操作错误"):
    # 1. 基础类型校验
    if type(base_data) != type(new_data):
        raise ValueError(f"{error_prefix}: 数据类型严重不匹配！基础类型为 {type(base_data).__name__}，接入类型为 {type(new_data).__name__}。")
        
    # 2. PyTorch Tensor 空间形状校验 (跳过第0维批次大小)
    if isinstance(base_data, torch.Tensor):
        if base_data.shape[1:] != new_data.shape[1:]:
            raise ValueError(f"{error_prefix}: 张量空间形状不一致！基础形状 {base_data.shape[1:]} VS 接入形状 {new_data.shape[1:]}。(如分辨率或通道数不同)")
            
    # 3. Latent 字典校验
    elif isinstance(base_data, dict) and "samples" in base_data:
        if "samples" not in new_data:
            raise ValueError(f"{error_prefix}: 接入的字典不是合法的 Latent 数据！")
        if base_data["samples"].shape[1:] != new_data["samples"].shape[1:]:
            raise ValueError(f"{error_prefix}: Latent 空间维度不一致！基础形状 {base_data['samples'].shape[1:]} VS 接入形状 {new_data['samples'].shape[1:]}。")
            
    # 4. OpenPose 骨骼结构校验 (防止三点脚和单点脚缝合)
    elif isinstance(base_data, list) and len(base_data) > 0 and isinstance(base_data[0], dict) and "people" in base_data[0]:
        try:
            p1 = base_data[0].get("people", [])
            p2 = new_data[0].get("people", []) if len(new_data) > 0 else []
            if p1 and p2:
                f1 = p1[0].get("foot_keypoints_2d", [])
                f2 = p2[0].get("foot_keypoints_2d", [])
                if len(f1) != len(f2):
                    raise ValueError(f"{error_prefix}: 骨骼脚部结构不兼容！基础数据为 {len(f1)//3} 点脚，而接入数据为 {len(f2)//3} 点脚。")
                b1 = p1[0].get("pose_keypoints_2d", [])
                b2 = p2[0].get("pose_keypoints_2d", [])
                if len(b1) != len(b2):
                    raise ValueError(f"{error_prefix}: 骨骼身体结构不兼容！基础数据为 {len(b1)//3} 个点，而接入数据为 {len(b2)//3} 个点。")
        except Exception:
            pass

    
# ================= 💾 缓存数据读写管线 =================
def get_file_list(folder_name, ext=".json"):
    files = ["none"] # 🔥 核心修复：永远将 "none" 留在列表里，防止前端传来 none 时后端校验崩溃
    for base_prefix, base_dir in[("input", os.path.join(folder_paths.get_input_directory(), folder_name)),
                                  ("output", os.path.join(folder_paths.get_output_directory(), folder_name))]:
        if os.path.exists(base_dir):
            for root, _, filenames in os.walk(base_dir):
                for f in filenames:
                    if f.endswith(ext):
                        rel_path = os.path.relpath(os.path.join(root, f), base_dir)
                        # 统一为正斜杠，防止 Windows 路径在前端错乱
                        rel_path = rel_path.replace("\\", "/")
                        files.append(f"{base_prefix}/{rel_path}")
    return files

def make_serializable(obj):
    if isinstance(obj, np.ndarray): return obj.tolist()
    elif isinstance(obj, dict): return {k: make_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list): return[make_serializable(item) for item in obj]
    return obj

def get_new_file_path(output_dir, filename_prefix, ext=".json"):
    out_dir_norm = os.path.abspath(output_dir)
    
    # 🔥 修复：必须先判断原字符串是不是绝对路径！否则相对路径会被 abspath 污染成 Comfy 根目录！
    if os.path.isabs(filename_prefix):
        prefix_norm = os.path.abspath(filename_prefix)
        if prefix_norm.lower().startswith(out_dir_norm.lower()):
            rel_prefix = os.path.relpath(prefix_norm, out_dir_norm)
            display_path = rel_prefix.replace("\\", "/") 
            full_output_folder = os.path.join(out_dir_norm, os.path.dirname(rel_prefix))
            filename = os.path.basename(rel_prefix)
        else:
            display_path = filename_prefix
            full_output_folder = os.path.dirname(prefix_norm)
            filename = os.path.basename(prefix_norm)
    else:
        # 如果不是绝对路径，那就是在 output/mask_bin_tensor_data/ 下面的相对路径
        display_path = filename_prefix.replace("\\", "/")
        full_output_folder = os.path.join(out_dir_norm, os.path.dirname(filename_prefix))
        filename = os.path.basename(filename_prefix)

    os.makedirs(full_output_folder, exist_ok=True)
    pattern = re.compile(rf"^{re.escape(filename)}_(\d{{5}})\{ext}$")
    max_counter = 0
    for f in os.listdir(full_output_folder):
        match = pattern.match(f)
        if match:
            max_counter = max(max_counter, int(match.group(1)))
    
    counter = max_counter + 1
    # 返回真实路径，同时附带给 UI 的文本
    return os.path.join(full_output_folder, f"{filename}_{counter:05d}{ext}"), display_path
