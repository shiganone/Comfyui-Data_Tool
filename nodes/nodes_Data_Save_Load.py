import os
import json
import numpy as np
import torch
import folder_paths
import comfy.model_management as mm
import pickle
from ..utils import get_file_list, make_serializable, get_new_file_path, calculate_slice_indices

offload_device = mm.unet_offload_device()


class SaveNLFPose:
    @classmethod
    def INPUT_TYPES(s): return {"required": {"nlf_poses": ("NLFPRED",), "filename_prefix": ("STRING", {"default": "3d_nlf_pose"})}}
    RETURN_TYPES = ("NLFPRED",)
    OUTPUT_NODE = True
    FUNCTION = "save"
    CATEGORY = "Data_Tool/Data_Save_Load"

    # 🔥 核心修复：加入 IS_CHANGED 魔法，强制 ComfyUI 每次点击运行都必须执行该节点，禁止缓存跳过！
    @classmethod
    def IS_CHANGED(s, **kwargs):
        return float("NaN")

    def save(self, nlf_poses, filename_prefix):
        tensors = nlf_poses['joints3d_nonparam'][0]
        data =[t.cpu().numpy().tolist() for t in tensors]
        output_dir = os.path.join(folder_paths.get_output_directory(), "nlfpose_data")
        file_path, display_path = get_new_file_path(output_dir, filename_prefix, ext=".json")
        with open(file_path, 'w') as f: json.dump({'joints3d_nonparam': [data]}, f)
        return {"ui": {"update_path": [display_path]}, "result": (nlf_poses,)}


class LoadNLFPose:
    @classmethod
    def INPUT_TYPES(s): 
        return {
            "required": {
                "pose_file": (get_file_list("nlfpose_data", ext=".json"), ),
                "absolute_path": ("STRING", {"default": "", "tooltip": "若填写带盘符的绝对路径，优先读取。若无效将打印警告并回退。"}),
                "frame_start_index": ("INT", {"default": 0, "min": -100000, "max": 100000, "step": 1}),
                "frame_count": ("INT", {"default": 0, "min": 0, "max": 100000, "step": 1}),
                "reverse_direction": ("BOOLEAN", {"default": False, "tooltip": "True为向左(前)提取"}),
            }
        }
    RETURN_TYPES = ("NLFPRED",)
    FUNCTION = "load"
    CATEGORY = "Data_Tool/Data_Save_Load"

    def load(self, pose_file, absolute_path, frame_start_index, frame_count, reverse_direction):
        abs_path = absolute_path.strip()
        file_path = None
        if abs_path:
            if os.path.isabs(abs_path) and os.path.exists(abs_path): file_path = abs_path
            else: print(f"\n⚠️ [NLF Warning] 绝对路径无效或不存在: '{abs_path}'，自动回退到下拉菜单！\n")
        
        if file_path is None:
            if pose_file == "none": raise ValueError("No NLF pose file selected.")
            pfx, rel_path = pose_file.split("/", 1)
            base_dir = folder_paths.get_input_directory() if pfx == "input" else folder_paths.get_output_directory()
            file_path = os.path.join(base_dir, "nlfpose_data", rel_path)
            
        with open(file_path, 'r') as f: data = json.load(f)
        all_frames = data['joints3d_nonparam'][0]
        
        # 🔥 调用统一时序切割算法
        s, e = calculate_slice_indices(len(all_frames), frame_start_index, frame_count, reverse_direction)
        sliced_frames = all_frames[s:e]
        
        tensors =[torch.tensor(frame, dtype=torch.float32, device=offload_device) for frame in sliced_frames]
        return ({'joints3d_nonparam':[tensors]},)


class SaveKeypoints:
    @classmethod
    def INPUT_TYPES(s): return {"required": {"keypoints": ("POSE_KEYPOINT",), "filename_prefix": ("STRING", {"default": "2d_keypoints"})}}
    RETURN_TYPES = ("POSE_KEYPOINT",)
    OUTPUT_NODE = True
    FUNCTION = "save"
    CATEGORY = "Data_Tool/Data_Save_Load"

    @classmethod
    def IS_CHANGED(s, **kwargs):
        return float("NaN")

    def save(self, keypoints, filename_prefix):
        serializable_data = make_serializable(keypoints)
        output_dir = os.path.join(folder_paths.get_output_directory(), "keypoints_data")
        file_path, display_path = get_new_file_path(output_dir, filename_prefix, ext=".json")
        with open(file_path, 'w') as f: json.dump(serializable_data, f)
        return {"ui": {"update_path": [display_path]}, "result": (keypoints,)}


class LoadKeypoints:
    @classmethod
    def INPUT_TYPES(s): 
        return {
            "required": {
                "keypoints_file": (get_file_list("keypoints_data", ext=".json"), ),
                "absolute_path": ("STRING", {"default": "", "tooltip": "若填写带盘符的绝对路径，优先读取。若无效将打印警告并回退。"}),
                "frame_start_index": ("INT", {"default": 0, "min": -100000, "max": 100000, "step": 1}),
                "frame_count": ("INT", {"default": 0, "min": 0, "max": 100000, "step": 1}),
                "reverse_direction": ("BOOLEAN", {"default": False, "tooltip": "True为向左(前)提取"}),
            }
        }
    RETURN_TYPES = ("POSE_KEYPOINT",)
    FUNCTION = "load"
    CATEGORY = "Data_Tool/Data_Save_Load"

    def load(self, keypoints_file, absolute_path, frame_start_index, frame_count, reverse_direction):
        abs_path = absolute_path.strip()
        file_path = None
        if abs_path:
            if os.path.isabs(abs_path) and os.path.exists(abs_path): file_path = abs_path
            else: print(f"\n⚠️ [NLF Warning] 绝对路径无效或不存在: '{abs_path}'，自动回退到下拉菜单！\n")
        
        if file_path is None:
            if keypoints_file == "none": raise ValueError("No Keypoints file selected.")
            pfx, rel_path = keypoints_file.split("/", 1)
            base_dir = folder_paths.get_input_directory() if pfx == "input" else folder_paths.get_output_directory()
            file_path = os.path.join(base_dir, "keypoints_data", rel_path)
        
        with open(file_path, 'r') as f: load_data = json.load(f)
        
        # 🔥 调用统一时序切割算法
        sliced_data = None
        if isinstance(load_data, list):
            s, e = calculate_slice_indices(len(load_data), frame_start_index, frame_count, reverse_direction)
            sliced_data = load_data[s:e]
        elif isinstance(load_data, dict) and "poses" in load_data:
            s, e = calculate_slice_indices(len(load_data["poses"]), frame_start_index, frame_count, reverse_direction)
            load_data["poses"] = load_data["poses"][s:e]
            sliced_data = load_data
        else:
            sliced_data = load_data

        def restore_numpy(obj):
            if isinstance(obj, dict):
                for k in['candidate', 'subset', 'hands', 'faces', 'body_score', 'hand_score', 'face_score']:
                    if k in obj and isinstance(obj[k], list):
                        obj[k] = np.array(obj[k], dtype=np.float32)
                return {k: restore_numpy(v) for k, v in obj.items()}
            elif isinstance(obj, list): return[restore_numpy(item) for item in obj]
            return obj

        return (restore_numpy(sliced_data),)


# ================= 💾 Mask 遮罩批次 IO =================
class SaveMaskBinTensor:
    @classmethod
    def INPUT_TYPES(s): 
        return {
            "required": {
                "mask": ("MASK",), 
                "filename_prefix": ("STRING", {"default": "mask_bin_tensor_data"}),
                "precision": (["float32", "float16", "uint8", "boolean"], {"default": "uint8"}),
                "use_blosc": ("BOOLEAN", {"default": True, "tooltip": "开启Blosc内存洗牌提纯"}),
                "use_zstd": ("BOOLEAN", {"default": True, "tooltip": "开启Zstd极速高压"}),
                "zstd_level": ("INT", {"default": 3, "min": 1, "max": 22, "step": 1, "tooltip": "压缩等级。1最快，22体积最小(结合Blosc时最高受限于9)"}),
                "max_chunk_mb": ("INT", {"default": 1900, "min": 500, "max": 2000, "step": 100, "tooltip": "单批次数据体积上限(MB)"}),
            }
        }
    RETURN_TYPES = ("MASK",)
    OUTPUT_NODE = True
    FUNCTION = "save"
    CATEGORY = "Data_Tool/Data_Save_Load"

    @classmethod
    def IS_CHANGED(s, **kwargs):
        return float("NaN")

    def save(self, mask, filename_prefix, precision, use_blosc, use_zstd, zstd_level, max_chunk_mb):
        output_dir = os.path.join(folder_paths.get_output_directory(), "mask_bin_tensor_data")
        file_path, display_path = get_new_file_path(output_dir, filename_prefix, ext=".pkl")
        
        save_tensor = mask.cpu()
        if "float16" in precision: save_tensor = save_tensor.half()
        elif "uint8" in precision: save_tensor = torch.round(save_tensor.clamp(0.0, 1.0) * 255.0).to(torch.uint8)
        elif "boolean" in precision: save_tensor = save_tensor > 0.5

        tensor_np = save_tensor.numpy()
        shape_info = list(tensor_np.shape)
        dtype_info = str(tensor_np.dtype)
        
        bytes_per_element = save_tensor.element_size()
        elements_per_frame = np.prod(shape_info[1:])
        bytes_per_frame = elements_per_frame * bytes_per_element
        max_chunk_bytes = max_chunk_mb * 1024 * 1024
        
        if bytes_per_frame > max_chunk_bytes:
            raise ValueError(f"单帧数据大小 ({bytes_per_frame / (1024*1024):.2f} MB) 已超限！")
            
        frames_per_chunk = max(1, int(max_chunk_bytes // bytes_per_frame))
        chunks_data =[]
        comp_algo = "none"

        for i in range(0, shape_info[0], frames_per_chunk):
            chunk = save_tensor[i:i+frames_per_chunk]
            chunk_np = chunk.numpy()
            raw_bytes = chunk_np.tobytes()

            try:
                if use_blosc and use_zstd:
                    import blosc
                    blosc_level = min(int(zstd_level), 9)
                    compressed = blosc.compress(raw_bytes, typesize=chunk_np.itemsize, clevel=blosc_level, shuffle=blosc.SHUFFLE, cname='zstd')
                    comp_algo = "blosc_zstd"
                elif use_blosc:
                    import blosc
                    blosc_level = min(int(zstd_level), 9)
                    compressed = blosc.compress(raw_bytes, typesize=chunk_np.itemsize, clevel=blosc_level, shuffle=blosc.SHUFFLE, cname='blosclz')
                    comp_algo = "blosc"
                elif use_zstd:
                    import zstandard as zstd
                    cctx = zstd.ZstdCompressor(level=int(zstd_level))
                    compressed = cctx.compress(raw_bytes)
                    comp_algo = "zstd"
                else:
                    compressed = raw_bytes
            except ImportError as e:
                if i == 0: print(f"\n⚠️ [Data Tool] 缺少压缩库 {e}，自动降级为无压缩！\n")
                compressed = raw_bytes
                comp_algo = "none"
                
            chunks_data.append(compressed)

        payload = {
            "is_chunked": True,
            "shape": shape_info,
            "dtype": dtype_info,
            "compression": comp_algo,
            "chunks": chunks_data
        }
        with open(file_path, "wb") as f:
            pickle.dump(payload, f)
            
        return {"ui": {"update_path":[display_path]}, "result": (mask,)}


class LoadMaskBinTensor:
    @classmethod
    def INPUT_TYPES(s): 
        return {
            "required": {
                "mask_file": (get_file_list("mask_bin_tensor_data", ext=".pkl"), ),
                "absolute_path": ("STRING", {"default": "", "tooltip": "若填写绝对路径，优先读取。若无效将打印警告并回退。"}),
                "frame_start_index": ("INT", {"default": 0, "min": -100000, "max": 100000, "step": 1}),
                "frame_count": ("INT", {"default": 0, "min": 0, "max": 100000, "step": 1}),
                "reverse_direction": ("BOOLEAN", {"default": False, "tooltip": "True为向左(前)提取"}),
            }
        }
    RETURN_TYPES = ("MASK",)
    FUNCTION = "load"
    CATEGORY = "Data_Tool/Data_Save_Load"

    def load(self, mask_file, absolute_path, frame_start_index, frame_count, reverse_direction):
        abs_path = absolute_path.strip()
        file_path = None
        if abs_path:
            if os.path.isabs(abs_path) and os.path.exists(abs_path): file_path = abs_path
            else: print(f"\n⚠️[NLF Warning] 绝对路径无效或不存在: '{abs_path}'，自动回退到下拉菜单！\n")
        
        if file_path is None:
            if mask_file == "none": raise ValueError("No Mask file selected.")
            pfx, rel_path = mask_file.split("/", 1)
            base_dir = folder_paths.get_input_directory() if pfx == "input" else folder_paths.get_output_directory()
            file_path = os.path.join(base_dir, "mask_bin_tensor_data", rel_path)
        
        # 🔥 原生 Pickle 读取
        with open(file_path, "rb") as f:
            payload = pickle.load(f)
        
        comp_algo = payload["compression"]
        shape = payload["shape"]
        dtype_str = payload["dtype"].replace("torch.", "")
        if dtype_str == "bool": dtype_str = "bool_"

        def decompress_chunk(c_data, algo):
            if algo in ["blosc_zstd", "blosc"]:
                import blosc
                return blosc.decompress(c_data)
            elif algo == "zstd":
                import zstandard as zstd
                dctx = zstd.ZstdDecompressor()
                return dctx.decompress(c_data)
            return c_data

        tensor_list =[]
        for chunk_data in payload.get("chunks",[]):
            decompressed = decompress_chunk(chunk_data, comp_algo)
            chunk_np = np.frombuffer(decompressed, dtype=np.dtype(dtype_str)).copy()
            chunk_np = chunk_np.reshape(-1, *shape[1:])
            # 零拷贝还原 PyTorch Tensor
            tensor_list.append(torch.from_numpy(chunk_np))
            
        mask = torch.cat(tensor_list, dim=0)
        
        if mask.dtype == torch.uint8: mask = mask.float() / 255.0
        elif mask.dtype == torch.bool: mask = mask.float()
        elif mask.dtype == torch.float16: mask = mask.float()
            
        s, e = calculate_slice_indices(mask.shape[0], frame_start_index, frame_count, reverse_direction)
        sliced_mask = mask[s:e]
        return (sliced_mask,)


# ================= 💾 Image 图像批次 IO =================
class SaveImageBinTensor:
    @classmethod
    def INPUT_TYPES(s): 
        return {
            "required": {
                "images": ("IMAGE",), 
                "filename_prefix": ("STRING", {"default": "image_bin_tensor_data"}),
                "precision": (["float32", "float16", "uint8"], {"default": "uint8"}),
                "use_blosc": ("BOOLEAN", {"default": True, "tooltip": "开启Blosc内存洗牌提纯"}),
                "use_zstd": ("BOOLEAN", {"default": True, "tooltip": "开启Zstd极速高压"}),
                "zstd_level": ("INT", {"default": 3, "min": 1, "max": 22, "step": 1, "tooltip": "压缩等级"}),
                "max_chunk_mb": ("INT", {"default": 1900, "min": 500, "max": 2000, "step": 100, "tooltip": "单批次数据体积上限(MB)"}),
            }
        }
    RETURN_TYPES = ("IMAGE",)
    OUTPUT_NODE = True
    FUNCTION = "save"
    CATEGORY = "Data_Tool/Data_Save_Load"

    @classmethod
    def IS_CHANGED(s, **kwargs):
        return float("NaN")

    def save(self, images, filename_prefix, precision, use_blosc, use_zstd, zstd_level, max_chunk_mb):
        output_dir = os.path.join(folder_paths.get_output_directory(), "image_bin_tensor_data")
        file_path, display_path = get_new_file_path(output_dir, filename_prefix, ext=".pkl")
        
        save_tensor = images.cpu()
        if "float16" in precision: 
            save_tensor = save_tensor.half()
        elif "uint8" in precision: 
            save_tensor = torch.round(save_tensor.clamp(0.0, 1.0) * 255.0).to(torch.uint8)

        tensor_np = save_tensor.numpy()
        shape_info = list(tensor_np.shape)
        dtype_info = str(tensor_np.dtype)
        
        bytes_per_element = save_tensor.element_size()
        elements_per_frame = np.prod(shape_info[1:])
        bytes_per_frame = elements_per_frame * bytes_per_element
        max_chunk_bytes = max_chunk_mb * 1024 * 1024
        
        if bytes_per_frame > max_chunk_bytes:
            raise ValueError(f"单帧数据大小 ({bytes_per_frame / (1024*1024):.2f} MB) 已超限！")
            
        frames_per_chunk = max(1, int(max_chunk_bytes // bytes_per_frame))
        chunks_data =[]
        comp_algo = "none"

        for i in range(0, shape_info[0], frames_per_chunk):
            chunk = save_tensor[i:i+frames_per_chunk]
            chunk_np = chunk.numpy()
            raw_bytes = chunk_np.tobytes()

            try:
                if use_blosc and use_zstd:
                    import blosc
                    blosc_level = min(int(zstd_level), 9)
                    compressed = blosc.compress(raw_bytes, typesize=chunk_np.itemsize, clevel=blosc_level, shuffle=blosc.SHUFFLE, cname='zstd')
                    comp_algo = "blosc_zstd"
                elif use_blosc:
                    import blosc
                    blosc_level = min(int(zstd_level), 9)
                    compressed = blosc.compress(raw_bytes, typesize=chunk_np.itemsize, clevel=blosc_level, shuffle=blosc.SHUFFLE, cname='blosclz')
                    comp_algo = "blosc"
                elif use_zstd:
                    import zstandard as zstd
                    cctx = zstd.ZstdCompressor(level=int(zstd_level))
                    compressed = cctx.compress(raw_bytes)
                    comp_algo = "zstd"
                else:
                    compressed = raw_bytes
            except ImportError as e:
                if i == 0: print(f"\n⚠️ [Data Tool] 缺少压缩库 {e}，自动降级为无压缩！\n")
                compressed = raw_bytes
                comp_algo = "none"
                
            chunks_data.append(compressed)

        payload = {
            "is_chunked": True,
            "shape": shape_info,
            "dtype": dtype_info,
            "compression": comp_algo,
            "chunks": chunks_data
        }
        with open(file_path, "wb") as f:
            pickle.dump(payload, f)
            
        return {"ui": {"update_path":[display_path]}, "result": (images,)}


class LoadImageBinTensor:
    @classmethod
    def INPUT_TYPES(s): 
        return {
            "required": {
                "image_file": (get_file_list("image_bin_tensor_data", ext=".pkl"), ),
                "absolute_path": ("STRING", {"default": "", "tooltip": "若填写绝对路径，优先读取。若无效将打印警告并回退。"}),
                "frame_start_index": ("INT", {"default": 0, "min": -100000, "max": 100000, "step": 1}),
                "frame_count": ("INT", {"default": 0, "min": 0, "max": 100000, "step": 1}),
                "reverse_direction": ("BOOLEAN", {"default": False, "tooltip": "True为向左(前)提取"}),
            }
        }
    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "load"
    CATEGORY = "Data_Tool/Data_Save_Load"

    def load(self, image_file, absolute_path, frame_start_index, frame_count, reverse_direction):
        abs_path = absolute_path.strip()
        file_path = None
        if abs_path:
            if os.path.isabs(abs_path) and os.path.exists(abs_path): file_path = abs_path
            else: print(f"\n⚠️ [NLF Warning] 绝对路径无效或不存在: '{abs_path}'，自动回退到下拉菜单！\n")
        
        if file_path is None:
            if image_file == "none": raise ValueError("No Image file selected.")
            pfx, rel_path = image_file.split("/", 1)
            base_dir = folder_paths.get_input_directory() if pfx == "input" else folder_paths.get_output_directory()
            file_path = os.path.join(base_dir, "image_bin_tensor_data", rel_path)
        
        with open(file_path, "rb") as f:
            payload = pickle.load(f)
            
        comp_algo = payload["compression"]
        shape = payload["shape"]
        dtype_str = payload["dtype"].replace("torch.", "")

        def decompress_chunk(c_data, algo):
            if algo in["blosc_zstd", "blosc"]:
                import blosc
                return blosc.decompress(c_data)
            elif algo == "zstd":
                import zstandard as zstd
                dctx = zstd.ZstdDecompressor()
                return dctx.decompress(c_data)
            return c_data

        tensor_list =[]
        for chunk_data in payload.get("chunks",[]):
            decompressed = decompress_chunk(chunk_data, comp_algo)
            chunk_np = np.frombuffer(decompressed, dtype=np.dtype(dtype_str)).copy()
            chunk_np = chunk_np.reshape(-1, *shape[1:])
            tensor_list.append(torch.from_numpy(chunk_np))
            
        images = torch.cat(tensor_list, dim=0)
        
        if images.dtype == torch.uint8: images = images.float() / 255.0
        elif images.dtype == torch.float16: images = images.float()
            
        s, e = calculate_slice_indices(images.shape[0], frame_start_index, frame_count, reverse_direction)
        sliced_images = images[s:e]
        return (sliced_images,)


# ================= 💾 Latent 潜空间批次 IO =================
class SaveLatentBinTensor:
    @classmethod
    def INPUT_TYPES(s): 
        return {
            "required": {
                "latent": ("LATENT",), 
                "filename_prefix": ("STRING", {"default": "latent_bin_tensor_data"}),
                "use_blosc": ("BOOLEAN", {"default": True, "tooltip": "开启Blosc内存洗牌提纯"}),
                "use_zstd": ("BOOLEAN", {"default": True, "tooltip": "开启Zstd极速高压"}),
                "zstd_level": ("INT", {"default": 3, "min": 1, "max": 22, "step": 1, "tooltip": "压缩等级"}),
                "max_chunk_mb": ("INT", {"default": 1900, "min": 500, "max": 2000, "step": 100, "tooltip": "单批次数据体积上限(MB)"}),
            }
        }
    RETURN_TYPES = ("LATENT",)
    OUTPUT_NODE = True
    FUNCTION = "save"
    CATEGORY = "Data_Tool/Data_Save_Load"

    @classmethod
    def IS_CHANGED(s, **kwargs):
        return float("NaN")

    def save(self, latent, filename_prefix, use_blosc, use_zstd, zstd_level, max_chunk_mb):
        output_dir = os.path.join(folder_paths.get_output_directory(), "latent_bin_tensor_data")
        file_path, display_path = get_new_file_path(output_dir, filename_prefix, ext=".pkl")
        
        save_tensor = latent["samples"].cpu()
        tensor_np = save_tensor.numpy()
        shape_info = list(tensor_np.shape)
        dtype_info = str(tensor_np.dtype)
        
        bytes_per_element = save_tensor.element_size()
        elements_per_frame = np.prod(shape_info[1:])
        bytes_per_frame = elements_per_frame * bytes_per_element
        max_chunk_bytes = max_chunk_mb * 1024 * 1024
        
        if bytes_per_frame > max_chunk_bytes:
            raise ValueError(f"单帧数据大小 ({bytes_per_frame / (1024*1024):.2f} MB) 已超限！")
            
        frames_per_chunk = max(1, int(max_chunk_bytes // bytes_per_frame))
        chunks_data =[]
        comp_algo = "none"

        for i in range(0, shape_info[0], frames_per_chunk):
            chunk = save_tensor[i:i+frames_per_chunk]
            chunk_np = chunk.numpy()
            raw_bytes = chunk_np.tobytes()

            try:
                if use_blosc and use_zstd:
                    import blosc
                    blosc_level = min(int(zstd_level), 9)
                    compressed = blosc.compress(raw_bytes, typesize=chunk_np.itemsize, clevel=blosc_level, shuffle=blosc.SHUFFLE, cname='zstd')
                    comp_algo = "blosc_zstd"
                elif use_blosc:
                    import blosc
                    blosc_level = min(int(zstd_level), 9)
                    compressed = blosc.compress(raw_bytes, typesize=chunk_np.itemsize, clevel=blosc_level, shuffle=blosc.SHUFFLE, cname='blosclz')
                    comp_algo = "blosc"
                elif use_zstd:
                    import zstandard as zstd
                    cctx = zstd.ZstdCompressor(level=int(zstd_level))
                    compressed = cctx.compress(raw_bytes)
                    comp_algo = "zstd"
                else:
                    compressed = raw_bytes
            except ImportError as e:
                if i == 0: print(f"\n⚠️ [Data Tool] 缺少压缩库 {e}，自动降级为无压缩！\n")
                compressed = raw_bytes
                comp_algo = "none"
                
            chunks_data.append(compressed)

        other_keys = {}
        for k, v in latent.items():
            if k != "samples":
                if isinstance(v, torch.Tensor):
                    v_np = v.cpu().numpy()
                    other_keys[k] = {
                        "__is_tensor": True,
                        "shape": list(v_np.shape),
                        "dtype": str(v_np.dtype),
                        "data": v_np.tobytes()
                    }
                else:
                    other_keys[k] = v

        payload = {
            "is_chunked": True,
            "shape": shape_info,
            "dtype": dtype_info,
            "compression": comp_algo,
            "chunks": chunks_data,
            "other_keys": other_keys
        }
        with open(file_path, "wb") as f:
            pickle.dump(payload, f)
            
        return {"ui": {"update_path":[display_path]}, "result": (latent,)}


class LoadLatentBinTensor:
    @classmethod
    def INPUT_TYPES(s): 
        return {
            "required": {
                "latent_file": (get_file_list("latent_bin_tensor_data", ext=".pkl"), ),
                "absolute_path": ("STRING", {"default": "", "tooltip": "若填写绝对路径，优先读取。若无效将打印警告并回退。"}),
                "frame_start_index": ("INT", {"default": 0, "min": -100000, "max": 100000, "step": 1}),
                "frame_count": ("INT", {"default": 0, "min": 0, "max": 100000, "step": 1}),
                "reverse_direction": ("BOOLEAN", {"default": False, "tooltip": "True为向左(前)提取"}),
            }
        }
    RETURN_TYPES = ("LATENT",)
    FUNCTION = "load"
    CATEGORY = "Data_Tool/Data_Save_Load"

    def load(self, latent_file, absolute_path, frame_start_index, frame_count, reverse_direction):
        abs_path = absolute_path.strip()
        file_path = None
        if abs_path:
            if os.path.isabs(abs_path) and os.path.exists(abs_path): file_path = abs_path
            else: print(f"\n⚠️ [NLF Warning] 绝对路径无效或不存在: '{abs_path}'，自动回退到下拉菜单！\n")
        
        if file_path is None:
            if latent_file == "none": raise ValueError("No Latent file selected.")
            pfx, rel_path = latent_file.split("/", 1)
            base_dir = folder_paths.get_input_directory() if pfx == "input" else folder_paths.get_output_directory()
            file_path = os.path.join(base_dir, "latent_bin_tensor_data", rel_path)
        
        with open(file_path, "rb") as f:
            payload = pickle.load(f)
            
        comp_algo = payload["compression"]
        shape = payload["shape"]
        dtype_str = payload["dtype"].replace("torch.", "")

        def decompress_chunk(c_data, algo):
            if algo in ["blosc_zstd", "blosc"]:
                import blosc
                return blosc.decompress(c_data)
            elif algo == "zstd":
                import zstandard as zstd
                dctx = zstd.ZstdDecompressor()
                return dctx.decompress(c_data)
            return c_data

        tensor_list =[]
        for chunk_data in payload.get("chunks",[]):
            decompressed = decompress_chunk(chunk_data, comp_algo)
            chunk_np = np.frombuffer(decompressed, dtype=np.dtype(dtype_str)).copy()
            chunk_np = chunk_np.reshape(-1, *shape[1:])
            tensor_list.append(torch.from_numpy(chunk_np))
            
        samples = torch.cat(tensor_list, dim=0)
        
        # 🔥 原样复原字典里的附属张量 (如 noise_mask)
        latent_out = {"samples": samples}
        for k, v in payload.get("other_keys", {}).items():
            if isinstance(v, dict) and v.get("__is_tensor"):
                sub_dtype = v["dtype"].replace("torch.", "")
                if sub_dtype == "bool": sub_dtype = "bool_"
                arr = np.frombuffer(v["data"], dtype=np.dtype(sub_dtype)).copy()
                arr = arr.reshape(v["shape"])
                latent_out[k] = torch.from_numpy(arr)
            else:
                latent_out[k] = v
                
        # 同步切割核心 samples 与可能存在的 noise_mask 批次
        s, e = calculate_slice_indices(latent_out["samples"].shape[0], frame_start_index, frame_count, reverse_direction)
        latent_out["samples"] = latent_out["samples"][s:e]
        
        if "noise_mask" in latent_out and isinstance(latent_out["noise_mask"], torch.Tensor):
            nm = latent_out["noise_mask"]
            if nm.shape[0] == shape[0]: # 安全保护
                latent_out["noise_mask"] = nm[s:e]
                
        return (latent_out,)


NODE_CLASS_MAPPINGS = {
    "SaveNLFPose": SaveNLFPose,
    "LoadNLFPose": LoadNLFPose,
    "SaveKeypoints": SaveKeypoints,
    "LoadKeypoints": LoadKeypoints,
    "SaveMaskBinTensor": SaveMaskBinTensor,
    "LoadMaskBinTensor": LoadMaskBinTensor,
    "SaveImageBinTensor": SaveImageBinTensor,
    "LoadImageBinTensor": LoadImageBinTensor,
    "SaveLatentBinTensor": SaveLatentBinTensor,
    "LoadLatentBinTensor": LoadLatentBinTensor,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SaveNLFPose": "💾 Save NLF Pose",
    "LoadNLFPose": "📂 Load NLF Pose",
    "SaveKeypoints": "💾 Save Keypoints",
    "LoadKeypoints": "📂 Load Keypoints",
    "SaveMaskBinTensor": "💾 Save Mask (Bin Tensor)",
    "LoadMaskBinTensor": "📂 Load Mask (Bin Tensor)",
    "SaveImageBinTensor": "💾 Save Image (Bin Tensor)",
    "LoadImageBinTensor": "📂 Load Image (Bin Tensor)",
    "SaveLatentBinTensor": "💾 Save Latent (Bin Tensor)",
    "LoadLatentBinTensor": "📂 Load Latent (Bin Tensor)",
}