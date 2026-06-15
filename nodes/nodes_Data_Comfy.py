from ..utils import any_type


# ================= 🔍 条件字典提取节点 (Universal Conditioning Getter) =================
class ConditioningGetter:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "conditioning": ("CONDITIONING", {"tooltip": "连入原始条件"}),
                "key_name": ("STRING", {"default": "", "tooltip": "要提取的键名"}),
            }
        }
    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("data",)
    FUNCTION = "get_value"
    CATEGORY = "Data_Tool/Data_comfy"

    def get_value(self, conditioning, key_name):
        # 遍历条件列表，寻找匹配的键名
        for t in conditioning:
            cond_dict = t[1]
            if key_name in cond_dict:
                print(f"✅[条件提取成功] 已成功提取键名: '{key_name}'")
                return (cond_dict[key_name],)
                
        print(f"⚠️ [条件提取警告] 在 Conditioning 中未找到键名: '{key_name}'")
        return (None,)

# ================= ✍️ 条件字典写入节点 (Universal Conditioning Setter) =================
class ConditioningSetter:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "conditioning": ("CONDITIONING", {"tooltip": "连入原始条件"}),
                "key_name": ("STRING", {"default": "", "tooltip": "要写入或覆盖的键名"}),
                "new_value": (any_type, {"tooltip": "要进行覆盖的新数据"}),
            }
        }
    RETURN_TYPES = ("CONDITIONING",)
    RETURN_NAMES = ("conditioning",)
    FUNCTION = "set_value"
    CATEGORY = "Data_Tool/Data_comfy"

    def set_value(self, conditioning, key_name, new_value):
        c_out =[]
        # 严格遵守 Copy 原则，防止缓存污染
        for t in conditioning:
            cond_tensor = t[0]
            cond_dict = t[1].copy()
            
            # 原地覆盖或新建键值对
            cond_dict[key_name] = new_value
            
            # 重新打包
            c_out.append([cond_tensor, cond_dict])
            
        print(f"✅ [条件写入成功] 键名 '{key_name}' 的数据已成功覆盖/写入！")
        return (c_out,)

# ================= 📦 张量/潜空间转换器 (Universal Tensor/Latent Converter) =================
class TensorLatentConverter:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "data": (any_type, {"tooltip": "输入纯张量 或 LATENT 字典"}),
                "mode": (["Tensor_To_Latent", "Latent_To_Tensor"], {"default": "Tensor_To_Latent"}),
            },
            "optional": {
                "mask": ("MASK", {"tooltip": "遮罩 (Tensor_To_Latent时压入潜空间，Latent_To_Tensor时忽略输入)"}),
            }
        }
    # 🔥 返回类型增加 MASK 输出端口
    RETURN_TYPES = (any_type, "MASK")
    RETURN_NAMES = ("data", "mask")
    FUNCTION = "convert"
    CATEGORY = "Data_Tool/Data_comfy"

    def convert(self, data, mode, mask=None):
        if mode == "Tensor_To_Latent":
            # 如果已经是字典，浅拷贝以防污染
            if isinstance(data, dict) and "samples" in data:
                result = data.copy()
            else:
                result = {"samples": data}
            
            # 🔥 如果用户连了遮罩，强行塞入 noise_mask
            if mask is not None:
                result["noise_mask"] = mask
                
            # 模式为压入时，右侧的 mask 输出通道传空值即可
            return (result, None)
            
        else:
            # Latent 到 Tensor 模式
            if isinstance(data, dict):
                out_tensor = data.get("samples", data)
                # 🔥 自动提取里面潜藏的 noise_mask 并从 mask 通道输出
                out_mask = data.get("noise_mask", None)
                return (out_tensor, out_mask)
            
            # 如果输入本身就是 Tensor（没壳），原样返回，mask 输出 None
            return (data, None)


NODE_CLASS_MAPPINGS = {
    "ConditioningGetter": ConditioningGetter,
    "ConditioningSetter": ConditioningSetter,
    "TensorLatentConverter": TensorLatentConverter,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ConditioningGetter": "🔍 条件获取 Conditioning Getter",
    "ConditioningSetter": "✍️ 条件设置 Conditioning Setter",
    "TensorLatentConverter": "🔄 Tensor Latent Converter",
}