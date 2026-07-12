// =========================================================================
// ✏️ 通用型 Pose 编辑器 - 核心弹窗渲染与状态总线引擎
// =========================================================================

// 🔥 懒加载安全翻译机：免疫任何由于 ComfyUI 文件加载顺序导致找不到变量的错误
const T = (text) => window.DataTool_I18N_UI && window.DataTool_I18N_UI.T ? window.DataTool_I18N_UI.T(text) : text;

window.DataTool = window.DataTool || {};
window.DataTool.openUniversalPoseEditor = function (node, poseData) {
    const state = node.properties.editor_state;

    // 创建全屏遮罩与模态框
    const modal = document.createElement("div");
    Object.assign(modal.style, {
        position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
        background: "rgba(0,0,0,0.85)", zIndex: "9999", display: "flex",
        justifyContent: "center", alignItems: "center", fontFamily: "sans-serif",
        color: "#ddd", fontSize: "14px"
    });

    // 选项字典生成器 (值保留中文逻辑供底层计算，但显示使用 T() 翻译)
    const modeOptions = ["自适应", "拉伸", "裁切", "保持", "对齐高度", "对齐宽度"];
    const alignOptions = ["居中", "上对齐", "下对齐", "左对齐", "右对齐", "左上", "右上", "左下", "右下"];
    const makeSelect = (options, selected) => options.map(o => `<option value="${o}" ${o === selected ? 'selected' : ''}>${T(o)}</option>`).join('');

    modal.innerHTML = `
        <style>
            #dt-pose-editor-modal input[type="number"]::-webkit-inner-spin-button,
            #dt-pose-editor-modal input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            #dt-pose-editor-modal input[type="number"] { -moz-appearance: textfield; }
        </style>
        <div id="dt-pose-editor-modal" style="width: 90%; height: 92%; background: #222; border-radius: 8px; display: flex; flex-direction: row; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
            
            <div id="dt-left-panel" style="width: 520px; min-width: 520px; height: 100%; background: #2a2a2a; display: block; overflow-y: auto; overflow-x: hidden;">
                
                <div style="border-bottom: 1px solid #444; flex-shrink: 0;">
                    <div id="dt-z-header" style="padding: 10px; background: #333; cursor: pointer; font-weight: bold; font-size: 16px; user-select: none; display: flex; justify-content: space-between;">
                        <span>${T("画布缩放控制")}</span><span id="dt-z-icon">${state.zoom.collapsed ? '<' : 'v'}</span>
                    </div>
                    <div id="dt-z-content" style="padding: 10px; display: ${state.zoom.collapsed ? 'none' : 'block'};">
                        <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                            <label style="flex:1; display:flex; justify-content:space-between; align-items:center;">${T("宽:")} <input type="number" id="dt-z-w" value="${state.zoom.w}" style="width:80px; background:#111; color:#fff; border:1px solid #555; padding:3px;"></label>
                            <label style="flex:1; display:flex; justify-content:space-between; align-items:center;">${T("高:")} <input type="number" id="dt-z-h" value="${state.zoom.h}" style="width:80px; background:#111; color:#fff; border:1px solid #555; padding:3px;"></label>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <label style="display:flex; align-items:center;">${T("策略:")} <select id="dt-z-mode" style="flex:1; margin-left:5px; background:#111; color:#fff; border:1px solid #555; padding:3px;">${makeSelect(modeOptions, state.zoom.mode)}</select></label>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <label style="display:flex; align-items:center;">${T("对齐:")} <select id="dt-z-align" style="flex:1; margin-left:5px; background:#111; color:#fff; border:1px solid #555; padding:3px;">${makeSelect(alignOptions, state.zoom.align)}</select></label>
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <label style="flex:1; display:flex; justify-content:space-between; align-items:center;">${T("X偏移:")} <input type="number" id="dt-z-x" value="${state.zoom.x}" style="width:80px; background:#111; color:#fff; border:1px solid #555; padding:3px;"></label>
                            <label style="flex:1; display:flex; justify-content:space-between; align-items:center;">${T("Y偏移:")} <input type="number" id="dt-z-y" value="${state.zoom.y}" style="width:80px; background:#111; color:#fff; border:1px solid #555; padding:3px;"></label>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button id="dt-z-apply" style="flex:1; padding:6px; background:#4CAF50; color:#fff; border:none; border-radius:3px; cursor:pointer;">${T("应用")}</button>
                            <button id="dt-z-reset" style="flex:1; padding:6px; background:#f44336; color:#fff; border:none; border-radius:3px; cursor:pointer;">${T("复位")}</button>
                        </div>
                    </div>
                </div>

                <div style="border-bottom: 1px solid #444; flex-shrink: 0;">
                    <div id="dt-b-header" style="padding: 10px; background: #333; cursor: pointer; font-weight: bold; font-size: 16px; user-select: none; display: flex; justify-content: space-between;">
                        <span>${T("背景底图控制")}</span><span id="dt-b-icon">${state.bg.collapsed ? '<' : 'v'}</span>
                    </div>
                    <div id="dt-b-content" style="padding: 10px; display: ${state.bg.collapsed ? 'none' : 'block'};">
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button id="dt-b-load" style="flex:1; padding:6px; background:#2196F3; color:#fff; border:none; border-radius:3px; cursor:pointer;">${T("加载背景底图")}</button>
                            <button id="dt-b-drag" style="flex:1; padding:6px; background:${state.bg.drag_mode ? '#ff9800' : '#555'}; color:#fff; border:none; border-radius:3px; cursor:pointer;">${T("拖动底图: ")} ${state.bg.drag_mode ? T("开") : T("关")}</button>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display:flex; align-items:center;">${T("不透明度:")}
                                <input type="range" id="dt-b-op-slider" min="0" max="1" step="0.05" value="${state.bg.opacity}" style="flex:1; margin-left:10px;">
                                <input type="number" id="dt-b-op-num" min="0" max="1" step="0.05" value="${state.bg.opacity}" style="width: 60px; margin-left:10px; background:#111; color:#fff; border:1px solid #555; padding:3px;">
                            </label>
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                            <label style="flex:1; display:flex; justify-content:space-between; align-items:center;">${T("宽:")} <input type="number" id="dt-b-w" value="${state.bg.w}" style="width:80px; background:#111; color:#fff; border:1px solid #555; padding:3px;"></label>
                            <label style="flex:1; display:flex; justify-content:space-between; align-items:center;">${T("高:")} <input type="number" id="dt-b-h" value="${state.bg.h}" style="width:80px; background:#111; color:#fff; border:1px solid #555; padding:3px;"></label>
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                            <label style="flex:1; display:flex; justify-content:space-between; align-items:center;">${T("X偏移:")} <input type="number" id="dt-b-x" value="${state.bg.x}" style="width:80px; background:#111; color:#fff; border:1px solid #555; padding:3px;"></label>
                            <label style="flex:1; display:flex; justify-content:space-between; align-items:center;">${T("Y偏移:")} <input type="number" id="dt-b-y" value="${state.bg.y}" style="width:80px; background:#111; color:#fff; border:1px solid #555; padding:3px;"></label>
                        </div>
                        
                        <div style="padding: 10px; background: #222; border-radius: 4px; border: 1px dashed #444;">
                            <div style="text-align: center; margin-bottom: 10px; color: #aaa; font-size:12px;">${T("-- 自动对齐画布 --")}</div>
                            <div style="margin-bottom: 8px;">
                                <label style="display:flex; align-items:center;">${T("策略:")} <select id="dt-b-auto-mode" style="flex:1; margin-left:5px; background:#111; color:#fff; border:1px solid #555; padding:3px;">${makeSelect(modeOptions, state.bg.auto_mode)}</select></label>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="display:flex; align-items:center;">${T("对齐:")} <select id="dt-b-auto-align" style="flex:1; margin-left:5px; background:#111; color:#fff; border:1px solid #555; padding:3px;">${makeSelect(alignOptions, state.bg.auto_align)}</select></label>
                            </div>
                            <button id="dt-b-auto-apply" style="width:100%; padding:6px; background:#607D8B; color:#fff; border:none; border-radius:3px; cursor:pointer;">${T("应用")}</button>
                        </div>
                    </div>
                </div>

                <div style="display: block; padding-bottom: 20px;">
                    <div style="padding: 10px; background: #333; font-weight: bold; font-size: 16px; user-select: none;">
                        ${T("关键点层级树")}
                    </div>
                    <div style="padding: 10px; border-bottom: 1px solid #444;">
                        <div style="background: #222; border-radius: 4px; border: 1px dashed #444; padding: 10px; display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 13px;">
                                <span style="color:#aaa; font-weight:bold; margin-right:5px;">${T("新增pose:")}</span>
                                <label style="cursor:pointer;"><input type="checkbox" id="dt-ap-hand" ${state.add_pose.hand ? 'checked' : ''}> ${T("手部")}</label>
                                <label style="cursor:pointer;"><input type="checkbox" id="dt-ap-face" ${state.add_pose.face ? 'checked' : ''}> ${T("面部")}</label>
                                <select id="dt-ap-face-pts" style="background:#111; color:#fff; border:1px solid #555; padding:2px; cursor:pointer;">
                                    <option value="68" ${state.add_pose.face_pts === "68" ? 'selected' : ''}>${T("68(无瞳孔)")}</option>
                                    <option value="70" ${state.add_pose.face_pts === "70" ? 'selected' : ''}>${T("70(有瞳孔)")}</option>
                                </select>
                                <label style="cursor:pointer;"><input type="checkbox" id="dt-ap-foot" ${state.add_pose.foot ? 'checked' : ''}> ${T("脚部")}</label>
                                <select id="dt-ap-foot-pts" style="background:#111; color:#fff; border:1px solid #555; padding:2px; cursor:pointer;">
                                    <option value="1" ${state.add_pose.foot_pts === "1" ? 'selected' : ''}>${T("1点")}</option>
                                    <option value="3" ${state.add_pose.foot_pts === "3" ? 'selected' : ''}>${T("3点")}</option>
                                </select>
                            </div>
                            <button id="dt-t-add" style="padding:6px 15px; background:#4CAF50; color:#fff; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">${T("添加")}</button>
                        </div>
                    </div>
                    <div id="dt-tree-container" style="padding: 0 10px 20px 10px; background: #252525;">
                        <div style="text-align:center; color:#777; margin-top:20px; font-style:italic;">${T("(层级树引擎等待下一批次加载...)")}</div>
                    </div>
                </div>
            </div>

            <div id="dt-splitter" style="width: 6px; background: #444; cursor: col-resize; flex-shrink: 0; z-index: 10;"></div>

            <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; background: #1a1a1a;">
                
                <div style="height: 45px; min-height: 45px; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center; padding: 0 15px; background: #333;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label style="display:flex; align-items:center;">${T("点大小:")}
                            <input type="range" id="dt-ui-pts-slider" min="1" max="15" step="1" value="${state.ui.point_size}" style="width: 80px; margin-left:5px;">
                            <input type="number" id="dt-ui-pts-num" min="1" max="15" step="1" value="${state.ui.point_size}" style="width: 45px; margin-left:5px; background:#111; color:#fff; border:1px solid #555; padding:2px;">
                        </label>
                        <label style="display:flex; align-items:center; margin-left:10px;">${T("Pose不透明度:")}
                            <input type="range" id="dt-ui-pose-op-slider" min="0" max="1" step="0.05" value="${state.ui.pose_opacity}" style="width: 80px; margin-left:5px;">
                            <input type="number" id="dt-ui-pose-op-num" min="0" max="1" step="0.05" value="${state.ui.pose_opacity}" style="width: 55px; margin-left:5px; background:#111; color:#fff; border:1px solid #555; padding:2px;">
                        </label>
                        <label style="display:flex; align-items:center; margin-left:10px;">${T("阈值:")}
                            <input type="range" id="dt-ui-thresh-slider" min="0" max="1" step="0.01" value="${state.ui.threshold}" style="width: 80px; margin-left:5px;">
                            <input type="number" id="dt-ui-thresh-num" min="0" max="1" step="0.01" value="${state.ui.threshold}" style="width: 55px; margin-left:5px; background:#111; color:#fff; border:1px solid #555; padding:2px;">
                        </label>
                        <label style="display:flex; align-items:center; margin-left:15px; cursor:pointer;">
                            <input type="checkbox" id="dt-ui-conn-feet" ${state.ui.connect_feet ? 'checked' : ''} style="margin-right:5px; cursor:pointer;"> ${T("脚部连线")}
                        </label>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="dt-btn-cancel" style="width: 100px; padding: 6px; background: #757575; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight:bold;">${T("取消")}</button>
                        <button id="dt-btn-save" style="width: 100px; padding: 6px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight:bold;">${T("确认保存")}</button>
                    </div>
                </div>
                
                <!-- Canvas 舞台容器与悬浮控制面板 -->
                <div id="dt-canvas-wrapper" style="flex: 1; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center;">
                    <canvas id="dt-canvas" style="background: #111; box-shadow: 0 0 15px rgba(0,0,0,0.8); z-index: 1;"></canvas>

                    <!-- 多选变换浮动面板 -->
                    <div id="dt-float-panel" style="position: absolute; top: 15px; right: 15px; background: rgba(34, 34, 34, 0.9); border: 1px solid #555; border-radius: 6px; padding: 10px; display: none; flex-direction: column; gap: 8px; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.5); backdrop-filter: blur(4px);">
                        <div style="font-weight: bold; font-size: 13px; color: #ccc; text-align: center; margin-bottom: 4px; border-bottom: 1px solid #555; padding-bottom: 5px;">${T("多选变换控制")}</div>
                        <div style="display: flex; gap: 8px; align-items: center;"><span style="width:75px; font-size:12px; color:#aaa;">${T("锚点 X")}</span><input id="dt-fp-px" type="number" step="any" style="width:70px; background:#111; color:#fff; border:1px solid #666; padding:2px;"></div>
                        <div style="display: flex; gap: 8px; align-items: center;"><span style="width:75px; font-size:12px; color:#aaa;">${T("锚点 Y")}</span><input id="dt-fp-py" type="number" step="any" style="width:70px; background:#111; color:#fff; border:1px solid #666; padding:2px;"></div>
                        <div style="display: flex; gap: 8px; align-items: center;"><span style="width:75px; font-size:12px; color:#aaa;">${T("中心偏移 X")}</span><input id="dt-fp-ox" type="number" step="any" value="0.000" style="width:70px; background:#111; color:#fff; border:1px solid #666; padding:2px;"></div>
                        <div style="display: flex; gap: 8px; align-items: center;"><span style="width:75px; font-size:12px; color:#aaa;">${T("中心偏移 Y")}</span><input id="dt-fp-oy" type="number" step="any" value="0.000" style="width:70px; background:#111; color:#fff; border:1px solid #666; padding:2px;"></div>
                        <div style="display: flex; gap: 8px; align-items: center;"><span style="width:75px; font-size:12px; color:#aaa;">${T("旋转(°)")}</span><input id="dt-fp-rot" type="number" step="any" value="0.000" style="width:70px; background:#111; color:#fff; border:1px solid #666; padding:2px;"></div>
                        <div style="display: flex; gap: 8px; align-items: center;"><span style="width:75px; font-size:12px; color:#aaa;">${T("缩放 X")}</span><input id="dt-fp-sx" type="number" step="any" value="1.000" style="width:70px; background:#111; color:#fff; border:1px solid #666; padding:2px;"></div>
                        <div style="display: flex; gap: 8px; align-items: center;"><span style="width:75px; font-size:12px; color:#aaa;">${T("缩放 Y")}</span><input id="dt-fp-sy" type="number" step="any" value="1.000" style="width:70px; background:#111; color:#fff; border:1px solid #666; padding:2px;"></div>
                        <div style="display: flex; gap: 8px; align-items: center;"><span style="width:75px; font-size:12px; color:#aaa;">${T("同步缩放")}</span><input id="dt-fp-sync-scale" type="checkbox" style="cursor:pointer; margin-left:2px;"></div>
                        <div style="display: flex; gap: 8px; width: 100%; margin-top: 6px; border-top: 1px solid #444; padding-top: 8px;">
                            <button id="dt-fp-btn-reset" style="flex: 1; background: #3a3a3a; border: 1px solid #555; border-radius: 4px; color: #fff; font-size: 12px; padding: 5px 0; cursor: pointer; text-align: center; transition: background 0.2s;" onmouseover="this.style.background='#4a4a4a'" onmouseout="this.style.background='#3a3a3a'">${T("重设")}</button>
                            <button id="dt-fp-btn-revert" style="flex: 1; background: #3a3a3a; border: 1px solid #555; border-radius: 4px; color: #fff; font-size: 12px; padding: 5px 0; cursor: pointer; text-align: center; transition: background 0.2s;" onmouseover="this.style.background='#4a4a4a'" onmouseout="this.style.background='#3a3a3a'">${T("归位")}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // ==========================================
    // 监听逻辑：数据绑定与状态持久化更新
    // ==========================================

    // 初次打开时，如果数据里自带尺寸，同步填充缩放区的输入框
    if (poseData.canvas_width && poseData.canvas_height) {
        document.getElementById("dt-z-w").value = poseData.canvas_width;
        document.getElementById("dt-z-h").value = poseData.canvas_height;
        state.zoom.w = poseData.canvas_width;
        state.zoom.h = poseData.canvas_height;
    }

    const updateState = () => {
        // 更新内存状态树
        state.zoom.w = parseInt(document.getElementById("dt-z-w").value) || 512;
        state.zoom.h = parseInt(document.getElementById("dt-z-h").value) || 512;
        state.zoom.mode = document.getElementById("dt-z-mode").value;
        state.zoom.align = document.getElementById("dt-z-align").value;
        state.zoom.x = parseInt(document.getElementById("dt-z-x").value) || 0;
        state.zoom.y = parseInt(document.getElementById("dt-z-y").value) || 0;

        // 修复 0 变 0.5 的问题，改为 isNaN 严谨校验
        let opVal = parseFloat(document.getElementById("dt-b-op-num").value);
        state.bg.opacity = isNaN(opVal) ? 0.5 : opVal;

        state.bg.w = parseInt(document.getElementById("dt-b-w").value) || 512;
        state.bg.h = parseInt(document.getElementById("dt-b-h").value) || 512;
        state.bg.x = parseInt(document.getElementById("dt-b-x").value) || 0;
        state.bg.y = parseInt(document.getElementById("dt-b-y").value) || 0;
        state.bg.auto_mode = document.getElementById("dt-b-auto-mode").value;
        state.bg.auto_align = document.getElementById("dt-b-auto-align").value;

        let ptsVal = parseInt(document.getElementById("dt-ui-pts-num").value);
        state.ui.point_size = isNaN(ptsVal) ? 4 : ptsVal;

        let poseOpVal = parseFloat(document.getElementById("dt-ui-pose-op-num").value);
        state.ui.pose_opacity = isNaN(poseOpVal) ? 1.0 : Math.max(0, Math.min(1, poseOpVal));

        let thVal = parseFloat(document.getElementById("dt-ui-thresh-num").value);
        state.ui.threshold = isNaN(thVal) ? 0.3 : thVal;

        state.ui.connect_feet = document.getElementById("dt-ui-conn-feet").checked;

        state.add_pose.hand = document.getElementById("dt-ap-hand").checked;
        state.add_pose.face = document.getElementById("dt-ap-face").checked;
        state.add_pose.face_pts = document.getElementById("dt-ap-face-pts").value;
        state.add_pose.foot = document.getElementById("dt-ap-foot").checked;
        state.add_pose.foot_pts = document.getElementById("dt-ap-foot-pts").value;
    };

    // 绑定所有输入控件的变化事件 (过滤掉联动同步的 slider)
    const allInputs = modal.querySelectorAll('input, select');
    allInputs.forEach(el => {
        if (!el.id.includes("-slider")) {
            el.addEventListener('input', updateState);
            el.addEventListener('change', updateState);
        }
    });

    // 绑定手风琴折叠逻辑
    const toggleAccordion = (headerId, contentId, iconId, stateObj) => {
        document.getElementById(headerId).onclick = () => {
            stateObj.collapsed = !stateObj.collapsed;
            document.getElementById(contentId).style.display = stateObj.collapsed ? 'none' : 'block';
            document.getElementById(iconId).innerText = stateObj.collapsed ? '<' : 'v';
        };
    };
    toggleAccordion("dt-z-header", "dt-z-content", "dt-z-icon", state.zoom);
    toggleAccordion("dt-b-header", "dt-b-content", "dt-b-icon", state.bg);

    // 背景拖动状态切换逻辑
    const btnDrag = document.getElementById("dt-b-drag");
    btnDrag.onclick = () => {
        state.bg.drag_mode = !state.bg.drag_mode;
        btnDrag.innerText = T("拖动底图: ") + (state.bg.drag_mode ? T("开") : T("关"));
        btnDrag.style.background = state.bg.drag_mode ? "#ff9800" : "#555";
    };

    // 底部/顶部通用取消按钮
    document.getElementById("dt-btn-cancel").onclick = () => {
        modal.remove();
    };

    // 启动渲染与数据流转引擎
    initEditorEngine(node, poseData, state, updateState);
}

// =========================================================================
// ✏️ 通用型 Pose 编辑器 - 核心画布渲染与数据流转引擎
// =========================================================================
function initEditorEngine(node, poseData, state, updateStateCallback) {
    // 1. 数据隔离克隆
    let workingPose = JSON.parse(JSON.stringify(poseData));
    const backupPose = JSON.parse(JSON.stringify(poseData));
    let bgImgObject = null;

    // 自由变换(Transform)核心变量 (提前声明以防止 TDZ / 悬空引用)
    let pivot = null;
    let pivotRelativeX = 0.5, pivotRelativeY = 0.5;
    let bboxAngle = 0; // 绕锚点旋转的角度（弧度）
    let bboxScaleX = 1.0;
    let bboxScaleY = 1.0;
    let lastSelKey = "";
    let innerBbox = null, outerBbox = null;
    let initialBboxCenter = null; // 选择开始时的初始包围盒中心点，用于计算中心偏移量
    let selectionStartPointsSnapshot = {}; // 选择开始时所有被选中关键点的初始坐标快照，用于“归位”操作

    // 拖拽时的起始数值，用于解析计算有向包围盒(OBB)的缩放和旋转
    let startBboxAngle = 0;
    let startBboxCenter = { x: 0, y: 0 };
    let startBboxWidth = 0;
    let startBboxHeight = 0;
    let startPivot = { x: 0, y: 0 };
    let startBboxScaleX = 1.0;
    let startBboxScaleY = 1.0;

    // 🔥 历史记录与撤回引擎 (Ctrl+Z)
    let poseHistory = [];
    let redoHistory = []; // 新增重做栈

    const saveHistory = () => {
        if (poseHistory.length > 30) poseHistory.shift();
        poseHistory.push(JSON.stringify({
            workingPose: workingPose,
            pivot: pivot ? { x: pivot.x, y: pivot.y } : null,
            pivotRelativeX: pivotRelativeX,
            pivotRelativeY: pivotRelativeY,
            bboxAngle: bboxAngle,
            bboxScaleX: bboxScaleX,
            bboxScaleY: bboxScaleY,
            innerBbox: innerBbox ? { cx: innerBbox.cx, cy: innerBbox.cy, w: innerBbox.w, h: innerBbox.h } : null,
            outerBbox: outerBbox ? { cx: outerBbox.cx, cy: outerBbox.cy, w: outerBbox.w, h: outerBbox.h } : null,
            lastSelKey: lastSelKey,
            initialBboxCenter: initialBboxCenter ? { x: initialBboxCenter.x, y: initialBboxCenter.y } : null,
            selectionStartPointsSnapshot: selectionStartPointsSnapshot ? JSON.parse(JSON.stringify(selectionStartPointsSnapshot)) : {}
        }));
        redoHistory = []; // 一旦有任何新的手动操作，彻底清空重做栈
    };
    saveHistory(); // 保存初始状态

    const undoHandler = (e) => {
        // 防内存泄漏：如果弹窗被关闭，自动解绑全局事件
        if (!document.getElementById("dt-pose-editor-modal")) {
            document.removeEventListener("keydown", undoHandler);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (poseHistory.length > 1) {
                redoHistory.push(poseHistory.pop());
                const histState = JSON.parse(poseHistory[poseHistory.length - 1]);
                workingPose = histState.workingPose;
                pivot = histState.pivot;
                pivotRelativeX = histState.pivotRelativeX;
                pivotRelativeY = histState.pivotRelativeY;
                bboxAngle = histState.bboxAngle || 0;
                bboxScaleX = histState.bboxScaleX !== undefined ? histState.bboxScaleX : 1.0;
                bboxScaleY = histState.bboxScaleY !== undefined ? histState.bboxScaleY : 1.0;
                innerBbox = histState.innerBbox;
                outerBbox = histState.outerBbox;
                lastSelKey = histState.lastSelKey || "";
                initialBboxCenter = histState.initialBboxCenter;
                selectionStartPointsSnapshot = histState.selectionStartPointsSnapshot || {};
                calcBBox(true); drawCanvas(); renderTree();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            if (redoHistory.length > 0) {
                const nextState = redoHistory.pop();
                poseHistory.push(nextState);
                const histState = JSON.parse(nextState);
                workingPose = histState.workingPose;
                pivot = histState.pivot;
                pivotRelativeX = histState.pivotRelativeX;
                pivotRelativeY = histState.pivotRelativeY;
                bboxAngle = histState.bboxAngle || 0;
                bboxScaleX = histState.bboxScaleX !== undefined ? histState.bboxScaleX : 1.0;
                bboxScaleY = histState.bboxScaleY !== undefined ? histState.bboxScaleY : 1.0;
                innerBbox = histState.innerBbox;
                outerBbox = histState.outerBbox;
                lastSelKey = histState.lastSelKey || "";
                initialBboxCenter = histState.initialBboxCenter;
                selectionStartPointsSnapshot = histState.selectionStartPointsSnapshot || {};
                calcBBox(true); drawCanvas(); renderTree();
            }
        }
    };
    document.addEventListener("keydown", undoHandler);

    // 🔥 第三阶段交互状态引擎变量
    let selSet = new Set();
    let lockSet = new Set();
    let v_scale = 1.0, v_x = 0, v_y = 0; // 视口缩放与平移
    let isFirstDraw = true;
    let isDragging = false, dragType = null; // 'pan', 'bg', 'points', 'marquee', 'pivot', 'handle', 'rotate'
    let lastMx = 0, lastMy = 0, startMx = 0, startMy = 0;
    let marqueeStart = null, marqueeEnd = null;

    // 自由变换(Transform)核心变量
    let transformSnapshot = [], transformAnchor = null, activeHandle = null;
    let startAngle = 0;

    const cvs = document.getElementById("dt-canvas");
    const ctx = cvs.getContext("2d");

    // 缩小新增人物按钮前后的空隙
    document.getElementById("dt-t-add").parentElement.style.padding = "5px 10px";
    document.getElementById("dt-tree-container").style.padding = "5px 10px";

    // 浮动面板 UI 同步器
    const updateFloatPanelUI = () => {
        const panel = document.getElementById("dt-float-panel");
        if (selSet.size <= 1) { panel.style.display = "none"; return; }
        panel.style.display = "flex";

        // 恢复之前保存的位置并限制在画布包装区内
        if (state.ui && state.ui.float_panel_pos && state.ui.float_panel_pos.left !== undefined) {
            panel.style.right = 'auto';
            const wrapper = document.getElementById("dt-canvas-wrapper");
            let targetLeft = state.ui.float_panel_pos.left;
            let targetTop = state.ui.float_panel_pos.top;
            if (wrapper) {
                const maxLeft = Math.max(0, wrapper.clientWidth - panel.offsetWidth);
                const maxTop = Math.max(0, wrapper.clientHeight - panel.offsetHeight);
                targetLeft = Math.max(0, Math.min(targetLeft, maxLeft));
                targetTop = Math.max(0, Math.min(targetTop, maxTop));
            }
            panel.style.left = targetLeft + 'px';
            panel.style.top = targetTop + 'px';
        } else {
            panel.style.right = '15px';
            panel.style.top = '15px';
            panel.style.left = 'auto';
        }

        if (pivot) {
            document.getElementById("dt-fp-px").value = parseFloat(pivot.x.toFixed(3));
            document.getElementById("dt-fp-py").value = parseFloat(pivot.y.toFixed(3));
        }
        const ox = innerBbox && initialBboxCenter ? innerBbox.cx - initialBboxCenter.x : 0.0;
        const oy = innerBbox && initialBboxCenter ? innerBbox.cy - initialBboxCenter.y : 0.0;
        document.getElementById("dt-fp-ox").value = ox.toFixed(3);
        document.getElementById("dt-fp-oy").value = oy.toFixed(3);
        document.getElementById("dt-fp-sx").value = bboxScaleX.toFixed(3);
        document.getElementById("dt-fp-sy").value = bboxScaleY.toFixed(3);
        document.getElementById("dt-fp-rot").value = (bboxAngle * (180 / Math.PI)).toFixed(3);
    };

    // 核心矩阵变换器
    const applyTransform = (snapshot, sx, sy, angleDeg, origin) => {
        const rad = angleDeg * (Math.PI / 180);
        const cos_rot = Math.cos(rad), sin_rot = Math.sin(rad);
        const cos0 = Math.cos(startBboxAngle);
        const sin0 = Math.sin(startBboxAngle);
        snapshot.forEach(pt => {
            const { p, arr, i, ox, oy } = pt;
            // 1. 计算相对于变换锚点(anchor)的坐标偏移
            const dx = ox - origin.x;
            const dy = oy - origin.y;
            // 2. 投影到起始有向包围盒(OBB)的局部轴上
            const lx = dx * cos0 + dy * sin0;
            const ly = -dx * sin0 + dy * cos0;
            // 3. 沿局部轴进行缩放
            const lx_scaled = lx * sx;
            const ly_scaled = ly * sy;
            // 4. 转换回与起始 OBB 对齐的世界坐标
            const nx = origin.x + lx_scaled * cos0 - ly_scaled * sin0;
            const ny = origin.y + lx_scaled * sin0 + ly_scaled * cos0;
            // 5. 绕中心锚点(pivot)旋转 angleDeg 角度
            let rx, ry;
            if (angleDeg !== 0) {
                rx = pivot.x + (nx - pivot.x) * cos_rot - (ny - pivot.y) * sin_rot;
                ry = pivot.y + (nx - pivot.x) * sin_rot + (ny - pivot.y) * cos_rot;
            } else {
                rx = nx;
                ry = ny;
            }
            workingPose.people[p][arr][i * 3] = rx;
            workingPose.people[p][arr][i * 3 + 1] = ry;
            // 实时同步左侧树数值
            const inX = document.querySelector(`.pt-inp[data-id="${p}|${arr}|${i}"][data-comp="0"]`);
            const inY = document.querySelector(`.pt-inp[data-id="${p}|${arr}|${i}"][data-comp="1"]`);
            if (inX) inX.value = Math.round(rx);
            if (inY) inY.value = Math.round(ry);
        });
    };

    // 抓取当前快照
    const createSnapshot = () => {
        transformSnapshot = [];
        selSet.forEach(id => {
            if (lockSet.has(id)) return;
            const [p, arr, i] = id.split('|');
            transformSnapshot.push({ p, arr, i, ox: workingPose.people[p][arr][i * 3], oy: workingPose.people[p][arr][i * 3 + 1] });
        });
    };

    const getSelKey = () => {
        const ids = Array.from(selSet);
        ids.sort();
        return ids.join(",");
    };

    const calcBBox = (keepPivot = false) => {
        if (selSet.size <= 1) {
            innerBbox = null;
            outerBbox = null;
            pivot = null;
            bboxAngle = 0;
            bboxScaleX = 1.0;
            bboxScaleY = 1.0;
            lastSelKey = "";
            initialBboxCenter = null;
            updateFloatPanelUI();
            return;
        }
        const currentSelKey = getSelKey();
        if (currentSelKey !== lastSelKey) {
            // 全新选择：计算 AABB 并重置角度与缩放
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            selSet.forEach(id => {
                const [p, arr, i] = id.split('|');
                const x = workingPose.people[p][arr][i * 3], y = workingPose.people[p][arr][i * 3 + 1];
                if (x < minX) minX = x; if (y < minY) minY = y;
                if (x > maxX) maxX = x; if (y > maxY) maxY = y;
            });
            innerBbox = { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
            outerBbox = { cx: innerBbox.cx, cy: innerBbox.cy, w: innerBbox.w + 30, h: innerBbox.h + 30 };
            bboxAngle = 0;
            bboxScaleX = 1.0;
            bboxScaleY = 1.0;
            pivot = { x: innerBbox.cx, y: innerBbox.cy };
            lastSelKey = currentSelKey;
            initialBboxCenter = { x: innerBbox.cx, y: innerBbox.cy };

            // 保存初始选中的关键点坐标快照
            selectionStartPointsSnapshot = {};
            selSet.forEach(id => {
                const [p, arr, i] = id.split('|');
                selectionStartPointsSnapshot[id] = {
                    x: workingPose.people[p][arr][i * 3],
                    y: workingPose.people[p][arr][i * 3 + 1]
                };
            });
        } else {
            // 相同选择
            if (isDragging) {
                // 拖拽期间，拖拽处理器解析地计算 OBB，所以我们不需要从点坐标重新计算！
                if (dragType === 'handle') {
                    const cos = Math.cos(bboxAngle);
                    const sin = Math.sin(bboxAngle);
                    const lx_pivot_new = (pivotRelativeX - 0.5) * innerBbox.w;
                    const ly_pivot_new = (pivotRelativeY - 0.5) * innerBbox.h;
                    pivot = {
                        x: innerBbox.cx + lx_pivot_new * cos - ly_pivot_new * sin,
                        y: innerBbox.cy + lx_pivot_new * sin + ly_pivot_new * cos
                    };
                }
            } else {
                // 选择相同但我们没有在拖拽（可能是撤销/重做、点输入变化、或刚结束拖拽）。
                // 如果 keepPivot 为 true，我们保留 innerBbox, outerBbox 和 bboxAngle（例如在控制面板编辑或撤销/重做之后）。
                if (keepPivot) {
                    // 不要从绝对坐标重建；保留 OBB 结构！
                } else {
                    // 从点坐标重建 AABB 并重置角度，因为在变换之外发生了手动点位编辑
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    selSet.forEach(id => {
                        const [p, arr, i] = id.split('|');
                        const x = workingPose.people[p][arr][i * 3], y = workingPose.people[p][arr][i * 3 + 1];
                        if (x < minX) minX = x; if (y < minY) minY = y;
                        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
                    });
                    innerBbox = { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
                    outerBbox = { cx: innerBbox.cx, cy: innerBbox.cy, w: innerBbox.w + 30, h: innerBbox.h + 30 };
                    bboxAngle = 0;
                    bboxScaleX = 1.0;
                    bboxScaleY = 1.0;
                    pivot = { x: innerBbox.cx, y: innerBbox.cy };
                    initialBboxCenter = { x: innerBbox.cx, y: innerBbox.cy };
                }
            }
        }
        updateFloatPanelUI();
    };

    // 官方连线字典与彩虹色谱
    const body_limbSeq = [[1, 2], [1, 5], [2, 3], [3, 4], [5, 6], [6, 7], [1, 8], [8, 9], [9, 10], [1, 11], [11, 12], [12, 13], [1, 0], [0, 14], [14, 16], [0, 15], [15, 17]];
    const hand_edges = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20]];
    const colors = [[255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]];

    const HSVtoRGB = (h, s, v) => {
        let r, g, b, i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
        switch (i % 6) { case 0: r = v, g = t, b = p; break; case 1: r = q, g = v, b = p; break; case 2: r = p, g = v, b = t; break; case 3: r = p, g = q, b = v; break; case 4: r = t, g = p, b = v; break; case 5: r = v, g = p, b = q; break; }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    // 2. 无边界视口极速重绘引擎
    const drawCanvas = () => {
        const wrapper = document.getElementById("dt-canvas-wrapper");
        if (wrapper.clientWidth === 0) return;
        // 拖拽边框时的画面偏移：计算容器变化差值，按比例动态补偿视口平移
        if (!isFirstDraw && cvs.width > 0 && cvs.height > 0) {
            v_x += (wrapper.clientWidth - cvs.width) / 2;
            v_y += (wrapper.clientHeight - cvs.height) / 2;
        }

        // 强行把 canvas 的像素尺寸和外壳物理尺寸 1:1 绑定，突破死板截断
        cvs.width = wrapper.clientWidth; cvs.height = wrapper.clientHeight;

        const cw = workingPose.canvas_width || state.zoom.w;
        const ch = workingPose.canvas_height || state.zoom.h;

        // 首次绘制时，计算让有效画布在视口居中显示的缩放倍率
        if (isFirstDraw) {
            v_scale = Math.min((cvs.width - 60) / cw, (cvs.height - 60) / ch);
            if (v_scale <= 0) v_scale = 1;
            v_x = (cvs.width - cw * v_scale) / 2;
            v_y = (cvs.height - ch * v_scale) / 2;
            isFirstDraw = false;
        }

        // 画布外的无限底色 (深灰)
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        ctx.save();
        ctx.translate(v_x, v_y);
        ctx.scale(v_scale, v_scale);

        // 真实的逻辑画布底色 (纯黑)
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, cw, ch);

        if (bgImgObject && state.bg.opacity > 0) {
            ctx.globalAlpha = state.bg.opacity;
            ctx.drawImage(bgImgObject, state.bg.x, state.bg.y, state.bg.w, state.bg.h);
            ctx.globalAlpha = 1.0;
        }

        const radius = state.ui.point_size;

        // 🔥 注入 Pose 的透明度状态
        ctx.globalAlpha = state.ui.pose_opacity;

        workingPose.people.forEach((p, pIdx) => {
            // 🔥 核心：增加置信度 <= 0 的彻底隐藏判定
            const getPt = (arr, i) => {
                if (!p[arr]) return null;
                const score = p[arr][i * 3 + 2];
                const id = `${pIdx}|${arr}|${i}`;
                if (score <= 0 || (score < state.ui.threshold && !selSet.has(id))) return null;
                return { x: p[arr][i * 3], y: p[arr][i * 3 + 1], id: id };
            };

            body_limbSeq.forEach((limb, i) => {
                const pt1 = getPt('pose_keypoints_2d', limb[0]), pt2 = getPt('pose_keypoints_2d', limb[1]);
                if (pt1 && pt2) { ctx.beginPath(); ctx.moveTo(pt1.x, pt1.y); ctx.lineTo(pt2.x, pt2.y); ctx.strokeStyle = `rgb(${colors[i % colors.length].join(',')})`; ctx.lineWidth = 2; ctx.stroke(); }
            });
            ['hand_left_keypoints_2d', 'hand_right_keypoints_2d'].forEach(k => {
                hand_edges.forEach((edge, i) => {
                    const pt1 = getPt(k, edge[0]), pt2 = getPt(k, edge[1]);
                    if (pt1 && pt2) { ctx.beginPath(); ctx.moveTo(pt1.x, pt1.y); ctx.lineTo(pt2.x, pt2.y); ctx.strokeStyle = `rgb(${HSVtoRGB(i / 20.0, 1, 1).join(',')})`; ctx.lineWidth = 2; ctx.stroke(); }
                });
            });

            // 脚部点位动态“对半切”向脚踝连线逻辑
            if (state.ui.connect_feet && p['foot_keypoints_2d']) {
                const foot_len = p['foot_keypoints_2d'].length / 3;
                const mid = Math.floor(foot_len / 2);
                for (let i = 0; i < foot_len; i++) {
                    const ptF = getPt('foot_keypoints_2d', i);
                    if (ptF) {
                        const ankleIdx = (i < mid) ? 13 : 10; // 左脚踝13，右脚踝10
                        const ptA = getPt('pose_keypoints_2d', ankleIdx);
                        if (ptA) {
                            ctx.beginPath(); ctx.moveTo(ptF.x, ptF.y); ctx.lineTo(ptA.x, ptA.y);
                            ctx.strokeStyle = `rgb(${colors[(18 + i) % colors.length].join(',')})`; ctx.lineWidth = 2; ctx.stroke();
                        }
                    }
                }
            }

            const drawPts = (arr, colorOverride, colorShift) => {
                if (!p[arr]) return;
                for (let i = 0; i < p[arr].length / 3; i++) {
                    const pt = getPt(arr, i);
                    if (pt) {
                        ctx.beginPath(); ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
                        if (selSet.has(pt.id)) { ctx.lineWidth = 3; ctx.strokeStyle = "#FFEB3B"; ctx.stroke(); }
                        ctx.fillStyle = colorOverride || `rgb(${colors[(i + colorShift) % colors.length].join(',')})`; ctx.fill();
                    }
                }
            };
            drawPts('pose_keypoints_2d', null, 0); drawPts('foot_keypoints_2d', null, 18);
            drawPts('hand_left_keypoints_2d', null, 0); drawPts('hand_right_keypoints_2d', null, 0);
            drawPts('face_keypoints_2d', 'white');
        });

        // 🔥 必须重置透明度，防止虚线框和边界框变淡
        ctx.globalAlpha = 1.0;

        // 画布边缘的白虚线，盖在所有骨骼和图片之上
        ctx.beginPath();
        ctx.rect(0, 0, cw, ch);
        ctx.lineWidth = 1.5 / v_scale;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.setLineDash([8 / v_scale, 8 / v_scale]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 🔥 绘制自由变换控件
        if (outerBbox && innerBbox && pivot) {
            ctx.save();
            ctx.translate(innerBbox.cx, innerBbox.cy);
            ctx.rotate(bboxAngle);

            // 1. 真实边界框 (内框，半透明白虚线)
            ctx.beginPath();
            ctx.rect(-innerBbox.w / 2, -innerBbox.h / 2, innerBbox.w, innerBbox.h);
            ctx.lineWidth = 1 / v_scale;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.setLineDash([4 / v_scale, 4 / v_scale]);
            ctx.stroke();
            ctx.setLineDash([]);

            // 2. 交互边界框 (外框，绿色底)
            ctx.beginPath();
            ctx.rect(-outerBbox.w / 2, -outerBbox.h / 2, outerBbox.w, outerBbox.h);
            ctx.lineWidth = 1.5 / v_scale;
            ctx.strokeStyle = "#4CAF50";
            ctx.stroke();
            ctx.fillStyle = "rgba(76, 175, 80, 0.05)";
            ctx.fill();

            // 3. 绘制 8 个控制柄
            const hs = 9 / v_scale; // handle size
            const drawH = (lx, ly) => {
                ctx.fillRect(lx - hs / 2, ly - hs / 2, hs, hs);
                ctx.strokeRect(lx - hs / 2, ly - hs / 2, hs, hs);
            };
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1 / v_scale;

            const ow = outerBbox.w, oh = outerBbox.h;
            drawH(-ow / 2, -oh / 2); drawH(0, -oh / 2); drawH(ow / 2, -oh / 2);
            drawH(-ow / 2, 0); drawH(ow / 2, 0);
            drawH(-ow / 2, oh / 2); drawH(0, oh / 2); drawH(ow / 2, oh / 2);

            ctx.restore();

            // 4. 绘制十字准星锚点 (Pivot) (🔥 调大尺寸并增加亮黄色醒目底板)
            const pr = 9 / v_scale, pl = 12 / v_scale; // pr=圆心半径, pl=十字线长度
            ctx.beginPath(); ctx.arc(pivot.x, pivot.y, pr, 0, Math.PI * 2);
            ctx.fillStyle = "#FFEB3B"; ctx.fill();
            ctx.lineWidth = 1.5 / v_scale; ctx.strokeStyle = "#222"; ctx.stroke();

            ctx.beginPath(); ctx.moveTo(pivot.x, pivot.y - pl); ctx.lineTo(pivot.x, pivot.y + pl); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pivot.x - pl, pivot.y); ctx.lineTo(pivot.x + pl, pivot.y); ctx.stroke();
        }

        if (dragType === 'marquee' && marqueeStart && marqueeEnd) {
            const mx = Math.min(marqueeStart.x, marqueeEnd.x), my = Math.min(marqueeStart.y, marqueeEnd.y);
            const mw = Math.abs(marqueeStart.x - marqueeEnd.x), mh = Math.abs(marqueeStart.y - marqueeEnd.y);
            ctx.beginPath(); ctx.rect(mx, my, mw, mh);
            ctx.lineWidth = 1 / v_scale; ctx.strokeStyle = "#2196F3"; ctx.setLineDash([4 / v_scale, 4 / v_scale]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = "rgba(33, 150, 243, 0.2)"; ctx.fill();
        }
        ctx.restore();
    };

    // 3. 强互动的层级树 DOM 引擎 (🔥 彻底重构：阻止冒泡与一次性 DOM 生成)
    const expandedDetails = new Set();
    let isFirstTreeRender = true;

    const renderTree = () => {
        const container = document.getElementById("dt-tree-container");

        if (!isFirstTreeRender) {
            container.querySelectorAll("details").forEach(d => {
                if (d.id) {
                    if (d.open) expandedDetails.add(d.id);
                    else expandedDetails.delete(d.id);
                }
            });
        }
        container.innerHTML = "";

        const eyeUI = (isVis, ids) => `<span class="dt-vis" data-ids='${JSON.stringify(ids)}' style="cursor:pointer; margin-right:5px; filter: grayscale(${isVis ? 0 : 1}); opacity:${isVis ? 1 : 0.3}" title="${T("可见性")}">👁️</span>`;
        const lockUI = (isLock, ids) => `<span class="dt-lock" data-ids='${JSON.stringify(ids)}' style="cursor:pointer; margin-right:5px; filter: grayscale(${isLock ? 0 : 1}); opacity:${isLock ? 1 : 0.3}" title="${T("锁定")}">🔒</span>`;
        const selUI = (isSel, ids) => `<input type="checkbox" class="dt-sel" data-ids='${JSON.stringify(ids)}' ${isSel ? 'checked' : ''} style="margin-right:5px; cursor:pointer;" title="${T("选中")}">`;

        const getAllIds = (pIdx, arrName) => {
            let ids = [];
            const p = workingPose.people[pIdx];
            if (arrName) {
                if (p[arrName]) for (let i = 0; i < p[arrName].length / 3; i++) ids.push(`${pIdx}|${arrName}|${i}`);
            } else {
                ['pose_keypoints_2d', 'foot_keypoints_2d', 'face_keypoints_2d', 'hand_left_keypoints_2d', 'hand_right_keypoints_2d'].forEach(k => {
                    if (p[k]) for (let i = 0; i < p[k].length / 3; i++) ids.push(`${pIdx}|${k}|${i}`);
                });
            }
            return ids;
        };

        workingPose.people.forEach((p, pIdx) => {
            const pIds = getAllIds(pIdx, null);
            const pLocked = pIds.length > 0 && pIds.every(id => lockSet.has(id));
            const pSelected = pIds.length > 0 && pIds.every(id => selSet.has(id));
            const pVis = pIds.length > 0 && pIds.every(id => { const [pp, aa, ii] = id.split('|'); return workingPose.people[pp][aa][ii * 3 + 2] > 0; });

            const pId = `dt-p-${pIdx}`;
            if (isFirstTreeRender) expandedDetails.add(pId);

            const pDiv = document.createElement("details");
            pDiv.id = pId;
            pDiv.open = expandedDetails.has(pId);

            let pHTML = `<summary style="padding:5px; background:#2a2a2a; border:1px solid #444; border-radius:4px; margin-bottom:4px; cursor:pointer; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center;">${eyeUI(pVis, pIds)}${lockUI(pLocked, pIds)}${selUI(pSelected, pIds)} <span>${T("人物 ")}${pIdx}</span></div>
                <span class="dt-del" data-p="${pIdx}" style="color:#f44336; cursor:pointer;">${T("[删除]")}</span>
            </summary>`;

            const buildSection = (title, arrName, namesList) => {
                if (!p[arrName] || p[arrName].length === 0) return "";
                const secIds = getAllIds(pIdx, arrName);
                const sLocked = secIds.length > 0 && secIds.every(id => lockSet.has(id));
                const sSelected = secIds.length > 0 && secIds.every(id => selSet.has(id));
                const sVis = secIds.length > 0 && secIds.every(id => { const [pp, aa, ii] = id.split('|'); return workingPose.people[pp][aa][ii * 3 + 2] > 0; });

                const secId = `dt-sec-${pIdx}-${arrName}`;
                const isOpen = expandedDetails.has(secId) ? 'open' : '';

                let html = `<details id="${secId}" ${isOpen} style="margin-left:15px;"><summary style="padding:4px 5px; background:#2a2a2a; border:1px solid #444; border-radius:4px; margin-bottom:4px; cursor:pointer; display:flex; align-items:center;">${eyeUI(sVis, secIds)}${lockUI(sLocked, secIds)}${selUI(sSelected, secIds)} <span>${T(title)}</span></summary><div style="padding-left:15px;">`;
                for (let i = 0; i < p[arrName].length / 3; i++) {
                    const x = p[arrName][i * 3], y = p[arrName][i * 3 + 1], actual_s = p[arrName][i * 3 + 2];
                    const name = namesList ? (namesList[i] ? T(namesList[i]) : T("点") + i) : T("点") + i;
                    const id = `${pIdx}|${arrName}|${i}`;
                    const isVis = actual_s > 0;

                    html += `<div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom:4px; background:#222; border:1px solid #444; border-radius:4px; padding:3px 5px; font-family:monospace; gap:3px;">
                        <div style="margin-right:auto; display:flex; align-items:center;">${eyeUI(isVis, [id])}${lockUI(lockSet.has(id), [id])}${selUI(selSet.has(id), [id])} <span>${name}</span></div>
                        <span style="color:#888; font-size:11px;">X:</span><input class="pt-inp" data-id="${id}" data-comp="0" type="number" step="any" ${lockSet.has(id) ? 'disabled' : ''} value="${x}" style="width:80px; background:#111; color:#fff; border:1px solid #555;">
                        <span style="color:#888; font-size:11px;">Y:</span><input class="pt-inp" data-id="${id}" data-comp="1" type="number" step="any" ${lockSet.has(id) ? 'disabled' : ''} value="${y}" style="width:80px; background:#111; color:#fff; border:1px solid #555;">
                        <span style="color:#888; font-size:11px;">${T("分数:")}</span><input class="pt-inp" data-id="${id}" data-comp="2" type="number" step="any" min="-0.999999" max="1" ${lockSet.has(id) ? 'disabled' : ''} value="${actual_s}" style="width:90px; background:#111; color:#fff; border:1px solid #555;">
                    </div>`;
                }
                html += `</div></details>`; return html;
            };

            const bodyNames = ["鼻子", "脖颈", "右肩", "右肘", "右腕", "左肩", "左肘", "左腕", "右髋", "右膝", "右踝", "左髋", "左膝", "左踝", "右眼", "左眼", "右耳", "左耳"];
            const handNames = ["手腕", "拇指1", "拇指2", "拇指3", "拇指4", "食指1", "食指2", "食指3", "食指4", "中指1", "中指2", "中指3", "中指4", "无名1", "无名2", "无名3", "无名4", "小指1", "小指2", "小指3", "小指4"];

            pHTML += buildSection("躯干", "pose_keypoints_2d", bodyNames);
            pHTML += buildSection("手部(左)", "hand_left_keypoints_2d", handNames);
            pHTML += buildSection("手部(右)", "hand_right_keypoints_2d", handNames);
            pHTML += buildSection("脚部", "foot_keypoints_2d", null);
            pHTML += buildSection("面部", "face_keypoints_2d", null);

            pDiv.innerHTML = pHTML;
            container.appendChild(pDiv);
        });

        // ================= 🌲 直接绑定输入与点击事件引擎 =================
        container.querySelectorAll(".pt-inp").forEach(inp => {
            inp.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    e.target.blur();
                }
            });
            inp.addEventListener("change", (e) => {
                const ds = e.target.dataset;
                const [p, arr, i] = ds.id.split('|');
                const comp = parseInt(ds.comp);

                let val = parseFloat(e.target.value);
                if (isNaN(val)) val = 0;

                if (comp === 2) {
                    val = Math.max(-0.999999, Math.min(1, val));
                    e.target.value = val;
                    workingPose.people[p][arr][i * 3 + 2] = val;
                } else {
                    workingPose.people[p][arr][i * 3 + comp] = val;
                    e.target.value = val;
                }
                calcBBox(); drawCanvas(); renderTree();
                saveHistory(); // 🔥 记录修改历史
            });
        });

        // 🔥 强力阻断机制：独立绑定点击事件并停止冒泡
        container.querySelectorAll(".dt-vis").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault(); e.stopPropagation();
                const targetIds = JSON.parse(btn.dataset.ids);
                const allVis = targetIds.every(id => { const [p, arr, i] = id.split('|'); return workingPose.people[p][arr][i * 3 + 2] > 0; });
                targetIds.forEach(id => {
                    const [p, arr, i] = id.split('|');
                    let sc = workingPose.people[p][arr][i * 3 + 2];
                    if (allVis && sc > 0) workingPose.people[p][arr][i * 3 + 2] = (sc === 1) ? 0 : -sc;
                    else if (!allVis && sc <= 0) workingPose.people[p][arr][i * 3 + 2] = (sc === 0) ? 1 : Math.abs(sc);
                });
                calcBBox(); renderTree(); drawCanvas();
                saveHistory(); // 🔥 记录可见性历史
            });
        });

        container.querySelectorAll(".dt-lock").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault(); e.stopPropagation();
                const targetIds = JSON.parse(btn.dataset.ids);
                const allLocked = targetIds.every(id => lockSet.has(id));
                if (allLocked) targetIds.forEach(id => lockSet.delete(id)); else targetIds.forEach(id => lockSet.add(id));
                renderTree(); drawCanvas();
            });
        });

        container.querySelectorAll(".dt-sel").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const targetIds = JSON.parse(btn.dataset.ids);
                const allSelected = targetIds.every(id => selSet.has(id));
                if (allSelected) targetIds.forEach(id => selSet.delete(id)); else targetIds.forEach(id => selSet.add(id));
                calcBBox(); renderTree(); drawCanvas();
            });
        });

        container.querySelectorAll(".dt-del").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault(); e.stopPropagation();
                const pIdx = parseInt(btn.dataset.p);
                workingPose.people.splice(pIdx, 1);
                selSet.clear(); lockSet.clear(); calcBBox(); renderTree(); drawCanvas();
                saveHistory(); // 🔥 记录删除历史
            });
        });

        isFirstTreeRender = false;
    };

    // 4. 重映射数学引擎 (🔥 修复历史数据污染崩溃)
    const calcMatrix = (cw, ch, iw, ih, mode, align) => {
        mode = mode || "自适应";
        align = align || "居中";
        iw = Math.max(1, iw); ih = Math.max(1, ih); // 防止除0错误

        let sx = 1, sy = 1;
        if (mode === "自适应") { let s = Math.min(cw / iw, ch / ih); sx = s; sy = s; }
        else if (mode === "拉伸") { sx = cw / iw; sy = ch / ih; }
        else if (mode === "裁切") { let s = Math.max(cw / iw, ch / ih); sx = s; sy = s; }
        else if (mode === "对齐高度") { let s = ch / ih; sx = s; sy = s; }
        else if (mode === "对齐宽度") { let s = cw / iw; sx = s; sy = s; }

        let rw = cw - (iw * sx), rh = ch - (ih * sy), ax = 0, ay = 0;
        if (align.includes("居中")) { ax = rw / 2; ay = rh / 2; }
        if (align.includes("左")) ax = 0; if (align.includes("右")) ax = rw;
        if (align.includes("上")) ay = 0; if (align.includes("下")) ay = rh;
        return { sx, sy, ax, ay };
    };

    // 5. 事件绑定：应用骨架重映射
    document.getElementById("dt-z-apply").onclick = () => {
        let cw = state.zoom.w, ch = state.zoom.h;
        let iw = workingPose.canvas_width || cw, ih = workingPose.canvas_height || ch;

        if (cw === iw && ch === ih && state.zoom.x === 0 && state.zoom.y === 0) return;

        let mat = calcMatrix(cw, ch, iw, ih, state.zoom.mode, state.zoom.align);
        let fx = mat.ax + state.zoom.x, fy = mat.ay + state.zoom.y;

        workingPose.people.forEach(p => {
            ['pose_keypoints_2d', 'foot_keypoints_2d', 'face_keypoints_2d', 'hand_left_keypoints_2d', 'hand_right_keypoints_2d'].forEach(k => {
                if (p[k]) {
                    for (let i = 0; i < p[k].length; i += 3) {
                        if (p[k][i + 2] > 0) {
                            p[k][i] = p[k][i] * mat.sx + fx; p[k][i + 1] = p[k][i + 1] * mat.sy + fy;
                        }
                    }
                }
            });
        });
        workingPose.canvas_width = cw; workingPose.canvas_height = ch;
        document.getElementById("dt-z-x").value = 0; document.getElementById("dt-z-y").value = 0;
        updateStateCallback(); drawCanvas(); renderTree();
        saveHistory(); // 🔥 记录映射历史
    };

    // 6. 事件绑定：复位
    document.getElementById("dt-z-reset").onclick = () => {
        workingPose = JSON.parse(JSON.stringify(backupPose));
        document.getElementById("dt-z-w").value = workingPose.canvas_width || 512;
        document.getElementById("dt-z-h").value = workingPose.canvas_height || 512;
        document.getElementById("dt-z-x").value = 0; document.getElementById("dt-z-y").value = 0;
        updateStateCallback(); drawCanvas(); renderTree();
        saveHistory(); // 🔥 记录复位历史
    };

    // 7. 事件绑定：自动对齐底图
    document.getElementById("dt-b-auto-apply").onclick = () => {
        if (!bgImgObject) return;
        let mat = calcMatrix(state.zoom.w, state.zoom.h, bgImgObject.naturalWidth, bgImgObject.naturalHeight, state.bg.auto_mode, state.bg.auto_align);
        document.getElementById("dt-b-w").value = Math.round(bgImgObject.naturalWidth * mat.sx);
        document.getElementById("dt-b-h").value = Math.round(bgImgObject.naturalHeight * mat.sy);
        document.getElementById("dt-b-x").value = Math.round(mat.ax);
        document.getElementById("dt-b-y").value = Math.round(mat.ay);
        updateStateCallback(); drawCanvas();
    };

    // 8. 事件绑定：加载底图 (🔥 修复竞态条件 Bug)
    document.getElementById("dt-b-load").onclick = async () => {
        const btn = document.getElementById("dt-b-load");
        btn.innerText = T("获取中..."); btn.disabled = true;

        try {
            const { api } = await import("../../scripts/api.js");
            const getUrl = (path) => window.location.pathname.replace(/\/$/, '') + path;
            const p = await app.graphToPrompt();
            const prompt = p.output;

            // 顺藤摸瓜：仅保留当前节点及其祖先节点
            const keep_ids = new Set();
            function trace(id) {
                if (keep_ids.has(id)) return;
                keep_ids.add(id);
                const n = prompt[id];
                if (n && n.inputs) {
                    for (let k in n.inputs) {
                        let v = n.inputs[k];
                        if (Array.isArray(v) && v.length >= 1) trace(String(v[0]));
                    }
                }
            }
            trace(String(node.id));
            for (let k in prompt) { if (!keep_ids.has(k)) delete prompt[k]; }

            const processImg = (path) => {
                node.properties.bg_image_path = path;
                bgImgObject = new Image();
                bgImgObject.onload = () => {
                    document.getElementById("dt-b-auto-apply").click();
                    btn.innerText = T("加载背景底图"); btn.disabled = false;
                };
                bgImgObject.onerror = () => {
                    btn.innerText = T("图片加载失败");
                    setTimeout(() => { btn.innerText = T("加载背景底图"); btn.disabled = false; }, 2000);
                };
                bgImgObject.src = getUrl(`/view?filename=${encodeURIComponent(path)}&type=temp&t=${Date.now()}`);
            };

            const executeHandler = (e) => {
                if (e.type === "executed" && String(e.detail.node) === String(node.id)) {
                    api.removeEventListener("executed", executeHandler);
                    api.removeEventListener("execution_cached", executeHandler);
                    const out = e.detail.output;
                    if (out && out.background_image && out.background_image[0]) {
                        processImg(out.background_image[0].filename);
                    } else {
                        btn.innerText = T("未连图或失败"); setTimeout(() => { btn.innerText = T("加载背景底图"); btn.disabled = false; }, 2000);
                    }
                } else if (e.type === "execution_cached" && e.detail.nodes.includes(String(node.id))) {
                    api.removeEventListener("executed", executeHandler);
                    api.removeEventListener("execution_cached", executeHandler);
                    if (node.properties.bg_image_path) {
                        processImg(node.properties.bg_image_path);
                    } else {
                        btn.innerText = T("无缓存数据"); setTimeout(() => { btn.innerText = T("加载背景底图"); btn.disabled = false; }, 2000);
                    }
                }
            };

            // 🔥 修复：必须在 fetch 发起前绑定监听器，防止错失瞬间返回的缓存命中事件
            api.addEventListener("executed", executeHandler);
            api.addEventListener("execution_cached", executeHandler);

            const res = await fetch(getUrl('/prompt'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id: api.clientId, prompt: prompt, extra_data: p.workflow })
            });

            if (!res.ok) {
                api.removeEventListener("executed", executeHandler);
                api.removeEventListener("execution_cached", executeHandler);
                throw new Error("请求被拒绝");
            }
        } catch (e) {
            alert("请求执行失败: " + e);
            btn.innerText = T("加载背景底图"); btn.disabled = false;
        }
    };

    // 双向同步滑块与数值框 (🔥 修复作用域变量名报错)
    const setupSync = (sliderId, numId) => {
        const slider = document.getElementById(sliderId);
        const num = document.getElementById(numId);
        slider.addEventListener('input', (e) => { num.value = e.target.value; updateStateCallback(); drawCanvas(); });
        num.addEventListener('input', (e) => { slider.value = e.target.value; updateStateCallback(); drawCanvas(); });
    };
    setupSync("dt-ui-pts-slider", "dt-ui-pts-num");
    setupSync("dt-ui-thresh-slider", "dt-ui-thresh-num");
    setupSync("dt-b-op-slider", "dt-b-op-num");
    setupSync("dt-ui-pose-op-slider", "dt-ui-pose-op-num");

    // 单独绑定需要立刻触发绘制的输入框与脚部复选框
    ['dt-b-w', 'dt-b-h', 'dt-b-x', 'dt-b-y'].forEach(id => {
        document.getElementById(id).addEventListener("input", drawCanvas);
    });
    document.getElementById("dt-ui-conn-feet").addEventListener("change", drawCanvas);

    // ================= 🌟 核心：Canvas 鼠标与滚轮物理交互引擎 =================
    const getWPos = (e) => {
        const rect = cvs.getBoundingClientRect();
        const xOnCanvas = e.clientX - rect.left;
        const yOnCanvas = e.clientY - rect.top;
        return { x: (xOnCanvas - v_x) / v_scale, y: (yOnCanvas - v_y) / v_scale, cx: xOnCanvas, cy: yOnCanvas };
    };

    const isPointInRotatedBox = (px, py, box) => {
        if (!box) return false;
        const cos = Math.cos(bboxAngle);
        const sin = Math.sin(bboxAngle);
        const dx = px - box.cx;
        const dy = py - box.cy;
        const lx = dx * cos + dy * sin;
        const ly = -dx * sin + dy * cos;
        return Math.abs(lx) <= box.w / 2 && Math.abs(ly) <= box.h / 2;
    };

    // 🔥 右键隐藏快捷功能 (多选域/单点隐身)
    cvs.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const { x: wx, y: wy } = getWPos(e);
        let changed = false;

        // 1. 命中多选边界框
        if (outerBbox && isPointInRotatedBox(wx, wy, outerBbox)) {
            selSet.forEach(id => {
                const [p, arr, i] = id.split('|');
                let sc = workingPose.people[p][arr][i * 3 + 2];
                if (sc > 0) { workingPose.people[p][arr][i * 3 + 2] = (sc === 1) ? 0 : -sc; changed = true; }
            });
            selSet.clear(); // 隐藏后清空选中，消除边界框
        } else {
            // 2. 命中单个点 (最小距离竞优算法，去除冗余缓冲，完全贴合视觉尺寸)
            let hitId = null;
            let minHitDist = Infinity;
            let hitRadius = state.ui.point_size;

            for (let pIdx = 0; pIdx < workingPose.people.length; pIdx++) {
                const p = workingPose.people[pIdx];
                for (let arr of ['pose_keypoints_2d', 'foot_keypoints_2d', 'face_keypoints_2d', 'hand_left_keypoints_2d', 'hand_right_keypoints_2d']) {
                    if (!p[arr]) continue;
                    for (let i = 0; i < p[arr].length / 3; i++) {
                        const score = p[arr][i * 3 + 2], id = `${pIdx}|${arr}|${i}`;
                        if (score <= 0 || (score < state.ui.threshold && !selSet.has(id))) continue;

                        const dist = Math.hypot(p[arr][i * 3] - wx, p[arr][i * 3 + 1] - wy);
                        // 如果在视觉圆圈内，且比之前找到的点更接近鼠标中心，则更新目标
                        if (dist <= hitRadius && dist < minHitDist) {
                            minHitDist = dist;
                            hitId = id;
                        }
                    }
                }
            }
            if (hitId) {
                const [p, arr, i] = hitId.split('|');
                const score = workingPose.people[p][arr][i * 3 + 2];
                workingPose.people[p][arr][i * 3 + 2] = (score === 1) ? 0 : -score;
                selSet.delete(hitId);
                changed = true;
            }
        }
        if (changed) { saveHistory(); calcBBox(); drawCanvas(); renderTree(); }
    });

    cvs.addEventListener("wheel", (e) => {
        e.preventDefault();
        const { x: wx, y: wy } = getWPos(e);
        const delta = -e.deltaY * 0.001;
        // 取消放大的 20 倍限制，保留极小的 0.0001 底线防止除零溢出崩溃
        const new_scale = Math.max(0.0001, v_scale * Math.exp(delta));
        v_x += wx * (v_scale - new_scale);
        v_y += wy * (v_scale - new_scale);
        v_scale = new_scale;
        drawCanvas();
    });

    cvs.addEventListener("mousedown", (e) => {
        const { x: wx, y: wy } = getWPos(e);
        lastMx = e.clientX; lastMy = e.clientY;
        startMx = wx; startMy = wy;
        isDragging = true;
        window._dt_pts_moved = false;

        if (e.button === 1 || e.buttons === 4) { dragType = 'pan'; return; }
        if (state.bg.drag_mode) { dragType = 'bg'; return; }

        let hitRadius = Math.max(10, state.ui.point_size) / v_scale;

        // 1. 命中测试：锚点 (Pivot)
        if (pivot && Math.hypot(pivot.x - wx, pivot.y - wy) <= hitRadius + (5 / v_scale)) {
            dragType = 'pivot'; return;
        }

        // 2. 命中测试：8 个控制柄 (Handles)
        if (outerBbox && innerBbox) {
            const ob = outerBbox, ib = innerBbox, hr = 12 / v_scale;
            const w = ob.w, h = ob.h;
            const iw = ib.w, ih = ib.h;

            const localHandles = [
                { id: 'nw', lx: -w / 2, ly: -h / 2, lax: iw / 2, lay: ih / 2 },
                { id: 'n', lx: 0, ly: -h / 2, lax: 0, lay: ih / 2 },
                { id: 'ne', lx: w / 2, ly: -h / 2, lax: -iw / 2, lay: ih / 2 },
                { id: 'w', lx: -w / 2, ly: 0, lax: iw / 2, lay: 0 },
                { id: 'e', lx: w / 2, ly: 0, lax: -iw / 2, lay: 0 },
                { id: 'sw', lx: -w / 2, ly: h / 2, lax: iw / 2, lay: -ih / 2 },
                { id: 's', lx: 0, ly: h / 2, lax: 0, lay: -ih / 2 },
                { id: 'se', lx: w / 2, ly: h / 2, lax: -iw / 2, lay: -ih / 2 }
            ];

            const cos = Math.cos(bboxAngle);
            const sin = Math.sin(bboxAngle);

            let clickedH = null;
            for (let hSpec of localHandles) {
                const hx = ob.cx + hSpec.lx * cos - hSpec.ly * sin;
                const hy = ob.cy + hSpec.lx * sin + hSpec.ly * cos;
                if (Math.abs(wx - hx) <= hr && Math.abs(wy - hy) <= hr) {
                    clickedH = hSpec;
                    break;
                }
            }

            if (clickedH) {
                dragType = 'handle'; activeHandle = clickedH.id;
                const anchorX = ib.cx + clickedH.lax * cos - clickedH.lay * sin;
                const anchorY = ib.cy + clickedH.lax * sin + clickedH.lay * cos;
                transformAnchor = { x: anchorX, y: anchorY };

                // 锚点(Pivot)在起始 OBB 局部坐标系中的相对位置
                const dx = pivot.x - ib.cx;
                const dy = pivot.y - ib.cy;
                const lx_pivot = dx * cos + dy * sin;
                const ly_pivot = -dx * sin + dy * cos;
                pivotRelativeX = ib.w === 0 ? 0.5 : (lx_pivot + ib.w / 2) / ib.w;
                pivotRelativeY = ib.h === 0 ? 0.5 : (ly_pivot + ib.h / 2) / ib.h;

                createSnapshot();
                startBboxAngle = bboxAngle;
                startBboxCenter = { x: ib.cx, y: ib.cy };
                startBboxWidth = ib.w;
                startBboxHeight = ib.h;
                startPivot = { x: pivot.x, y: pivot.y };
                startBboxScaleX = bboxScaleX;
                startBboxScaleY = bboxScaleY;
                return;
            }

            // 3. 命中测试：旋转触发区 (四个角点向外 30 像素)
            const rotDist = 30 / v_scale;
            const corners = [
                { lx: -w / 2, ly: -h / 2 },
                { lx: w / 2, ly: -h / 2 },
                { lx: -w / 2, ly: h / 2 },
                { lx: w / 2, ly: h / 2 }
            ];
            let hitRotate = false;
            for (let c of corners) {
                const cx_world = ob.cx + c.lx * cos - c.ly * sin;
                const cy_world = ob.cy + c.lx * sin + c.ly * cos;
                if (Math.hypot(wx - cx_world, wy - cy_world) < rotDist) {
                    hitRotate = true;
                    break;
                }
            }
            if (hitRotate) {
                dragType = 'rotate';
                startAngle = Math.atan2(wy - pivot.y, wx - pivot.x);
                createSnapshot();
                startBboxAngle = bboxAngle;
                startBboxCenter = { x: ib.cx, y: ib.cy };
                startBboxWidth = ib.w;
                startBboxHeight = ib.h;
                startPivot = { x: pivot.x, y: pivot.y };
                startBboxScaleX = bboxScaleX;
                startBboxScaleY = bboxScaleY;
                return;
            }
        }

        // 4. 命中测试：具体点位
        let hitId = null; let minHitDist = Infinity;
        for (let pIdx = 0; pIdx < workingPose.people.length; pIdx++) {
            for (let arr of ['pose_keypoints_2d', 'foot_keypoints_2d', 'face_keypoints_2d', 'hand_left_keypoints_2d', 'hand_right_keypoints_2d']) {
                if (!workingPose.people[pIdx][arr]) continue;
                for (let i = 0; i < workingPose.people[pIdx][arr].length / 3; i++) {
                    const score = workingPose.people[pIdx][arr][i * 3 + 2], id = `${pIdx}|${arr}|${i}`;
                    if (score <= 0 || (score < state.ui.threshold && !selSet.has(id))) continue;
                    const dist = Math.hypot(workingPose.people[pIdx][arr][i * 3] - wx, workingPose.people[pIdx][arr][i * 3 + 1] - wy);
                    if (dist <= hitRadius && dist < minHitDist) { minHitDist = dist; hitId = id; }
                }
            }
        }

        if (hitId) {
            if (e.shiftKey) {
                if (selSet.has(hitId)) { selSet.delete(hitId); dragType = null; }
                else { selSet.add(hitId); dragType = 'points'; }
            } else {
                if (!selSet.has(hitId)) { selSet.clear(); selSet.add(hitId); }
                dragType = 'points';
            }
            calcBBox(); drawCanvas(); renderTree(); return;
        }

        // 5. 命中边界框内部 (整体拖拽)
        if (outerBbox && isPointInRotatedBox(wx, wy, outerBbox)) {
            dragType = 'points';
            startBboxAngle = bboxAngle;
            startBboxCenter = { x: innerBbox.cx, y: innerBbox.cy };
            startBboxWidth = innerBbox.w;
            startBboxHeight = innerBbox.h;
            startPivot = { x: pivot.x, y: pivot.y };
            startBboxScaleX = bboxScaleX;
            startBboxScaleY = bboxScaleY;
            return;
        }

        // 6. 空白处框选
        dragType = 'marquee';
        if (!e.shiftKey) selSet.clear();
        calcBBox(); marqueeStart = { x: wx, y: wy }; marqueeEnd = { x: wx, y: wy };
        drawCanvas(); renderTree();
    });

    // 🌟 SVG 数据驱动：纯代码生成四向弯曲旋转箭头光标
    const getRotCursor = (deg) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='transform:rotate(${deg}deg); filter:drop-shadow(0px 0px 2px black);'%3E%3Cpath d='M4.93 4.93A10 10 0 0 1 19.07 19.07 M19.07 19.07A10 10 0 0 1 4.93 4.93 M4.93 4.93L9 5 M4.93 4.93L5 9 M19.07 19.07L15 19 M19.07 19.07L19 15'/%3E%3C/svg>") 12 12, crosshair`;

    // 根据包围盒旋转角度计算八个手柄的最优标准拉伸光标
    const getResizingCursor = (handleId, angleRad) => {
        const baseAngles = {
            'e': 0,
            'se': 45,
            's': 90,
            'sw': 135,
            'w': 180,
            'nw': 225,
            'n': 270,
            'ne': 315
        };
        const baseAngle = baseAngles[handleId] || 0;
        const angleDeg = (angleRad * 180 / Math.PI) + baseAngle;
        let normalizedAngle = ((angleDeg % 180) + 180) % 180;

        if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
            return 'nwse-resize';
        } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
            return 'ns-resize';
        } else if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) {
            return 'nesw-resize';
        } else {
            return 'ew-resize';
        }
    };

    cvs.addEventListener("mousemove", (e) => {
        const { x: wx, y: wy } = getWPos(e);

        // 非拖拽悬停状态下的光标智能感应
        if (!isDragging) {
            let hoverCursor = 'default';
            if (state.bg.drag_mode) {
                hoverCursor = 'move';
            } else if (outerBbox && innerBbox && pivot) {
                // 🔥 hr 控制悬停感应半径(现为12)，rotDist 控制旋转感应半径(现为30)
                const ob = outerBbox, hr = 12 / v_scale, rotDist = 30 / v_scale;
                const w = ob.w, h = ob.h;

                const localHandles = [
                    { id: 'nw', lx: -w / 2, ly: -h / 2, cur: getResizingCursor('nw', bboxAngle) },
                    { id: 'n', lx: 0, ly: -h / 2, cur: getResizingCursor('n', bboxAngle) },
                    { id: 'ne', lx: w / 2, ly: -h / 2, cur: getResizingCursor('ne', bboxAngle) },
                    { id: 'w', lx: -w / 2, ly: 0, cur: getResizingCursor('w', bboxAngle) },
                    { id: 'e', lx: w / 2, ly: 0, cur: getResizingCursor('e', bboxAngle) },
                    { id: 'sw', lx: -w / 2, ly: h / 2, cur: getResizingCursor('sw', bboxAngle) },
                    { id: 's', lx: 0, ly: h / 2, cur: getResizingCursor('s', bboxAngle) },
                    { id: 'se', lx: w / 2, ly: h / 2, cur: getResizingCursor('se', bboxAngle) }
                ];

                const cos = Math.cos(bboxAngle);
                const sin = Math.sin(bboxAngle);

                let hitH = false;
                for (let hSpec of localHandles) {
                    const hx = ob.cx + hSpec.lx * cos - hSpec.ly * sin;
                    const hy = ob.cy + hSpec.lx * sin + hSpec.ly * cos;
                    if (Math.abs(wx - hx) <= hr && Math.abs(wy - hy) <= hr) {
                        hoverCursor = hSpec.cur;
                        hitH = true;
                        break;
                    }
                }

                if (!hitH) {
                    if (Math.hypot(pivot.x - wx, pivot.y - wy) <= hr + (5 / v_scale)) {
                        hoverCursor = 'move';
                    } else {
                        // 对 4 个旋转角点进行旋转范围感应
                        const corners = [
                            { lx: -w / 2, ly: -h / 2, deg: -45 },
                            { lx: w / 2, ly: -h / 2, deg: 45 },
                            { lx: -w / 2, ly: h / 2, deg: -135 },
                            { lx: w / 2, ly: h / 2, deg: 135 }
                        ];
                        let hitRot = false;
                        for (let c of corners) {
                            const cx_world = ob.cx + c.lx * cos - c.ly * sin;
                            const cy_world = ob.cy + c.lx * sin + c.ly * cos;
                            if (Math.hypot(wx - cx_world, wy - cy_world) < rotDist) {
                                const totalDeg = Math.round(c.deg + bboxAngle * (180 / Math.PI));
                                hoverCursor = getRotCursor(totalDeg);
                                hitRot = true;
                                break;
                            }
                        }

                        if (!hitRot) {
                            if (isPointInRotatedBox(wx, wy, ob)) {
                                hoverCursor = 'grab';
                            }
                        }
                    }
                }
            } else {
                let hitRadius = Math.max(10, state.ui.point_size) / v_scale;
                let hitPt = false;
                for (let pIdx = 0; pIdx < workingPose.people.length; pIdx++) {
                    const p = workingPose.people[pIdx];
                    for (let arr of ['pose_keypoints_2d', 'foot_keypoints_2d', 'face_keypoints_2d', 'hand_left_keypoints_2d', 'hand_right_keypoints_2d']) {
                        if (!p[arr]) continue;
                        for (let i = 0; i < p[arr].length / 3; i++) {
                            const score = p[arr][i * 3 + 2];
                            if (score <= 0 || (score < state.ui.threshold && !selSet.has(`${pIdx}|${arr}|${i}`))) continue;
                            if (Math.hypot(p[arr][i * 3] - wx, p[arr][i * 3 + 1] - wy) <= hitRadius) { hitPt = true; break; }
                        }
                        if (hitPt) break;
                    }
                    if (hitPt) break;
                }
                if (hitPt) hoverCursor = 'pointer';
            }
            cvs.style.cursor = hoverCursor;
            return; // 非拖拽状态到此为止
        }

        const rect = cvs.getBoundingClientRect();
        const dxCanvas = (e.clientX - lastMx);
        const dyCanvas = (e.clientY - lastMy);
        lastMx = e.clientX; lastMy = e.clientY;

        if (dragType === 'pan') {
            v_x += dxCanvas; v_y += dyCanvas; drawCanvas();
            cvs.style.cursor = 'grabbing';
        } else if (dragType === 'bg') {
            state.bg.x += dxCanvas / v_scale; state.bg.y += dyCanvas / v_scale;
            document.getElementById("dt-b-x").value = Math.round(state.bg.x);
            document.getElementById("dt-b-y").value = Math.round(state.bg.y);
            updateStateCallback(); drawCanvas();
            cvs.style.cursor = 'move';
        } else if (dragType === 'pivot') {
            window._dt_pts_moved = true;
            pivot.x = wx; pivot.y = wy;
            // Shift 吸附逻辑
            if (e.shiftKey && innerBbox) {
                const ib = innerBbox;
                const iw = ib.w, ih = ib.h;
                const localTargets = [
                    { lx: -iw / 2, ly: -ih / 2 }, { lx: iw / 2, ly: -ih / 2 },
                    { lx: -iw / 2, ly: ih / 2 }, { lx: iw / 2, ly: ih / 2 },
                    { lx: 0, ly: -ih / 2 }, { lx: 0, ly: ih / 2 },
                    { lx: -iw / 2, ly: 0 }, { lx: iw / 2, ly: 0 },
                    { lx: 0, ly: 0 }
                ];
                const cos = Math.cos(bboxAngle);
                const sin = Math.sin(bboxAngle);
                let snapTargets = localTargets.map(t => ({
                    x: ib.cx + t.lx * cos - t.ly * sin,
                    y: ib.cy + t.lx * sin + t.ly * cos
                }));
                workingPose.people.forEach(p => {
                    ['pose_keypoints_2d', 'foot_keypoints_2d', 'face_keypoints_2d', 'hand_left_keypoints_2d', 'hand_right_keypoints_2d'].forEach(arr => {
                        if (!p[arr]) return;
                        for (let i = 0; i < p[arr].length / 3; i++) { if (p[arr][i * 3 + 2] > 0) snapTargets.push({ x: p[arr][i * 3], y: p[arr][i * 3 + 1] }); }
                    });
                });
                let closest = null, minDist = 20 / v_scale;
                snapTargets.forEach(t => { const d = Math.hypot(t.x - wx, t.y - wy); if (d < minDist) { minDist = d; closest = t; } });
                if (closest) { pivot.x = closest.x; pivot.y = closest.y; }
            }
            updateFloatPanelUI(); drawCanvas();
            cvs.style.cursor = 'move';
        } else if (dragType === 'handle') {
            window._dt_pts_moved = true;
            let sx = 1, sy = 1;

            const cos0 = Math.cos(startBboxAngle);
            const sin0 = Math.sin(startBboxAngle);

            const dx_start = startMx - transformAnchor.x;
            const dy_start = startMy - transformAnchor.y;
            const w0 = dx_start * cos0 + dy_start * sin0;
            const h0 = -dx_start * sin0 + dy_start * cos0;

            const dx_curr = wx - transformAnchor.x;
            const dy_curr = wy - transformAnchor.y;
            const w_curr = dx_curr * cos0 + dy_curr * sin0;
            const h_curr = -dx_curr * sin0 + dy_curr * cos0;

            if (activeHandle.includes('w') || activeHandle.includes('e')) {
                sx = (w0 === 0) ? 1 : w_curr / w0;
                sx = Math.max(0.001, sx);
            }
            if (activeHandle.includes('n') || activeHandle.includes('s')) {
                sy = (h0 === 0) ? 1 : h_curr / h0;
                sy = Math.max(0.001, sy);
            }

            // 默认保持比例，Shift 开启自由拉伸
            if (!e.shiftKey && activeHandle.length === 2) {
                const uniformScale = (sx + sy) / 2;
                sx = Math.max(0.001, uniformScale);
                sy = Math.max(0.001, uniformScale);
            }
            applyTransform(transformSnapshot, sx, sy, 0, transformAnchor);
            bboxScaleX = startBboxScaleX * sx;
            bboxScaleY = startBboxScaleY * sy;
            document.getElementById("dt-fp-sx").value = bboxScaleX.toFixed(3);
            document.getElementById("dt-fp-sy").value = bboxScaleY.toFixed(3);

            // 解析地更新 innerBbox 和 outerBbox:
            innerBbox.w = Math.abs(startBboxWidth * sx);
            innerBbox.h = Math.abs(startBboxHeight * sy);
            outerBbox.w = innerBbox.w + 30;
            outerBbox.h = innerBbox.h + 30;

            // 中心点计算:
            let lax = 0, lay = 0;
            const iw = startBboxWidth, ih = startBboxHeight;
            if (activeHandle === 'nw') { lax = iw / 2; lay = ih / 2; }
            else if (activeHandle === 'n') { lax = 0; lay = ih / 2; }
            else if (activeHandle === 'ne') { lax = -iw / 2; lay = ih / 2; }
            else if (activeHandle === 'w') { lax = iw / 2; lay = 0; }
            else if (activeHandle === 'e') { lax = -iw / 2; lay = 0; }
            else if (activeHandle === 'sw') { lax = iw / 2; lay = -ih / 2; }
            else if (activeHandle === 's') { lax = 0; lay = -ih / 2; }
            else if (activeHandle === 'se') { lax = -iw / 2; lay = -ih / 2; }

            const lc_new_x = -lax * sx;
            const lc_new_y = -lay * sy;
            const offset_x = lax + lc_new_x;
            const offset_y = lay + lc_new_y;

            innerBbox.cx = startBboxCenter.x + offset_x * cos0 - offset_y * sin0;
            innerBbox.cy = startBboxCenter.y + offset_x * sin0 + offset_y * cos0;
            outerBbox.cx = innerBbox.cx;
            outerBbox.cy = innerBbox.cy;

            calcBBox(); drawCanvas();
            cvs.style.cursor = getResizingCursor(activeHandle, bboxAngle);
        } else if (dragType === 'rotate') {
            window._dt_pts_moved = true;
            const currAngle = Math.atan2(wy - pivot.y, wx - pivot.x);
            const deltaAngle = currAngle - startAngle;
            applyTransform(transformSnapshot, 1, 1, deltaAngle * (180 / Math.PI), pivot);

            bboxAngle = startBboxAngle + deltaAngle;
            document.getElementById("dt-fp-rot").value = (bboxAngle * (180 / Math.PI)).toFixed(3);

            // 解析地更新:
            bboxAngle = startBboxAngle + deltaAngle;
            const dx = startBboxCenter.x - pivot.x;
            const dy = startBboxCenter.y - pivot.y;
            const cos_rot = Math.cos(deltaAngle);
            const sin_rot = Math.sin(deltaAngle);
            innerBbox.cx = pivot.x + dx * cos_rot - dy * sin_rot;
            innerBbox.cy = pivot.y + dx * sin_rot + dy * cos_rot;
            outerBbox.cx = innerBbox.cx;
            outerBbox.cy = innerBbox.cy;

            calcBBox(); drawCanvas();
        } else if (dragType === 'points') {
            window._dt_pts_moved = true;
            const dxWorld = dxCanvas / v_scale, dyWorld = dyCanvas / v_scale;
            selSet.forEach(id => {
                if (lockSet.has(id)) return;
                const [p, arr, i] = id.split('|');
                workingPose.people[p][arr][i * 3] += dxWorld;
                workingPose.people[p][arr][i * 3 + 1] += dyWorld;
                const inX = document.querySelector(`.pt-inp[data-id="${id}"][data-comp="0"]`);
                const inY = document.querySelector(`.pt-inp[data-id="${id}"][data-comp="1"]`);
                if (inX) inX.value = Math.round(workingPose.people[p][arr][i * 3]);
                if (inY) inY.value = Math.round(workingPose.people[p][arr][i * 3 + 1]);
            });
            // 拖拽时保证锚点相对位置绝对同步
            if (pivot) { pivot.x += dxWorld; pivot.y += dyWorld; }
            if (innerBbox) { innerBbox.cx += dxWorld; innerBbox.cy += dyWorld; }
            if (outerBbox) { outerBbox.cx += dxWorld; outerBbox.cy += dyWorld; }
            calcBBox(); drawCanvas();
            cvs.style.cursor = 'grabbing';
        } else if (dragType === 'marquee') {
            marqueeEnd = { x: wx, y: wy }; drawCanvas();
            cvs.style.cursor = 'crosshair';
        }
    });

    cvs.addEventListener("mouseup", (e) => {
        if (!isDragging) return;
        isDragging = false;

        if (window._dt_pts_moved) {
            saveHistory();
            window._dt_pts_moved = false;
        } else if (dragType === 'marquee') {
            const minX = Math.min(marqueeStart.x, marqueeEnd.x), maxX = Math.max(marqueeStart.x, marqueeEnd.x);
            const minY = Math.min(marqueeStart.y, marqueeEnd.y), maxY = Math.max(marqueeStart.y, marqueeEnd.y);
            if (!e.shiftKey) selSet.clear();

            workingPose.people.forEach((p, pIdx) => {
                ['pose_keypoints_2d', 'foot_keypoints_2d', 'face_keypoints_2d', 'hand_left_keypoints_2d', 'hand_right_keypoints_2d'].forEach(arr => {
                    if (!p[arr]) return;
                    for (let i = 0; i < p[arr].length / 3; i++) {
                        if (p[arr][i * 3 + 2] <= 0 || p[arr][i * 3 + 2] < state.ui.threshold) continue;
                        const px = p[arr][i * 3], py = p[arr][i * 3 + 1];
                        if (px >= minX && px <= maxX && py >= minY && py <= maxY) selSet.add(`${pIdx}|${arr}|${i}`);
                    }
                });
            });
            marqueeStart = null; marqueeEnd = null;
            calcBBox(); drawCanvas(); renderTree();
        }
        dragType = null;
    });

    // 绑定浮动面板数值输入确认事件
    ['dt-fp-px', 'dt-fp-py', 'dt-fp-sx', 'dt-fp-sy', 'dt-fp-rot', 'dt-fp-ox', 'dt-fp-oy'].forEach(id => {
        const inp = document.getElementById(id);
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } });
        inp.addEventListener("change", (e) => {
            if (selSet.size <= 1) return;

            let deltaOx = 0;
            let deltaOy = 0;
            let rel_sx = 1.0;
            let rel_sy = 1.0;
            let rel_rot = 0.0;
            let pivotChanged = false;

            const px = parseFloat(document.getElementById("dt-fp-px").value) || (pivot ? pivot.x : 0);
            const py = parseFloat(document.getElementById("dt-fp-py").value) || (pivot ? pivot.y : 0);
            const sx = parseFloat(document.getElementById("dt-fp-sx").value) || 1.0;
            const sy = parseFloat(document.getElementById("dt-fp-sy").value) || 1.0;
            const rot = parseFloat(document.getElementById("dt-fp-rot").value) || 0;

            if (id === 'dt-fp-ox' || id === 'dt-fp-oy') {
                const targetOx = parseFloat(document.getElementById("dt-fp-ox").value) || 0;
                const targetOy = parseFloat(document.getElementById("dt-fp-oy").value) || 0;
                const currentOx = innerBbox && initialBboxCenter ? innerBbox.cx - initialBboxCenter.x : 0.0;
                const currentOy = innerBbox && initialBboxCenter ? innerBbox.cy - initialBboxCenter.y : 0.0;
                deltaOx = targetOx - currentOx;
                deltaOy = targetOy - currentOy;
            }

            if (id === 'dt-fp-sx' || id === 'dt-fp-sy') {
                // 如果开启了同步缩放，且当前修改的是缩放 X 或 Y 框
                const syncScale = document.getElementById("dt-fp-sync-scale").checked;
                if (syncScale) {
                    if (id === 'dt-fp-sx') {
                        document.getElementById("dt-fp-sy").value = sx.toFixed(3);
                    } else if (id === 'dt-fp-sy') {
                        document.getElementById("dt-fp-sx").value = sy.toFixed(3);
                    }
                }
                const finalSx = parseFloat(document.getElementById("dt-fp-sx").value) || 1.0;
                const finalSy = parseFloat(document.getElementById("dt-fp-sy").value) || 1.0;
                rel_sx = bboxScaleX === 0 ? 1.0 : finalSx / bboxScaleX;
                rel_sy = bboxScaleY === 0 ? 1.0 : finalSy / bboxScaleY;
            }

            if (id === 'dt-fp-rot') {
                rel_rot = rot - (bboxAngle * (180 / Math.PI));
            }

            if (id === 'dt-fp-px' || id === 'dt-fp-py') {
                pivotChanged = pivot && (pivot.x !== px || pivot.y !== py);
            }

            if (pivot) { pivot.x = px; pivot.y = py; }

            let hasTranslated = false;
            if (deltaOx !== 0 || deltaOy !== 0) {
                selSet.forEach(id => {
                    if (lockSet.has(id)) return;
                    const [p, arr, i] = id.split('|');
                    workingPose.people[p][arr][i * 3] += deltaOx;
                    workingPose.people[p][arr][i * 3 + 1] += deltaOy;
                    const inX = document.querySelector(`.pt-inp[data-id="${p}|${arr}|${i}"][data-comp="0"]`);
                    const inY = document.querySelector(`.pt-inp[data-id="${p}|${arr}|${i}"][data-comp="1"]`);
                    if (inX) inX.value = Math.round(workingPose.people[p][arr][i * 3]);
                    if (inY) inY.value = Math.round(workingPose.people[p][arr][i * 3 + 1]);
                });
                if (pivot) { pivot.x += deltaOx; pivot.y += deltaOy; }
                if (innerBbox) { innerBbox.cx += deltaOx; innerBbox.cy += deltaOy; }
                if (outerBbox) { outerBbox.cx += deltaOx; outerBbox.cy += deltaOy; }
                hasTranslated = true;

                // 偏移后，同步更新 DOM 中锚点输入框的值，避免后面误判 pivotChanged
                if (pivot) {
                    document.getElementById("dt-fp-px").value = parseFloat(pivot.x.toFixed(3));
                    document.getElementById("dt-fp-py").value = parseFloat(pivot.y.toFixed(3));
                }
            }

            if (rel_sx !== 1.0 || rel_sy !== 1.0 || rel_rot !== 0) {
                // 保存初始包围盒参数，使 applyTransform 与 包围盒更新使用相同的基准
                startBboxAngle = bboxAngle;
                startBboxCenter = { x: innerBbox.cx, y: innerBbox.cy };
                startBboxWidth = innerBbox.w;
                startBboxHeight = innerBbox.h;
                startPivot = { x: pivot.x, y: pivot.y };

                createSnapshot();
                applyTransform(transformSnapshot, rel_sx, rel_sy, rel_rot, pivot);

                // 1. 更新包围盒尺寸
                innerBbox.w = Math.abs(startBboxWidth * rel_sx);
                innerBbox.h = Math.abs(startBboxHeight * rel_sy);
                outerBbox.w = innerBbox.w + 30;
                outerBbox.h = innerBbox.h + 30;

                // 2. 更新包围盒中心点 cx, cy (绕 origin/pivot 的变换数学模型)
                const dx = startBboxCenter.x - pivot.x;
                const dy = startBboxCenter.y - pivot.y;
                const cos0 = Math.cos(startBboxAngle);
                const sin0 = Math.sin(startBboxAngle);
                // 投影到起始局部坐标系
                const lx = dx * cos0 + dy * sin0;
                const ly = -dx * sin0 + dy * cos0;
                // 在局部坐标系下进行缩放
                const lx_scaled = lx * rel_sx;
                const ly_scaled = ly * rel_sy;
                // 转回世界坐标
                const nx = pivot.x + lx_scaled * cos0 - ly_scaled * sin0;
                const ny = pivot.y + lx_scaled * sin0 + ly_scaled * cos0;

                // 进行旋转
                const rad = rel_rot * (Math.PI / 180);
                const cos_rot = Math.cos(rad);
                const sin_rot = Math.sin(rad);
                innerBbox.cx = pivot.x + (nx - pivot.x) * cos_rot - (ny - pivot.y) * sin_rot;
                innerBbox.cy = pivot.y + (nx - pivot.x) * sin_rot + (ny - pivot.y) * cos_rot;
                outerBbox.cx = innerBbox.cx;
                outerBbox.cy = innerBbox.cy;

                // 3. 更新旋转角
                bboxAngle = startBboxAngle + rad;
                bboxScaleX = sx;
                bboxScaleY = sy;

                saveHistory();
                calcBBox(true); drawCanvas(); renderTree();
            } else {
                if (pivotChanged || hasTranslated) {
                    saveHistory();
                }
                calcBBox(true); drawCanvas();
            }
        });
    });

    // 绑定多选变换控制面板的“重设”与“归位”按钮
    const resetBtn = document.getElementById("dt-fp-btn-reset");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (selSet.size <= 1) return;
            saveHistory();
            lastSelKey = ""; // 强制标记为全新选择
            calcBBox(false); // 重新计算包围盒（不保留旧的旋转、缩放、偏移等状态，全部规正）
            saveHistory();
            drawCanvas();
            renderTree();
        });
    }

    const revertBtn = document.getElementById("dt-fp-btn-revert");
    if (revertBtn) {
        revertBtn.addEventListener("click", () => {
            if (selSet.size <= 1 || !selectionStartPointsSnapshot) return;
            saveHistory();

            // 恢复所有被选中点到初始选中的快照点位
            let hasReverted = false;
            for (const id in selectionStartPointsSnapshot) {
                if (selSet.has(id)) {
                    const [p, arr, i] = id.split('|');
                    const startPt = selectionStartPointsSnapshot[id];
                    workingPose.people[p][arr][i * 3] = startPt.x;
                    workingPose.people[p][arr][i * 3 + 1] = startPt.y;

                    const inX = document.querySelector(`.pt-inp[data-id="${p}|${arr}|${i}"][data-comp="0"]`);
                    const inY = document.querySelector(`.pt-inp[data-id="${p}|${arr}|${i}"][data-comp="1"]`);
                    if (inX) inX.value = Math.round(startPt.x);
                    if (inY) inY.value = Math.round(startPt.y);
                    hasReverted = true;
                }
            }

            if (hasReverted) {
                lastSelKey = ""; // 强制标记为全新选择以重新初始化包围盒及相关变换基准
                calcBBox(false);
                saveHistory();
                drawCanvas();
                renderTree();
            }
        });
    }

    // 绑定多选控制面板数值输入框的“拖拽滑块”功能
    const bindDragToSlide = (id) => {
        const inp = document.getElementById(id);
        if (!inp) return;

        inp.title = T("按住并左右拖拽可快速调整数值（左小右大）");
        inp.style.cursor = "ew-resize";

        inp.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return; // 仅限鼠标左键
            if (document.activeElement === inp) {
                // 如果当前输入框已经处于获取焦点（输入模式）状态，则不要启动拖拽滑动，让用户能正常拖选/修改数字
                return;
            }

            const startX = e.clientX;
            const startVal = parseFloat(inp.value) || (id.includes('sx') || id.includes('sy') ? 1.0 : 0.0);
            let hasMoved = false;

            // 快照记录开始拖拽时所有相关的面板数值，作为变化计算基准
            const startOx = parseFloat(document.getElementById("dt-fp-ox").value) || 0;
            const startOy = parseFloat(document.getElementById("dt-fp-oy").value) || 0;
            const startSx = parseFloat(document.getElementById("dt-fp-sx").value) || 1.0;
            const startSy = parseFloat(document.getElementById("dt-fp-sy").value) || 1.0;
            const startRot = parseFloat(document.getElementById("dt-fp-rot").value) || 0;

            // 对关键点进行绝对位置快照及变换参数重置，防累计误差
            createSnapshot();
            startBboxAngle = bboxAngle;
            startBboxCenter = innerBbox ? { x: innerBbox.cx, y: innerBbox.cy } : null;
            startBboxWidth = innerBbox ? innerBbox.w : 0;
            startBboxHeight = innerBbox ? innerBbox.h : 0;
            startPivot = pivot ? { x: pivot.x, y: pivot.y } : null;
            startBboxScaleX = bboxScaleX;
            startBboxScaleY = bboxScaleY;

            const onMouseMove = (ev) => {
                const deltaX = ev.clientX - startX;
                if (!hasMoved && Math.abs(deltaX) > 3) {
                    hasMoved = true;
                    inp.blur(); // 模糊焦点防止触发原生输入选中/文字操作
                    document.body.style.cursor = 'ew-resize';
                    inp.style.cursor = 'ew-resize';
                }

                if (hasMoved) {
                    ev.preventDefault();

                    let step = 0.5; // 位移/旋转步长
                    if (id === 'dt-fp-sx' || id === 'dt-fp-sy') {
                        step = 0.005; // 缩放步长更小、更细腻
                    }

                    // 左小右大：向左拖拽（deltaX为负）时数值减少，向右拖拽（deltaX为正）时数值增加
                    let targetValue = startVal + deltaX * step;
                    if (id === 'dt-fp-sx' || id === 'dt-fp-sy') {
                        targetValue = Math.max(0.001, targetValue); // 缩放值防归零或为负
                    }

                    inp.value = targetValue.toFixed(3);

                    const syncScale = document.getElementById("dt-fp-sync-scale").checked;
                    if (syncScale) {
                        if (id === 'dt-fp-sx') {
                            document.getElementById("dt-fp-sy").value = targetValue.toFixed(3);
                        } else if (id === 'dt-fp-sy') {
                            document.getElementById("dt-fp-sx").value = targetValue.toFixed(3);
                        }
                    }

                    // 初始化本次运动增量
                    let deltaOx = 0;
                    let deltaOy = 0;
                    let rel_sx = 1.0;
                    let rel_sy = 1.0;
                    let rel_rot = 0.0;

                    if (id === 'dt-fp-ox' || id === 'dt-fp-oy') {
                        const targetOx = parseFloat(document.getElementById("dt-fp-ox").value) || 0;
                        const targetOy = parseFloat(document.getElementById("dt-fp-oy").value) || 0;
                        deltaOx = targetOx - startOx;
                        deltaOy = targetOy - startOy;
                    }

                    if (id === 'dt-fp-sx' || id === 'dt-fp-sy') {
                        const targetSx = parseFloat(document.getElementById("dt-fp-sx").value) || 1.0;
                        const targetSy = parseFloat(document.getElementById("dt-fp-sy").value) || 1.0;
                        rel_sx = startBboxScaleX === 0 ? 1.0 : targetSx / startBboxScaleX;
                        rel_sy = startBboxScaleY === 0 ? 1.0 : targetSy / startBboxScaleY;
                    }

                    if (id === 'dt-fp-rot') {
                        const targetRot = parseFloat(document.getElementById("dt-fp-rot").value) || 0;
                        rel_rot = targetRot - (startBboxAngle * (180 / Math.PI));
                    }

                    // 1. 进行缩放和旋转
                    applyTransform(transformSnapshot, rel_sx, rel_sy, rel_rot, startPivot);

                    // 2. 叠加位移偏移量
                    if (deltaOx !== 0 || deltaOy !== 0) {
                        selSet.forEach(id => {
                            if (lockSet.has(id)) return;
                            const [p, arr, i] = id.split('|');
                            workingPose.people[p][arr][i * 3] += deltaOx;
                            workingPose.people[p][arr][i * 3 + 1] += deltaOy;
                            const inX = document.querySelector(`.pt-inp[data-id="${p}|${arr}|${i}"][data-comp="0"]`);
                            const inY = document.querySelector(`.pt-inp[data-id="${p}|${arr}|${i}"][data-comp="1"]`);
                            if (inX) inX.value = Math.round(workingPose.people[p][arr][i * 3]);
                            if (inY) inY.value = Math.round(workingPose.people[p][arr][i * 3 + 1]);
                        });
                    }

                    // 3. 更新辅助锚点
                    if (startPivot) {
                        pivot.x = startPivot.x + deltaOx;
                        pivot.y = startPivot.y + deltaOy;
                        document.getElementById("dt-fp-px").value = parseFloat(pivot.x.toFixed(3));
                        document.getElementById("dt-fp-py").value = parseFloat(pivot.y.toFixed(3));
                    }

                    // 4. 更新有向包围盒 (OBB) 中心及长宽
                    if (startBboxCenter) {
                        const dx = startBboxCenter.x - startPivot.x;
                        const dy = startBboxCenter.y - startPivot.y;
                        const cos0 = Math.cos(startBboxAngle);
                        const sin0 = Math.sin(startBboxAngle);
                        const lx = dx * cos0 + dy * sin0;
                        const ly = -dx * sin0 + dy * cos0;
                        const lx_scaled = lx * rel_sx;
                        const ly_scaled = ly * rel_sy;
                        const nx = startPivot.x + lx_scaled * cos0 - ly_scaled * sin0;
                        const ny = startPivot.y + lx_scaled * sin0 + ly_scaled * cos0;

                        const rad = rel_rot * (Math.PI / 180);
                        const cos_rot = Math.cos(rad);
                        const sin_rot = Math.sin(rad);
                        const rotatedCx = startPivot.x + (nx - startPivot.x) * cos_rot - (ny - startPivot.y) * sin_rot;
                        const rotatedCy = startPivot.y + (nx - startPivot.x) * sin_rot + (ny - startPivot.y) * cos_rot;

                        innerBbox.cx = rotatedCx + deltaOx;
                        innerBbox.cy = rotatedCy + deltaOy;
                        outerBbox.cx = innerBbox.cx;
                        outerBbox.cy = innerBbox.cy;
                    }

                    innerBbox.w = Math.abs(startBboxWidth * rel_sx);
                    innerBbox.h = Math.abs(startBboxHeight * rel_sy);
                    outerBbox.w = innerBbox.w + 30;
                    outerBbox.h = innerBbox.h + 30;
                    bboxAngle = startBboxAngle + (rel_rot * (Math.PI / 180));
                    bboxScaleX = parseFloat(document.getElementById("dt-fp-sx").value) || 1.0;
                    bboxScaleY = parseFloat(document.getElementById("dt-fp-sy").value) || 1.0;

                    calcBBox(true);
                    drawCanvas();
                }
            };

            const onMouseUp = () => {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
                if (hasMoved) {
                    document.body.style.cursor = '';
                    inp.style.cursor = 'ew-resize';
                    saveHistory();
                    calcBBox(true);
                    drawCanvas();
                    renderTree();
                }
            };

            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        });
    };

    // 为需要拖拽调整的五个输入框绑定事件
    ['dt-fp-ox', 'dt-fp-oy', 'dt-fp-sx', 'dt-fp-sy', 'dt-fp-rot'].forEach(bindDragToSlide);

    // 绑定多选控制面板的全局“拖拽移动”功能
    const panel = document.getElementById("dt-float-panel");
    if (panel) {
        panel.addEventListener("mousedown", (e) => {
            // 点击的是输入框、选择框、按钮等交互元件，或者光标是 pointer，则不执行面板拖动
            const tagName = e.target.tagName.toLowerCase();
            if (
                tagName === "input" ||
                tagName === "button" ||
                tagName === "select" ||
                e.target.closest("button") ||
                window.getComputedStyle(e.target).cursor === "pointer"
            ) {
                return;
            }

            e.preventDefault(); // 阻止默认的文本选择高亮行为

            const wrapper = document.getElementById("dt-canvas-wrapper");
            if (!wrapper) return;

            const startPanelX = panel.offsetLeft;
            const startPanelY = panel.offsetTop;
            const startMouseX = e.clientX;
            const startMouseY = e.clientY;

            const onPanelMouseMove = (ev) => {
                const dx = ev.clientX - startMouseX;
                const dy = ev.clientY - startMouseY;
                let targetLeft = startPanelX + dx;
                let targetTop = startPanelY + dy;

                // 边界限制：卡住画布容器 boundaries
                const maxLeft = Math.max(0, wrapper.clientWidth - panel.offsetWidth);
                const maxTop = Math.max(0, wrapper.clientHeight - panel.offsetHeight);
                targetLeft = Math.max(0, Math.min(targetLeft, maxLeft));
                targetTop = Math.max(0, Math.min(targetTop, maxTop));

                panel.style.right = "auto";
                panel.style.left = targetLeft + "px";
                panel.style.top = targetTop + "px";
            };

            const onPanelMouseUp = () => {
                window.removeEventListener("mousemove", onPanelMouseMove);
                window.removeEventListener("mouseup", onPanelMouseUp);

                // 持久化记录面板位置，确保再次多选或重开编辑器能恢复
                state.ui = state.ui || {};
                state.ui.float_panel_pos = {
                    left: parseInt(panel.style.left),
                    top: parseInt(panel.style.top)
                };
                if (updateStateCallback) {
                    updateStateCallback();
                }
            };

            window.addEventListener("mousemove", onPanelMouseMove);
            window.addEventListener("mouseup", onPanelMouseUp);
        });
    }

    // ================= 🧍 程序化骨架生成算法 (Procedural Skeleton Generator) =================
    document.getElementById("dt-t-add").onclick = () => {
        // 1. 获取当前画布真实尺寸
        const cw = workingPose.canvas_width || state.zoom.w || 512;
        const ch = workingPose.canvas_height || state.zoom.h || 512;

        // 2. 自适应 (Fit) 缩放映射器
        const aw = 512, ah = 1024; // 抽象模型基准尺寸
        const scale = Math.min(cw / aw, ch / ah) * 0.85; // 0.85 留出安全边距

        // 动态偏移量：防止多人重叠，每次新增向右下略微偏移
        const shift = workingPose.people.length * 40;
        const ox = (cw - aw * scale) / 2 + (shift % (cw / 3));
        const oy = (ch - ah * scale) / 2 + (shift % (ch / 3));

        const tx = (x) => x * scale + ox;
        const ty = (y) => y * scale + oy;

        // 3. 构建极度对称的标准身体 (18点)
        const bodyRaw = [
            [256, 120], [256, 228], [195, 228], [176, 358], [157, 476],  // 鼻, 颈, 右臂(肩肘腕)
            [317, 228], [336, 358], [355, 476], [211, 465], [219, 695],  // 左臂(肩肘腕), 右腿(髋膝)
            [229, 934], [301, 465], [293, 695], [283, 934], [240, 112],  // 右踝, 左腿(髋膝踝), 右眼(精确对齐瞳孔)
            [272, 112], [223, 121], [289, 121]                           // 左眼(精确对齐瞳孔), 右耳, 左耳
        ];

        let body = new Array(18 * 3).fill(0);
        for (let i = 0; i < 18; i++) {
            body[i * 3] = tx(bodyRaw[i][0]); body[i * 3 + 1] = ty(bodyRaw[i][1]); body[i * 3 + 2] = 0.9;
        }

        let newPerson = { pose_keypoints_2d: body };

        // 4. 程序化手部 (五指自然张开面向镜头)
        if (state.add_pose.hand) {
            const makeHand = (cx, cy, isL) => {
                let pts = new Array(21 * 3).fill(0);
                pts[0] = cx; pts[1] = cy; pts[2] = 0.9; // 根节点(手腕)
                const sign = isL ? 1 : -1;
                // 拇指到小指的辐射基础角度
                const angles = [Math.PI * 0.8, Math.PI * 0.6, Math.PI * 0.5, Math.PI * 0.4, Math.PI * 0.25];
                const lengths = [12, 16, 18, 17, 13].map(l => l * scale); // 骨骼比例长

                for (let f = 0; f < 5; f++) {
                    let baseAngle = isL ? angles[f] : Math.PI - angles[f];
                    for (let j = 1; j <= 4; j++) {
                        const idx = 1 + f * 4 + (j - 1);
                        const curAngle = baseAngle + (j * 0.05 * sign); // 关节微弯曲自然化
                        const r = lengths[f] * j;
                        pts[idx * 3] = cx + Math.cos(curAngle) * r;
                        pts[idx * 3 + 1] = cy + Math.sin(curAngle) * r;
                        pts[idx * 3 + 2] = 0.9;
                    }
                }
                return pts;
            };
            newPerson.hand_right_keypoints_2d = makeHand(body[4 * 3], body[4 * 3 + 1], false);
            newPerson.hand_left_keypoints_2d = makeHand(body[7 * 3], body[7 * 3 + 1], true);
        }

        // 5. 程序化面部 (纯数学几何构造标准脸)
        if (state.add_pose.face) {
            const count = parseInt(state.add_pose.face_pts);
            let pts = new Array(count * 3).fill(0);
            const setPt = (i, x, y) => { if (i < count) { pts[i * 3] = tx(x); pts[i * 3 + 1] = ty(y); pts[i * 3 + 2] = 0.9; } };

            const fx = 256, fy = 120, fw = 35, fh = 45; // 脸部中心点与宽幅
            // U型下颌线
            for (let i = 0; i <= 16; i++) {
                let a = Math.PI * (1 - i / 16);
                setPt(i, fx + Math.cos(a) * fw, fy + 10 + Math.sin(a) * fh);
            }
            // 左右眉毛
            for (let i = 0; i < 5; i++) setPt(17 + i, fx - 28 + i * 6, fy - 20 - Math.sin((i / 4) * Math.PI) * 4);
            for (let i = 0; i < 5; i++) setPt(22 + i, fx + 4 + i * 6, fy - 20 - Math.sin((i / 4) * Math.PI) * 4);
            // 鼻子
            for (let i = 0; i < 4; i++) setPt(27 + i, fx, fy - 10 + i * 7);
            for (let i = 0; i < 5; i++) setPt(31 + i, fx - 12 + i * 6, fy + 15 + (i == 2 ? 2 : 0));

            // 左右眼
            const reX = fx - 16, reY = fy - 8, leX = fx + 16, leY = fy - 8;
            setPt(36, reX - 8, reY); setPt(37, reX - 4, reY - 3); setPt(38, reX + 4, reY - 3); setPt(39, reX + 8, reY); setPt(40, reX + 4, reY + 3); setPt(41, reX - 4, reY + 3);
            setPt(42, leX - 8, leY); setPt(43, leX - 4, leY - 3); setPt(44, leX + 4, leY - 3); setPt(45, leX + 8, leY); setPt(46, leX + 4, leY + 3); setPt(47, leX - 4, leY + 3);

            // 微笑唇形
            const mx = fx, my = fy + 28;
            setPt(48, mx - 18, my); setPt(49, mx - 10, my - 5); setPt(50, mx - 4, my - 6); setPt(51, mx, my - 5); setPt(52, mx + 4, my - 6); setPt(53, mx + 10, my - 5); setPt(54, mx + 18, my);
            setPt(55, mx + 10, my + 6); setPt(56, mx + 4, my + 7); setPt(57, mx, my + 7); setPt(58, mx - 4, my + 7); setPt(59, mx - 10, my + 6);
            setPt(60, mx - 14, my); setPt(61, mx - 5, my - 2); setPt(62, mx, my - 2); setPt(63, mx + 5, my - 2); setPt(64, mx + 14, my);
            setPt(65, mx + 5, my + 2); setPt(66, mx, my + 2); setPt(67, mx - 5, my + 2);

            // 附加双瞳孔
            if (count === 70) { setPt(68, reX, reY); setPt(69, leX, leY); }
            newPerson.face_keypoints_2d = pts;
        }

        // 6. 程序化脚部 (支持 1 点与 3 点脚)
        if (state.add_pose.foot) {
            const count = parseInt(state.add_pose.foot_pts);
            let pts = new Array((count === 1 ? 2 : 6) * 3).fill(0);
            const setPt = (i, x, y) => { pts[i * 3] = tx(x); pts[i * 3 + 1] = ty(y); pts[i * 3 + 2] = 0.9; };
            // L_toe1, L_toe2, L_heel  |  R_toe1, R_toe2, R_heel (左右严格区分)
            if (count === 1) {
                setPt(0, 278, 993); // 左脚尖
                setPt(1, 234, 993); // 右脚尖
            } else {
                setPt(0, 267, 996); setPt(1, 289, 990); setPt(2, 276, 946); // 左脚
                setPt(3, 245, 996); setPt(4, 223, 990); setPt(5, 236, 946); // 右脚
            }
            newPerson.foot_keypoints_2d = pts;
        }

        workingPose.people.push(newPerson);
        expandedDetails.add(`dt-p-${workingPose.people.length - 1}`); // 强制新人物默认展开
        renderTree(); drawCanvas();
    };

    // ================= ↕️ 分割线拖拽改变左右比例 =================
    const splitter = document.getElementById("dt-splitter");
    const leftPanel = document.getElementById("dt-left-panel");
    const modalInner = leftPanel.parentElement;
    let isResizingSplitter = false;

    splitter.addEventListener("mousedown", (e) => {
        isResizingSplitter = true;
        e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
        if (!isResizingSplitter) return;
        const rect = modalInner.getBoundingClientRect();
        let newWidth = e.clientX - rect.left;
        if (newWidth < 380) newWidth = 380; // 遵循左侧最小宽度约束
        if (newWidth > rect.width - 300) newWidth = rect.width - 300; // 预留右侧最小宽度
        leftPanel.style.width = newWidth + "px";
        drawCanvas(); // 必须实时重绘以自动校准 Canvas 宽高！
    });
    document.addEventListener("mouseup", () => {
        if (isResizingSplitter) isResizingSplitter = false;
    });


    // ================= 严格的流转初始化 =================
    document.getElementById("dt-z-w").value = workingPose.canvas_width || 512;
    document.getElementById("dt-z-h").value = workingPose.canvas_height || 512;
    document.getElementById("dt-z-x").value = 0;
    document.getElementById("dt-z-y").value = 0;
    updateStateCallback();

    renderTree();

    const resetBgToZero = () => {
        document.getElementById("dt-b-w").value = 0;
        document.getElementById("dt-b-h").value = 0;
        document.getElementById("dt-b-x").value = 0;
        document.getElementById("dt-b-y").value = 0;
        bgImgObject = null;
        updateStateCallback();
        drawCanvas();
    };

    if (node.properties.bg_image_path) {
        const getUrl = (path) => window.location.pathname.replace(/\/$/, '') + path;
        bgImgObject = new Image();
        bgImgObject.onload = () => { document.getElementById("dt-b-auto-apply").click(); };
        bgImgObject.onerror = resetBgToZero;
        bgImgObject.src = getUrl(`/view?filename=${encodeURIComponent(node.properties.bg_image_path)}&type=temp`);
    } else {
        resetBgToZero();
    }
    // ================= 💾 终极数据回写 (保存引擎) =================
    document.getElementById("dt-btn-save").onclick = () => {
        // 1. 将内部内存中的工作数据，序列化为带有层级缩进的易读 JSON 字符串
        const finalJson = JSON.stringify(workingPose, null, 2);

        // 2. 寻找到当前节点的文本框 Widget 并回填数据
        const jsonWidget = node.widgets.find(w => w.name === "pose_json");
        if (jsonWidget) {
            jsonWidget.value = finalJson;
            // 若节点有内置回调，安全触发以防万一
            if (jsonWidget.callback) {
                jsonWidget.callback(finalJson);
            }
        }

        // 3. 核心：标记工作流已变动，提示 ComfyUI 的执行图进行拓扑重算
        app.graph.setDirtyCanvas(true);

        // 4. 模拟点击取消按钮以销毁整个弹窗 DOM，完成闭环
        document.getElementById("dt-btn-cancel").click();
    };
}