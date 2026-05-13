(function () {
  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const params = new URLSearchParams(window.location.search);
  const mockMode = params.get("mock") === "1";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const config = window.LabConfig || {};
  const apiBaseUrl = (config.API_BASE_URL || "").replace(/\/$/, "");
  const wsUrl = config.WS_URL || "";
  const deviceId = config.DEVICE_ID || "Lab_Device_01";

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
    if (apiBaseUrl) return normalizeLatestStatus(await getJson("/api/device/latest"));
    return clone(emptyStatus);
  }

  async function getHistory() {
    await delay(80);
    if (mockMode && window.LabMock) return window.LabMock.getHistory();
    if (apiBaseUrl) return getJson("/api/device/history");
    return [];
  }

  async function getAccessLogs() {
    await delay(80);
    if (mockMode && window.LabMock) return window.LabMock.getAccessLogs();
    if (apiBaseUrl) return normalizeRfidLogs(await getJson("/api/rfid/list"));
    return [];
  }

  async function getAlarmLogs() {
    await delay(80);
    if (mockMode && window.LabMock) return window.LabMock.getAlarmLogs();
    if (apiBaseUrl) return normalizeAlarmLogs(await getJson("/api/alarm/list"));
    return [];
  }

  async function getFeed() {
    await delay(60);
    if (mockMode && window.LabMock) return window.LabMock.getFeed();
    if (apiBaseUrl) return [];
    return [];
  }

  async function sendCommand(command) {
    await delay(450);
    if (mockMode && window.LabMock) return window.LabMock.command(command);
    if (apiBaseUrl) {
      return sendControlCommand(command);
    }
    return {
      success: false,
      message: `云平台尚未接入，${command} 未下发`
    };
  }

  function normalizeLatestStatus(data) {
    return {
      deviceId: data.deviceId || deviceId,
      online: data.online !== undefined ? Boolean(data.online) : true,
      updatedAt: data.updatedAt || data.updateTime || data.time || "",
      properties: {
        temperature: readNumber(data.temperature),
        humidity: readNumber(data.humidity),
        smoke: readNumber(data.smoke),
        light: readNumber(data.light),
        humanStatus: readStatus(data.humanStatus),
        doorStatus: readStatus(data.doorStatus),
        fanStatus: readStatus(data.fanStatus),
        lightStatus: readStatus(data.lightStatus),
        alarmStatus: readStatus(data.alarmStatus),
        rfidStatus: data.rfidStatus || ""
      }
    };
  }

  function normalizeAlarmLogs(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item) => ({
      time: item.time || item.alarmTime || item.createTime || "",
      type: item.type || item.alarmType || "报警事件",
      level: item.level || item.alarmLevel || "一般",
      value: item.value || item.alarmValue || "",
      status: item.status || item.alarmStatus || "未处理"
    }));
  }

  function normalizeRfidLogs(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item) => ({
      time: item.time || item.accessTime || item.createTime || "",
      cardId: item.cardId || item.rfid || "",
      person: item.person || item.userType || item.userName || "未知用户",
      result: item.result || item.accessResult || "",
      doorAction: item.doorAction || (String(item.accessResult || "").includes("拒绝") ? "拒绝" : "开门")
    }));
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

  function sendControlCommand(command) {
    const controlMap = {
      openDoor: { path: "/api/control/door", body: { status: 1 } },
      closeDoor: { path: "/api/control/door", body: { status: 0 } },
      openFan: { path: "/api/control/fan", body: { status: 1 } },
      closeFan: { path: "/api/control/fan", body: { status: 0 } },
      openLight: { path: "/api/control/light", body: { status: 1 } },
      closeLight: { path: "/api/control/light", body: { status: 0 } },
      resetAlarm: { path: "/api/control/alarm/reset", body: { status: 0 } }
    };

    const target = controlMap[command];
    if (!target) {
      return Promise.resolve({
        success: false,
        message: `未知命令：${command}`
      });
    }

    return postJson(target.path, {
      deviceId,
      ...target.body
    });
  }

  async function getJson(path) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`接口请求失败：${response.status}`);
    }
    return response.json();
  }

  async function postJson(path, body) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`命令下发失败：${response.status}`);
    }
    return response.json();
  }

  function connectRealtime(onMessage, onStateChange) {
    if (mockMode || !wsUrl || typeof WebSocket === "undefined") {
      return null;
    }

    const socket = new WebSocket(wsUrl);

    socket.addEventListener("open", () => {
      if (onStateChange) onStateChange("connected");
      socket.send(JSON.stringify({ type: "subscribe", deviceId }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        onMessage({ type: "unknown", raw: event.data });
      }
    });

    socket.addEventListener("close", () => {
      if (onStateChange) onStateChange("closed");
    });

    socket.addEventListener("error", () => {
      if (onStateChange) onStateChange("error");
    });

    return socket;
  }

  window.LabApi = {
    isMockMode: mockMode,
    hasBackend: Boolean(apiBaseUrl),
    hasWebSocket: Boolean(wsUrl),
    deviceId,
    getStatus,
    getHistory,
    getAccessLogs,
    getAlarmLogs,
    getFeed,
    sendCommand,
    connectRealtime
  };
})();
