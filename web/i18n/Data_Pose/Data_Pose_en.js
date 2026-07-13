window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.EN, {
    "RescaleKeypoints": {
        title: "📐 Rescale 2D Keypoints",
        widgets: {
            "width": "Width",
            "height": "Height",
            "resize_mode": "Resize Mode",
            "alignment": "Alignment",
            "offset_x": "Offset X",
            "offset_y": "Offset Y",
            "output_absolute": "Output Absolute Pixels"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📐 Node Functionality</h3>
    Remaps the resolution of keypoint format skeleton data.<br>
    <b>Inputs</b><br>keypoints: Original skeleton data batch.<br>
    <b>Outputs</b><br>POSE_KEYPOINTS: Rescaled skeleton data batch.<br>
    <b>Parameters</b><br>
    • <b>Width/Height</b>: Target resolution for remapping.<br>
    • <b>Resize Mode</b>:<br>
    &nbsp;&nbsp;· Stretch: Changes aspect ratio, stretches width and height to fill.<br>
    &nbsp;&nbsp;· Fit: Maintains aspect ratio, fits into the new resolution, padding any remaining areas with empty space.<br>
    &nbsp;&nbsp;· Crop: Maintains aspect ratio, fills the new resolution, cropping any excess areas.<br>
    &nbsp;&nbsp;· Keep: Maintains original framing, only changes canvas size.<br>
    &nbsp;&nbsp;· Fit Height: Maintains aspect ratio, matches new height, width cropped/padded.<br>
    &nbsp;&nbsp;· Fit Width: Maintains aspect ratio, matches new width, height cropped/padded.<br>
    • <b>Alignment</b>: 3x3 grid alignment. Top/bottom is invalid for Fit Height, left/right is invalid for Fit Width.<br>
    • <b>Offset X/Y</b>: Manually adjust the overall translation.<br>
    • <b>Output Absolute Pixels</b>: If enabled, outputs absolute pixel coordinates; if disabled, outputs 0~1 relative coordinates.
</div>`
    },

    "KeypointConfidenceModifier": {
        title: "🎯 Keypoint Confidence Modifier",
        widgets: {
            "start_index": "Start Index",
            "end_index": "End Index",
            "target_score": "Target Score",
            "modify_target": "Modify Target",
            "delete_mode": "Delete Mode",
            "edit_commands": "Text Box"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🎯 Node Functionality</h3>
    Forces the confidence score of target keypoints in a specified batch range to the target value.<br>
    <b>Inputs</b><br>keypoints: Original pose keypoint batch.<br>
    <b>Outputs</b><br>POSE_KEYPOINT: Modified pose keypoint batch.<br>
    <b>Parameters</b><br>
    • <b>Start Index</b>: Start of the batch portion to process.<br>
    • <b>End Index</b>: End of the batch portion to process. If set to <b>-1</b>, it represents modifying all frames from the Start Index to the very last frame; automatically truncated if it exceeds the batch length.<br>
    • <b>Target Score</b>: New confidence score for the target keypoints.<br>
    • <b>Modify Target</b>:<br>
    &nbsp;&nbsp;· Selected: Applies the modification/deletion only to the keypoints selected in the Text Box.<br>
    &nbsp;&nbsp;· Unselected: Applies the modification/deletion only to the keypoints NOT selected in the Text Box.<br>
    • <b>Delete Mode</b>: If enabled, physically deletes the corresponding target keypoints from the data. (For special cases only, generally keep this disabled)<br>
    • <b>Text Box</b>: Input the specified keypoint names, indices, or use hyphens to input ranges (e.g., <b>0-5</b>).<br>
    <hr style="border-color: #444;">
    <h3 style="color: #4af;">✨ Keypoint Layout & Shortcut Mapping</h3>
    Supports direct numeric inputs, ranges (e.g., 0-5), or the following shortcut names on the left of the colons (comma or space separated).<br><br>
    🔸 <b>[body:]</b><br>
    nose: 0, neck: 1<br>
    r_shoulder: 2, r_elbow: 3, r_wrist: 4<br>
    l_shoulder: 5, l_elbow: 6, l_wrist: 7<br>
    r_hip: 8, r_knee: 9, r_ankle: 10<br>
    l_hip: 11, l_knee: 12, l_ankle: 13<br>
    r_eye: 14, l_eye: 15, r_ear: 16, l_ear: 17<br><br>
    🔸 <b>[face:]</b><br>
    face_contour: 0-16, l_eyebrow: 17-21, r_eyebrow: 22-26, eyebrow: 17-26<br>
    nose: 27-35, l_eye: 36-41, r_eye: 42-47, eye: 36-48<br>
    upper_lip: 48-54 (outer) + 61-63 (inner)<br>
    lower_lip: 55-59 (outer) + 65-67 (inner)<br>
    inner_lip: 60-67, mouth: 48-67, face: 0-67<br><br>
    🔸 <b>[left_hand: / right_hand:]</b><br>
    hand: 0-20<br>
    thumb: 1-4, index: 5-8, middle: 9-12<br>
    ring: 13-16, pinky: 17-20<br><br>
    🔸 <b>[foot:]</b><br>
    toe: All toe keypoints for both feet, heel: All heel keypoints for both feet<br>
    ViTPose (1-point foot): l_toe: 0, r_toe: 1, toe: 0-1<br>
    SDPose (3-point foot): l_toe: 0-1, l_heel: 2, r_toe: 3-4, r_heel: 5, toe: 0-1, 3-4, heel: 2, 5
</div>`
    },

    "KeypointHandFilter": {
        title: "✋ Keypoint Hand Filter",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✋ Node Functionality</h3>
    Zeros out the data of hand keypoints that exceed the detection distance from the root hand keypoint.<br>
    <b>Inputs</b><br>keypoints: Original batch.<br>
    <b>Outputs</b><br>POSE_KEYPOINTS: Filtered batch.<br>
    <b>Parameters</b><br>
    • <b>Threshold</b>: The detection distance used for filtering.
</div>`
    },

    "SDPoseToViTPoseFoot": {
        title: "🦶 SDPose To ViTPose Foot",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🦶 Node Functionality</h3>
    Converts SDPose 3-point feet to ViTPose 1-point feet by merging the two toe points and removing the heel point.<br>
    <b>Inputs</b><br>keypoints: Original batch.<br>
    <b>Outputs</b><br>POSE_KEYPOINTS: Converted batch.<br>
    <b>Parameters</b><br>
    • <b>Score Method</b>: How to calculate the confidence score of the new merged single toe point from the two SDPose toe points.<br>
    &nbsp;&nbsp;· Max: Uses the higher confidence score.<br>
    &nbsp;&nbsp;· Min: Uses the lower confidence score.<br>
    &nbsp;&nbsp;· Average: Uses the average of the two confidence scores.
</div>`
    },

    "NLF_Pose_Orientation": {
        title: "🧭 Get NLF Pose Orientation",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🧭 Node Functionality</h3>
    Extracts the chest and pelvis orientation data for each skeleton from NLF pose data.<br>
    <b>Inputs</b><br>nlf_poses: NLF skeleton data.<br>
    <b>Outputs</b><br>orientations: A 3-level nested array. 1st layer = frames, 2nd layer = skeletons, 3rd layer = 4 values corresponding to Chest Yaw, Chest Pitch, Pelvis Yaw, Pelvis Pitch.
</div>`
    },

    "NLF_Orientation_Parser": {
        title: "🧭 NLF Orientation Parser",
        widgets: {
            "person_index": "Target Index",
            "body_part": "Body Part",
            "default_direction": "Fallback Direction",
            "yaw_capture_range": "Yaw Capture Range",
            "pitch_capture_range": "Pitch Capture Range",
            "active_directions": "Text Box"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🧭 Node Functionality</h3>
    Receives orientation data and accurately parses the Euler angles into English direction labels (e.g., F, B, L, R). Auto-deduplicates identical directions within a single frame.<br>
    <b>Inputs</b><br>orientations: Data from the Pose Orientation node.<br>
    <b>Outputs</b><br>labels_batch: Parsed direction labels.<br>
    <b>Parameters</b><br>
    • <b>Target Index</b>: >= 0 to parse a specific character index; -1 to parse all characters.<br>
    • <b>Body Part</b>: Choose to extract Chest, Pelvis, Average, or All.<br>
    • <b>Fallback Direction</b>: Default direction output if the data is out of range for all active labels.<br>
    • <b>Yaw/Pitch Capture Range</b>: Detection range for active directions. Value is divided by 2 for the capture radius. e.g., 90 means ±45 degrees.<br>
    • <b>Text Box</b>: Input labels to activate. Detects and outputs these labels based on the capture range.<br>
    <hr style="border-color: #444;">
    <h3 style="color: #4af;">✨ 26 Available Direction Labels</h3>
    Input the corresponding letters to activate directions. Comma or space separated.<br><br>
    🔸 <b>Pure Horizontal (Level)</b><br>
    Front: F, Back: B, Left: L, Right: R<br>
    Left-Front: LF, Right-Front: RF, Left-Back: LB, Right-Back: RB<br><br>
    🔸 <b>Pure Vertical (Up/Down)</b><br>
    Up: U, Down: D<br><br>
    🔸 <b>Upward Combos (Diagonal Up)</b><br>
    Front-Up: FU, Back-Up: BU, Left-Up: LU, Right-Up: RU<br>
    Left-Front-Up: LFU, Right-Front-Up: RFU, Left-Back-Up: LBU, Right-Back-Up: RBU<br><br>
    🔸 <b>Downward Combos (Diagonal Down)</b><br>
    Front-Down: FD, Back-Down: BD, Left-Down: LD, Right-Down: RD<br>
    Left-Front-Down: LFD, Right-Front-Down: RFD, Left-Back-Down: LBD, Right-Back-Down: RBD
</div>`
    },

    "Direction_Modifier": {
        title: "🧭 Direction Modifier",
        widgets: {
            "target_direction": "Target Direction",
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🧭 Node Functionality</h3>
    Modifies the specified directions in the direction labels to the target direction.<br>
    <b>Inputs</b><br>labels_batch: Original direction labels.<br>
    <b>Outputs</b><br>labels_batch: Modified direction labels.<br>
    <b>Parameters</b><br>
    • <b>Target Direction</b>: The target direction to modify into.<br>
    • <b>Text Box</b>: Input the labels to be modified. It will detect the corresponding labels from the orientation data and replace them with the target direction.<br>
    <hr style="border-color: #444;">
    <h3 style="color: #4af;">✨ 26 Available Direction Labels</h3>
    Input the corresponding letters to activate directions. Comma or space separated.<br><br>
    🔸 <b>Pure Horizontal (Level)</b><br>
    Front: F, Back: B, Left: L, Right: R<br>
    Left-Front: LF, Right-Front: RF, Left-Back: LB, Right-Back: RB<br><br>
    🔸 <b>Pure Vertical (Up/Down)</b><br>
    Up: U, Down: D<br><br>
    🔸 <b>Upward Combos (Diagonal Up)</b><br>
    Front-Up: FU, Back-Up: BU, Left-Up: LU, Right-Up: RU<br>
    Left-Front-Up: LFU, Right-Front-Up: RFU, Left-Back-Up: LBU, Right-Back-Up: RBU<br><br>
    🔸 <b>Downward Combos (Diagonal Down)</b><br>
    Front-Down: FD, Back-Down: BD, Left-Down: LD, Right-Down: RD<br>
    Left-Front-Down: LFD, Right-Front-Down: RFD, Left-Back-Down: LBD, Right-Back-Down: RBD
</div>`
    },

    "PoseBackgroundOptions": {
        title: "Pose Background Options",
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">Node Functionality</h3>
    Provides highly customizable pose background mask configurations for pose rendering.<br>
    <b>Outputs</b><br>
    POSE_BACKGROUND: Connects to the corresponding input of the UniversalPoseRenderer node.<br>
    <b>Parameters</b><br>
    • <b>bg_color</b>: The background color for the drawn keypoints. Supports Hex (#000000), RGB (0,0,0), or Decimal integers.<br>
    • <b>draw_only_bg</b>: When enabled, the UniversalPoseRenderer will only render the background mask and skip drawing the color skeletons.<br>
    • <b>[body/face/hand/foot]_point_radius</b>: Controls the background expansion radius for the keypoints and connections of the corresponding body part.<br>
    • <b>[body/face/hand/foot]_hull</b>: When enabled, calculates the bounding polygon of the valid keypoints and fills it with the background color. (The body hull is calculated based solely on 5 core points: collarbone, shoulders, and hips).<br>
    • <b>[body/face/hand/foot]_infill_expand</b>: Controls the outward expansion distance (in pixels) for the infill polygon of the corresponding body part.
</div>`
    },

    "UniversalPoseRenderer": {
        title: "🎨 Universal Pose Renderer",
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🎨 Node Functionality</h3>
    Removes safety point-count validations for face and foot points, supporting the rendering of pose data with any number of face and foot keypoints.<br>
    <b>Inputs</b><br>
    keypoints: The pose data to be rendered.<br>
    background_image (Optional): A batch of background images. If disconnected, it renders on a pure black background by default.<br>
    pose_background (Optional): Customizes the drawn background based on keypoints.<br>
    <b>Outputs</b><br>
    IMAGE: The rendered pose image batch.<br>
    MASK: The mask corresponding to the background drawn by the pose_background options.<br>
    <b>Parameters</b><br>
    • <b>draw_body / draw_hands / draw_face / draw_feet</b>: Toggles for rendering specific body parts.<br>
    • <b>connect_feet</b>: When enabled, draws lines connecting the foot points to the ankle points.<br>
    • <b>score_threshold</b>: Confidence score threshold; points below this score will not be drawn.<br>
    • <b>stick_width</b>: The line thickness for keypoint connections.<br>
    • <b>face_point_size</b>: The pixel radius for the white facial points.
</div>`
    },

    "UniversalPoseEditor": {
        title: "✏️ Universal Pose Editor",
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✏️ Node Functionality</h3>
    A universal 2D keypoint pose editor.<br>
    <b>Inputs</b><br>
    background_image (Optional): Clicking the [Load BG] button inside the editor will extract this image to use as a reference background.<br>
    keypoint (Optional): Clicking the [Update Keypoints] button will retrieve this keypoint data and overwrite the text box.<br>
    <b>Outputs</b><br>
    POSE_KEYPOINT: Outputs the keypoint data currently inside the text box.<br>
    <b>Parameters</b><br>
    pose_json: Input the keypoint data in standard JSON format.<br>
    <hr style="border-color: #444;">
    <h3 style="color: #4af;">🎮 Editor Shortcuts & Controls</h3>
    • <b>View Control</b>: Use the mouse wheel to zoom, and drag with the middle mouse button to pan the canvas.<br>
    • <b>Select Keypoints</b>: Left-click to select a single point, drag in any empty space to box-select, or hold <b>Shift</b> while clicking for multi-selection. Under multi-selection, a bounding box is drawn; drag the bounding box handles to freely scale or rotate. Drag the anchor to adjust the center of scaling/rotation, and hold <b>Shift</b> while dragging the anchor to snap.<br>
    • <b>Move Keypoints</b>: Once target points are selected, hold the left mouse button and drag to move them.<br>
    • <b>Hide Keypoints</b>: Click <b>[Right-Click]</b> on a keypoint or selected bounding box to quickly toggle visibility.<br>
    • <b>History Actions</b>: Supports <b>Ctrl+Z</b> (Undo) and <b>Ctrl+Y</b> (Redo).
</div>`
    },
});