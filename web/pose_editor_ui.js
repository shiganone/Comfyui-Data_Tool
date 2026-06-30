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
                
                <div id="dt-canvas-wrapper" style="flex: 1; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center;">
                    <canvas id="dt-canvas" style="background: #111; box-shadow: 0 0 15px rgba(0,0,0,0.8);"></canvas>
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

    // 🔥 历史记录与撤回/重做引擎 (Ctrl+Z / Ctrl+Y)
    let poseHistory = [];
    let redoHistory = []; // 新增重做栈

    const saveHistory = () => {
        if (poseHistory.length > 30) poseHistory.shift();
        poseHistory.push(JSON.stringify(workingPose));
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
                // 撤回逻辑：把当前状态压入重做栈，并读取上一步
                redoHistory.push(poseHistory.pop());
                workingPose = JSON.parse(poseHistory[poseHistory.length - 1]);
                calcBBox(); drawCanvas(); renderTree();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            if (redoHistory.length > 0) {
                // 重做逻辑：从重做栈弹出下一步，压回历史栈，并渲染
                const nextState = redoHistory.pop();
                poseHistory.push(nextState);
                workingPose = JSON.parse(nextState);
                calcBBox(); drawCanvas(); renderTree();
            }
        }
    };
    document.addEventListener("keydown", undoHandler);

    // 🔥 第三阶段交互状态引擎变量
    let selSet = new Set();
    let lockSet = new Set();
    let v_scale = 1.0, v_x = 0, v_y = 0; // 画布视口缩放与平移
    let isFirstDraw = true; // 用于首次自动居中缩放
    let isDragging = false, dragType = null;
    let lastMx = 0, lastMy = 0;
    let marqueeStart = null, marqueeEnd = null;
    let bbox = null;

    const cvs = document.getElementById("dt-canvas");
    const ctx = cvs.getContext("2d");

    // 缩小新增人物按钮前后的空隙
    document.getElementById("dt-t-add").parentElement.style.padding = "5px 10px";
    document.getElementById("dt-tree-container").style.padding = "5px 10px";

    // 官方连线字典与彩虹色谱
    const body_limbSeq = [[1, 2], [1, 5], [2, 3], [3, 4], [5, 6], [6, 7], [1, 8], [8, 9], [9, 10], [1, 11], [11, 12], [12, 13], [1, 0], [0, 14], [14, 16], [0, 15], [15, 17]];
    const hand_edges = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20]];
    const colors = [[255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]];

    const HSVtoRGB = (h, s, v) => {
        let r, g, b, i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
        switch (i % 6) { case 0: r = v, g = t, b = p; break; case 1: r = q, g = v, b = p; break; case 2: r = p, g = v, b = t; break; case 3: r = p, g = q, b = v; break; case 4: r = t, g = p, b = v; break; case 5: r = v, g = p, b = q; break; }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const calcBBox = () => {
        if (selSet.size <= 1) { bbox = null; return; }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selSet.forEach(id => {
            const [p, arr, i] = id.split('|');
            const x = workingPose.people[p][arr][i * 3], y = workingPose.people[p][arr][i * 3 + 1];
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        });
        bbox = { x: minX - 15, y: minY - 15, w: maxX - minX + 30, h: maxY - minY + 30 };
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
                if (pt1 && pt2) { ctx.beginPath(); ctx.moveTo(pt1.x, pt1.y); ctx.lineTo(pt2.x, pt2.y); ctx.strokeStyle = `rgb(${colors[i % colors.length].join(',')})`; ctx.lineWidth = 4; ctx.stroke(); }
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
                            ctx.strokeStyle = `rgb(${colors[(18 + i) % colors.length].join(',')})`; ctx.lineWidth = 4; ctx.stroke();
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

        // 画布边缘的白虚线，盖在所有骨骼和图片之上
        ctx.beginPath();
        ctx.rect(0, 0, cw, ch);
        ctx.lineWidth = 1.5 / v_scale;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.setLineDash([8 / v_scale, 8 / v_scale]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (bbox) {
            ctx.beginPath(); ctx.rect(bbox.x, bbox.y, bbox.w, bbox.h);
            ctx.lineWidth = 2 / v_scale; ctx.strokeStyle = "#4CAF50"; ctx.setLineDash([5 / v_scale, 5 / v_scale]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = "rgba(76, 175, 80, 0.1)"; ctx.fill();
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

    // 🔥 右键隐藏快捷功能 (多选域/单点隐身)
    cvs.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const { x: wx, y: wy } = getWPos(e);
        let changed = false;

        // 1. 命中多选边界框
        if (bbox && wx >= bbox.x && wx <= bbox.x + bbox.w && wy >= bbox.y && wy <= bbox.y + bbox.h) {
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
        const new_scale = Math.max(0.05, Math.min(20, v_scale * Math.exp(delta)));
        v_x += wx * (v_scale - new_scale);
        v_y += wy * (v_scale - new_scale);
        v_scale = new_scale;
        drawCanvas();
    });

    cvs.addEventListener("mousedown", (e) => {
        const { x: wx, y: wy } = getWPos(e);
        lastMx = e.clientX; lastMy = e.clientY;
        isDragging = true;

        if (e.button === 1 || e.buttons === 4) { dragType = 'pan'; return; }
        if (state.bg.drag_mode) { dragType = 'bg'; return; }

        if (bbox && wx >= bbox.x && wx <= bbox.x + bbox.w && wy >= bbox.y && wy <= bbox.y + bbox.h) {
            dragType = 'points'; window._dt_pts_moved = false; return;
        }

        // 命中测试：具体点位 (最小距离竞优算法，精准命中)
        let hitId = null;
        let minHitDist = Infinity;
        let hitRadius = state.ui.point_size;

        for (let pIdx = 0; pIdx < workingPose.people.length; pIdx++) {
            const p = workingPose.people[pIdx];
            for (let arr of ['pose_keypoints_2d', 'foot_keypoints_2d', 'face_keypoints_2d', 'hand_left_keypoints_2d', 'hand_right_keypoints_2d']) {
                if (!p[arr]) continue;
                for (let i = 0; i < p[arr].length / 3; i++) {
                    const score = p[arr][i * 3 + 2], id = `${pIdx}|${arr}|${i}`;
                    // 可见性 <= 0 彻底免疫物理击中
                    if (score <= 0 || (score < state.ui.threshold && !selSet.has(id))) continue;

                    const dist = Math.hypot(p[arr][i * 3] - wx, p[arr][i * 3 + 1] - wy);
                    if (dist <= hitRadius && dist < minHitDist) {
                        minHitDist = dist;
                        hitId = id;
                    }
                }
            }
        }

        if (hitId) {
            if (e.shiftKey) {
                if (selSet.has(hitId)) selSet.delete(hitId);
                else selSet.add(hitId);
            } else {
                if (!selSet.has(hitId)) { selSet.clear(); selSet.add(hitId); }
            }
            calcBBox(); dragType = 'points'; window._dt_pts_moved = false; drawCanvas(); renderTree();
            return;
        }

        dragType = 'marquee';
        if (!e.shiftKey) selSet.clear();
        calcBBox();
        marqueeStart = { x: wx, y: wy }; marqueeEnd = { x: wx, y: wy };
        drawCanvas(); renderTree();
    });


    cvs.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const rect = cvs.getBoundingClientRect();
        const dxCanvas = (e.clientX - lastMx);
        const dyCanvas = (e.clientY - lastMy);
        lastMx = e.clientX; lastMy = e.clientY;

        if (dragType === 'pan') {
            v_x += dxCanvas; v_y += dyCanvas; drawCanvas();
        } else if (dragType === 'bg') {
            state.bg.x += dxCanvas / v_scale; state.bg.y += dyCanvas / v_scale;
            document.getElementById("dt-b-x").value = Math.round(state.bg.x);
            document.getElementById("dt-b-y").value = Math.round(state.bg.y);
            updateStateCallback(); drawCanvas();
        } else if (dragType === 'points') {
            window._dt_pts_moved = true; // 🔥 标记发生了真实的物理拖拽
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
            calcBBox(); drawCanvas();
        } else if (dragType === 'marquee') {
            const { x: wx, y: wy } = getWPos(e);
            marqueeEnd = { x: wx, y: wy }; drawCanvas();
        }
    });

    cvs.addEventListener("mouseup", (e) => {
        if (!isDragging) return;
        isDragging = false;

        if (dragType === 'points' && window._dt_pts_moved) {
            saveHistory(); // 🔥 记录拖拽终点历史
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