window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.EN, {
    "SaveNLFPose": {
        title: "💾 Save NLF Pose",
        widgets: { "filename_prefix": "Filename / Path Prefix" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💾 Node Functionality</h3>
    Serializes skeleton data into standard JSON format files.<br>
    <b>Inputs</b><br>nlf_poses: Skeleton data to save.<br>
    <b>Outputs</b><br>NLFPRED: Unchanged output data stream.<br>
    <b>Parameters</b><br>
    • <b>Filename / Path Prefix</b>: Default saves to output/nlfpose_data. Input 'Folder/File' to auto-create subfolders. Input absolute path to save directly to that path.
</div>`
    },
    "SaveKeypoints": {
        title: "💾 Save Keypoints",
        widgets: { "filename_prefix": "Filename / Path Prefix" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💾 Node Functionality</h3>
    Serializes skeleton data into standard JSON format files.<br>
    <b>Inputs</b><br>keypoints: Skeleton data to save.<br>
    <b>Outputs</b><br>POSE_KEYPOINTS: Unchanged output data stream.<br>
    <b>Parameters</b><br>
    • <b>Filename / Path Prefix</b>: Default saves to output/keypoints_data. Input 'Folder/File' to auto-create subfolders. Input absolute path to save directly to that path.
</div>`
    },
    "SaveImageBinTensor": {
        title: "💾 Save Image (Bin Tensor)",
        widgets: {
            "filename_prefix": "Filename / Path Prefix",
            "precision": "Precision",
            "use_blosc": "Use Blosc",
            "use_zstd": "Use Zstd",
            "zstd_level": "Zstd Level",
            "max_chunk_mb": "Max Chunk Size(MB)"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💾 Node Functionality</h3>
    Serializes image batches into .pkl format binary tensors.<br>
    <b>Inputs</b><br>images: Image batch to save.<br>
    <b>Outputs</b><br>IMAGE: Unchanged output image data stream.<br>
    <b>Parameters</b><br>
    • <b>Filename / Path Prefix</b>: Default saves to output/image_bin_tensor_data. Input 'Folder/File' to auto-create subfolders. Input absolute path to save directly to that path.<br>
    • <b>Precision</b>: Tensor precision. Lower precision reduces size but is lossy. For images, 8-bit (uint8) is lossless.<br>
    • <b>Use Blosc</b>: Use Blosc library to shuffle memory. If Zstd is enabled, overlays Zstd algorithm for compression.<br>
    • <b>Use Zstd</b>: Use Zstd compression algorithm.<br>
    • <b>Zstd Level</b>: Zstd compression level (1-22). Max is 9 when Blosc is enabled. Too high causes slow speeds, 3 is recommended.<br>
    • <b>Max Chunk Size(MB)</b>: Max size limit per chunk to prevent OOM or algorithm limits.
</div>`
    },
    "SaveMaskBinTensor": {
        title: "💾 Save Mask (Bin Tensor)",
        widgets: {
            "filename_prefix": "Filename / Path Prefix",
            "precision": "Precision",
            "use_blosc": "Use Blosc",
            "use_zstd": "Use Zstd",
            "zstd_level": "Zstd Level",
            "max_chunk_mb": "Max Chunk Size(MB)"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💾 Node Functionality</h3>
    Serializes mask batches into .pkl format binary tensors.<br>
    <b>Inputs</b><br>mask: Mask batch to save.<br>
    <b>Outputs</b><br>MASK: Unchanged output mask data stream.<br>
    <b>Parameters</b><br>
    • <b>Filename / Path Prefix</b>: Default saves to output/mask_bin_tensor_data. Input 'Folder/File' to auto-create subfolders. Input absolute path to save directly to that path.<br>
    • <b>Precision</b>: Tensor precision. Lower precision reduces size but is lossy. For masks with alpha, 8-bit (uint8) is lossless; for binary masks, boolean is lossless.<br>
    • <b>Use Blosc</b>: Use Blosc library to shuffle memory. If Zstd is enabled, overlays Zstd algorithm for compression.<br>
    • <b>Use Zstd</b>: Use Zstd compression algorithm.<br>
    • <b>Zstd Level</b>: Zstd compression level (1-22). Max is 9 when Blosc is enabled. Too high causes slow speeds, 3 is recommended.<br>
    • <b>Max Chunk Size(MB)</b>: Max size limit per chunk to prevent OOM or algorithm limits.
</div>`
    },
    "SaveLatentBinTensor": {
        title: "💾 Save Latent (Bin Tensor)",
        widgets: {
            "filename_prefix": "Filename / Path Prefix",
            "use_blosc": "Use Blosc",
            "use_zstd": "Use Zstd",
            "zstd_level": "Zstd Level",
            "max_chunk_mb": "Max Chunk Size(MB)"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💾 Node Functionality</h3>
    Serializes Latent batches into .pkl format binary tensors.<br>
    <b>Inputs</b><br>latent: Latent batch to save.<br>
    <b>Outputs</b><br>LATENT: Unchanged output Latent data stream.<br>
    <b>Parameters</b><br>
    • <b>Filename / Path Prefix</b>: Default saves to output/latent_bin_tensor_data. Input 'Folder/File' to auto-create subfolders. Input absolute path to save directly to that path.<br>
    • <b>Use Blosc</b>: Use Blosc library to shuffle memory. If Zstd is enabled, overlays Zstd algorithm for compression.<br>
    • <b>Use Zstd</b>: Use Zstd compression algorithm.<br>
    • <b>Zstd Level</b>: Zstd compression level (1-22). Max is 9 when Blosc is enabled. Too high causes slow speeds, 3 is recommended.<br>
    • <b>Max Chunk Size(MB)</b>: Max size limit per chunk to prevent OOM or algorithm limits.
</div>`
    },
    "LoadNLFPose": {
        title: "📂 Load NLF Pose",
        widgets: {
            "pose_file": "File",
            "absolute_path": "Absolute Path",
            "frame_start_index": "Start Index",
            "frame_count": "Load Length",
            "reverse_direction": "Reverse Extract"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📂 Node Functionality</h3>
    Loads saved NLF Pose .json files.<br>
    <b>Outputs</b><br>NLFPRED: Loaded batch.<br>
    <b>Parameters</b><br>
    • <b>File</b>: Dropdown menu to select file, auto-scans input/nlfpose_data and output/nlfpose_data.<br>
    • <b>Absolute Path</b>: If filled with an absolute path, this node ignores the dropdown menu and reads directly from this path. Prints warning and auto-fallbacks if invalid.<br>
    • <b>Start Index</b>: Starting frame to load. Supports negative indexing (e.g., -1 is the last frame).<br>
    • <b>Load Length</b>: Length to load. 0 means loading to the end.<br>
    • <b>Reverse Extract</b>: If enabled, extracts backward from the start index for the specified length.
</div>`
    },
    "LoadKeypoints": {
        title: "📂 Load Keypoints",
        widgets: {
            "keypoints_file": "File",
            "absolute_path": "Absolute Path",
            "frame_start_index": "Start Index",
            "frame_count": "Load Length",
            "reverse_direction": "Reverse Extract"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📂 Node Functionality</h3>
    Loads saved Keypoint .json files.<br>
    <b>Outputs</b><br>POSE_KEYPOINTS: Loaded batch.<br>
    <b>Parameters</b><br>
    • <b>File</b>: Dropdown menu to select file, auto-scans input/keypoints_data and output/keypoints_data.<br>
    • <b>Absolute Path</b>: If filled with an absolute path, this node ignores the dropdown menu and reads directly from this path. Prints warning and auto-fallbacks if invalid.<br>
    • <b>Start Index</b>: Starting frame to load. Supports negative indexing (e.g., -1 is the last frame).<br>
    • <b>Load Length</b>: Length to load. 0 means loading to the end.<br>
    • <b>Reverse Extract</b>: If enabled, extracts backward from the start index for the specified length.
</div>`
    },
    "LoadImageBinTensor": {
        title: "📂 Load Image (Bin Tensor)",
        widgets: {
            "image_file": "File",
            "absolute_path": "Absolute Path",
            "frame_start_index": "Start Index",
            "frame_count": "Load Length",
            "reverse_direction": "Reverse Extract"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📂 Node Functionality</h3>
    Loads saved image binary tensor .pkl files.<br>
    <b>Outputs</b><br>IMAGE: Loaded batch.<br>
    <b>Parameters</b><br>
    • <b>File</b>: Dropdown menu to select file, auto-scans input/image_bin_tensor_data and output/image_bin_tensor_data.<br>
    • <b>Absolute Path</b>: If filled with an absolute path, this node ignores the dropdown menu and reads directly from this path. Prints warning and auto-fallbacks if invalid.<br>
    • <b>Start Index</b>: Starting frame to load. Supports negative indexing (e.g., -1 is the last frame).<br>
    • <b>Load Length</b>: Length to load. 0 means loading to the end.<br>
    • <b>Reverse Extract</b>: If enabled, extracts backward from the start index for the specified length.
</div>`
    },
    "LoadMaskBinTensor": {
        title: "📂 Load Mask (Bin Tensor)",
        widgets: {
            "mask_file": "File",
            "absolute_path": "Absolute Path",
            "frame_start_index": "Start Index",
            "frame_count": "Load Length",
            "reverse_direction": "Reverse Extract"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📂 Node Functionality</h3>
    Loads saved mask binary tensor .pkl files.<br>
    <b>Outputs</b><br>MASK: Loaded batch.<br>
    <b>Parameters</b><br>
    • <b>File</b>: Dropdown menu to select file, auto-scans input/mask_bin_tensor_data and output/mask_bin_tensor_data.<br>
    • <b>Absolute Path</b>: If filled with an absolute path, this node ignores the dropdown menu and reads directly from this path. Prints warning and auto-fallbacks if invalid.<br>
    • <b>Start Index</b>: Starting frame to load. Supports negative indexing (e.g., -1 is the last frame).<br>
    • <b>Load Length</b>: Length to load. 0 means loading to the end.<br>
    • <b>Reverse Extract</b>: If enabled, extracts backward from the start index for the specified length.
</div>`
    },
    "LoadLatentBinTensor": {
        title: "📂 Load Latent (Bin Tensor)",
        widgets: {
            "latent_file": "File",
            "absolute_path": "Absolute Path",
            "frame_start_index": "Start Index",
            "frame_count": "Load Length",
            "reverse_direction": "Reverse Extract"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📂 Node Functionality</h3>
    Loads saved latent binary tensor .pkl files.<br>
    <b>Outputs</b><br>LATENT: Loaded batch.<br>
    <b>Parameters</b><br>
    • <b>File</b>: Dropdown menu to select file, auto-scans input/latent_bin_tensor_data and output/latent_bin_tensor_data.<br>
    • <b>Absolute Path</b>: If filled with an absolute path, this node ignores the dropdown menu and reads directly from this path. Prints warning and auto-fallbacks if invalid.<br>
    • <b>Start Index</b>: Starting frame to load. Supports negative indexing (e.g., -1 is the last frame).<br>
    • <b>Load Length</b>: Length to load. 0 means loading to the end.<br>
    • <b>Reverse Extract</b>: If enabled, extracts backward from the start index for the specified length.
</div>`
    },
});