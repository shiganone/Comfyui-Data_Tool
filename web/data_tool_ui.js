import { app } from "../../scripts/app.js";

// 🌟 1. 防御性初始化全局翻译数据总线 🌟
window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

// 🌟 2. 智能探测语言环境 🌟
const isZH = (localStorage.getItem("comfy_language") === "zh-CN") ||
    (navigator.language.toLowerCase().startsWith("zh"));

app.registerExtension({
    name: "DataTool.UI_Core",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {

        // ================= 【一】 宽度紧箍咒 =================
        if (nodeData.category && nodeData.category.includes("Data_Tool")) {
            const origComputeSize = nodeType.prototype.computeSize;
            nodeType.prototype.computeSize = function (out) {
                let size = origComputeSize ? origComputeSize.apply(this, arguments) : [210, 50];
                size[0] = Math.min(size[0], 260);
                return size;
            };
        }

        // ================= 【二】 加载节点：上传按钮注入与映射修复 =================
        const loadNodes = ["LoadNLFPose", "LoadKeypoints", "LoadMaskBinTensor", "LoadImageBinTensor", "LoadLatentBinTensor"];
        if (loadNodes.includes(nodeData.name)) {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.style.display = "none";
                this.element_to_cleanup = fileInput;

                let folderType = nodeData.name === "LoadNLFPose" ? "nlfpose_data" :
                    nodeData.name === "LoadKeypoints" ? "keypoints_data" :
                        nodeData.name === "LoadMaskBinTensor" ? "mask_bin_tensor_data" :
                            nodeData.name === "LoadImageBinTensor" ? "image_bin_tensor_data" : "latent_bin_tensor_data";

                let widgetName = nodeData.name === "LoadNLFPose" ? "pose_file" :
                    nodeData.name === "LoadKeypoints" ? "keypoints_file" :
                        nodeData.name === "LoadMaskBinTensor" ? "mask_file" :
                            nodeData.name === "LoadImageBinTensor" ? "image_file" : "latent_file";

                fileInput.onchange = async () => {
                    if (fileInput.files.length > 0) {
                        const body = new FormData();
                        body.append("file", fileInput.files[0]);
                        body.append("type", folderType);
                        try {
                            const resp = await fetch("/nlf_datatool/upload", { method: "POST", body: body });
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

                this.addWidget("button", "📂 上传文件 (Upload)", "upload", () => { fileInput.click(); });
                setTimeout(() => { this.setSize(this.computeSize()); }, 100);
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

                // 强制节点根据新的接口数量重新调整高度
                this.setSize(this.computeSize());
            };
        }

        // ================= 【四】 动态界面翻译与悬浮面板引擎 =================
        // 动态去全局字典里拿当前节点的翻译数据
        const tData = isZH ? window.DataTool_I18N.ZH[nodeData.name] : window.DataTool_I18N.EN[nodeData.name];
        if (!tData) return;

        if (isZH && tData.title) {
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