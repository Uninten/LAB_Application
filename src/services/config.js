(function () {
  window.LabConfig = {
    // 填云平台同学提供的后端接口地址，不要填华为云 AK/SK、Token 或设备密钥。
    // 示例：http://localhost:3000
    API_BASE_URL: "130a97bf5d.st1.iotda-device.cn-north-4.myhuaweicloud.com",

    // 后端如果支持 WebSocket 实时推送，就填写这里；不支持可以留空，页面会自动使用 HTTP 轮询。
    // 示例：ws://localhost:3000/ws
    WS_URL: "",

    DEVICE_ID: "Lab_Device_01",

    // HTTP 轮询间隔，单位毫秒。
    POLL_INTERVAL_MS: 2500
  };
})();
