(function () {
  window.LabConfig = {
    DEVICE_ID: "6a0437cdcbb0cf6bb95a67a7_LAB_Safe_M",
    POLL_INTERVAL_MS: 2500,

    DIRECT_HUAWEI: {
      ENABLED: true,

      // IoTDA 应用侧实例地址。
      IOTDA_ENDPOINT: "https://130a97bf5d.st1.iotda-app.cn-north-4.myhuaweicloud.com",
      REGION_ID: "cn-north-4",
      DERIVED_AUTH_SERVICE_NAME: "iotda",

      PROJECT_ID: "0d8e6ac1f0a04b4e8137b40b777d4d95",
      DEVICE_ID: "6a0437cdcbb0cf6bb95a67a7_LAB_Safe_M",

      // aksk：使用 credentials.csv 中的 AK/SK 做长期签名认证。
      // token：使用 X-Auth-Token 临时认证。
      AUTH_TYPE: "aksk",
      AK: "HPUARQNNUW2XMHAUXKBJ",
      SK: "SRSFEoqS2gTVR381TMH18QZ5DLbcgbYlPnO65e9F",
      IAM_TOKEN: "",

      SERVICE_ID: "Sensor",
      COMMAND_API: "sync",

      COMMANDS: {
        openDoor: { command_name: "OpenDoor", paras: { DoorStatus: 1 } },
        closeDoor: { command_name: "CloseDoor", paras: { DoorStatus: 0 } },
        openFan: { command_name: "OpenFan", paras: { FanStatus: 1 } },
        closeFan: { command_name: "CloseFan", paras: { FanStatus: 0 } },
        openLight: { command_name: "OpenLight", paras: { LightStatus: 1 } },
        closeLight: { command_name: "CloseLight", paras: { LightStatus: 0 } },
        resetAlarm: { command_name: "ResetAlarm", paras: { AlarmStatus: 0 } }
      },

      INSTANCE_ID: ""
    }
  };
})();
