import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js"; // 🔥 新增 API 引入用于 WebSocket

// 🌟 1. 防御性初始化全局翻译数据总线 🌟
window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

// 🌟 2. 智能探测语言环境 (🔥 修复：现行版 ComfyUI 的语言设置不再存于 localStorage，
//    而是持久化在服务器端，需通过 app.extensionManager.setting 读取 Comfy.Locale) 🌟
function detectIsZH() {
    try {
        const locale = app.extensionManager?.setting?.get("Comfy.Locale");
        if (locale) return locale.toLowerCase().startsWith("zh");
    } catch (e) { /* 设置系统尚未就绪时静默降级 */ }

    // 兜底链：仅当原生设置读取失败 (如极旧版 ComfyUI) 时才会用到
    const legacy = localStorage.getItem("comfy_language");
    if (legacy !== null) return legacy === "zh-CN";
    return navigator.language.toLowerCase().startsWith("zh");
}

app.registerExtension({
    name: "DataTool.UI_Core",
    
    // 注册全局 WebSocket 监听器 (全自动刷新方案)
    setup() {
        api.addEventListener("datatool.file_saved", (event) => {
            const updatedFolder = event.detail.folder;
            if (!app.graph) return;
            // 遍历当前画布上的所有节点，只让属于我们且文件夹匹配的加载节点执行局部静默重扫
            for (const node of app.graph._nodes) {
                if (node.isDataToolLoadNode && node.folderType === updatedFolder && node.refreshLoadNode) {
                    node.refreshLoadNode();
                }
            }
        });
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // ================= 【一】 设置宽度 =================
        if (nodeData.category && nodeData.category.includes("Data_Tool")) {
            const origComputeSize = nodeType.prototype.computeSize;
            nodeType.prototype.computeSize = function (out) {
                let size = origComputeSize ? origComputeSize.apply(this, arguments) : [210, 50];
                size[0] = Math.min(size[0], 260);
                return size;
            };
        }

        // ================= 【二】 加载节点：上传按钮、局部刷新与映射修复 =================
        const loadNodes = ["LoadNLFPose", "LoadKeypoints", "LoadMaskBinTensor", "LoadImageBinTensor", "LoadLatentBinTensor"];
        if (loadNodes.includes(nodeData.name)) {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.style.display = "none";
                this.element_to_cleanup = fileInput;

                // 配置元数据
                this.folderType = nodeData.name === "LoadNLFPose" ? "nlfpose_data" :
                    nodeData.name === "LoadKeypoints" ? "keypoints_data" :
                        nodeData.name === "LoadMaskBinTensor" ? "mask_bin_tensor_data" :
                            nodeData.name === "LoadImageBinTensor" ? "image_bin_tensor_data" : "latent_bin_tensor_data";

                let ext = (nodeData.name === "LoadMaskBinTensor" || nodeData.name === "LoadImageBinTensor" || nodeData.name === "LoadLatentBinTensor") ? ".pkl" : ".json";

                let widgetName = nodeData.name === "LoadNLFPose" ? "pose_file" :
                    nodeData.name === "LoadKeypoints" ? "keypoints_file" :
                        nodeData.name === "LoadMaskBinTensor" ? "mask_file" :
                            nodeData.name === "LoadImageBinTensor" ? "image_file" : "latent_file";

                this.isDataToolLoadNode = true; // 烙上标记，方便 WebSocket 寻找

                // 🔥 核心：封装局部极速刷新方法，供按钮和 WebSocket 共同调用
                this.refreshLoadNode = async () => {
                    try {
                        const resp = await fetch(`/data_tool/list_files?type=${this.folderType}&ext=${ext}`);
                        if (resp.ok) {
                            const newFiles = await resp.json();
                            const widget = this.widgets?.find(w => w.name === widgetName);
                            if (widget) {
                                const oldVal = widget.value;
                                widget.options.values = newFiles;
                                // 安全校验：如果旧文件被删了，或者列表更新了，防止选定一个不存在的值
                                if (!newFiles.includes(oldVal) && newFiles.length > 0) {
                                    widget.value = newFiles[0];
                                }
                                app.graph.setDirtyCanvas(true);
                            }
                        }
                    } catch (e) { console.warn("[Data_Tool] 局部刷新失败:", e); }
                };

                fileInput.onchange = async () => {
                    if (fileInput.files.length > 0) {
                        const body = new FormData();
                        body.append("file", fileInput.files[0]);
                        body.append("type", this.folderType);
                        try {
                            const resp = await fetch("/data_tool/upload", { method: "POST", body: body });
                            if (resp.ok) {
                                const data = await resp.json();
                                const widget = this.widgets?.find(w => w.name === widgetName);
                                if (widget) {
                                    const newOption = `input/${data.name}`;
                                    if (!widget.options.values.includes(newOption)) widget.options.values.push(newOption);
                                    widget.value = newOption;
                                    app.graph.setDirtyCanvas(true);
                                }
                            }
                        } catch (e) { alert("❌ 网络或环境出错: " + e); }
                    }
                };
                document.body.append(fileInput);

                this.addWidget("button", detectIsZH() ? "📂 上传文件" : "📂 Upload File", "upload", () => { fileInput.click(); });
                // 注入手动刷新按钮
                this.addWidget("button", detectIsZH() ? "🔄 刷新列表" : "🔄 Refresh List", "refresh", () => { this.refreshLoadNode(); });

                setTimeout(() => {
                    const sz = this.computeSize();
                    if (this.size[0] < sz[0] || this.size[1] < sz[1]) {
                        this.setSize([Math.max(this.size[0], sz[0]), Math.max(this.size[1], sz[1])]);
                    }
                }, 100);
            };

            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function () {
                if (this.element_to_cleanup) this.element_to_cleanup.remove();
                if (onRemoved) onRemoved.apply(this, arguments);
            }
        }

        // ================= 【三】 保存节点：截断路径拦截修复 =================
        const saveNodes = ["SaveNLFPose", "SaveKeypoints", "SaveMaskBinTensor", "SaveImageBinTensor", "SaveLatentBinTensor"];
        if (saveNodes.includes(nodeData.name)) {
            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (onExecuted) onExecuted.apply(this, arguments);
                if (message && message.update_path) {
                    const widget = this.widgets?.find(w => w.name === "filename_prefix");
                    if (widget) {
                        widget.value = message.update_path[0];
                    }
                }
            };
        }

        // ================= 【三点五】 组合节点：动态端口无限增加 =================
        if (nodeData.name === "BatchDataCombiner") {
            const onConnectionsChange = nodeType.prototype.onConnectionsChange;
            nodeType.prototype.onConnectionsChange = function (type, index, connected, link_info) {
                if (onConnectionsChange) onConnectionsChange.apply(this, arguments);

                // 1代表输入端口 (type === 1)。只在输入端口连线断开时触发逻辑
                if (type !== 1) return;

                // 统计当前有多少个未连线的空端口
                let emptyCount = 0;
                for (let i = 0; i < this.inputs.length; i++) {
                    if (!this.inputs[i].link) emptyCount++;
                }

                // 情况A：没有空端口了，马上生出一个新的
                if (emptyCount === 0) {
                    this.addInput("data_" + (this.inputs.length + 1), "*");
                }
                // 情况B：有多于1个空端口（用户拔掉了某根线），从末尾开始删除，直到只剩1个空端口
                else if (emptyCount > 1) {
                    for (let i = this.inputs.length - 1; i >= 0; i--) {
                        if (!this.inputs[i].link) {
                            this.removeInput(i);
                            emptyCount--;
                            if (emptyCount === 1) break;
                        }
                    }
                    // 重新对剩下的所有端口进行排序命名 (data_1, data_2...)，防止中间拔线导致断层
                    for (let i = 0; i < this.inputs.length; i++) {
                        this.inputs[i].name = "data_" + (i + 1);
                    }
                }

                const minSize = this.computeSize();
                this.setSize([this.size[0], minSize[1]]);
            };
        }

        // ================= 【三点八】 Pose 编辑器：注入编辑按钮 =================
        if (nodeData.name === "UniversalPoseEditor") {

            // 🌟 核心：拦截后端返回的图片路径
            const onExecutedEditor = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (onExecutedEditor) onExecutedEditor.apply(this, arguments);
                if (message && message.background_image) {
                    this.properties = this.properties || {};
                    this.properties.bg_image_path = message.background_image[0].filename;
                }
            };

            const onNodeCreatedEditor = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreatedEditor) onNodeCreatedEditor.apply(this, arguments);

                // 🌟 核心：初始化全量状态持久化记忆树
                // 这里的数据会随着 ComfyUI 工作流保存到 .json 中，永不丢失
                this.properties = this.properties || {};
                this.properties.editor_state = this.properties.editor_state || {
                    zoom: { w: 512, h: 512, mode: "自适应", align: "居中", x: 0, y: 0, collapsed: false },
                    bg: { opacity: 0.5, w: 512, h: 512, x: 0, y: 0, auto_mode: "自适应", auto_align: "居中", collapsed: false, drag_mode: false },
                    ui: { point_size: 4, threshold: 0.3, connect_feet: true },
                    add_pose: { hand: false, face: false, face_pts: "70", foot: false, foot_pts: "3" }
                };

                // 注入触发按钮
                this.addWidget("button", detectIsZH() ? "✏️ 编辑关键点" : "✏️ Edit Keypoints", "edit_pose_btn", () => {
                    const jsonWidget = this.widgets.find(w => w.name === "pose_json");
                    if (!jsonWidget) return;

                    let poseData;
                    
                    // 如果文本框是空的，自动生成一个标准的 512x512 空白画布结构
                    if (!jsonWidget.value || jsonWidget.value.trim() === "") {
                        poseData = { canvas_width: 512, canvas_height: 512, people: [] };
                    } else {
                        try {
                            poseData = JSON.parse(jsonWidget.value);
                        } catch (e) {
                            alert("❌ 无法打开编辑器：文本框中的 JSON 格式无效，请检查！\n" + e.message);
                            return;
                        }
                    }

                    // 兼容带数组外壳的单帧数据
                    if (Array.isArray(poseData)) {
                        if (poseData.length === 1) {
                            poseData = poseData[0];
                        } else {
                            alert("❌ 无法打开编辑器：检测到多帧序列(批次)数据！目前仅支持编辑单帧 JSON。");
                            return;
                        }
                    }

                    if (!poseData || typeof poseData !== 'object' || !poseData.people) {
                        alert("❌ 无法打开编辑器：数据格式不正确，缺少 'people' 键。");
                        return;
                    }

                    // 启动弹窗编辑器
                    window.DataTool.openUniversalPoseEditor(this, poseData);
                });

                setTimeout(() => {
                    const sz = this.computeSize();
                    if (this.size[0] < sz[0] || this.size[1] < sz[1]) {
                        this.setSize([Math.max(this.size[0], sz[0]), Math.max(this.size[1], sz[1])]);
                    }
                }, 100);
            };
        }

        // ================= 【四】 动态界面翻译与悬浮面板引擎 =================
        // 🔥 每个节点类型注册时都重新读取一次，确保拿到用户当前选择的语言
        const isZH = detectIsZH();

        // 动态去全局字典里拿当前节点的翻译数据
        const tData = isZH ? window.DataTool_I18N.ZH[nodeData.name] : window.DataTool_I18N.EN[nodeData.name];
        if (!tData) return;

        if (tData.title) { // 🔥 去掉 isZH && 限制：英文模式下也要同步更新节点搜索面板里的显示名
            nodeData.display_name = tData.title;
        }

        const applyTranslations = (node) => {
            if (node.widgets) {
                for (let w of node.widgets) {
                    if (tData.widgets && tData.widgets[w.name]) {
                        w.label = tData.widgets[w.name];
                    }
                }
            }
            if (tData.slot_labels) {
                if (node.inputs) {
                    for (let slot of node.inputs) {
                        if (tData.slot_labels[slot.name]) {
                            // 静态精确匹配
                            slot.label = tData.slot_labels[slot.name];
                        } else if (slot.name.match(/^data_\d+$/) && tData.slot_labels["data_*"]) {
                            // 动态端口通配符匹配 (拦截 data_2, data_3...)
                            const num = slot.name.split("_")[1];
                            slot.label = tData.slot_labels["data_*"].replace("{N}", num);
                        }
                    }
                }
                if (node.outputs) {
                    for (let slot of node.outputs) {
                        if (tData.slot_labels[slot.name]) slot.label = tData.slot_labels[slot.name];
                    }
                }
            }
        };

        const onNodeCreatedI18N = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (onNodeCreatedI18N) onNodeCreatedI18N.apply(this, arguments);
            if (tData.title) this.title = tData.title;

            applyTranslations(this);

            if (tData.help) {
                this.helpPanel = document.createElement("div");
                Object.assign(this.helpPanel.style, {
                    position: "absolute",
                    display: "none",
                    width: "340px",
                    maxHeight: "500px",
                    overflowY: "auto",
                    backgroundColor: "rgba(30, 30, 30, 0.95)",
                    border: "1px solid #555",
                    borderRadius: "8px",
                    padding: "15px",
                    color: "#eee",
                    fontSize: "13px",
                    lineHeight: "1.4",
                    boxShadow: "0px 4px 12px rgba(0,0,0,0.5)",
                    zIndex: "1000",
                    pointerEvents: "auto",
                });
                this.helpPanel.innerHTML = tData.help;
                document.body.appendChild(this.helpPanel);
            }
        };

        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            if (onConfigure) onConfigure.apply(this, arguments);
            applyTranslations(this);
        };

        const onDrawForeground = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx) {
            const r = onDrawForeground ? onDrawForeground.apply(this, arguments) : undefined;
            if (!tData.help) return r;

            if (this.flags?.collapsed) {
                if (this.helpPanel) this.helpPanel.style.display = "none";
                return r;
            }

            ctx.save();
            ctx.font = "bold 18px Arial";
            ctx.fillStyle = "#888";
            ctx.fillText("?", this.size[0] - 22, -6);
            ctx.restore();

            if (this.helpPanel && this.helpPanel.style.display !== "none") {
                const canvas = app.canvas;
                const nodeBounding = this.getBounding();
                const screenPos = canvas.canvas.getBoundingClientRect();

                const rightEdgeX = nodeBounding[0] + nodeBounding[2] + 15;
                const topEdgeY = nodeBounding[1];

                const posX = screenPos.left + (rightEdgeX + canvas.ds.offset[0]) * canvas.ds.scale;
                const posY = screenPos.top + (topEdgeY + canvas.ds.offset[1]) * canvas.ds.scale;

                this.helpPanel.style.left = posX + "px";
                this.helpPanel.style.top = posY + "px";
                const scaleFactor = Math.max(0.6, Math.min(1.2, canvas.ds.scale));
                this.helpPanel.style.transform = `scale(${scaleFactor})`;
                this.helpPanel.style.transformOrigin = "top left";
            }
            return r;
        };

        const onMouseDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e, pos, canvas) {
            if (!tData.help) return onMouseDown ? onMouseDown.apply(this, arguments) : false;
            if (this.flags?.collapsed) return onMouseDown ? onMouseDown.apply(this, arguments) : false;

            if (pos[1] < 0 && pos[0] > this.size[0] - 30) {
                if (this.helpPanel) {
                    this.helpPanel.style.display = this.helpPanel.style.display === "none" ? "block" : "none";
                }
                return true;
            }
            return onMouseDown ? onMouseDown.apply(this, arguments) : false;
        };

        const onRemovedI18N = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            if (this.helpPanel) this.helpPanel.remove();
            if (onRemovedI18N) onRemovedI18N.apply(this, arguments);
        };
    }
});