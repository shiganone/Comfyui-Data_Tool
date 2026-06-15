window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.ZH, {
    "SaveNLFPose": {
        title: "💾 保存 NLF Pose",
        widgets: { "filename_prefix": "文件名/路径前缀" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💾 节点功能说明</h3>
    将骨骼数据序列化为标准的 JSON 格式文件。<br>
    <b>输入</b><br>nlf_poses：需要保存的骨骼数据。<br>
    <b>输出</b><br>NLFPRED：原样输出的数据流。<br>
    <b>参数</b><br>
    • <b>文件名/路径前缀</b>: 保存的文件名，默认保存到output/nlfpose_data文件夹。若输入 文件夹名/文件名，将自动在nlfpose_data文件夹下寻找或创建名为 文件夹名 的子文件夹并存入文件，支持多层子文件夹。若输入绝对路径，则直接在绝对路径保存文件。
</div>`
    },
    "SaveKeypoints": {
        title: "💾 保存 Keypoints",
        widgets: { "filename_prefix": "文件名/路径前缀" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💾 节点功能说明</h3>
    将骨骼数据序列化为标准的 JSON 格式文件。<br>
    <b>输入</b><br>keypoints：需要保存的骨骼数据。<br>
    <b>输出</b><br>POSE_KEYPOINTS：原样输出的数据流。<br>
    <b>参数</b><br>
    • <b>文件名/路径前缀</b>: 保存的文件名，默认保存到output/keypoints_data文件夹。若输入 文件夹名/文件名，将自动在keypoints_data文件夹下寻找或创建名为 文件夹名 的子文件夹并存入文件，支持多层子文件夹。若输入绝对路径，则直接在绝对路径保存文件。
</div>`
    },
    "SaveImageBinTensor": {
        title: "💾 保存图像 (二进制张量)",
        widgets: {
            "filename_prefix": "文件名/路径前缀",
            "precision": "精度",
            "use_blosc": "开启Blosc",
            "use_zstd": "开启Zstd",
            "zstd_level": "Zstd等级",
            "max_chunk_mb": "单批次体积(MB)"
        },
        slot_labels: { "images": "图像", "IMAGE": "图像" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💾 节点功能说明</h3>
    将图像批次保存为.pkl格式的二进制张量。<br>
    <b>输入</b><br>图像：需要保存的图像批次。<br>
    <b>输出</b><br>图像：原样输出的图像数据流。<br>
    <b>参数</b><br>
    • <b>文件名/路径前缀</b>: 保存的文件名，默认保存到output/image_bin_tensor_data文件夹。若输入 文件夹名/文件名，将自动在image_bin_tensor_data文件夹下寻找或创建名为 文件夹名 的子文件夹并存入文件，支持多层子文件夹。若输入绝对路径，则直接在绝对路径保存文件。<br>
    • <b>精度</b>: 保存张量的精度。精度越低体积越小，但是数据有损。对于图像，8位（uint8）是无损的。<br>
    • <b>开启Blosc</b>: 使用Blosc库洗牌内存。若开启Zstd，则叠加Zstd算法进行压缩，否则使用默认压缩算法。<br>
    • <b>开启Zstd</b>: 使用Zstd压缩算法。<br>
    • <b>Zstd等级</b>: Zstd 的压缩级别（1-22），Zstd与Blosc同时开启时最大为9。过大会导致速度变慢，推荐3。<br>
    • <b>单批次体积(MB)</b>: 每批次压缩体积上限。防止超出压缩算法单次上限，或者压缩时占用内存过大。
</div>`
    },
    "SaveMaskBinTensor": {
        title: "💾 保存遮罩 (二进制张量)",
        widgets: {
            "filename_prefix": "文件名/路径前缀",
            "precision": "精度",
            "use_blosc": "开启Blosc",
            "use_zstd": "开启Zstd",
            "zstd_level": "Zstd等级",
            "max_chunk_mb": "单批次体积(MB)"
        },
        slot_labels: { "mask": "遮罩", "MASK": "遮罩" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💾 节点功能说明</h3>
    将遮罩批次保存为.pkl格式的二进制张量。<br>
    <b>输入</b><br>遮罩：需要保存的遮罩批次。<br>
    <b>输出</b><br>遮罩：原样输出的遮罩数据流。<br>
    <b>参数</b><br>
    • <b>文件名/路径前缀</b>: 保存的文件名，默认保存到output/mask_bin_tensor_data文件夹。若输入 文件夹名/文件名，将自动在mask_bin_tensor_data文件夹下寻找或创建名为 文件夹名 的子文件夹并存入文件，支持多层子文件夹。若输入绝对路径，则直接在绝对路径保存文件。<br>
    • <b>精度</b>: 保存张量的精度。精度越低体积越小，但是数据有损。对于有透明度变化的遮罩，8位（uint8）是无损的；对于二值化遮罩，布尔（boolean）是无损的。<br>
    • <b>开启Blosc</b>: 使用Blosc库洗牌内存。若开启Zstd，则叠加Zstd算法进行压缩，否则使用默认压缩算法。<br>
    • <b>开启Zstd</b>: 使用Zstd压缩算法。<br>
    • <b>Zstd等级</b>: Zstd 的压缩级别（1-22），Zstd与Blosc同时开启时最大为9。过大会导致速度变慢，推荐3。<br>
    • <b>单批次体积(MB)</b>: 每批次压缩体积上限。防止超出压缩算法单次上限，或者压缩时占用内存过大。
</div>`
    },
    "SaveLatentBinTensor": {
        title: "💾 保存 Latent (二进制张量)",
        widgets: {
            "filename_prefix": "文件名/路径前缀",
            "use_blosc": "开启Blosc",
            "use_zstd": "开启Zstd",
            "zstd_level": "Zstd等级",
            "max_chunk_mb": "单批次体积(MB)"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💾 节点功能说明</h3>
    将Latent批次保存为.pkl格式的二进制张量。<br>
    <b>输入</b><br>Latent：需要保存的Latent批次。<br>
    <b>输出</b><br>LATENT：原样输出的Latent数据流。<br>
    <b>参数</b><br>
    • <b>文件名/路径前缀</b>: 保存的文件名，默认保存到output/latent_bin_tensor_data文件夹。若输入 文件夹名/文件名，将自动在latent_bin_tensor_data文件夹下寻找或创建名为 文件夹名 的子文件夹并存入文件，支持多层子文件夹。若输入绝对路径，则直接在绝对路径保存文件。<br>
    • <b>开启Blosc</b>: 使用Blosc库洗牌内存。若开启Zstd，则叠加Zstd算法进行压缩，否则使用默认压缩算法。<br>
    • <b>开启Zstd</b>: 使用Zstd压缩算法。<br>
    • <b>Zstd等级</b>: Zstd 的压缩级别（1-22），Zstd与Blosc同时开启时最大为9。过大会导致速度变慢，推荐3。<br>
    • <b>单批次体积(MB)</b>: 每批次压缩体积上限。防止超出压缩算法单次上限，或者压缩时占用内存过大。
</div>`
    },
    "LoadNLFPose": {
        title: "📂 加载 NLF Pose",
        widgets: {
            "pose_file": "文件",
            "absolute_path": "绝对路径",
            "frame_start_index": "起始索引",
            "frame_count": "加载长度",
            "reverse_direction": "反向提取"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📂 节点功能说明</h3>
    加载保存的NLF Pose的.json文件。<br>
    <b>输出</b><br>NLFPRED：加载的批次。<br>
    <b>参数</b><br>
    • <b>文件</b>: 下拉菜单选择文件，自动扫描 input/nlfpose_data和output/nlfpose_data 文件夹内的所有合法文件。<br>
    • <b>绝对路径</b>: 若在此处填写带盘符的绝对路径，节点将无视文件下拉菜单的选项，强行从此绝对路径读取。若路径无效则打印警告并自动回退。<br>
    • <b>起始索引</b>: 加载批次的起始索引。支持负数，负数为反向查找索引（如 -1 为最后1帧）。<br>
    • <b>加载长度</b>: 要加载的长度。设为 0 代表直接读取到末尾。<br>
    • <b>反向提取</b>: 开启后，从起始索引向前倒推加载选定长度的帧（如起始索引5，长度3，反向切割则截取3、4、5）。
</div>`
    },
    "LoadKeypoints": {
        title: "📂 加载 Keypoints",
        widgets: {
            "keypoints_file": "文件",
            "absolute_path": "绝对路径",
            "frame_start_index": "起始索引",
            "frame_count": "加载长度",
            "reverse_direction": "反向提取"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📂 节点功能说明</h3>
    加载保存的Keypoint的.json文件。<br>
    <b>输出</b><br>POSE_KEYPOINTS：加载的批次。<br>
    <b>参数</b><br>
    • <b>文件</b>: 下拉菜单选择文件，自动扫描 input/keypoints_data和output/keypoints_data 文件夹内的所有合法文件。<br>
    • <b>绝对路径</b>: 若在此处填写带盘符的绝对路径，节点将无视文件下拉菜单的选项，强行从此绝对路径读取。若路径无效则打印警告并自动回退。<br>
    • <b>起始索引</b>: 加载批次的起始索引。支持负数，负数为反向查找索引（如 -1 为最后1帧）。<br>
    • <b>加载长度</b>: 要加载的长度。设为 0 代表直接读取到末尾。<br>
    • <b>反向提取</b>: 开启后，从起始索引向前倒推加载选定长度的帧（如起始索引5，长度3，反向切割则截取3、4、5）。
</div>`
    },
    "LoadImageBinTensor": {
        title: "📂 加载图像 (二进制张量)",
        widgets: {
            "image_file": "文件",
            "absolute_path": "绝对路径",
            "frame_start_index": "起始索引",
            "frame_count": "加载长度",
            "reverse_direction": "反向提取"
        },
        slot_labels: { "IMAGE": "图像" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📂 节点功能说明</h3>
    加载保存的图像二进制张量.pkl文件。<br>
    <b>输出</b><br>图像：加载的批次。<br>
    <b>参数</b><br>
    • <b>文件</b>: 下拉菜单选择文件，自动扫描 input/image_bin_tensor_data和output/image_bin_tensor_data 文件夹内的所有合法文件。<br>
    • <b>绝对路径</b>: 若在此处填写带盘符的绝对路径，节点将无视文件下拉菜单的选项，强行从此绝对路径读取。若路径无效则打印警告并自动回退。<br>
    • <b>起始索引</b>: 加载批次的起始索引。支持负数，负数为反向查找索引（如 -1 为最后1帧）。<br>
    • <b>加载长度</b>: 要加载的长度。设为 0 代表直接读取到末尾。<br>
    • <b>反向提取</b>: 开启后，从起始索引向前倒推加载选定长度的帧（如起始索引5，长度3，反向切割则截取3、4、5）。
</div>`
    },
    "LoadMaskBinTensor": {
        title: "📂 加载遮罩 (二进制张量)",
        widgets: {
            "mask_file": "文件",
            "absolute_path": "绝对路径",
            "frame_start_index": "起始索引",
            "frame_count": "加载长度",
            "reverse_direction": "反向提取"
        },
        slot_labels: { "MASK": "遮罩" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📂 节点功能说明</h3>
    加载保存的遮罩二进制张量.pkl文件。<br>
    <b>输出</b><br>遮罩：加载的批次。<br>
    <b>参数</b><br>
    • <b>文件</b>: 下拉菜单选择文件，自动扫描 input/mask_bin_tensor_data和output/mask_bin_tensor_data 文件夹内的所有合法文件。<br>
    • <b>绝对路径</b>: 若在此处填写带盘符的绝对路径，节点将无视文件下拉菜单的选项，强行从此绝对路径读取。若路径无效则打印警告并自动回退。<br>
    • <b>起始索引</b>: 加载批次的起始索引。支持负数，负数为反向查找索引（如 -1 为最后1帧）。<br>
    • <b>加载长度</b>: 要加载的长度。设为 0 代表直接读取到末尾。<br>
    • <b>反向提取</b>: 开启后，从起始索引向前倒推加载选定长度的帧（如起始索引5，长度3，反向切割则截取3、4、5）。
</div>`
    },
    "LoadLatentBinTensor": {
        title: "📂 加载 Latent (二进制张量)",
        widgets: {
            "latent_file": "文件",
            "absolute_path": "绝对路径",
            "frame_start_index": "起始索引",
            "frame_count": "加载长度",
            "reverse_direction": "反向提取"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📂 节点功能说明</h3>
    加载保存的Latent二进制张量.pkl文件。<br>
    <b>输出</b><br>LATENT：加载的批次。<br>
    <b>参数</b><br>
    • <b>文件</b>: 下拉菜单选择文件，自动扫描 input/latent_bin_tensor_data和output/latent_bin_tensor_data 文件夹内的所有合法文件。<br>
    • <b>绝对路径</b>: 若在此处填写带盘符的绝对路径，节点将无视文件下拉菜单的选项，强行从此绝对路径读取。若路径无效则打印警告并自动回退。<br>
    • <b>起始索引</b>: 加载批次的起始索引。支持负数，负数为反向查找索引（如 -1 为最后1帧）。<br>
    • <b>加载长度</b>: 要加载的长度。设为 0 代表直接读取到末尾。<br>
    • <b>反向提取</b>: 开启后，从起始索引向前倒推加载选定长度的帧（如起始索引5，长度3，反向切割则截取3、4、5）。
</div>`
    },
});