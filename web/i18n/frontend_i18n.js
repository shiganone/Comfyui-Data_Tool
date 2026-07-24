// =========================================================================
// 🌟 前端及编辑器通用独立翻译包
// =========================================================================
import { app } from "../../../scripts/app.js"; // 🔥 用于读取 ComfyUI 原生 Comfy.Locale 设置

window.DataTool_I18N_UI = window.DataTool_I18N_UI || { EN: {} };

window.DataTool_I18N_UI.EN = {
    // 前端控制台按钮
    "📂 上传文件": "📂 Upload File",
    "🔄 刷新列表": "🔄 Refresh List",
    "✏️ 编辑关键点": "✏️ Edit Keypoints",
    "🔄 更新关键点": "🔄 Update Keypoints",

    // Pose 编辑器
    "画布缩放控制": "Canvas Zoom", "宽:": "W:", "高:": "H:", "策略:": "Mode:", "对齐:": "Align:", "X偏移:": "Offset X:", "Y偏移:": "Offset Y:", "应用": "Apply", "复位": "Reset",
    "背景底图控制": "Background Image", "加载背景底图": "Load BG", "拖动底图: ": "Drag BG: ", "开": "ON", "关": "OFF", "不透明度:": "Opacity:",
    "-- 自动对齐画布 --": "-- Auto Align Canvas --",
    "关键点层级树": "Keypoint Tree", "新增pose:": "Add Pose:", "手部": "Hand", "面部": "Face", "脚部": "Foot",
    "68(无瞳孔)": "68 (No Pupil)", "70(有瞳孔)": "70 (Pupil)", "1点": "1 Pt", "3点": "3 Pts", "添加": "Add", "添加部位": "Add Part", "覆盖/添加": "Add/Overwrite", "删除": "Delete",
    "(层级树引擎等待下一批次加载...)": "(Tree engine loading...)",
    "点大小:": "Pt Size:", "Pose不透明度:": "Pose Opacity:", "阈值:": "Threshold:", "脚部连线": "Connect Feet", "取消": "Cancel", "确认保存": "Save",
    "自适应": "Fit", "拉伸": "Stretch", "裁切": "Crop", "保持": "Keep", "对齐高度": "Fit Height", "对齐宽度": "Fit Width",
    "居中": "Center", "上对齐": "Top", "下对齐": "Bottom", "左对齐": "Left", "右对齐": "Right", "左上": "Top-Left", "右上": "Top-Right", "左下": "Bottom-Left", "右下": "Bottom-Right",
    "可见性": "Vis", "锁定": "Lock", "选中": "Select", "人物 ": "Person ", "[删除]": "[Del]", "分数:": "Score:", "点": "Pt",
    "躯干": "Body", "手部(左)": "L-Hand", "手部(右)": "R-Hand", "鼻子": "Nose", "脖颈": "Neck", "右肩": "R-Shoulder", "右肘": "R-Elbow", "右腕": "R-Wrist", "左肩": "L-Shoulder", "左肘": "L-Elbow", "左腕": "L-Wrist", "右髋": "R-Hip", "右膝": "R-Knee", "右踝": "R-Ankle", "左髋": "L-Hip", "左膝": "L-Knee", "左踝": "L-Ankle", "右眼": "R-Eye", "左眼": "L-Eye", "右耳": "R-Ear", "左耳": "L-Ear",
    "手腕": "Wrist", "拇指1": "Thumb1", "拇指2": "Thumb2", "拇指3": "Thumb3", "拇指4": "Thumb4", "食指1": "Index1", "食指2": "Index2", "食指3": "Index3", "食指4": "Index4", "中指1": "Middle1", "中指2": "Middle2", "中指3": "Middle3", "中指4": "Middle4", "无名1": "Ring1", "无名2": "Ring2", "无名3": "Ring3", "无名4": "Ring4", "小指1": "Pinky1", "小指2": "Pinky2", "小指3": "Pinky3", "小指4": "Pinky4",
    "获取中...": "Loading...", "图片加载失败": "Load Failed", "未连图或失败": "No Img / Failed", "无缓存数据": "No Cache Data",
    "多选变换控制": "Multi-Select Transform", "锚点 X": "Pivot X", "锚点 Y": "Pivot Y", "中心偏移 X": "Center Offset X", "中心偏移 Y": "Center Offset Y",
    "旋转(°)": "Rotation (°)", "缩放 X": "Scale X", "缩放 Y": "Scale Y", "同步缩放": "Sync Scale", "重设": "Reset", "归位": "Restore",
    "按住并左右拖拽可快速调整数值（左小右大）": "Drag left/right to adjust value (left: decrease, right: increase)"
};

// 极简翻译机函数 (优先读取 ComfyUI 原生 Comfy.Locale 设置，而非已失效的 localStorage key)
window.DataTool_I18N_UI.T = function (text) {
    let isZH = null;
    try {
        const locale = app.extensionManager?.setting?.get("Comfy.Locale");
        if (locale) isZH = locale.toLowerCase().startsWith("zh");
    } catch (e) { /* 设置系统尚未就绪时静默降级 */ }

    if (isZH === null) { // 兜底链：仅当原生设置读取失败时才会用到
        const legacy = localStorage.getItem("comfy_language");
        isZH = legacy !== null ? legacy === "zh-CN" : navigator.language.toLowerCase().startsWith("zh");
    }

    return isZH ? text : (window.DataTool_I18N_UI.EN[text] || text);
};