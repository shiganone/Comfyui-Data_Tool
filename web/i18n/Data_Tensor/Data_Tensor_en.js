window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.EN, {
    "TensorExtractor": {
        title: "✂️ Tensor Extractor",
        widgets: {
            "slice_dim": "Slice Dimension",
            "start_index": "Start Index",
            "length": "Extract Length",
            "reverse_direction": "Reverse Extract",
            "split_to_list": "Output as List"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✂️ Node Functionality</h3>
    A versatile node to extract data from a specific dimension of the input tensor.<br>
    <b>Inputs</b><br>data: Original pure tensor data (image/mask, etc.), supports direct latent connection.<br>
    <b>Outputs</b><br>data: Extracted sliced data.<br>
    <b>Parameters</b><br>
    • <b>Slice Dimension</b>: The dimension on which the slice operation occurs.<br>
    • <b>Start Index</b>: The starting index for extraction. Supports negative values for reverse lookup (e.g., -1 for the last chunk).<br>
    • <b>Extract Length</b>: The length to slice.<br>
    • <b>Reverse Extract</b>: When enabled, extracts backward from the start index for the specified length (e.g., start index 5, length 3 -> extracts 3, 4, 5).<br>
    • <b>Output as List</b>: If enabled, splits the extracted tensor into a list of tensors of length 1; if disabled, outputs a single merged tensor block.
</div>`
    },
    "TensorReplacer": {
        title: "💉 Tensor Replacer",
        widgets: {
            "slice_dim": "Replace Dimension",
            "start_index": "Start Index",
            "reverse_replace": "Reverse Replace"
        },
        slot_labels: { "target_data": "Target Data", "replacement_data": "Replacement Data" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💉 Node Functionality</h3>
    Precisely overwrites a specific dimension of the target tensor with a new tensor data block.<br>
    <b>Inputs</b><br>
    Target Data: Original pure tensor to be replaced, supports direct latent connection.<br>
    Replacement Data: New tensor block used for replacement (supports single tensor or list).<br>
    <b>Outputs</b><br>data: Overwritten target data.<br>
    <b>Parameters</b><br>
    • <b>Replace Dimension</b>: The dimension on which the replacement occurs.<br>
    • <b>Start Index</b>: The starting index for replacement (e.g., start index 5, replacement length 3 -> overwrites target data 5, 6, 7). Supports negative values for reverse lookup.<br>
    • <b>Reverse Replace</b>: When enabled, uses the start index as the endpoint and overwrites backward (e.g., start index 5, replacement length 3 -> overwrites target data 3, 4, 5).
</div>`
    },
    "TensorFolder": {
        title: "🗂️ Tensor Folder",
        widgets: {
            "target_dim": "Target Dimension",
            "new_length": "Dimension Length",
            "interleaved": "Interleaved",
            "output_as_list": "Output as List"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🗂️ Node Functionality</h3>
    Cuts, folds, and increases the dimensionality of ultra-long data along a specified dimension. Excess tail data that cannot be evenly divided is safely truncated.<br>
    <b>Inputs</b><br>data: Original pure tensor data (image/mask, etc.), supports direct latent connection.<br>
    <b>Outputs</b><br>data: Reordered tensor after increasing dimensionality.<br>
    <b>Parameters</b><br>
    • <b>Target Dimension</b>: The dimension index to split and fold.<br>
    • <b>Dimension Length</b>: The fixed length of each internal sub-block after folding. (e.g., target dim [6] tensor, length 3 -> becomes [2,3] tensor).<br>
    • <b>Interleaved</b>: Enable for interleaved grabbing, disable for sequential hard cutting (e.g., folding [6] into [2,3]. If enabled, the two length-3 arrays are 0, 2, 4 and 1, 3, 5; if disabled, they are 0, 1, 2 and 3, 4, 5).<br>
    • <b>Output as List</b>: Enable to output a downgraded list of tensors, disable to output a single multi-dimensional large tensor (e.g., folding into [2,3]. Enabled -> two [3]s; Disabled -> one [2,3]).
</div>`
    },
});