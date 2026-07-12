window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.ZH, {
    "BatchDataExtractor": {
        title: "✂️ 批次截取",
        widgets: {
            "start_index": "起始索引",
            "length": "长度",
            "reverse_direction": "反向切割"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✂️ 节点功能说明</h3>
    从批次截取数据片段的通用性节点，可对图像、遮罩、Latent张量、keypoint骨骼、nlf骨骼批次进行切片。<br>
    <b>输入</b><br>data：原始批次。<br>
    <b>输出</b><br>data：提取出的批次。<br>
    <b>参数</b><br>
    • <b>起始索引</b>: 要截取部分的起始索引。支持负数，负数为反向查找索引（如 -1 为最后1帧）。<br>
    • <b>长度</b>: 截取批次的长度。设为 0 时代表截取到末尾，开启反向提取则从开头提取到 起始索引。<br>
    • <b>反向切割</b>: 开启后，会从选中索引向前倒推长度切割（如起始索引5，长度3，反向切割则截取3、4、5）。
</div>`
    },

    "BatchDataReplacer": {
        title: "💉 批次替换",
        widgets: {
            "start_index": "起始索引",
            "overflow_mode": "溢出模式",
            "reverse_direction": "反向替换"
        },
        slot_labels: { "target_data": "原始数据", "replacement_data": "替换数据", "data": "输出数据" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💉 节点功能说明</h3>
    从指定的起始索引位置开始，将原始批次数据中的对应片段，用新的替换数据进行精准的覆盖替换。支持图像、遮罩、Latent、keypoint骨骼、NLF 3D骨骼类型的数据。<br>
    <b>输入</b><br>
    原始数据：被替换的原始批次。<br>
    替换数据：用来替换的新批次。<br>
    <b>输出</b><br>
    输出数据：替换重组完成后的新数据。<br>
    <b>参数</b><br>
    • <b>起始索引</b>: 开始发生覆盖的切片索引。支持负数，负数为反向查找（如 -1 为最后一帧）。<br>
    • <b>溢出模式</b>: 当替换批次长于原始批次尾部时，多余部分的处治方式。<br>
    &nbsp;&nbsp;·截断 (Truncate)：裁剪替换数据，保证原批次的总长度不变。<br>
    &nbsp;&nbsp;·延长 (Extend)：自动向后追加多出的帧数，使得最终输出的批次总长度增加。<br>
    • <b>反向替换</b>: 开启后，以起始索引为终点，向左（前）倒推替换批次的长度进行替换（如替换数据长度3，起始索引5，则替换原始数据的3、4、5）。
</div>`
    },

    "BatchDataCombiner": {
        title: "🔗 批次组合",
        widgets: {},
        slot_labels: { "data_*": "数据 {N}", "data": "合并数据" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🔗 节点功能说明</h3>
    将相同类型的批次数据进行拼接，支持动态自动增加输入端口。支持图像、遮罩、Latent、keypoint骨骼、NLF 3D骨骼类型的数据。<br>
    <b>输入</b><br>
    数据：需要合并的多个相同类型的批次。<br>
    <b>输出</b><br>
    合并数据：合并拼接后的完整批次。<br>
</div>`
    },

    "BatchFrameRateConverter": {
        title: "🎞️ 批次帧率转换",
        widgets: {
            "source_fps": "原始帧率",
            "target_fps": "目标帧率",
            "algorithm": "映射算法"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🎞️ 节点功能说明</h3>
    把批次按照选定的帧率，进行抽帧/补帧输出。<br>
    <b>输入</b><br>data：原始帧率批次。<br>
    <b>输出</b><br>data：新帧率批次。<br>
    <b>参数</b><br>
    • <b>原始帧率</b>: 输入批次对应的帧率。<br>
    • <b>目标帧率</b>: 修改后新帧率。<br>
    • <b>映射算法</b>: 抽帧补帧算法。
</div>`
    },
});