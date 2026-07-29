window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.EN, {
    "BatchDataExtractor": {
        title: "✂️ Batch Data Extractor",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✂️ Node Functionality</h3>
    A universal node for extracting data segments from a batch, applicable to images, masks, latent tensors, keypoint skeletons, and NLF skeleton batches.<br>
    <b>Inputs</b><br>data: Original batch.<br>
    <b>Outputs</b><br>data: Extracted batch.<br>
    <b>Parameters</b><br>
    • <b>start_index</b>: The starting index of the portion to extract. Supports negative numbers (e.g., -1 is the last frame).<br>
    • <b>length</b>: The length of the batch to extract. Set to 0 to extract to the end, or from the start to the start index if reverse cut is enabled.<br>
    • <b>reverse_direction</b>: When enabled, extracts backward from the selected index for the specified length (e.g., start index 5, length 3, reverse cuts 3, 4, 5).
</div>`
    },

    "BatchDataReplacer": {
        title: "💉 Batch Replacer",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">💉 Node Functionality</h3>
    Starting from the specified start index, this node precisely overwrites the corresponding segment in the original batch with the new replacement data. Supports Images, Masks, Latents, Keypoint skeletons, and NLF 3D skeletons.<br>
    <b>Inputs</b><br>
    target_data: The original batch to be replaced.<br>
    replacement_data: The new batch used for replacement.<br>
    <b>Outputs</b><br>
    data: The newly combined batch after replacement.<br>
    <b>Parameters</b><br>
    • <b>start_index</b>: The slice index where the overwrite begins. Supports negative values for reverse lookup (e.g., -1 for the last frame).<br>
    • <b>overflow_mode</b>: Handling method when the replacement batch exceeds the tail of the original batch.<br>
    &nbsp;&nbsp;· Truncate: Crops the replacement data to ensure the total length of the original batch remains unchanged.<br>
    &nbsp;&nbsp;· Extend: Automatically appends the extra frames to the end, increasing the total length of the final output batch.<br>
    • <b>reverse_direction</b>: When enabled, uses the start index as the endpoint and replaces backward based on the replacement batch's length (e.g., replacement length 3, start index 5 -> overwrites frames 3, 4, 5 of the original data).
</div>`
    },

    "BatchDataCombiner": {
        title: "🔗 Batch Combiner",
        widgets: {},
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
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🎞️ Node Functionality</h3>
    Extracts or interpolates frames from a batch according to the selected framerate.<br>
    <b>Inputs</b><br>data: Original framerate batch.<br>
    <b>Outputs</b><br>data: New framerate batch.<br>
    <b>Parameters</b><br>
    • <b>source_fps</b>: The framerate of the input batch.<br>
    • <b>target_fps</b>: The new framerate after modification.<br>
    • <b>algorithm</b>: Frame extraction/interpolation algorithm.
</div>`
    },

    "ContainerElementExtractor": {
        title: "📦 Container Element Extractor",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📦 Node Functionality</h3>
    Extracts element content from a list/tuple or dictionary container based on index or key name.<br>
    <b>Inputs</b><br>container: Input list, tuple, dictionary, or other container data.<br>
    <b>Outputs</b><br>value: Specified element or dictionary value obtained from the container.<br>
    <b>Parameters</b><br>
    • <b>container_type</b>: Select the input container type, supporting "Sequence" and "Map". Sequence corresponds to list/tuple, and Map corresponds to dictionary.<br>
    • <b>index (Sequence)</b>: Integer index of the element to extract, supporting negative numbers (e.g., -1 for the last element).<br>
    • <b>key_name (Map)</b>: Key name to query and extract in the dictionary, supporting automatic type conversion and matching.<br>
    • <b>keys_list (Map)</b>: After running the node, automatically lists all available key names contained in the dictionary in this text box.
</div>`
    },

    "ContainerElementWriter": {
        title: "📦 Container Element Writer",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📦 Node Functionality</h3>
    Writes new data to the specified position or key name of a list/tuple or dictionary container, and outputs the modified updated container.<br>
    <b>Inputs</b><br>
    container: Target list, tuple, or dictionary container.<br>
    value: New data content to write into the container.<br>
    <b>Outputs</b><br>container: Modified and updated container data.<br>
    <b>Parameters</b><br>
    • <b>container_type</b>: Select the input container type, supporting "Sequence" and "Map". Sequence corresponds to list/tuple, and Map corresponds to dictionary.<br>
    • <b>index (Sequence)</b>: List index to write new data. If the index exceeds the current list length, it will automatically pad with None.<br>
    • <b>key_name (Map)</b>: Key name to write or overwrite in the dictionary, supporting automatic type matching.<br>
    • <b>keys_list (Map)</b>: After running the node, automatically lists all available key names in the updated dictionary in this text box.
</div>`
    },
});
