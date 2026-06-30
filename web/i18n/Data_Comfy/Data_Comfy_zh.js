window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.ZH, {
    "ConditioningGetter": {
        title: "🔍 条件字典提取",
        widgets: { "key_name": "键名" },
        slot_labels: { "conditioning": "条件" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🔍 节点功能说明</h3>
    从comfyui的条件类型黄线中，通过键名提取出内部字典的数据。<br>
    <b>输入</b><br>条件：原始条件。<br>
    <b>输出</b><br>data：提取出的底层数据。<br>
    <b>参数</b><br>
    • <b>键名</b>: 被提取的键名。
</div>`
    },

    "ConditioningSetter": {
        title: "✍️ 条件字典写入",
        widgets: { "key_name": "键名" },
        slot_labels: { "conditioning": "条件", "new_value": "新数据", "CONDITIONING": "条件" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✍️ 节点功能说明</h3>
    从comfyui的条件类型黄线中，替换内部字典中指定键名的数据。<br>
    <b>输入</b><br>
    条件：原始条件。<br>
    新数据：进行替换的新数据。<br>
    <b>输出</b><br>条件：修改后的条件。<br>
    <b>参数</b><br>
    • <b>键名</b>: 被覆盖的键名。
</div>`
    },

    "TensorLatentConverter": {
        title: "🔄 张量/Latent 转换器",
        widgets: { "mode": "转换模式" },
        slot_labels: { "mask": "mask (可选)" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🔄 节点功能说明</h3>
    纯张量（Tensor）与 Latent 类型相互转换。<br>
    <b>输入</b><br>
    data：输入纯张量 或 Latent 字典。<br>
    mask (可选)：独立的 Mask 遮罩数据。<br>
    <b>输出</b><br>
    data：转换后的 Latent 字典或 纯张量。<br>
    mask：分离出的独立 Mask 遮罩。<br>
    <b>参数</b><br>
    • <b>转换模式</b>:<br>
    &nbsp;&nbsp;·Tensor_To_Latent：给张量添加 Latent 壳。若左侧连入了遮罩，则将其打包入潜空间的 noise_mask 键中。该模式下右侧的 mask 输出为空。<br>
    &nbsp;&nbsp;·Latent_To_Tensor：删去 Latent 壳，输出纯张量。若输入 Latent 内含有 noise_mask，则将其从右侧的 mask 输出。该模式下左侧的 mask 输入无效。
</div>`
    },
});