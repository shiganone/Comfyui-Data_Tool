import torch
from ..utils import any_type


# ================= ✂️ 通用张量提取切片节点 (Tensor Extractor) =================
class TensorExtractor:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "data": (any_type, {"tooltip": "连入任意类型的数据 (图片/Mask/Latent)"}),
                "slice_dim": ("INT", {"default": 0, "min": 0, "max": 10, "step": 1, "tooltip": "切片维度"}),
                "start_index": ("INT", {"default": 0, "min": -100000, "max": 100000, "step": 1, "tooltip": "起始索引 (支持负数，-1表示最后一个)"}),
                "length": ("INT", {"default": 1, "min": 1, "max": 100000, "step": 1, "tooltip": "提取长度"}),
                "reverse_direction": ("BOOLEAN", {"default": False, "tooltip": "True为向左提取"}),
                "split_to_list": ("BOOLEAN", {"default": False, "tooltip": "True为输出张量列表，False为输出单一整块张量"}),
            }
        }
    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("data",)
    FUNCTION = "extract"
    CATEGORY = "Data_Tool/Data_Tensor"

    def extract(self, data, slice_dim, start_index, length, reverse_direction, split_to_list):
        # 1. 自动剥壳 (Latent)
        is_dict = isinstance(data, dict) and "samples" in data
        tensor = data["samples"] if is_dict else data
        
        if not isinstance(tensor, torch.Tensor):
            print("TensorExtractor: 输入数据非Tensor，原样返回。")
            return (data,)

        # 2. 直接使用指定的维度
        dim = slice_dim
            
        total_len = tensor.shape[dim]
        
        # 3. 负数索引与方向处理
        start = start_index if start_index >= 0 else total_len + start_index
        if reverse_direction:
            start = start - length + 1
            
        start = max(0, start)
        end = min(total_len, start + length)
        
        # 4. 动态全维切片
        indices = [slice(None)] * tensor.ndim
        indices[dim] = slice(start, end)
        sliced_tensor = tensor[tuple(indices)]
        
        # 5. 输出组装
        if split_to_list:
            tensors_list = list(torch.split(sliced_tensor, 1, dim=dim))
            if is_dict:
                result = [{"samples": t} for t in tensors_list]
            else:
                result = tensors_list
        else:
            if is_dict:
                result = data.copy()
                result["samples"] = sliced_tensor
            else:
                result = sliced_tensor

        return (result,)


# ================= 💉 通用张量精准替换节点 (Tensor Replacer) =================
class TensorReplacer:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "target_data": (any_type, {"tooltip": "被替换的原始数据"}),
                "replacement_data": (any_type, {"tooltip": "用来替换的数据(支持单块或列表)"}),
                "slice_dim": ("INT", {"default": 0, "min": -10, "max": 10, "step": 1, "tooltip": "替换发生在哪一维"}),
                "start_index": ("INT", {"default": 0, "min": -100000, "max": 100000, "step": 1, "tooltip": "从原始数据的哪个索引开始替换 (支持负数)"}),
                "reverse_replace": ("BOOLEAN", {"default": False, "tooltip": "True为游标向左替换"}),
            }
        }
    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("data",)
    FUNCTION = "replace"
    CATEGORY = "Data_Tool/Data_Tensor"

    def replace(self, target_data, replacement_data, slice_dim, start_index, reverse_replace):
        # 1. 目标数据剥壳与拷贝
        is_target_dict = isinstance(target_data, dict) and "samples" in target_data
        target_tensor = target_data["samples"].clone() if is_target_dict else target_data.clone()
        
        if not isinstance(target_tensor, torch.Tensor):
            return (target_data,)

        # 2. 强力防呆校验一：切片维度是否越界
        ndim_tgt = target_tensor.ndim
        if slice_dim >= ndim_tgt or slice_dim < -ndim_tgt:
            raise ValueError(f"张量替换错误: 设定的替换维度 {slice_dim} 超出了目标张量的总维度数 {ndim_tgt}！")
        dim = slice_dim if slice_dim >= 0 else ndim_tgt + slice_dim

        # 3. 替换数据预处理 (处理List或Dict组合为整块Tensor)
        if isinstance(replacement_data, list):
            repl_tensors = [r["samples"] if (isinstance(r, dict) and "samples" in r) else r for r in replacement_data]
            # 提前校验列表内张量的维度，防止 cat 报错
            if repl_tensors[0].ndim != ndim_tgt:
                raise ValueError(f"张量替换错误: 维度数量不匹配！目标张量为 {ndim_tgt} 维，替换列表内张量为 {repl_tensors[0].ndim} 维。")
            repl_tensor = torch.cat(repl_tensors, dim=dim)
        else:
            repl_tensor = replacement_data["samples"] if (isinstance(replacement_data, dict) and "samples" in replacement_data) else replacement_data

        if not isinstance(repl_tensor, torch.Tensor):
            return (target_data,)

        # 4. 强力防呆校验二：总维度数校验
        if ndim_tgt != repl_tensor.ndim:
            raise ValueError(f"张量替换错误: 维度数量不匹配！目标张量为 {ndim_tgt} 维，替换张量为 {repl_tensor.ndim} 维。")

        # 5. 强力防呆校验三：除替换维度外的其它空间形状是否完全一致
        tgt_shape = list(target_tensor.shape)
        repl_shape = list(repl_tensor.shape)
        tgt_shape.pop(dim)
        repl_shape.pop(dim)
        
        if tgt_shape != repl_shape:
            raise ValueError(f"张量替换错误: 除替换维度外，其他空间形状不一致！基础张量其余形状为 {tgt_shape}，替换张量其余形状为 {repl_shape}。")

        # 6. 索引与边界计算
        total_len = target_tensor.shape[dim]
        repl_len = repl_tensor.shape[dim]
        
        start = start_index if start_index >= 0 else total_len + start_index
        if reverse_replace:
            start = start - repl_len + 1
            
        start = max(0, start)
        end = min(total_len, start + repl_len)
        actual_repl_len = end - start
        
        if actual_repl_len <= 0:
            return (target_data,)

        # 7. 动态切片赋值
        indices_tgt = [slice(None)] * target_tensor.ndim
        indices_tgt[dim] = slice(start, end)
        
        indices_repl = [slice(None)] * repl_tensor.ndim
        indices_repl[dim] = slice(0, actual_repl_len)
        
        target_tensor[tuple(indices_tgt)] = repl_tensor[tuple(indices_repl)]

        # 8. 装壳返回
        if is_target_dict:
            result = target_data.copy()
            result["samples"] = target_tensor
        else:
            result = target_tensor

        return (result,)


# ================= 🗂️ 张量升维折叠节点 (Tensor Folder) =================
class TensorFolder:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "data": (any_type, {"tooltip": "输入张量 (Tensor/Mask/Latent均可)"}),
                "target_dim": ("INT", {"default": 0, "min": -10, "max": 10, "step": 1, "tooltip": "要提取/折叠的目标维度 (例如 0 代表第一维)"}),
                "new_length": ("INT", {"default": 1, "min": 1, "max": 100000, "step": 1, "tooltip": "升维后，新维度的固定长度"}),
                "interleaved": ("BOOLEAN", {"default": True, "tooltip": "True(交织排列 0,1,2,3)；False(顺序硬切 0~19)"}),
                "output_as_list": ("BOOLEAN", {"default": False, "tooltip": "True: 输出降一级的张量列表；False: 输出升维后的完整大张量"}),
            }
        }
    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("data",)
    FUNCTION = "process"
    CATEGORY = "Data_Tool/Data_Tensor"

    def process(self, data, target_dim, new_length, interleaved, output_as_list):
        # 1. 自动剥壳 (Latent)
        is_dict = isinstance(data, dict) and "samples" in data
        tensor = data["samples"] if is_dict else data

        if not isinstance(tensor, torch.Tensor):
            print("TensorFolder: 输入数据非Tensor，原样返回。")
            return (data,)

        # 处理负数维度索引
        if target_dim < 0:
            target_dim += tensor.ndim

        # 2. 你的核心算法：计算组数与长度
        N = tensor.shape[target_dim]
        L = new_length
        K = N // L
        
        # 安全防御：如果不能整除，丢弃尾部多余数据
        if K * L != N:
            print(f"⚠️[TensorFolder警告] 维度长度 {N} 无法被新长度 {L} 整除。将截断末尾 {N - K*L} 个数据！")
            indices = [slice(None)] * tensor.ndim
            indices[target_dim] = slice(0, K * L)
            tensor = tensor[tuple(indices)]

        # 3. 动态重塑 (Reshape & Transpose)
        shape_before = list(tensor.shape[:target_dim])
        shape_after = list(tensor.shape[target_dim+1:])
        
        if not interleaved:
            # 顺序硬切: 直接在内存中切断 [..., K, L, ...]
            new_shape = shape_before + [K, L] + shape_after
            reshaped = tensor.reshape(new_shape)
        else:
            # 交织排列: 先生成 [..., L, K, ...] 再做物理维度交换转置为 [..., K, L, ...]
            temp_shape = shape_before + [L, K] + shape_after
            reshaped = tensor.reshape(temp_shape)
            # 转置后必须调用 contiguous() 重组内存连续性
            reshaped = reshaped.transpose(target_dim, target_dim + 1).contiguous()

        # 4. 根据开关决定输出格式
        if output_as_list:
            # 拆分为 K 个长度为 L 的张量列表
            tensors_list = list(torch.unbind(reshaped, dim=target_dim))
            if is_dict:
                result =[{"samples": t} for t in tensors_list]
            else:
                result = tensors_list
        else:
            # 输出一个完整的高维张量
            if is_dict:
                result = data.copy()
                result["samples"] = reshaped
            else:
                result = reshaped

        return (result,)


NODE_CLASS_MAPPINGS = {
    "TensorExtractor": TensorExtractor,
    "TensorReplacer": TensorReplacer,
    "TensorFolder": TensorFolder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TensorExtractor": "✂️ 张量提取 Tensor Extractor",
    "TensorReplacer": "💉 张量替换 Tensor Replacer",
    "TensorFolder": "🗂️ 张量折叠 Tensor Folder",
}