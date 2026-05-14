# 智能实验室安全管理系统 - 应用端 Web

本目录用于存放课设中“应用端”部分的 Web 页面、华为云直连配置、任务清单和接口字段说明。

## 目录说明

```text
application_web
│
├── index.html
├── README.md
├── 应用端Web任务清单.md
├── docs
│   └── 接口与数据字段约定.md
│
└── src
    ├── assets      # 样式资源
    ├── components  # 预留组件目录
    ├── pages       # 预留页面目录
    ├── services    # 华为云直连配置和请求代码
    └── mock        # 前期演示用模拟数据
```

## 运行方式

当前版本是静态页面，不需要安装依赖。直接用浏览器打开 `index.html` 即可查看页面。

默认不显示模拟数据，页面会显示“等待云平台数据”。

临时看页面效果可以打开：

```text
index.html?mock=1
```

## 华为云直连配置

修改：

```text
src/services/config.js
```

填写华为云 IoTDA 信息：

```js
window.LabConfig = {
  DEVICE_ID: "Lab_Device_01",
  POLL_INTERVAL_MS: 2500,
  DIRECT_HUAWEI: {
    ENABLED: true,
    IOTDA_ENDPOINT: "https://你的-iotda-endpoint",
    PROJECT_ID: "你的-project-id",
    DEVICE_ID: "Lab_Device_01",
    IAM_TOKEN: "临时 IAM Token",
    SERVICE_ID: "LabService",
    INSTANCE_ID: ""
  }
};
```

页面会直接调用：

```text
GET  /v5/iot/{project_id}/devices/{device_id}/shadow
POST /v5/iot/{project_id}/devices/{device_id}/commands
```

说明：

- `IOTDA_ENDPOINT`：华为云 IoTDA 应用侧 API 地址。
- `PROJECT_ID`：华为云项目 ID。
- `DEVICE_ID`：设备 ID。
- `IAM_TOKEN`：临时 Token。
- `SERVICE_ID`：华为云物模型服务 ID，需要和云平台同学创建的服务 ID 一致。
- `INSTANCE_ID`：如果你的 IoTDA 实例要求 `Instance-Id` 请求头就填写，否则留空。

注意：如果浏览器报 CORS 跨域错误，说明华为云接口不允许浏览器直接跨域访问，前端直连方案会受限制。

## 已实现功能

- 实时数据卡片：温度、湿度、烟雾、光照。
- 设备状态展示：门锁、灯光、风扇、报警器、人体检测、RFID。
- 远程控制：开/关门、开/关灯、开/关风扇、解除报警。
- 查询华为云设备影子。
- 调用华为云命令下发接口。
- Canvas 数据曲线区域。
- RFID 门禁记录和报警记录区域。
- 手机端响应式布局。
- `?mock=1` 模拟数据演示模式。
