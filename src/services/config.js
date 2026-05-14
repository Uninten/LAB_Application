(function () {
  window.LabConfig = {
    DEVICE_ID: "Lab_Device_01",

    // 页面向华为云查询设备影子的轮询间隔，单位毫秒。
    POLL_INTERVAL_MS: 2500,

    // 浏览器直接请求华为云 IoTDA。课程设计本地演示可使用。
    DIRECT_HUAWEI: {
      // 是否启用华为云直连模式：true 表示直接请求华为云，false 表示页面保持等待数据状态。
      ENABLED: false,

      // 华为云 IoTDA 应用侧 API 地址，由云平台负责人提供，例如 https://xxxx.iotda-app.cn-north-4.myhuaweicloud.com。
      IOTDA_ENDPOINT: "",

      // 华为云项目 ID，不是账号 ID；可在“我的凭证/项目”中查看。
      PROJECT_ID: "",

      // 华为云 IoTDA 中创建的设备 ID，需要和云平台设备详情中的 device_id 一致。
      DEVICE_ID: "Lab_Device_01",

      // 临时 IAM Token，用于浏览器请求华为云 API；Token 过期后需要重新获取并替换。
      IAM_TOKEN: "",

      // 华为云物模型中的服务 ID，需要和产品物模型里定义的 service_id 一致。
      SERVICE_ID: "LabService",

      // IoTDA 实例 ID；如果接口要求请求头 Instance-Id 就填写，否则保持空字符串。
      INSTANCE_ID: ""
    }
  };
})();
