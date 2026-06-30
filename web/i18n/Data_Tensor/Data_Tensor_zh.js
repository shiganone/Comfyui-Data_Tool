window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.ZH, {
    "TensorExtractor": {
        title: "✂️ 张量切片提取",
        widgets: {
            "slice_dim": "切片维度",
            "start_index": "起始索引",
            "length": "提取长度",
            "reverse_direction": "反向提取",
            "split_to_list": "输出为列表"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✂️ 节点功能说明</h3>
    从输入张量中，选择指定维度提取出数据。<br>
    <b>输入</b><br>data：原始纯张量数据（图像/遮罩等），支持latent直连。<br>
    <b>输出</b><br>data：提取出的切片数据。<br>
    <b>参数</b><br>
    • <b>切片维度</b>: 切片操作发生在哪一维。<br>
    • <b>起始索引</b>: 提取起点的索引。支持负数，负数为反向查找索引（如 -1 为最后1块）。<br>
    • <b>提取长度</b>: 要截取的长度。<br>
    • <b>反向提取</b>: 开启后，从起始索引向前倒推提取长度 进行截取（如起始索引5，长度3，则截取3、4、5）。<br>
    • <b>输出为列表</b>: 开启后将提取出的张量按长度1拆分为列表输出，关闭则输出合并好的单一整块大张量。
</div>`
    },
    "TensorReplacer": {
        title: "💉 张量精准替换",
        widgets: {
            "slice_dim": "替换维度",
            "start_index": "起始索引",
            "reverse_replace": "反向替换"
        },
        slot_labels: { "target_data": "目标数据", "replacement_data": "替换数据" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💉 节点功能说明</h3>
    在目标张量的指定维度上，用新的张量数据块进行精准的覆盖替换。<br>
    <b>输入</b><br>
    目标数据：被替换的原始纯张量数据，支持latent直连。<br>
    替换数据：用来替换的新张量数据块（支持单块张量或张量列表）。<br>
    <b>输出</b><br>data：被覆盖替换后的目标数据。<br>
    <b>参数</b><br>
    • <b>替换维度</b>: 替换操作发生在哪一维。<br>
    • <b>起始索引</b>: 开始进行覆盖的起点索引（如起始索引5，替换数据长度3，覆盖目标数据的5、6、7），支持负数，负数为反向查找索引（如 -1 为最后1个）。<br>
    • <b>反向替换</b>: 开启后，以起始索引为终点，向前倒推覆盖替换（如起始索引5，替换数据的长度3，则覆盖目标数据的3、4、5）。
</div>`
    },
    "TensorFolder": {
        title: "🗂️ 张量折叠器",
        widgets: {
            "target_dim": "目标维度",
            "new_length": "维度长度",
            "interleaved": "交织排列",
            "output_as_list": "输出为列表"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🗂️ 节点功能说明</h3>
    将某一维度的超长数据，按照指定的固定长度进行切割、折叠并升维。尾部无法整除的多余数据会被安全截断丢弃。<br>
    <b>输入</b><br>data：原始纯张量数据（图像/遮罩等），支持latent直连。<br>
    <b>输出</b><br>data：升维重排后的数据。<br>
    <b>参数</b><br>
    • <b>目标维度</b>: 要进行切分和折叠的维度索引。<br>
    • <b>维度长度</b>: 折叠升维后，内部每个子块的固定长度。（如目标维度[6]张量，维度长度3，折叠后变成[2,3]张量）<br>
    • <b>交织排列</b>: 开启为交织抓取排列，关闭为顺序硬切断（如目标维度[6]张量，维度长度3，折叠成[2,3]张量。开启时，2个长度3的维度数据分别为 0、2、4 和 1、3、5，关闭时分别为 0、1、2 和 3、4、5）。<br>
    • <b>输出为列表</b>: 开启则输出降一级的张量列表，关闭则输出升维后的多维大张量（如折叠成[2,3]张量。开启后输出2个[3]，关闭后输出[2,3]）。
</div>`
    },

    "ExtraMaskDraw": {
        title: "附加遮罩绘制",
        widgets: {
            "mask_color": "遮罩颜色"
        },
        slot_labels: { "mask": "遮罩", "extra_mask": "附加遮罩" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">节点功能说明</h3>
    连接 遮罩绘制颜色节点，允许渲染更多颜色不同的遮罩，支持串联。<br>
    <b>输入</b><br>
    遮罩：被绘制的遮罩。<br>
    附加遮罩 (可选)：串联 附加遮罩绘制节点 。<br>
    <b>输出</b><br>
    附加遮罩：连接 遮罩绘制颜色节点 ，或者串联 附加遮罩绘制节点 。<br>
    <b>参数</b><br>
    • <b>遮罩颜色</b>: 遮罩的渲染颜色。支持 十六进制(#000000), RGB(0,0,0) 或 十进制整数。
</div>`
    },

    "MaskDrawColor": {
        title: "🎨 遮罩绘制颜色",
        widgets: {
            "bg_color": "背景颜色",
            "mask_color": "遮罩颜色"
        },
        slot_labels: { "mask": "遮罩", "extra_mask": "附加遮罩", "background_image": "背景图像", "IMAGE": "图像" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🎨 节点功能说明</h3>
    在背景（纯色或图片）上绘制遮罩以及上层多重附加遮罩。<br>
    <b>输入</b><br>
    遮罩：被绘制的遮罩。<br>
    背景图像 (可选)：背景图像。连入则无视背景颜色。<br>
    附加遮罩 (可选)：接收 附加遮罩绘制 节点，渲染更多遮罩（后来居上顺序渲染）。<br>
    <b>输出</b><br>
    图像：渲染后图像。<br>
    <b>参数</b><br>
    • <b>背景颜色 / 遮罩颜色</b>: 背景与遮罩的渲染颜色。支持 十六进制(#000000), RGB(0,0,0) 或 十进制整数。
</div>`
    },
});