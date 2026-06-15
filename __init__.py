import os
import sys
import importlib
import subprocess
import folder_paths
import server
from aiohttp import web

# --- 🌟 智能环境依赖自动安装引擎 🌟 ---
def ensure_package(package_name, import_name=None):
    if import_name is None: import_name = package_name
    try:
        importlib.import_module(import_name)
    except ImportError:
        print(f"\n[Data_Tool] 未检测到 {package_name}，正在启动智能安装策略...")
        py_version = f"cp{sys.version_info.major}{sys.version_info.minor}"
        current_dir = os.path.dirname(os.path.abspath(__file__))
        wheel_dir = os.path.join(current_dir, "wheel", package_name)
        
        wheel_path = None
        if os.path.exists(wheel_dir):
            for f in os.listdir(wheel_dir):
                if f.endswith(".whl") and py_version in f:
                    wheel_path = os.path.join(wheel_dir, f)
                    break
        
        try:
            if wheel_path:
                print(f"[Data_Tool] 命中本地环境 Python {sys.version_info.major}.{sys.version_info.minor}，离线安装: {os.path.basename(wheel_path)}")
                subprocess.check_call([sys.executable, "-m", "pip", "install", wheel_path])
            else:
                print(f"[Data_Tool] 未找到离线包，降级使用网络源安装 {package_name}...")
                subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
            print(f"[Data_Tool] {package_name} 安装成功！\n")
        except Exception as e:
            print(f"\n⚠️ [Data_Tool] {package_name} 自动安装失败，请尝试手动安装。错误信息: {e}\n")

# 启动环境护城河
ensure_package("blosc")
ensure_package("zstandard")

# 1. 初始化 IO 专用路径
for folder in ["nlfpose_data", "keypoints_data", "mask_bin_tensor_data", "image_bin_tensor_data", "latent_bin_tensor_data"]:
    os.makedirs(os.path.join(folder_paths.get_input_directory(), folder), exist_ok=True)
    os.makedirs(os.path.join(folder_paths.get_output_directory(), folder), exist_ok=True)

# 2. 建立通用的 JSON/数据上传通道
@server.PromptServer.instance.routes.post("/nlf_datatool/upload")
async def upload_io_file(request):
    post = await request.post()
    file = post.get("file")
    file_type = post.get("type", "keypoints_data")
    if file and file.filename:
        file_name = file.filename
        content = file.file.read()
        target_dir = os.path.join(folder_paths.get_input_directory(), file_type)
        with open(os.path.join(target_dir, file_name), "wb") as f:
            f.write(content)
        return web.json_response({"name": file_name, "type": file_type})
    return web.Response(status=400)

# 3. 🌟 动态反射模块化加载引擎 🌟
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# 将你拆分出的节点模块注册到这里 (格式: 相对路径字符串)
MODULES = [
    ".nodes.nodes_Data_Any",
    ".nodes.nodes_Data_Pose",
    ".nodes.nodes_Data_Save_Load",
    ".nodes.nodes_Data_Tensor",
    ".nodes.nodes_Data_Comfy"
]

for module_path in MODULES:
    try:
        # 动态导入子文件模块
        module = importlib.import_module(module_path, package=__package__)
        # 利用反射提取子文件中的字典并合并到主字典
        NODE_CLASS_MAPPINGS.update(getattr(module, "NODE_CLASS_MAPPINGS", {}))
        NODE_DISPLAY_NAME_MAPPINGS.update(getattr(module, "NODE_DISPLAY_NAME_MAPPINGS", {}))
    except Exception as e:
        print(f"⚠️ [Data_Tool] 模块加载失败: {module_path}. 错误: {e}")

WEB_DIRECTORY = "./web"
__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']