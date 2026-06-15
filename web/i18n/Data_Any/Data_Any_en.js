window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.EN, {
    "BatchDataExtractor": {
        title: "✂️ Batch Data Extractor",
        widgets: {
            "start_index": "Start Index",
            "length": "Length",
            "reverse_direction": "Reverse Cut"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✂️ Node Functionality</h3>
    A universal node for extracting data segments from a batch, applicable to images, masks, latent tensors, keypoint skeletons, and NLF skeleton batches.<br>
    <b>Inputs</b><br>data: Original batch.<br>
    <b>Outputs</b><br>data: Extracted batch.<br>
    <b>Parameters</b><br>
    • <b>Start Index</b>: The starting index of the portion to extract. Supports negative numbers (e.g., -1 is the last frame).<br>
    • <b>Length</b>: The length of the batch to extract.<br>
    • <b>Reverse Cut</b>: When enabled, extracts backward from the selected index for the specified length (e.g., start index 5, length 3, reverse cuts 3, 4, 5).
</div>`
    },

    "BatchDataReplacer": {
        title: "💉 Batch Replacer",
        widgets: {
            "start_index": "Start Index",
            "overflow_mode": "Overflow Mode",
            "reverse_direction": "Reverse Replace"
        },
        slot_labels: { "target_data": "Target Data", "replacement_data": "Replacement Data", "data": "Output Data" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💉 Node Functionality</h3>
    Starting from the specified start index, this node precisely overwrites the corresponding segment in the original batch with the new replacement data. Supports Images, Masks, Latents, Keypoint skeletons, and NLF 3D skeletons.<br>
    <b>Inputs</b><br>
    Target Data: The original batch to be replaced.<br>
    Replacement Data: The new batch used for replacement.<br>
    <b>Outputs</b><br>
    Output Data: The newly combined batch after replacement.<br>
    <b>Parameters</b><br>
    • <b>Start Index</b>: The slice index where the overwrite begins. Supports negative values for reverse lookup (e.g., -1 for the last frame).<br>
    • <b>Overflow Mode</b>: Handling method when the replacement batch exceeds the tail of the original batch.<br>
    &nbsp;&nbsp;· Truncate: Crops the replacement data to ensure the total length of the original batch remains unchanged.<br>
    &nbsp;&nbsp;· Extend: Automatically appends the extra frames to the end, increasing the total length of the final output batch.<br>
    • <b>Reverse Replace</b>: When enabled, uses the start index as the endpoint and replaces backward based on the replacement batch's length (e.g., replacement length 3, start index 5 -> overwrites frames 3, 4, 5 of the original data).
</div>`
    },

    "BatchDataCombiner": {
        title: "🔗 Batch Combiner",
        widgets: {},
        slot_labels: { "data_*": "Data {N}", "data": "Combined Data" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🔗 Node Functionality</h3>
    Concatenates multiple batches of the same data type. Supports dynamic auto-addition of input ports. Applicable to Images, Masks, Latents, Keypoint skeletons, and NLF 3D skeletons.<br>
    <b>Inputs</b><br>
    Data: Multiple batches of the same type to be combined.<br>
    <b>Outputs</b><br>
    Combined Data: The complete batch after concatenation.<br>
</div>`
    },

    "BatchFrameRateConverter": {
        title: "🎞️ Batch FrameRate Converter",
        widgets: {
            "source_fps": "Source FPS",
            "target_fps": "Target FPS",
            "algorithm": "Algorithm"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🎞️ Node Functionality</h3>
    Extracts or interpolates frames from a batch according to the selected framerate.<br>
    <b>Inputs</b><br>data: Original framerate batch.<br>
    <b>Outputs</b><br>data: New framerate batch.<br>
    <b>Parameters</b><br>
    • <b>Source FPS</b>: The framerate of the input batch.<br>
    • <b>Target FPS</b>: The new framerate after modification.<br>
    • <b>Algorithm</b>: Frame extraction/interpolation algorithm.
</div>`
    },
});