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
    if (apiBaseUrl) return getJson("/api/device/status");
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
    if (apiBaseUrl) return getJson("/api/access/logs");
    return [];
  }

  async function getAlarmLogs() {
    await delay(80);
    if (mockMode && window.LabMock) return window.LabMock.getAlarmLogs();
    if (apiBaseUrl) return getJson("/api/alarm/logs");
    return [];
  }

  async function getFeed() {
    await delay(60);
    if (mockMode && window.LabMock) return window.LabMock.getFeed();
    if (apiBaseUrl) return getJson("/api/events/recent");
    return [];
  }

  async function sendCommand(command) {
    await delay(450);
    if (mockMode && window.LabMock) return window.LabMock.command(command);
    if (apiBaseUrl) {
      return postJson("/api/device/command", {
        deviceId,
        command,
        params: {}
      });
    }
    return {
      success: false,
      message: `云平台尚未接入，${command} 未下发`
    };
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
