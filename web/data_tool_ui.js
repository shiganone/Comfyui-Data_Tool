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

const T = (text) => window.DataTool_I18N_UI && window.DataTool_I18N_UI.T ? window.DataTool_I18N_UI.T(text) : text;

// 🌟 辅助函数：安全挂接/链式回调（参考 VHS/ComfyUI 扩展标准实现） 🌟
function chainCallback(object, property, callback) {
    if (object == undefined) return;
    if (property in object && object[property]) {
        const callback_orig = object[property];
        object[property] = function () {
            const r = callback_orig.apply(this, arguments);
            return callback.apply(this, arguments) ?? r;
        };
    } else {
        object[property] = callback;
    }
}

// 🌟 动态切换参数与输入插槽辅助函数 (解耦复用函数，后续其他节点亦可直接调用) 🌟
function addFormatWidgets(nodeType, formatWidgetName = 'container_type') {
    chainCallback(nodeType.prototype, "onNodeCreated", function () {
        const formatWidget = this.widgets?.find(w => w.name === formatWidgetName);
        if (!formatWidget) return;

        // 从节点定义中拿到当前格式的参数表
        const formats = this.constructor.nodeData?.input?.required?.[formatWidgetName]?.[1]?.formats;
        if (!formats) return;

        // 收集 formats 中涉及的所有动态属性名（如 "index", "key_name", "keys_list"）
        const allFormatWidgetNames = new Set();
        for (const k in formats) {
            if (Array.isArray(formats[k])) {
                for (const item of formats[k]) {
                    if (item && item[0]) allFormatWidgetNames.add(item[0]);
                }
            }
        }

        // 1. 清理 ComfyUI 默认根据 INPUT_TYPES 自动创建的多余 widget 和 input 插槽
        if (this.widgets) {
            for (let i = this.widgets.length - 1; i >= 0; i--) {
                const w = this.widgets[i];
                if (w && w !== formatWidget && allFormatWidgetNames.has(w.name)) {
                    w.onRemove?.();
                    this.widgets.splice(i, 1);
                }
            }
        }
        if (this.inputs) {
            for (let i = this.inputs.length - 1; i >= 0; i--) {
                const input = this.inputs[i];
                if (input && allFormatWidgetNames.has(input.name)) {
                    this.removeInput(i);
                }
            }
        }

        const formatIdx = this.widgets.indexOf(formatWidget) + 1; // 动态参数起始位置
        let currentCount = 0;

        const update = (value) => {
            // 智能转换与容错：兼容数字索引 0/1、数字字符串 "0"/"1" 或未定义值
            let key = value;
            if (typeof key === "number" && formatWidget.options?.values) {
                key = formatWidget.options.values[key];
            }
            if (!key || !formats[key]) {
                const keys = Object.keys(formats);
                if (typeof value === "number" || (typeof value === "string" && !isNaN(Number(value)))) {
                    key = keys[Number(value)] || keys[0];
                } else {
                    key = keys[0];
                }
            }
            if (!formats[key]) return;

            // 保持 formatWidget.value 为合法的 key 字符串
            formatWidget.value = key;

            // 1. 创建新 widget (使用 ComfyUI 的内置 app.widgets 工厂)
            const newWidgets = [];
            for (const wDef of formats[key]) {
                let type = wDef[2]?.widgetType ?? wDef[1];
                if (Array.isArray(type)) type = "COMBO";

                if (app.widgets[type]) {
                    app.widgets[type](this, wDef[0], wDef.slice(1), app);
                    const w = this.widgets.pop();
                    w.config = wDef.slice(1);
                    if (w.name === "keys_list") {
                        if (w.inputEl) {
                            w.inputEl.readOnly = true;
                            w.inputEl.placeholder = T("键名预览");
                        }
                    }
                    newWidgets.push(w);
                }
            }

            // 2. 替换旧 widget
            const removed = this.widgets.splice(formatIdx, currentCount, ...newWidgets);
            removed.forEach(w => w?.onRemove?.());

            // 3. 彻底清理动态参数对应的输入插槽
            if (this.inputs) {
                for (let i = this.inputs.length - 1; i >= 0; i--) {
                    const input = this.inputs[i];
                    if (input && allFormatWidgetNames.has(input.name)) {
                        this.removeInput(i);
                    }
                }
            }

            currentCount = newWidgets.length;
            this.setSize(this.computeSize()); // 更新节点尺寸
            this.graph?.setDirtyCanvas(true);
        };

        formatWidget.callback = function (v) {
            update(v);
        };

        this._updateFormat = update;

        // 初始执行一次 update
        update(formatWidget.value);
    });

    // 2. 序列化 (onSerialize)
    chainCallback(nodeType.prototype, "onSerialize", function (info) {
        info.widgets_values = {};
        if (!this.widgets) return;
        for (let w of this.widgets) {
            if (w && w.name && w.type !== "button") {
                info.widgets_values[w.name] = w.value;
            }
        }
    });

    // 3. 反序列化与恢复 (onConfigure)
    chainCallback(nodeType.prototype, "onConfigure", function (info) {
        if (!this.widgets || !info || !info.widgets_values) return;

        let widgetDict = info.widgets_values;

        if (Array.isArray(widgetDict)) {
            const dict = {};
            for (let i = 0; i < this.widgets.length; i++) {
                if (this.widgets[i] && this.widgets[i].name) {
                    dict[this.widgets[i].name] = widgetDict[i];
                }
            }
            widgetDict = dict;
        }

        if (typeof widgetDict === "object" && widgetDict !== null) {
            if (formatWidgetName in widgetDict) {
                const formatWidget = this.widgets.find(w => w.name === formatWidgetName);
                if (formatWidget) {
                    formatWidget.value = widgetDict[formatWidgetName];
                    formatWidget.callback?.(formatWidget.value);
                }
            }

            for (let w of this.widgets) {
                if (!w || w.type === "button") continue;
                if (w.name in widgetDict) {
                    w.value = widgetDict[w.name];
                    if (w.inputEl) {
                        w.inputEl.value = w.value;
                    }
                }
            }
        }
    });
}

const NODE_DATA_CACHE = {};

const LOAD_NODE_MAP = {
    "nlfpose_data": { name: "LoadNLFPose", widgetName: "pose_file", ext: ".json" },
    "keypoints_data": { name: "LoadKeypoints", widgetName: "keypoints_file", ext: ".json" },
    "mask_bin_tensor_data": { name: "LoadMaskBinTensor", widgetName: "mask_file", ext: ".pkl" },
    "image_bin_tensor_data": { name: "LoadImageBinTensor", widgetName: "image_file", ext: ".pkl" },
    "latent_bin_tensor_data": { name: "LoadLatentBinTensor", widgetName: "latent_file", ext: ".pkl" }
};

async function syncLoadNodeFiles(folderType, targetSelectValue, callerNode) {
    const config = LOAD_NODE_MAP[folderType];
    if (!config) return;
    try {
        const resp = await fetch(`/data_tool/list_files?type=${folderType}&ext=${config.ext}`);
        if (!resp.ok) return;
        const newFiles = await resp.json();

        // 1. 更新当前画布上所有匹配该 folderType 的加载节点实例选项
        if (app.graph?._nodes) {
            for (const node of app.graph._nodes) {
                if (node.isDataToolLoadNode && node.folderType === folderType) {
                    const widget = node.widgets?.find(w => w.name === config.widgetName);
                    if (widget) {
                        const oldVal = widget.value;
                        if (Array.isArray(widget.options?.values)) {
                            widget.options.values.length = 0;
                            widget.options.values.push(...newFiles);
                        } else {
                            widget.options = widget.options || {};
                            widget.options.values = [...newFiles];
                        }

                        if (targetSelectValue && newFiles.includes(targetSelectValue) && (node === callerNode || !callerNode)) {
                            widget.value = targetSelectValue;
                        } else if (!newFiles.includes(oldVal) && newFiles.length > 0) {
                            widget.value = newFiles[0];
                        }
                    }
                }
            }
            app.graph.setDirtyCanvas(true);
        }

        // 2. 精准更新全局节点定义模板 (app.nodeDefs / NODE_DATA_CACHE / LiteGraph 注册表 / 实例构造器模板)
        const nodeTypeName = config.name;
        const registeredType = window.LiteGraph?.registered_node_types?.[nodeTypeName];
        const defsToUpdate = [
            NODE_DATA_CACHE[nodeTypeName],
            app.nodeDefs?.[nodeTypeName],
            registeredType?.nodeData,
            registeredType?.prototype?.constructor?.nodeData,
            callerNode?.constructor?.nodeData
        ];

        for (const def of defsToUpdate) {
            if (!def?.input?.required?.[config.widgetName]) continue;
            const reqConfig = def.input.required[config.widgetName];
            if (Array.isArray(reqConfig)) {
                if (Array.isArray(reqConfig[0])) {
                    reqConfig[0].length = 0;
                    reqConfig[0].push(...newFiles);
                }
                if (reqConfig[1] && typeof reqConfig[1] === "object" && Array.isArray(reqConfig[1].values)) {
                    reqConfig[1].values.length = 0;
                    reqConfig[1].values.push(...newFiles);
                }
            }
        }
    } catch (e) {
        console.warn("[Data_Tool] 刷新加载节点模板及实例失败:", e);
    }
}

app.registerExtension({
    name: "DataTool.UI_Core",

    // 注册全局 WebSocket 监听器 (全自动刷新方案)
    setup() {
        api.addEventListener("datatool.file_saved", (event) => {
            const updatedFolder = event.detail?.folder;
            if (updatedFolder) {
                syncLoadNodeFiles(updatedFolder);
            }
        });
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData && nodeData.name) {
            NODE_DATA_CACHE[nodeData.name] = nodeData;
        }

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

                // 新创建节点或切换工作流时，若缓存模板已刷新，同步最新选项列表
                const widget = this.widgets?.find(w => w.name === widgetName);
                const cachedDef = NODE_DATA_CACHE[nodeData.name];
                if (widget && cachedDef?.input?.required?.[widgetName]?.[0]) {
                    const latestFiles = cachedDef.input.required[widgetName][0];
                    if (Array.isArray(latestFiles)) {
                        widget.options = widget.options || {};
                        widget.options.values = [...latestFiles];
                    }
                }

                // 🔥 核心：封装局部与全局刷新方法
                this.refreshLoadNode = async (targetSelectValue) => {
                    await syncLoadNodeFiles(this.folderType, targetSelectValue, this);
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
                                const newOption = `input/${data.name}`;
                                await this.refreshLoadNode(newOption);
                            }
                        } catch (e) { alert("❌ 网络或环境出错: " + e); }
                    }
                };
                document.body.append(fileInput);

                this.addWidget("button", T("📂 上传文件"), "upload", () => { fileInput.click(); });
                // 注入手动刷新按钮
                this.addWidget("button", T("🔄 刷新列表"), "refresh", () => { this.refreshLoadNode(); });

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

        // ================= 【三点六】 张量维度长度节点：强化通配符端口与形状显示 =================
        if (nodeData.name === "TensorDimensionLength") {
            if (nodeData.input && nodeData.input.required && nodeData.input.required.data) {
                nodeData.input.required.data[0] = "*";
            }

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                const shapeWidget = this.widgets?.find(w => w.name === "shape_preview");
                if (shapeWidget) {
                    shapeWidget.options = shapeWidget.options || {};
                    shapeWidget.options.minHeight = 34;
                    shapeWidget.computeSize = (width) => [width || 200, Math.max(34, shapeWidget.options.minHeight || 34)];
                    if (shapeWidget.inputEl) {
                        shapeWidget.inputEl.readOnly = true;
                        shapeWidget.inputEl.placeholder = T("张量形状预览");
                    }
                }

                this.setSize(this.computeSize());
                return r;
            };

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (onExecuted) onExecuted.apply(this, arguments);
                if (message) {
                    const textVal = message.shape_preview?.[0] || message.text?.[0] || "";
                    const shapeWidget = this.widgets?.find(w => w.name === "shape_preview");
                    if (shapeWidget) {
                        shapeWidget.value = textVal;
                        if (shapeWidget.inputEl) {
                            shapeWidget.inputEl.value = textVal;
                        }
                        this.graph?.setDirtyCanvas(true);
                    }
                }
            };
        }

        // ================= 【三点七】 容器提取与写入节点：动态组件切换与万能端口 =================
        if (nodeData.name === "ContainerElementExtractor") {
            if (nodeData.input && nodeData.input.required && nodeData.input.required.container) {
                nodeData.input.required.container[0] = "*";
            }
            if (nodeData.output) {
                nodeData.output[0] = "*";
            }

            addFormatWidgets(nodeType, "container_type");

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (onExecuted) onExecuted.apply(this, arguments);
                if (message && message.keys_list) {
                    const keysWidget = this.widgets?.find(w => w.name === "keys_list");
                    if (keysWidget) {
                        keysWidget.value = message.keys_list[0];
                        if (keysWidget.inputEl) {
                            keysWidget.inputEl.value = message.keys_list[0];
                        }
                        this.setSize(this.computeSize());
                        this.graph?.setDirtyCanvas(true);
                    }
                }
            };
        }

        if (nodeData.name === "ContainerElementWriter") {
            if (nodeData.input && nodeData.input.required) {
                if (nodeData.input.required.container) nodeData.input.required.container[0] = "*";
                if (nodeData.input.required.value) nodeData.input.required.value[0] = "*";
            }
            if (nodeData.output) {
                nodeData.output[0] = "*";
            }

            addFormatWidgets(nodeType, "container_type");

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (onExecuted) onExecuted.apply(this, arguments);
                if (message && message.keys_list) {
                    const keysWidget = this.widgets?.find(w => w.name === "keys_list");
                    if (keysWidget) {
                        keysWidget.value = message.keys_list[0];
                        if (keysWidget.inputEl) {
                            keysWidget.inputEl.value = message.keys_list[0];
                        }
                        this.setSize(this.computeSize());
                        this.graph?.setDirtyCanvas(true);
                    }
                }
            };
        }

        // ================= 【三点八】 Pose 编辑器：注入编辑按钮 =================
        if (nodeData.name === "UniversalPoseEditor") {

            // 🌟 核心：拦截后端返回的图片路径与更新关键点JSON
            const onExecutedEditor = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (onExecutedEditor) onExecutedEditor.apply(this, arguments);
                if (message) {
                    if (message.background_image) {
                        this.properties = this.properties || {};
                        this.properties.bg_image_path = message.background_image[0].filename;
                    }
                    if (message.keypoint_json) {
                        const jsonWidget = this.widgets.find(w => w.name === "pose_json");
                        if (jsonWidget) {
                            // 仅在主动触发更新，或文本框本身无有效内容时，才做覆盖
                            if (this.properties?.force_update_keypoints || !jsonWidget.value || jsonWidget.value.trim() === "") {
                                let jsonVal = message.keypoint_json;
                                if (Array.isArray(jsonVal)) {
                                    // 兼容处理：如果是单字符数组则join，如果是单元素字符串数组则取第0个
                                    if (jsonVal.length > 1 && jsonVal.every(item => typeof item === 'string' && item.length === 1)) {
                                        jsonVal = jsonVal.join('');
                                    } else {
                                        jsonVal = jsonVal[0];
                                    }
                                }
                                jsonWidget.value = jsonVal;
                                if (jsonWidget.callback) {
                                    jsonWidget.callback(jsonWidget.value);
                                }
                            }
                        }
                        // 消费标志位
                        if (this.properties) {
                            this.properties.force_update_keypoints = false;
                        }
                    }
                }
            };

            const onNodeCreatedEditor = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreatedEditor) onNodeCreatedEditor.apply(this, arguments);

                // 🌟 核心：初始化全量状态持久化记忆树
                // 这里的数据会随着 ComfyUI 工作流保存到 .json 中，永不丢失
                this.properties = this.properties || {};
                this.properties.force_update_keypoints = false; // 初始化主动触发标志为 false
                this.properties.editor_state = this.properties.editor_state || {
                    zoom: { w: 512, h: 512, mode: "自适应", align: "居中", x: 0, y: 0, collapsed: false },
                    bg: { opacity: 0.5, w: 512, h: 512, x: 0, y: 0, auto_mode: "自适应", auto_align: "居中", collapsed: false, drag_mode: false },
                    ui: { point_size: 4, threshold: 0.3, connect_feet: true, pose_opacity: 1.0, left_panel_width: (window.DataTool && window.DataTool.PANEL_CONFIG ? window.DataTool.PANEL_CONFIG.DEFAULT_WIDTH : 520), tree_expanded: {} },
                    add_pose: { hand: false, face: false, face_pts: "70", foot: false, foot_pts: "3" }
                };

                // 注入更新关键点按钮
                const updateBtn = this.addWidget("button", T("🔄 更新关键点"), "update_pose_btn", async () => {
                    const btn = updateBtn;
                    const oldText = btn.label || T("🔄 更新关键点");
                    btn.label = T("获取中...");
                    app.canvas.draw(true, true);

                    try {
                        // 标记此次执行为用户主动触发拉取更新
                        this.properties = this.properties || {};
                        this.properties.force_update_keypoints = true;

                        const p = await app.graphToPrompt();
                        const prompt = p.output;

                        // 顺藤摸瓜：仅保留当前节点及其祖先节点
                        const keep_ids = new Set();
                        const trace = (id) => {
                            if (keep_ids.has(id)) return;
                            keep_ids.add(id);
                            const n = prompt[id];
                            if (n && n.inputs) {
                                for (let k in n.inputs) {
                                    let v = n.inputs[k];
                                    if (Array.isArray(v) && v.length >= 1) trace(String(v[0]));
                                }
                            }
                        };
                        trace(String(this.id));
                        for (let k in prompt) { if (!keep_ids.has(k)) delete prompt[k]; }

                        const executeHandler = (e) => {
                            if (e.type === "executed" && String(e.detail.node) === String(this.id)) {
                                api.removeEventListener("executed", executeHandler);
                                api.removeEventListener("execution_cached", executeHandler);
                                btn.label = oldText;
                                app.canvas.draw(true, true);
                            } else if (e.type === "execution_cached" && e.detail.nodes.includes(String(this.id))) {
                                api.removeEventListener("executed", executeHandler);
                                api.removeEventListener("execution_cached", executeHandler);
                                btn.label = oldText;
                                app.canvas.draw(true, true);
                            }
                        };

                        api.addEventListener("executed", executeHandler);
                        api.addEventListener("execution_cached", executeHandler);

                        const res = await fetch(window.location.pathname.replace(/\/$/, '') + '/prompt', {
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
                        btn.label = oldText;
                        app.canvas.draw(true, true);
                    }
                });

                // 注入触发按钮
                this.addWidget("button", T("✏️ 编辑关键点"), "edit_pose_btn", () => {
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