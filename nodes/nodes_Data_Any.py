import copy
import torch
from ..utils import any_type, calculate_slice_indices, validate_compatibility


# ================= ✂️ 万能批次/数据切片提取节点 =================
class BatchDataExtractor:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "data": (any_type, {"tooltip": "连入任意类型的数据 (图片/Mask/NLF/DWPose)"}),
                "start_index": ("INT", {"default": 0, "min": -100000, "max": 100000, "step": 1, "tooltip": "提取的起始索引 (支持负数)"}),
                "length": ("INT", {"default": 1, "min": 1, "max": 100000, "step": 1, "tooltip": "提取的长度/帧数"}),
                "reverse_direction": ("BOOLEAN", {"default": False, "tooltip": "True为向左(前)提取"}),
            }
        }
    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("data",)
    FUNCTION = "extract"
    CATEGORY = "Data_Tool/Data_Any"

    def extract(self, data, start_index, length, reverse_direction):
        # 1. 拦截 PyTorch Tensor (图片、Latent、Mask)
        if isinstance(data, torch.Tensor):
            total_len = data.shape[0]
            s, e = calculate_slice_indices(total_len, start_index, length, reverse_direction)
            return (data[s:e],)
            
        # 2. 拦截 List 数组 (例如 NLF 的 3D Pose 帧列表)
        elif isinstance(data, list):
            total_len = len(data)
            s, e = calculate_slice_indices(total_len, start_index, length, reverse_direction)
            return (data[s:e],)
            
        # 3. 拦截 DWPose 字典格式
        elif isinstance(data, dict) and "poses" in data:
            new_data = copy.deepcopy(data)
            total_len = len(new_data["poses"])
            s, e = calculate_slice_indices(total_len, start_index, length, reverse_direction)
            new_data["poses"] = new_data["poses"][s:e]
            return (new_data,)
            
        # 4. 拦截 NLF 顶层字典格式
        elif isinstance(data, dict) and "joints3d_nonparam" in data:
            new_data = copy.deepcopy(data)
            tensor_list = new_data["joints3d_nonparam"][0]
            total_len = len(tensor_list)
            s, e = calculate_slice_indices(total_len, start_index, length, reverse_direction)
            new_data["joints3d_nonparam"][0] = tensor_list[s:e]
            return (new_data,)
            
        else:
            print("BatchDataExtractor_Fixed: 未知数据类型，将原样返回。")
            return (data,)


# ================= 💉 万能批次数据替换节点 =================
class BatchDataReplacer:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "target_data": (any_type, {"tooltip": "被替换的原始数据 (图片/Mask/Latent/NLF/DWPose)"}),
                "replacement_data": (any_type, {"tooltip": "用来替换的新数据"}),
                "start_index": ("INT", {"default": 0, "min": -100000, "max": 100000, "step": 1, "tooltip": "替换起始索引 (支持负数)"}),
                "overflow_mode": (["截断 (Truncate)", "延长 (Extend)"], {"default": "截断 (Truncate)", "tooltip": "替换批次超出原始批次末尾时的处理方式"}),
                "reverse_direction": ("BOOLEAN", {"default": False, "tooltip": "True为向左(前)倒推替换长度"}),
            }
        }
    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("data",)
    FUNCTION = "replace"
    CATEGORY = "Data_Tool/Data_Any"

    def replace(self, target_data, replacement_data, start_index, overflow_mode, reverse_direction):
        
        # 🔥 强行防呆校验
        validate_compatibility(target_data, replacement_data, error_prefix="批次替换错误")
        
        def core_replace(tgt_seq, repl_seq, is_tensor=False):
            total_len = len(tgt_seq)
            repl_len = len(repl_seq)
            start = start_index if start_index >= 0 else total_len + start_index
            if reverse_direction: start = start - repl_len + 1
            repl_start_offset = 0
            if start < 0:
                repl_start_offset = -start
                start = 0
            if repl_start_offset >= repl_len: return tgt_seq

            if "截断" in overflow_mode or "Truncate" in overflow_mode:
                actual_repl_len = min(repl_len - repl_start_offset, total_len - start)
            else:
                actual_repl_len = repl_len - repl_start_offset
            if actual_repl_len <= 0: return tgt_seq

            if is_tensor:
                slice_1 = tgt_seq[:start]
                slice_2 = repl_seq[repl_start_offset : repl_start_offset + actual_repl_len]
                end_in_target = start + actual_repl_len
                slice_3 = tgt_seq[end_in_target:] if end_in_target < total_len else None
                parts = [slice_1, slice_2]
                if slice_3 is not None and len(slice_3) > 0: parts.append(slice_3)
                parts = [p for p in parts if p.shape[0] > 0]
                return torch.cat(parts, dim=0) if parts else tgt_seq
            else:
                slice_1 = tgt_seq[:start]
                slice_2 = repl_seq[repl_start_offset : repl_start_offset + actual_repl_len]
                end_in_target = start + actual_repl_len
                slice_3 = tgt_seq[end_in_target:] if end_in_target < total_len else []
                return slice_1 + slice_2 + slice_3

        if isinstance(target_data, torch.Tensor):
            return (core_replace(target_data, replacement_data, is_tensor=True),)
        elif isinstance(target_data, list):
            return (core_replace(target_data, replacement_data, is_tensor=False),)
        elif isinstance(target_data, dict):
            new_data = copy.deepcopy(target_data)
            if "samples" in new_data:
                new_data["samples"] = core_replace(new_data["samples"], replacement_data["samples"], is_tensor=True)
                if "noise_mask" in new_data and "noise_mask" in replacement_data:
                    new_data["noise_mask"] = core_replace(new_data["noise_mask"], replacement_data["noise_mask"], is_tensor=True)
            elif "poses" in new_data:
                new_data["poses"] = core_replace(new_data["poses"], replacement_data["poses"], is_tensor=False)
            elif "joints3d_nonparam" in new_data:
                tgt_list = new_data["joints3d_nonparam"][0]
                repl_list = replacement_data["joints3d_nonparam"][0]
                new_data["joints3d_nonparam"][0] = core_replace(tgt_list, repl_list, is_tensor=False)
            return (new_data,)
        return (target_data,)


# ================= 🔗 万能批次数据组合节点 (动态端口) =================
class BatchDataCombiner:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "data_1": (any_type, {"tooltip": "连入第一个批次"}),
            }
        }
    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("data",)
    FUNCTION = "combine"
    CATEGORY = "Data_Tool/Data_Any"

    def combine(self, **kwargs):
        import copy
        # 1. 过滤掉 None，并按键名里的数字顺序进行排序 (data_1, data_2, ...)
        sorted_keys = sorted([k for k in kwargs.keys() if k.startswith("data_") and kwargs[k] is not None], key=lambda k: int(k.split('_')[1]))
        inputs = [kwargs[k] for k in sorted_keys]

        if not inputs:
            return (None,)
        if len(inputs) == 1:
            return (inputs[0],)

        base_item = inputs[0]
        
        # 2. 全量遍历防呆校验
        for i, item in enumerate(inputs[1:]):
            validate_compatibility(base_item, item, error_prefix=f"批次组合错误 (data_1 VS data_{i+2})")

        # 3. 组装逻辑
        if isinstance(base_item, torch.Tensor):
            return (torch.cat(inputs, dim=0),)
            
        elif isinstance(base_item, list):
            result = []
            for item in inputs:
                result.extend(item)
            return (result,)
            
        elif isinstance(base_item, dict):
            out = copy.deepcopy(base_item)
            if "samples" in out:
                samples = [item["samples"] for item in inputs]
                out["samples"] = torch.cat(samples, dim=0)
                
                # 检查是否有 noise_mask，如果都有则拼接
                if all("noise_mask" in item for item in inputs):
                    masks = [item["noise_mask"] for item in inputs]
                    out["noise_mask"] = torch.cat(masks, dim=0)
            elif "poses" in out:
                result = []
                for item in inputs: result.extend(item["poses"])
                out["poses"] = result
            elif "joints3d_nonparam" in out:
                result = []
                for item in inputs: result.extend(item["joints3d_nonparam"][0])
                out["joints3d_nonparam"][0] = result
                
            return (out,)
            
        return (base_item,)


# ================= 🎞️ 批次帧率转换器 =================
class BatchFrameRateConverter:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "data": (any_type, {"tooltip": "任意批次数据（图像/潜空间/Mask/关键点/NLF等）"}),
                "source_fps": ("FLOAT", {"default": 30.0, "min": 0.001, "max": 120.0, "step": 0.1, "tooltip": "原始视频帧率"}),
                "target_fps": ("FLOAT", {"default": 30.0, "min": 0.001, "max": 120.0, "step": 0.1, "tooltip": "目标帧率"}),
                "algorithm": (["最邻近 (Round)", "向前对齐 (Floor)"], {"default": "最邻近 (Round)", "tooltip": "帧映射算法"}),
            }
        }
    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("data",)
    FUNCTION = "convert"
    CATEGORY = "Data_Tool/Data_Any"

    def convert(self, data, source_fps, target_fps, algorithm):
        # 1. 自动剥壳获取总帧数 N
        if isinstance(data, torch.Tensor):
            N = data.shape[0]
        elif isinstance(data, list):
            N = len(data)
        elif isinstance(data, dict):
            if "samples" in data:
                N = data["samples"].shape[0]
            elif "poses" in data:
                N = len(data["poses"])
            elif "joints3d_nonparam" in data:
                N = len(data["joints3d_nonparam"][0])
            else:
                return (data,)
        else:
            return (data,)

        if N <= 1 or source_fps <= 0 or target_fps <= 0:
            return (data,)

        # 2. 修复：按视频总时长进行科学计算，获得正确的目标帧数 M
        M = max(1, int(round(N * target_fps / source_fps)))

        # 3. 核心时序映射
        indices = []
        use_round = "Round" in algorithm or "最邻近" in algorithm
        for j in range(M):
            # 将目标帧 j 映射到源视频的浮点索引
            src_idx = j * source_fps / target_fps
            
            if use_round:
                # 🔥 修复：使用 int(x + 0.5) 完美复刻 C 语言和 FFmpeg 的四舍五入，规避 Python 的银行家舍入
                i = int(src_idx + 0.5)
            else:
                i = int(src_idx)
                
            i = max(0, min(i, N - 1))
            indices.append(i)

        # 4. 根据数据类型构造并组装输出
        
        def memory_safe_slice(tensor, idx_list):
            """极省内存的张量切片法：彻底消灭 PyTorch 高级索引带来的翻倍峰值"""
            # 将 Python List 转为 LongTensor 作为官方查表索引
            idx_tensor = torch.tensor(idx_list, dtype=torch.long, device=tensor.device)
            # 使用底层 C++ 优化的 index_select，不会产生多余的临时巨型缓冲区
            return torch.index_select(tensor, 0, idx_tensor)

        if isinstance(data, torch.Tensor):
            return (memory_safe_slice(data, indices),)

        elif isinstance(data, list):
            return ([data[i] for i in indices],)

        elif isinstance(data, dict):
            if "samples" in data:
                new_data = data.copy()
                new_data["samples"] = memory_safe_slice(data["samples"], indices)
                # 同步安全切片 noise_mask
                if "noise_mask" in data and isinstance(data["noise_mask"], torch.Tensor):
                    if data["noise_mask"].shape[0] == N:
                        new_data["noise_mask"] = memory_safe_slice(data["noise_mask"], indices)
                return (new_data,)

            elif "poses" in data:
                new_data = copy.deepcopy(data)
                new_data["poses"] = [data["poses"][i] for i in indices]
                return (new_data,)

            elif "joints3d_nonparam" in data:
                new_data = copy.deepcopy(data)
                tensor_list = data["joints3d_nonparam"][0]
                new_data["joints3d_nonparam"][0] = [tensor_list[i] for i in indices]
                return (new_data,)

            else:
                return (data,)


NODE_CLASS_MAPPINGS = {
    "BatchDataExtractor": BatchDataExtractor,
    "BatchDataReplacer": BatchDataReplacer,
    "BatchDataCombiner": BatchDataCombiner,
    "BatchFrameRateConverter": BatchFrameRateConverter,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "BatchDataExtractor": "✂️ 批次截取 Batch Extractor",
    "BatchDataReplacer": "💉 批次替换 Batch Replacer",
    "BatchDataCombiner": "🔗 批次组合 Batch Combiner",
    "BatchFrameRateConverter": "🎞️ 帧率转换 Batch Frame Rate Converter",
}