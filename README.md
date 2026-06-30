# ComfyUI Data Tool

[简体中文](#comfyui-data-tool) | [English](#english)

这是一套为 ComfyUI 设计的用于常用数据处理的工具节点。

每个节点右上角均有“❓”按钮。点击即可展开详细的说明面板，解答各参数的功能。

启动时会自动安装 `blosc` 和 `zstandard` 这两个压缩算法包。会优先从准备好的离线包 `wheel` 文件夹寻找对应 Python 版本安装，如果没有对应版本则自动联网下载安装。

---

## 📂 节点功能目录

### 1. 通用批次操作 (Data Any)
*   **✂️ 批次截取**：从图像、遮罩、Latent 潜空间、NLF pose 或 keypoint 数据中，提取出指定范围的画面或帧。
*   **💉 批次替换**：将一个数据批次中的部分，替换为另一组新的数据。
*   **🔗 批次组合**：动态增加接口，将多个相同类型的数据批次合并拼接成一个完整的长视频序列。
*   **🎞️ 批次帧率转换**：对视频帧、遮罩、骨骼等任意时序序列，进行抽帧或补帧以改变视频帧率。

### 2. 姿态与骨骼处理 (Data Pose)
*   **📐 关键点分辨率重映射**：对 2D 骨骼分辨率进行缩放，支持拉伸、自适应画面并进行平移微调。
*   **🎯 关键点置信度修改器**：通过文本框指令，修改指定关键点的置信度，或删除指定关键点。
*   **✋ 手部关键点过滤器**：根据与手腕的距离，自动过滤和清除手部的噪点。
*   **🦶 SDPose转ViTPose脚部**：将 SDPose 的三点脚格式转换为 ViTPose 的单点脚格式。
*   **🧭 获取NLF骨骼朝向**：从 3D 骨骼数据中提取出胸腔和骨盆的旋转朝向数据。
*   **🧭 NLF朝向解析器**：将骨骼旋转的角度数据解析为易读的方向标签（如 F, B, L, R 等 26 个方向）。
*   **🧭 朝向修改器**：修改解析出的朝向标签（例如将 R 批量改为 L ），并自动进行单帧去重。
*   **🎥 通用型pose渲染**：放开对脚部点的限制，在画布或连入的背景图上渲染各种格式的keypoint数据。
*   **✏️ 通用型pose编辑**：支持多种格式的keypoint的pose编辑器。

### 3. 数据保存与加载 (Data Save Load)
*   **💾 保存 / 📂 加载 NLF Pose**：3D NLF 骨骼序列的保存与加载（标准 JSON）。
*   **💾 保存 / 📂 加载 Keypoints**：2D 骨骼序列的保存与加载（标准 JSON）。
*   **💾 保存 / 📂 加载遮罩 (二进制张量)**：遮罩数据的高压离线保存与高速加载。
*   **💾 保存 / 📂 加载图像 (二进制张量)**：图像数据的高压离线保存与高速加载。
*   **💾 保存 / 📂 加载 Latent (二进制张量)**：Latent 潜空间的高压离线保存与高速加载（可完整保留 `noise_mask` 等数据）。

### 4. 通用张量操作 (Data Tensor)
*   **✂️ 张量切片提取**：从纯张量中提取指定维度的部分数据（支持输出为列表）。
*   **💉 张量精准替换**：在纯张量的指定维度上，用新的张量数据进行覆盖替换。
*   **🗂️ 张量折叠器**：对纯张量进行重塑和升维。
*   **🎨 遮罩绘制颜色**：将输入的遮罩赋予自定义色彩，支持自定义背景图像。

### 5. ComfyUI 专用数据操作 (Data Comfy)
*   **🔍 条件字典提取**：从 ComfyUI 的条件（黄线）中提取出底层隐藏的数据。
*   **✍️ 条件字典写入**：修改或写入数据到 ComfyUI 的条件（黄线）中。
*   **🔄 张量/Latent 转换器**：在纯张量和 Latent 潜空间格式之间进行快速互转。

---

## 🛠️ 安装方法

将本仓库下载并放置到您的 `ComfyUI/custom_nodes/` 目录下，或者在 `custom_nodes` 目录下使用终端运行：
```bash
git clone https://github.com/shiganone/Comfyui-Data_Tool.git
```

---
---

# English

[简体中文](#comfyui-data-tool) | [English](#english)

A suite of utility nodes designed for common data processing in ComfyUI.

Each node features a "❓" button in the top right corner. Click it to expand a detailed help panel explaining the functions of each parameter.

Automatically installs the `blosc` and `zstandard` compression packages on startup. It prioritizes local wheel files in the `wheel` folder matching your Python version. If no matching version is found, it will automatically download and install from the network.

---

## 📂 Node Directory

### 1. Batch Data Manipulation (Data Any)
*   **✂️ Batch Data Extractor**: Extract specific ranges of frames or indexes from image, mask, latent, NLF pose, or keypoint data.
*   **💉 Batch Replacer**: Replace a portion of a data batch with another set of new data.
*   **🔗 Batch Combiner**: Dynamically add ports to merge and concatenate multiple batches of the same type into a complete long video sequence.
*   **🎞️ Batch FrameRate Converter**: Resample frames by extracting or interpolating to change the framerate of any sequence (video frames, masks, skeletons, etc.).

### 2. Pose & Skeleton Processing (Data Pose)
*   **📐 Rescale 2D Keypoints**: Scale and align 2D skeleton resolution, supporting stretch, fit, and translation adjustments.
*   **🎯 Keypoint Confidence Modifier**: Modify the confidence score of specific keypoints or delete specific keypoints via text box commands.
*   **✋ Keypoint Hand Filter**: Automatically filter and clear out hand noise based on distance from the wrist.
*   **🦶 SDPose To ViTPose Foot**: Convert SDPose 3-point feet format to ViTPose 1-point feet format.
*   **🧭 Get NLF Pose Orientation**: Extract chest and pelvis rotation orientations from 3D skeleton data.
*   **🧭 NLF Orientation Parser**: Parse skeleton rotation angles into easy-to-read direction labels (e.g., F, B, L, R, up to 26 directions).
*   **🧭 Direction Modifier**: Modify the parsed direction labels (e.g., replace all R with L) with automatic intra-frame deduplication.
*   **🎥 Universal Pose Renderer**: Remove restrictions on the number of foot and face points, and render various formats of keypoint data on a canvas or connected background image.
*   **✏️ Universal Pose Editor**: A pose editor supporting multiple keypoint formats.

### 3. Data Saving & Loading (Data Save Load)
*   **💾 Save / 📂 Load NLF Pose**: Save and load 3D NLF skeleton sequences (standard JSON).
*   **💾 Save / 📂 Load Keypoints**: Save and load 2D skeleton sequences (standard JSON).
*   **💾 Save / 📂 Load Mask (Bin Tensor)**: High-compression offline saving and fast loading of mask data.
*   **💾 Save / 📂 Load Image (Bin Tensor)**: High-compression offline saving and fast loading of image data.
*   **💾 Save / 📂 Load Latent (Bin Tensor)**: High-compression offline saving and fast loading of latent data (fully preserving attributes like `noise_mask`).

### 4. Tensor Manipulations (Data Tensor)
*   **✂️ Tensor Extractor**: Extract sliced data from raw tensors along a specific dimension (supports output as list).
*   **💉 Tensor Replacer**: Overwrite and replace raw tensor data along a specific dimension.
*   **🗂️ Tensor Folder**: Reshape and increase the dimensionality of raw tensors.
*   **🎨 Mask Draw Color**: Apply custom colors to input masks, supporting custom background images.

### 5. ComfyUI Specific Operations (Data Comfy)
*   **🔍 Conditioning Getter**: Extract underlying data from ComfyUI conditioning (yellow line).
*   **✍️ Conditioning Setter**: Modify or write data into ComfyUI conditioning (yellow line).
*   **🔄 Tensor/Latent Converter**: Fast conversion between pure Tensor and Latent space formats.

---

## 🛠️ Installation

Download and place this repository into your `ComfyUI/custom_nodes/` directory, or run the following command in the `custom_nodes` directory:
```bash
git clone https://github.com/shiganone/Comfyui-Data_Tool.git
```