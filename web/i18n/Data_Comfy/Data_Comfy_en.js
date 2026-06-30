window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.EN, {
    "ConditioningGetter": {
        title: "🔍 Conditioning Getter",
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🔍 Node Functionality</h3>
    Extracts data from the internal dictionary of a ComfyUI conditioning (yellow line) using a key name.<br>
    <b>Inputs</b><br>
    conditioning: Original conditioning.<br>
    <b>Outputs</b><br>
    data: Extracted underlying data.<br>
    <b>Parameters</b><br>
    • <b>key_name</b>: The key to extract.
</div>`
    },

    "ConditioningSetter": {
        title: "✍️ Conditioning Setter",
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✍️ Node Functionality</h3>
    Replaces or sets data for a specific key in the internal dictionary of a ComfyUI conditioning (yellow line).<br>
    <b>Inputs</b><br>
    conditioning: Original conditioning.<br>
    new_value: New data to inject.<br>
    <b>Outputs</b><br>
    CONDITIONING: Modified conditioning.<br>
    <b>Parameters</b><br>
    • <b>key_name</b>: The key to overwrite or create.
</div>`
    },

    "TensorLatentConverter": {
        title: "🔄 Tensor/Latent Converter",
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🔄 Node Functionality</h3>
    Converts between pure Tensor and Latent types.<br>
    <b>Inputs</b><br>
    data: Input pure Tensor or Latent dict.<br>
    mask (Optional): Independent Mask data.<br>
    <b>Outputs</b><br>
    data: Converted Latent dict or pure Tensor.<br>
    mask: Separated independent Mask.<br>
    <b>Parameters</b><br>
    • <b>mode</b>:<br>
    &nbsp;&nbsp;· Tensor_To_Latent: Wraps the tensor in a Latent shell. If a mask is connected on the left, it packs it into the latent's 'noise_mask' key. The right mask output is empty in this mode.<br>
    &nbsp;&nbsp;· Latent_To_Tensor: Removes the Latent shell and outputs a pure tensor. If the input Latent contains a 'noise_mask', it separates it and outputs it via the right mask port. The left mask input is ignored in this mode.
</div>`
    },
});