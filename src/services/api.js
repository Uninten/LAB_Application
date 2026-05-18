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
        temperature: readNumber(readField(source, "temperature", "Temperature")),
        humidity: readNumber(readField(source, "humidity", "Humidity")),
        smoke: readNumber(readField(source, "smoke", "Smoke")),
        light: readNumber(readField(source, "light", "Light")),
        humanStatus: readStatus(readField(source, "humanStatus", "HumanStatus")),
        doorStatus: readStatus(readField(source, "doorStatus", "DoorStatus")),
        fanStatus: readStatus(readField(source, "fanStatus", "FanStatus")),
        lightStatus: readStatus(readField(source, "lightStatus", "LightStatus")),
        alarmStatus: readStatus(readField(source, "alarmStatus", "AlarmStatus")),
        rfidStatus: readField(source, "rfidStatus", "RFIDStatus") || ""
      }
    };
  }

  function readField(source, ...names) {
    for (const name of names) {
      if (source[name] !== undefined && source[name] !== null) return source[name];
    }
    return null;
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
      const errorText = await response.text();
      console.error("华为云设备影子查询失败：", response.status, errorText);
      throw new Error(`华为云设备影子查询失败：${response.status}`);
    }
    const data = await response.json();
    console.log("华为云设备影子返回：", data);
    return normalizeHuaweiShadow(data);
  }

  async function sendHuaweiCommand(command) {
    const controlMap = directHuawei.COMMANDS || {};
    const target = controlMap[command];
    if (!target) {
      return { success: false, message: `未知命令：${command}` };
    }

    const commandPath =
      directHuawei.COMMAND_API === "async"
        ? `/v5/iot/${directHuawei.PROJECT_ID}/devices/${deviceId}/async-commands`
        : `/v5/iot/${directHuawei.PROJECT_ID}/devices/${deviceId}/commands`;
    const body =
      directHuawei.COMMAND_API === "async"
        ? {
            service_id: directHuawei.SERVICE_ID || "Sensor",
            command_name: target.command_name,
            paras: target.paras,
            expire_time: 0,
            send_strategy: "immediately"
          }
        : {
            service_id: directHuawei.SERVICE_ID || "Sensor",
            command_name: target.command_name,
            paras: target.paras
          };

    console.log("华为云命令下发请求：", commandPath, body);
    const response = await fetch(huaweiUrl(commandPath), {
      method: "POST",
      headers: {
        ...huaweiHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("华为云命令下发失败：", response.status, errorText);
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
    if (!Object.keys(properties).length) {
      console.warn("华为云设备影子中没有读取到 reported.properties，原始返回：", data);
    }
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
