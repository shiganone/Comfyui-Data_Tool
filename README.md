# ComfyUI Data Tool

[简体中文](#comfyui-data-tool) | [English](#english)

这是一个为 ComfyUI 设计的通用数据处理、骨骼姿态解析与二进制数据快速读写的综合工具箱。

*   **智能参数提示**：每个节点右上角均有“❓”按钮。点击即可展开详细的说明面板，解答各参数的功能。
*   **免配置自动依赖**：启动时会自动安装 `blosc` 和 `zstandard` 这两个压缩算法包。会优先从准备好的离线包 `wheel` 文件夹寻找对应 Python 版本安装，如果没有对应版本则自动联网下载安装。

---

## 📂 节点功能目录

### 1. 通用批次操作 (Data Any)
*   **✂️ 批次截取 (Batch Extractor)**：从图像、遮罩、Latent 潜空间或关键点数据中，提取出指定范围的画面或帧。
*   **💉 批次替换 (Batch Replacer)**：将一个数据批次中的部分画面，替换为另一组新的数据。
*   **🔗 批次组合 (Batch Combiner)**：动态增加接口，将多个相同类型的数据批次合并拼接成一个完整的长视频序列。
*   **🎞️ 帧率转换 (Batch Frame Rate Converter)**：对视频帧、遮罩、骨骼等任意时序序列，进行抽帧或补帧以改变视频帧率。

### 2. 姿态与骨骼处理 (Data Pose)
*   **📐 关键点映射 (Rescale Keypoints)**：对 2D 骨骼分辨率进行缩放，支持拉伸、自适应画面并进行平移微调。
*   **🎯 置信修改 (Keypoint Confidence Modifier)**：通过文本框指令，修改或删除指定骨骼点（如面部、手部、身体、脚部）的置信度。
*   **✋ 手部过滤 (Keypoint Hand Filter)**：根据与手腕的距离，自动过滤和清除手部的噪点。
*   **🦶 sd转vit脚 (SDPose To ViTPose Foot)**：将 SDPose 的三点脚格式转换为 ViTPose 的单点脚格式。
*   **🧭 NLF 骨骼朝向 (Pose Orientation)**：从 3D 骨骼数据中提取出胸腔和骨盆的旋转朝向数据。
*   **🧭 NLF 朝向解析 (Orientation Parser)**：将骨骼旋转的角度数据解析为易读的方向标签（如 F, B, L, R 等 26 个方向）。
*   **🧭 朝向修改 (Direction Modifier)**：修改解析出的朝向标签（例如将 R 批量改为 L ），并自动进行单帧去重。
*   **🎥 姿态渲染 (Universal Pose Renderer)**：在画布或连入的背景图上绘制并渲染各种格式的姿态骨骼图像。

### 3. 数据保存与加载 (Data Save Load)
*   **💾 Save / 📂 Load NLF Pose**：3D NLF 骨骼序列的保存与加载（标准 JSON）。
*   **💾 Save / 📂 Load Keypoints**：2D 骨骼序列的保存与加载（标准 JSON）。
*   **💾 Save / 📂 Load Mask (Bin Tensor)**：遮罩数据的高压离线保存与高速加载。
*   **💾 Save / 📂 Load Image (Bin Tensor)**：图像数据的高压离线保存与高速加载。
*   **💾 Save / 📂 Load Latent (Bin Tensor)**：Latent 潜空间的高压离线保存与高速加载（可完整保留 `noise_mask` 等数据）。

### 4. 通用张量操作 (Data Tensor)
*   **✂️ 张量提取 (Tensor Extractor)**：从纯张量中提取指定维度的部分数据（支持输出为列表）。
*   **💉 张量替换 (Tensor Replacer)**：在纯张量的指定维度上，用新的张量数据进行覆盖替换。
*   **🗂️ 张量折叠 (Tensor Folder)**：对纯张量进行重塑和升维。

### 5. ComfyUI 专用数据操作 (Data Comfy)
*   **🔍 条件获取 (Conditioning Getter)**：从 ComfyUI 的条件（黄线）中提取出底层隐藏的数据。
*   **✍️ 条件设置 (Conditioning Setter)**：修改或写入数据到 ComfyUI 的条件（黄线）中。
*   **🔄 Tensor Latent Converter**：在纯张量和 Latent 潜空间格式之间进行快速互转。

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

A comprehensive toolkit designed for ComfyUI, providing general data manipulation, pose estimation parsing, and fast binary serialization.

*   **Smart Parameter Help**: Each node has a "❓" button on the top right. Click it to expand a detailed help panel explaining the functions of each parameter.
*   **Auto Dependencies Installer**: Automatically installs the `blosc` and `zstandard` compression packages on startup. It prioritizes local wheel files in the `wheel` folder matching your Python version. If no matching version is found, it will automatically download and install from the network.

---

## 📂 Node Directory

### 1. Batch Data Manipulation (Data Any)
*   **✂️ Batch Extractor (BatchDataExtractor)**: Extract specific ranges of frames or indexes from image, mask, latent, or pose data.
*   **💉 Batch Replacer (BatchDataReplacer)**: Replace a portion of a data batch with another set of new data.
*   **🔗 Batch Combiner (BatchDataCombiner)**: Dynamically add ports to merge/concatenate multiple batches of the same type into a single video sequence.
*   **🎞️ Batch Frame Rate Converter**: Resample frames by extracting or interpolating to change the framerate of any sequence (images, masks, skeletons).

### 2. Pose & Skeleton Processing (Data Pose)
*   **📐 Rescale Keypoints**: Scale and align 2D pose coordinates (supports stretch, fit, fit height/width with grid alignments and offsets).
*   **🎯 Keypoint Confidence Modifier**: Modify or delete the confidence score of specific keypoints (face, hand, body, foot) via command box.
*   **✋ Keypoint Hand Filter**: Automatically filter out hand coordinate noise based on distance from the wrist.
*   **🦶 SDPose To ViTPose Foot**: Convert 3-point feet (SDPose) to 1-point feet (ViTPose).
*   **🧭 Pose Orientation (NLF_Pose_Orientation)**: Extract chest and pelvis rotation orientations from 3D skeleton data.
*   **🧭 Orientation Parser (NLF_Orientation_Parser)**: Parse skeleton rotation angles into easy-to-read direction labels (26 cardinal directions like F, B, L, R).
*   **🧭 Direction Modifier (NLF_Direction_Modifier)**: Modify parsed direction labels (e.g., replace all R with L) with automatic de-duplication.
*   **🎥 Universal Pose Renderer**: Render skeletons (SDPose, ViTPose, OpenPose) with lines/points on a canvas or a background image.

### 3. Data Saving & Loading (Data Save Load)
*   **💾 Save / 📂 Load NLF Pose**: Save and load 3D NLF skeletons (standard JSON).
*   **💾 Save / 📂 Load Keypoints**: Save and load 2D skeleton sequences (standard JSON).
*   **💾 Save / 📂 Load Mask (Bin Tensor)**: High-efficiency offline compression saving and fast loading of mask data.
*   **💾 Save / 📂 Load Image (Bin Tensor)**: High-efficiency offline compression saving and fast loading of image data.
*   **💾 Save / 📂 Load Latent (Bin Tensor)**: High-efficiency offline compression saving and fast loading of latent data (fully preserving attributes like `noise_mask`).

### 4. Tensor Manipulations (Data Tensor)
*   **✂️ Tensor Extractor**: Extract sliced data from raw tensors along a specific dimension (supports output as list).
*   **💉 Tensor Replacer**: Overwrite/replace raw tensor data along a specific dimension.
*   **🗂️ Tensor Folder**: Reshape and increase dimensionality of raw tensors.

### 5. ComfyUI Specific Operations (Data Comfy)
*   **🔍 Conditioning Getter**: Extract underlying data from ComfyUI conditioning (yellow line).
*   **✍️ Conditioning Setter**: Modify or write data into ComfyUI conditioning (yellow line).
*   **🔄 Tensor Latent Converter**: Swap between raw tensors and Latent space formats.

---

## 🛠️ Installation

Download and place this repository into your `ComfyUI/custom_nodes/` directory, or run the following command in the `custom_nodes` directory:
```bash
git clone https://github.com/shiganone/Comfyui-Data_Tool.git
```