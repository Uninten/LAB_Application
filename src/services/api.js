(function () {
  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const params = new URLSearchParams(window.location.search);
  const mockMode = params.get("mock") === "1";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const config = window.LabConfig || {};
  const directHuawei = config.DIRECT_HUAWEI || {};
  const directHuaweiEnabled = Boolean(directHuawei.ENABLED);
  const deviceId = directHuaweiEnabled
    ? directHuawei.DEVICE_ID || config.DEVICE_ID || "Lab_Device_01"
    : config.DEVICE_ID || "Lab_Device_01";

  const emptyStatus = {
    deviceId,
    online: false,
    updatedAt: "",
    properties: {
      temperature: null,
      humidity: null,
      smoke: null,
      light: null,
      humanStatus: null,
      doorStatus: null,
      fanStatus: null,
      lightStatus: null,
      alarmStatus: null,
      rfidStatus: ""
    }
  };

  async function getStatus() {
    await delay(120);
    if (mockMode && window.LabMock) return window.LabMock.getStatus();
    if (directHuaweiEnabled) return normalizeLatestStatus(await getHuaweiShadow());
    return clone(emptyStatus);
  }

  async function getHistory() {
    await delay(80);
    if (mockMode && window.LabMock) return window.LabMock.getHistory();
    return [];
  }

  async function getAccessLogs() {
    await delay(80);
    if (mockMode && window.LabMock) return window.LabMock.getAccessLogs();
    return [];
  }

  async function getAlarmLogs() {
    await delay(80);
    if (mockMode && window.LabMock) return window.LabMock.getAlarmLogs();
    return [];
  }

  async function getFeed() {
    await delay(60);
    if (mockMode && window.LabMock) return window.LabMock.getFeed();
    return [];
  }

  async function sendCommand(command) {
    await delay(450);
    if (mockMode && window.LabMock) return window.LabMock.command(command);
    if (directHuaweiEnabled) return sendHuaweiCommand(command);
    return {
      success: false,
      message: `云平台尚未接入，${command} 未下发`
    };
  }

  function normalizeLatestStatus(data) {
    const source = data.properties ? data.properties : data;
    return {
      deviceId: data.deviceId || data.device_id || deviceId,
      online: data.online !== undefined ? Boolean(data.online) : true,
      updatedAt: data.updatedAt || data.updateTime || data.time || "",
      properties: {
        temperature: readNumber(source.temperature),
        humidity: readNumber(source.humidity),
        smoke: readNumber(source.smoke),
        light: readNumber(source.light),
        humanStatus: readStatus(source.humanStatus),
        doorStatus: readStatus(source.doorStatus),
        fanStatus: readStatus(source.fanStatus),
        lightStatus: readStatus(source.lightStatus),
        alarmStatus: readStatus(source.alarmStatus),
        rfidStatus: source.rfidStatus || ""
      }
    };
  }

  function readNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
  }

  function readStatus(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
  }

  async function getHuaweiShadow() {
    const response = await fetch(huaweiUrl(`/v5/iot/${directHuawei.PROJECT_ID}/devices/${deviceId}/shadow`), {
      method: "GET",
      headers: huaweiHeaders()
    });
    if (!response.ok) {
      throw new Error(`华为云设备影子查询失败：${response.status}`);
    }
    const data = await response.json();
    return normalizeHuaweiShadow(data);
  }

  async function sendHuaweiCommand(command) {
    const controlMap = {
      openDoor: { command_name: "openDoor", paras: { status: 1 } },
      closeDoor: { command_name: "closeDoor", paras: { status: 0 } },
      openFan: { command_name: "openFan", paras: { status: 1 } },
      closeFan: { command_name: "closeFan", paras: { status: 0 } },
      openLight: { command_name: "openLight", paras: { status: 1 } },
      closeLight: { command_name: "closeLight", paras: { status: 0 } },
      resetAlarm: { command_name: "resetAlarm", paras: { status: 0 } }
    };
    const target = controlMap[command];
    if (!target) {
      return { success: false, message: `未知命令：${command}` };
    }

    const response = await fetch(huaweiUrl(`/v5/iot/${directHuawei.PROJECT_ID}/devices/${deviceId}/commands`), {
      method: "POST",
      headers: {
        ...huaweiHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        service_id: directHuawei.SERVICE_ID || "LabService",
        ...target
      })
    });
    if (!response.ok) {
      throw new Error(`华为云命令下发失败：${response.status}`);
    }
    return {
      success: true,
      message: "命令已提交到华为云",
      data: await response.json()
    };
  }

  function normalizeHuaweiShadow(data) {
    const properties = {};
    const shadow = Array.isArray(data.shadow) ? data.shadow : [];
    shadow.forEach((service) => {
      Object.assign(properties, service?.reported?.properties || {});
    });
    return {
      deviceId,
      online: true,
      updatedAt: data.event_time || data.update_time || "",
      properties
    };
  }

  function huaweiUrl(path) {
    const endpoint = (directHuawei.IOTDA_ENDPOINT || "").replace(/\/$/, "");
    return `${endpoint}${path}`;
  }

  function huaweiHeaders() {
    if (!directHuawei.IOTDA_ENDPOINT || !directHuawei.PROJECT_ID || !directHuawei.IAM_TOKEN) {
      throw new Error("请先在 config.js 填写 DIRECT_HUAWEI 的 IOTDA_ENDPOINT、PROJECT_ID 和 IAM_TOKEN");
    }

    const headers = {
      Accept: "application/json",
      "X-Auth-Token": directHuawei.IAM_TOKEN
    };
    if (directHuawei.INSTANCE_ID) {
      headers["Instance-Id"] = directHuawei.INSTANCE_ID;
    }
    return headers;
  }

  window.LabApi = {
    isMockMode: mockMode,
    directHuaweiEnabled,
    deviceId,
    getStatus,
    getHistory,
    getAccessLogs,
    getAlarmLogs,
    getFeed,
    sendCommand
  };
})();
