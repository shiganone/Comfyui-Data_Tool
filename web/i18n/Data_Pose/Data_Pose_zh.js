window.DataTool_I18N = window.DataTool_I18N || { ZH: {}, EN: {} };

Object.assign(window.DataTool_I18N.ZH, {
    "RescaleKeypoints": {
        title: "📐 关键点分辨率重映射",
        widgets: {
            "width": "宽度",
            "height": "高度",
            "resize_mode": "缩放策略",
            "alignment": "对齐模式",
            "offset_x": "X轴偏移",
            "offset_y": "Y轴偏移",
            "output_absolute": "输出绝对像素"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">📐 节点功能说明</h3>
    对keypoint格式骨骼数据进行分辨率重映射。<br>
    <b>输入</b><br>keypoints：原始骨骼数据批次。<br>
    <b>输出</b><br>POSE_KEYPOINTS：重缩放后的骨骼数据批次。<br>
    <b>参数</b><br>
    • <b>宽度/高度</b>: 重映射的目标分辨率。<br>
    • <b>缩放策略</b>:<br>
    &nbsp;&nbsp;·拉伸(Stretch)：改变纵横比，拉伸宽高，铺满至新分辨率。<br>
    &nbsp;&nbsp;·自适应(Fit)：保持纵横比，铺满新分辨率，不足部分留白。<br>
    &nbsp;&nbsp;·裁切(Crop)：保持纵横比，铺满新分辨率，超出部分裁切。<br>
    &nbsp;&nbsp;·保持(Keep)：保持原始画面，仅改变画布。<br>
    &nbsp;&nbsp;·对齐高度(Fit Height)：保持纵横比，对齐新分辨率高度，宽度裁切或留白。<br>
    &nbsp;&nbsp;·对齐宽度(Fit Width)：保持纵横比，对齐新分辨率宽度，高度裁切或留白。<br>
    • <b>对齐模式</b>: 九宫格对齐定位。对齐高度时上下对齐无效，对齐宽度时左右对齐无效。<br>
    • <b>整体X/Y轴平移量</b>: 手动调整坐标的整体平移。<br>
    • <b>输出绝对像素</b>: 决定keypoint的数据形式。开启则输出绝对像素坐标，关闭则输出 0~1 的相对归一化坐标。
</div>`
    },

    "KeypointConfidenceModifier": {
        title: "🎯 关键点置信度修改器",
        widgets: {
            "start_index": "起始索引",
            "end_index": "结束索引",
            "target_score": "目标置信度",
            "modify_target": "修改对象",
            "delete_mode": "删除模式",
            "edit_commands": "文本框"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🎯 节点功能说明</h3>
    将指定批次范围内的目标骨骼点置信度强制修改为滑块设定的目标值。<br>
    <b>输入</b><br>keypoints：原始骨骼数据批次。<br>
    <b>输出</b><br>POSE_KEYPOINT：修改后的骨骼数据批次。<br>
    <b>参数</b><br>
    • <b>起始索引</b>: 要处理的批次部分的开始。<br>
    • <b>结束索引</b>: 要处理的批次部分的结尾。若设为 <b>-1</b> 则代表从起始索引一直修改到最后一帧；若超出批次长度将自动截断。<br>
    • <b>目标置信度</b>: 目标点位的新置信度分数。<br>
    • <b>修改对象</b>:<br>
    &nbsp;&nbsp;·选定点 (Selected)：处理目标为文本框选定的点。<br>
    &nbsp;&nbsp;·未选定点 (Unselected)：处理目标为文本框没有选定的点。<br>
    • <b>删除模式</b>: 开启后，直接从数据中物理删除对应的目标点位。（仅针对特殊情况，一般情况无需开启）<br>
    • <b>文本框</b>: 输入被指定的点位名称、点位索引，或使用连字符输入范围（例如：<b>0-5</b>）。<br>
    <hr style="border-color: #444;">
    <h3 style="color: #4af;">✨ 骨骼点位与快捷输入对照表</h3>
    支持直接输入单个数字、范围（如 0-5），或输入以下冒号左侧的快捷名称（逗号或空格分隔）。<br><br>
    🔸 <b>[body:]</b><br>
    鼻子: 0, 脖颈: 1<br>
    右肩: 2, 右肘: 3, 右腕: 4<br>
    左肩: 5, 左肘: 6, 左腕: 7<br>
    右髋: 8, 右膝: 9, 右踝: 10<br>
    左髋: 11, 左膝: 12, 左踝: 13<br>
    右眼: 14, 左眼: 15, 右耳: 16, 左耳: 17<br><br>
    🔸 <b>[face:]</b><br>
    脸轮廓: 0-16, 左眉: 17-21, 右眉: 22-26, 眉: 17-26<br>
    鼻子: 27-35, 左眼: 36-41, 右眼: 42-47, 眼: 36-48<br>
    上唇: 48-54 (外) + 61-63 (内)<br>
    下唇: 55-59 (外) + 65-67 (内)<br>
    嘴中线: 60-67, 嘴: 48-67, 脸: 0-67<br><br>
    🔸 <b>[left_hand: / right_hand:]</b><br>
    手: 0-20<br>
    拇指: 1-4, 食指: 5-8, 中指: 9-12<br>
    无名指: 13-16, 小指: 17-20<br><br>
    🔸 <b>[foot:]</b><br>
    脚尖: 左右脚所有脚尖点位, 脚跟: 左右脚所有脚跟点位<br>
    vitpose单点脚: 左脚尖: 0, 右脚尖: 1, 脚尖: 0-1<br>
    sdpose三点脚: 左脚尖: 0-1, 左脚跟: 2, 右脚尖: 3-4, 右脚跟: 5, 脚尖: 0-1、3-4, 脚跟: 2、5 
</div>`
    },

    "KeypointHandFilter": {
        title: "✋ 手部关键点过滤器",
        widgets: {
            "threshold": "阈值"
        },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✋ 节点功能说明</h3>
    以手部根点位为中心，把超出检测距离的手部点位的数据归0。<br>
    <b>输入</b><br>keypoints：原始批次。<br>
    <b>输出</b><br>POSE_KEYPOINTS：过滤后的批次。<br>
    <b>参数</b><br>
    • <b>阈值</b>: 过滤使用的检测距离。
</div>`
    },

    "SDPoseToViTPoseFoot": {
        title: "🦶 SDPose转ViTPose脚部",
        widgets: {},
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🦶 节点功能说明</h3>
    把sdpose的三点脚修改为vitpose的单点脚，使用合并两个脚尖点，剔除脚跟点的方法。<br>
    <b>输入</b><br>keypoints：原始批次。<br>
    <b>输出</b><br>POSE_KEYPOINTS：转换后批次。<br>
    <b>参数</b><br>
    • <b>置信度方法</b>: 通过两个sdpose脚尖点，计算合并后的新单点脚尖使用的置信度。<br>
    &nbsp;&nbsp;·最大(Max)：使用较大的置信度。<br>
    &nbsp;&nbsp;·最小(Min)：使用较小的置信度。<br>
    &nbsp;&nbsp;·平均(Average)：使用两点的置信度的平均值。
</div>`
    },
    "NLF_Pose_Orientation": {
        title: "🧭 获取NLF骨骼朝向",
        widgets: {},
        slot_labels: { "orientations": "朝向数据" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🧭 节点功能说明</h3>
    从NLF骨骼数据中提取出每个骨骼的胸腔和骨盆数据。<br>
    <b>输入</b><br>nlf_poses：NLF骨骼数据<br>
    <b>输出</b><br>orientations：三层嵌套数组。内容格式为，第一层数组的索引是帧数，第二层数组的索引是不同骨骼，第三层数组有4个数据，分别对应 胸腔偏航角、胸腔俯仰角、骨盆偏航角、骨盆俯仰角。
</div>`
    },

    "NLF_Orientation_Parser": {
        title: "🧭 NLF朝向解析器",
        widgets: {
            "person_index": "目标索引",
            "body_part": "提取部位",
            "default_direction": "保底方向",
            "yaw_capture_range": "偏航引力范围",
            "pitch_capture_range": "俯仰引力范围",
            "active_directions": "文本框"
        },
        slot_labels: { "orientations": "朝向数据", "labels_batch": "朝向标签" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🧭 节点功能说明</h3>
    本节点接收“获取NLF骨骼朝向”节点的输出，将 NLF 骨骼的朝向角度（欧拉角），精准解析为英文方向标签（如 F, B, L, R）。<br>
    单帧内同一个方向出现多次时，会自动去重，保持每个朝向仅出现一次。<br>
    <b>输入</b><br>orientations：“获取NLF骨骼朝向”节点输出的朝向数据<br>
    <b>输出</b><br>labels_batch：解析后的标签<br>
    <b>参数</b><br>
    • <b>目标索引</b>: 大于等于 0 则仅解析输入朝向数据的每帧中的对应索引数据，-1时解析所有角色。<br>
    • <b>提取部位</b>:<br>
    &nbsp;&nbsp;· 胸腔：仅解析输出胸腔朝向。<br>
    &nbsp;&nbsp;· 骨盆：仅解析输出骨盆朝向。<br>
    &nbsp;&nbsp;· 平均：计算输出胸腔与骨盆的平均朝向。<br>
    &nbsp;&nbsp;· 全部：同时解析并输出胸腔和骨盆的朝向。<br>
    • <b>保底方向</b>: 当朝向数据不在所有被激活标签的探测范围（处于盲区）时，则输出此方向。<br>
    • <b>偏航 / 俯仰 引力范围</b>: 激活方向的探测范围，设定值除以 2 作为“引力半径”。如选择90，激活F时：F（前方/正面）对应激活偏航角0度探针，范围为±45度，朝向数据中偏航角在±45度之间的数据将被判定为F。<br>
    • <b>文本框</b>: 输入要激活的标签，将从朝向数据中根据引力范围检测对应标签并输出。<br>
    <hr style="border-color: #444;">
    <h3 style="color: #4af;">✨ 26 个可用方向标签全集</h3>
    在文本框中输入对应字母则激活对应方向。用逗号或空格分隔。<br><br>
    🔸 <b>纯水平方向 (平视)</b><br>
    前: F, 后: B, 左: L, 右: R<br>
    左前: LF, 右前: RF, 左后: LB, 右后: RB<br><br>
    🔸 <b>纯垂直方向 (上下)</b><br>
    上: U, 下: D<br><br>
    🔸 <b>仰视组合方向 (斜上)</b><br>
    前上: FU, 后上: BU, 左上: LU, 右上: RU<br>
    左前上: LFU, 右前上: RFU, 左后上: LBU, 右后上: RBU<br><br>
    🔸 <b>俯视组合方向 (斜下)</b><br>
    前下: FD, 后下: BD, 左下: LD, 右下: RD<br>
    左前下: LFD, 右前下: RFD, 左后下: LBD, 右后下: RBD
</div>`
    },

    "Direction_Modifier": {
        title: "🧭 朝向修改器",
        widgets: {
            "target_direction": "目标朝向",
        },
        slot_labels: { "labels_batch": "朝向标签" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🧭 节点功能说明</h3>
    在朝向标签中的选则朝向，修改为目标朝向。<br>
    <b>输入</b><br>labels_batch：原始朝向标签<br>
    <b>输出</b><br>labels_batch：修改后朝向标签<br>
    <b>参数</b><br>
    • <b>目标朝向</b>: 修改为的目标朝向。<br>
    • <b>文本框</b>: 输入要修改的标签，将从朝向数据中按照引力范围，检测对应标签并输出。<br>
    <hr style="border-color: #444;">
    <h3 style="color: #4af;">✨ 26 个可用方向标签全集</h3>
    在文本框中输入对应字母则激活对应方向。用逗号或空格分隔。<br><br>
    🔸 <b>纯水平方向 (平视)</b><br>
    前: F, 后: B, 左: L, 右: R<br>
    左前: LF, 右前: RF, 左后: LB, 右后: RB<br><br>
    🔸 <b>纯垂直方向 (上下)</b><br>
    上: U, 下: D<br><br>
    🔸 <b>仰视组合方向 (斜上)</b><br>
    前上: FU, 后上: BU, 左上: LU, 右上: RU<br>
    左前上: LFU, 右前上: RFU, 左后上: LBU, 右后上: RBU<br><br>
    🔸 <b>俯视组合方向 (斜下)</b><br>
    前下: FD, 后下: BD, 左下: LD, 右下: RD<br>
    左前下: LFD, 右前下: RFD, 左后下: LBD, 右后下: RBD
</div>`
    },

    "PoseBackgroundOptions": {
        title: "pose背景选项",
        widgets: {
            "bg_color": "背景颜色",
            "draw_only_bg": "仅渲染背景",
            "body_point_radius": "躯干点遮罩半径",
            "body_hull": "躯干内补",
            "body_infill_expand": "躯干内补外扩",
            "face_point_radius": "面部点遮罩半径",
            "face_hull": "面部内补",
            "face_infill_expand": "面部内补外扩",
            "hand_point_radius": "手部点遮罩半径",
            "hand_hull": "手部内补",
            "hand_infill_expand": "手部内补外扩",
            "foot_point_radius": "脚部点遮罩半径",
            "foot_hull": "脚部内补",
            "foot_infill_expand": "脚部内补外扩"
        },
        slot_labels: { "POSE_BACKGROUND": "pose背景选项", },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">节点功能说明</h3>
    为姿态渲染提供高度定制化的姿态背景遮罩配置。<br>
    <b>输出</b><br>
    pose背景选项：连接 通用型pose渲染节点 的对应接口。<br>
    <b>参数</b><br>
    • <b>背景颜色</b>: 绘制的关键点背景颜色。支持 十六进制(#000000), RGB(0,0,0) 或 十进制整数。<br>
    • <b>仅渲染背景</b>: 开启后，通用型pose渲染节点 将仅渲染遮罩背景，不绘制骨骼。<br>
    • <b>[躯干/面部/手部/脚部] 点遮罩半径</b>: 控制对应部位的关键点和连线的背景扩张半径。<br>
    • <b>[躯干/面部/手部/脚部] 内补开关</b>: 开启后，计算有效关键点的外围多边形，使用背景颜色填充。（躯干仅基于锁骨及肩髋 5 个躯干点计算）<br>
    • <b>[躯干/面部/手部/脚部] 内补外扩</b>: 控制对应部位的内补多边形向外围均匀延展的像素距离。
</div>`
    },

    "UniversalPoseRenderer": {
        title: "🎨 通用型pose渲染",
        widgets: {
            "draw_body": "渲染身体",
            "draw_hands": "渲染手部",
            "draw_face": "渲染面部",
            "draw_feet": "渲染脚部",
            "connect_feet": "脚部连线",
            "score_threshold": "分数阈值",
            "stick_width": "线条宽度",
            "face_point_size": "面部点大小",
        },
        slot_labels: { "background_image": "背景图像", "pose_background": "pose背景选项", "IMAGE": "图像", "MASK": "遮罩" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">🎨 节点功能说明</h3>
    解除对脸部点和脚部点的数量安全校验，支持渲染任意数量面部点和脚部点的pose数据。<br>
    <b>输入</b><br>
    keypoints：被绘制的姿态数据。<br>
    背景图像 (可选)：背景图像批次。若不连，则默认渲染在纯黑背景上。<br>
    pose背景选项 (可选)：可自定义根据关键点绘制背景。<br>
    <b>输出</b><br>
    图像：渲染后的姿态图像。<br>
    遮罩：pose背景选项绘制的背景对应的遮罩。<br>
    <b>参数</b><br>
    • <b>渲染身体 / 渲染手部 / 渲染面部 / 渲染脚部</b>: 各个部位的渲染开关。<br>
    • <b>脚部连线</b>: 开启后，脚部点向脚踝点连线。<br>
    • <b>分数阈值</b>: 置信度分数阈值过滤，低于此分数的点不予绘制。<br>
    • <b>线条宽度</b>: 关键点连线的粗细。<br>
    • <b>面部点大小</b>: 面部白点的像素半径。
</div>`
    },

    "UniversalPoseEditor": {
        title: "✏️ 通用型pose编辑",
        widgets: {
            "pose_json": "骨骼JSON数据"
        },
        slot_labels: { "background_image": "背景图像" },
        help: `
<div style="font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #4af;">✏️ 节点功能说明</h3>
    通用型 2D keypoint 姿态编辑器。<br>
    <b>输入</b><br>
    背景图像 (可选)：编辑器内点击【加载背景底图】按钮，将提取此图像作为参考背景。<br>
    keypoint (可选)：点击【更新关键点】按钮，将获取此关键点数据覆写到文本框。<br>
    <b>输出</b><br>
    POSE_KEYPOINT：输出文本框中的keypoint数据。<br>
    <b>参数</b><br>
    文本框：输入 keypoint 数据。<br>
    <hr style="border-color: #444;">
    <h3 style="color: #4af;">🎮 编辑器快捷操作</h3>
    • <b>视角控制</b>：滚轮缩放，鼠标中键拖动可平移画布。<br>
    • <b>选择点位</b>：左键单选，空白处拖拽可框选，按住 <b>Shift</b> 键点击可进行多选。多选状态会绘制边界框，拖动边界框手柄可以自由缩放旋转。拖动锚点位置可以修改旋转缩放中心，按住 <b>Shift</b> 键同时拖动锚点可以进行吸附。<br>
    • <b>移动点位</b>：选中目标点后，直接按住左键拖拽即可移动。<br>
    • <b>隐藏点位</b>：在点位或框选区上点击 <b>[鼠标右键]</b> 可快速切换可见性。<br>
    • <b>历史操作</b>：支持 <b>Ctrl+Z</b> (撤销) 与 <b>Ctrl+Y</b> (重做)。
</div>`
    },
});