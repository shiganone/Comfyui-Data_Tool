window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.EN, {
    "TensorExtractor": {
        title: "✂️ Tensor Extractor",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✂️ Node Functionality</h3>
    A versatile node to extract data from a specific dimension of the input tensor.<br>
    <b>Inputs</b><br>data: Original pure tensor data (image/mask, etc.), supports direct latent connection.<br>
    <b>Outputs</b><br>data: Extracted sliced data.<br>
    <b>Parameters</b><br>
    • <b>slice_dim</b>: The dimension on which the slice operation occurs.<br>
    • <b>start_index</b>: The starting index for extraction. Supports negative values for reverse lookup (e.g., -1 for the last chunk).<br>
    • <b>length</b>: The length to slice. Set to 0 to extract to the end, or from the start to the start index if reverse extract is enabled.<br>
    • <b>reverse_direction</b>: When enabled, extracts backward from the start index for the specified length (e.g., start index 5, length 3 -> extracts 3, 4, 5).<br>
    • <b>split_to_list</b>: If enabled, splits the extracted tensor into a list of tensors of length 1; if disabled, outputs a single merged tensor block.
</div>`
    },
    "TensorReplacer": {
        title: "💉 Tensor Replacer",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💉 Node Functionality</h3>
    Precisely overwrites a specific dimension of the target tensor with a new tensor data block.<br>
    <b>Inputs</b><br>
    target_data: Original pure tensor to be replaced, supports direct latent connection.<br>
    replacement_data: New tensor block used for replacement (supports single tensor or list).<br>
    <b>Outputs</b><br>data: Overwritten target data.<br>
    <b>Parameters</b><br>
    • <b>slice_dim</b>: The dimension on which the replacement occurs.<br>
    • <b>start_index</b>: The starting index for replacement (e.g., start index 5, replacement length 3 -> overwrites target data 5, 6, 7). Supports negative values for reverse lookup.<br>
    • <b>reverse_replace</b>: When enabled, uses the start index as the endpoint and overwrites backward (e.g., start index 5, replacement length 3 -> overwrites target data 3, 4, 5).
</div>`
    },
    "TensorFolder": {
        title: "🗂️ Tensor Folder",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🗂️ Node Functionality</h3>
    Cuts, folds, and increases the dimensionality of ultra-long data along a specified dimension. Excess tail data that cannot be evenly divided is safely truncated.<br>
    <b>Inputs</b><br>data: Original pure tensor data (image/mask, etc.), supports direct latent connection.<br>
    <b>Outputs</b><br>data: Reordered tensor after increasing dimensionality.<br>
    <b>Parameters</b><br>
    • <b>target_dim</b>: The dimension index to split and fold.<br>
    • <b>new_length</b>: The fixed length of each internal sub-block after folding. (e.g., target dim [6] tensor, length 3 -> becomes [2,3] tensor).<br>
    • <b>interleaved</b>: Enable for interleaved grabbing, disable for sequential hard cutting (e.g., folding [6] into [2,3]. If enabled, the two length-3 arrays are 0, 2, 4 and 1, 3, 5; if disabled, they are 0, 1, 2 and 3, 4, 5).<br>
    • <b>output_as_list</b>: Enable to output a downgraded list of tensors, disable to output a single multi-dimensional large tensor (e.g., folding into [2,3]. Enabled -> two [3]s; Disabled -> one [2,3]).
</div>`
    },

    "ExtraMaskDraw": {
        title: "Extra Mask Draw",
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">Node Functionality</h3>
    Connects to the MaskDrawColor node, allowing the rendering of multiple masks with different colors. Supports infinite chaining.<br>
    <b>Inputs</b><br>
    mask: The mask to be drawn.<br>
    extra_mask (Optional): Chains another ExtraMaskDraw node.<br>
    <b>Outputs</b><br>
    EXTRA_MASK: Connects to the MaskDrawColor node or chains to another ExtraMaskDraw node.<br>
    <b>Parameters</b><br>
    • <b>mask_color</b>: The rendering color for the mask. Supports Hex (#000000), RGB (0,0,0), or Decimal integers.
</div>`
    },

    "MaskDrawColor": {
        title: "🎨 Mask Draw Color",
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🎨 Node Functionality</h3>
    Draws a base mask and multiple upper-layer extra masks onto a background (solid color or image).<br>
    <b>Inputs</b><br>
    mask: The base mask to be drawn.<br>
    background_image (Optional): Background image batch. If connected, the bg_color parameter is ignored.<br>
    extra_mask (Optional): Receives layers from ExtraMaskDraw nodes to render more masks (rendered in a later-is-on-top order).<br>
    <b>Outputs</b><br>
    IMAGE: The rendered image batch.<br>
    <b>Parameters</b><br>
    • <b>bg_color / mask_color</b>: The rendering colors for the background and the base mask. Supports Hex (#000000), RGB (0,0,0), or Decimal integers.
</div>`
    },

    "TensorDimensionLength": {
        title: "🧮 Tensor Dimension Length",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🧮 Node Functionality</h3>
    Gets the specific length of the input tensor along a specified dimension, and previews the full tensor shape structure in real-time.<br>
    <b>Inputs</b><br>data: Tensor data to query dimension length (images, masks, latents, etc.).<br>
    <b>Outputs</b><br>len: Integer length corresponding to the specified dimension.<br>
    <b>Parameters</b><br>
    • <b>dim</b>: Dimension index to get length for (e.g., 0 for the 1st dimension, supports negative indices such as -1 for the last dimension).<br>
    • <b>shape_preview</b>: After running the node, automatically displays the complete dimension shape list of the input tensor here.
</div>`
    },
});