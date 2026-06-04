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
  const directRfidLogs = [];
  let lastRfidKey = "";

  const emptyStatus = {
    deviceId,
    online: false,
    updatedAt: "",
    properties: {
      temperature: null,
      humidity: null,
      smoke: null,
      light: null,
      doorStatus: null,
      fanStatus: null,
      lightStatus: null,
      alarmStatus: null,
      rfidStatus: "",
      rfidCardId: "",
      rfidIdentity: "",
      rfidEventId: "",
      rfidTime: ""
    }
  };
  const directHistory = [];

  async function getStatus() {
    await delay(120);
    if (mockMode && window.LabMock) return window.LabMock.getStatus();
    if (directHuaweiEnabled) {
      const status = normalizeLatestStatus(await getHuaweiShadow());
      appendHistoryPoint(status);
      appendRfidLog(status.properties);
      return status;
    }
    return clone(emptyStatus);
  }

  async function getHistory() {
    await delay(80);
    if (mockMode && window.LabMock) return window.LabMock.getHistory();
    if (directHuaweiEnabled) return clone(directHistory);
    return [];
  }

  async function getAccessLogs() {
    await delay(80);
    if (mockMode && window.LabMock) return window.LabMock.getAccessLogs();
    if (directHuaweiEnabled) return clone(directRfidLogs);
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
      updatedAt:
        data.updatedAt ||
        data.updateTime ||
        data.time ||
        cleanText(readField(source, "dateTime", "DateTime")) ||
        formatDisplayTime(new Date()),
      properties: {
        temperature: readNumber(readField(source, "temperature", "Temperature")),
        humidity: readNumber(readField(source, "humidity", "Humidity")),
        smoke: readNumber(readField(source, "smoke", "Smoke")),
        light: readNumber(readField(source, "light", "Light")),
        doorStatus: readStatus(readField(source, "doorStatus", "DoorStatus")),
        fanStatus: readStatus(readField(source, "fanStatus", "FanStatus")),
        lightStatus: readStatus(readField(source, "lightStatus", "LightStatus")),
        alarmStatus: readStatus(readField(source, "alarmStatus", "AlarmStatus")),
        rfidStatus: cleanText(readField(source, "rfidStatus", "RFIDStatus")),
        rfidCardId: cleanText(readField(source, "rfidCard", "RFIDCard", "rfidCardId", "RFIDCardId")),
        rfidIdentity: cleanText(readField(source, "rfidIdentity", "RFIDIdentity", "rfidStatus", "RFIDStatus")),
        rfidEventId: cleanText(readField(source, "rfidEventId", "RFIDEventId", "dateTime", "DateTime")),
        rfidTime: cleanText(readField(source, "dateTime", "DateTime", "rfidTime", "RFIDTime"))
      }
    };
  }

  function appendHistoryPoint(status) {
    const p = status.properties || {};
    const hasValue = [p.temperature, p.humidity, p.smoke, p.light].some(
      (value) => value !== null && value !== undefined
    );
    if (!hasValue) return;

    directHistory.push({
      time: formatDisplayTime(status.updatedAt) || formatDisplayTime(new Date()),
      temperature: p.temperature,
      humidity: p.humidity,
      smoke: p.smoke,
      light: p.light
    });
    if (directHistory.length > 60) directHistory.shift();
  }

  function appendRfidLog(properties) {
    const cardId = String(properties.rfidCardId || "").trim();
    const identity = String(properties.rfidIdentity || "").trim();
    if (!cardId && !identity) return;

    const eventId = String(properties.rfidEventId || properties.rfidTime || "").trim();
    const key = eventId || `${cardId}|${identity}`;
    if (!key || key === lastRfidKey) return;

    lastRfidKey = key;
    directRfidLogs.unshift({
      time: properties.rfidTime || "--",
      cardId: cardId || "--",
      person: identity || "--"
    });
    if (directRfidLogs.length > 20) directRfidLogs.pop();
  }

  function formatDisplayTime(value) {
    if (!value) return "";
    if (value instanceof Date) {
      return value.toLocaleTimeString("zh-CN", { hour12: false });
    }
    const text = String(value).trim().replace(/^"|"$/g, "");
    const match = text.match(/(\d{1,2}:\d{2}:\d{2})/);
    return match ? match[1] : text;
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

  function cleanText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim().replace(/^"|"$/g, "");
  }

  async function getHuaweiShadow() {
    const path = `/v5/iot/${directHuawei.PROJECT_ID}/devices/${deviceId}/shadow`;
    const response = await fetch(huaweiUrl(path), {
      method: "GET",
      headers: await huaweiHeaders("GET", path, "")
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
    const bodyText = JSON.stringify(body);

    console.log("华为云命令下发请求：", commandPath, body);
    const response = await fetch(huaweiUrl(commandPath), {
      method: "POST",
      headers: await huaweiHeaders("POST", commandPath, bodyText),
      body: bodyText
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

  async function huaweiHeaders(method, path, bodyText) {
    validateHuaweiConfig();
    if ((directHuawei.AUTH_TYPE || "aksk").toLowerCase() === "token") {
      return tokenHeaders();
    }
    return akskHeaders(method, path, bodyText);
  }

  function validateHuaweiConfig() {
    if (!directHuawei.IOTDA_ENDPOINT || !directHuawei.PROJECT_ID) {
      throw new Error("请先在 config.js 填写 IOTDA_ENDPOINT 和 PROJECT_ID");
    }
    if ((directHuawei.AUTH_TYPE || "aksk").toLowerCase() === "token") {
      if (!directHuawei.IAM_TOKEN) throw new Error("请先在 config.js 填写 IAM_TOKEN");
      return;
    }
    if (!directHuawei.AK || !directHuawei.SK) {
      throw new Error("请先在 config.js 填写 AK 和 SK");
    }
    if (!window.crypto?.subtle) {
      throw new Error("当前浏览器不支持 Web Crypto，请使用 localhost 或 HTTPS 打开页面");
    }
  }

  function tokenHeaders() {
    const headers = {
      Accept: "application/json",
      "X-Auth-Token": directHuawei.IAM_TOKEN
    };
    if (directHuawei.INSTANCE_ID) headers["Instance-Id"] = directHuawei.INSTANCE_ID;
    return headers;
  }

  async function akskHeaders(method, path, bodyText) {
    const url = new URL(huaweiUrl(path));
    const sdkDate = formatSdkDate(new Date());
    const headers = {
      Accept: "application/json",
      "X-Sdk-Date": sdkDate
    };

    const signedHeaderValues = {
      host: url.host,
      "x-sdk-date": sdkDate
    };

    if (method.toUpperCase() !== "GET") {
      headers["Content-Type"] = "application/json";
      signedHeaderValues["content-type"] = "application/json";
    }

    if (directHuawei.INSTANCE_ID) {
      headers["Instance-Id"] = directHuawei.INSTANCE_ID;
      signedHeaderValues["instance-id"] = directHuawei.INSTANCE_ID;
    }

    const authorization = await buildAuthorization({
      method: method.toUpperCase(),
      url,
      bodyText,
      signedHeaderValues
    });
    headers.Authorization = authorization;
    return headers;
  }

  async function buildAuthorization({ method, url, bodyText, signedHeaderValues }) {
    const algorithm = "V11-HMAC-SHA256";
    const signedHeaderNames = Object.keys(signedHeaderValues).sort();
    const canonicalHeaders = signedHeaderNames
      .map((name) => `${name}:${signedHeaderValues[name]}\n`)
      .join("");
    const signedHeaders = signedHeaderNames.join(";");
    const payloadHash = await sha256Hex(bodyText || "");
    const canonicalRequest = [
      method,
      canonicalUri(url.pathname),
      canonicalQueryString(url.searchParams),
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join("\n");
    const info = `${signedHeaderValues["x-sdk-date"].slice(0, 8)}/${directHuawei.REGION_ID || "cn-north-4"}/${directHuawei.DERIVED_AUTH_SERVICE_NAME || "iotda"}`;
    const stringToSign = [
      algorithm,
      signedHeaderValues["x-sdk-date"],
      info,
      await sha256Hex(canonicalRequest)
    ].join("\n");
    const derivationKey = await getDerivationKey(directHuawei.AK, directHuawei.SK, info);
    const signature = await hmacSha256Hex(derivationKey, stringToSign);
    return `${algorithm} Credential=${directHuawei.AK}/${info}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  function canonicalUri(pathname) {
    const encodedPath = pathname
      .split("/")
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)).replace(/[!'()*]/g, hexEscape))
      .join("/") || "/";
    return encodedPath.endsWith("/") ? encodedPath : `${encodedPath}/`;
  }

  function canonicalQueryString(searchParams) {
    return Array.from(searchParams.entries())
      .sort(([aKey, aValue], [bKey, bValue]) => (aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey)))
      .map(([key, value]) => `${encodeURIComponent(key).replace(/[!'()*]/g, hexEscape)}=${encodeURIComponent(value).replace(/[!'()*]/g, hexEscape)}`)
      .join("&");
  }

  function formatSdkDate(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  }

  function hexEscape(char) {
    return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
  }

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const hash = await window.crypto.subtle.digest("SHA-256", bytes);
    return bufferToHex(hash);
  }

  async function hmacSha256Hex(secret, text) {
    return hmacSha256HexByBytes(new TextEncoder().encode(secret), text);
  }

  async function hmacSha256HexByBytes(secretBytes, text) {
    const key = await window.crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await window.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
    return bufferToHex(signature);
  }

  async function hmacSha256Bytes(secretBytes, messageBytes) {
    const key = await window.crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await window.crypto.subtle.sign("HMAC", key, messageBytes);
    return new Uint8Array(signature);
  }

  async function getDerivationKey(accessKey, secretKey, info) {
    const encoder = new TextEncoder();
    const prk = await hmacSha256Bytes(encoder.encode(accessKey), encoder.encode(secretKey));
    const infoBytes = encoder.encode(info);
    const expandInput = new Uint8Array(infoBytes.length + 1);
    expandInput.set(infoBytes, 0);
    expandInput[expandInput.length - 1] = 1;
    const okm = await hmacSha256Bytes(prk, expandInput);
    return bufferToHex(okm.slice(0, 32));
  }

  function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
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
