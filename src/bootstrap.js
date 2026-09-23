(function () {
  const MAX_CONFIG_SIZE = 64 * 1024;
  const params = new URLSearchParams(window.location.search);
  const mockMode = params.get("mock") === "1";
  const gate = document.querySelector("#configGate");
  const fileInput = document.querySelector("#configFile");
  const fileName = document.querySelector("#configFileName");
  const message = document.querySelector("#configMessage");
  let appStarted = false;

  function setMessage(text, type) {
    message.textContent = text;
    message.className = `config-message ${type || ""}`.trim();
  }

  function validateConfig(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new Error("配置文件顶层必须是 JSON 对象");
    }

    const direct = config.DIRECT_HUAWEI;
    if (!direct || typeof direct !== "object" || Array.isArray(direct)) {
      throw new Error("配置文件缺少 DIRECT_HUAWEI 对象");
    }
    if (!direct.ENABLED) {
      throw new Error("DIRECT_HUAWEI.ENABLED 必须设为 true");
    }

    ["IOTDA_ENDPOINT", "PROJECT_ID", "DEVICE_ID"].forEach((key) => {
      if (typeof direct[key] !== "string" || !direct[key].trim()) {
        throw new Error(`配置文件缺少 DIRECT_HUAWEI.${key}`);
      }
    });

    let endpoint;
    try {
      endpoint = new URL(direct.IOTDA_ENDPOINT);
    } catch {
      throw new Error("IOTDA_ENDPOINT 不是有效的网址");
    }
    if (endpoint.protocol !== "https:") {
      throw new Error("IOTDA_ENDPOINT 必须使用 HTTPS");
    }

    const authType = String(direct.AUTH_TYPE || "aksk").toLowerCase();
    if (authType === "token") {
      if (typeof direct.IAM_TOKEN !== "string" || !direct.IAM_TOKEN) {
        throw new Error("token 认证需要填写 IAM_TOKEN");
      }
    } else if (
      typeof direct.AK !== "string" ||
      !direct.AK ||
      typeof direct.SK !== "string" ||
      !direct.SK
    ) {
      throw new Error("aksk 认证需要填写 AK 和 SK");
    }

    return config;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`程序文件加载失败：${src}`));
      document.body.appendChild(script);
    });
  }

  async function start(config) {
    if (appStarted) return;
    window.LabConfig = config;
    await loadScript("./src/mock/mock-data.js?v=20260923-config-import");
    await loadScript("./src/services/api.js?v=20260923-config-import");
    await loadScript("./src/main.js?v=20260923-config-import");
    appStarted = true;
    gate.hidden = true;
  }

  async function importConfig(file) {
    if (!file) return;
    fileName.textContent = file.name;
    setMessage("正在读取配置…", "");

    if (file.size > MAX_CONFIG_SIZE) {
      throw new Error("配置文件不能超过 64 KB");
    }

    let config;
    try {
      config = JSON.parse(await file.text());
    } catch {
      throw new Error("配置文件不是有效的 JSON");
    }

    validateConfig(config);
    setMessage("配置读取成功，正在启动…", "success");
    await start(config);
  }

  fileInput.addEventListener("change", async (event) => {
    try {
      await importConfig(event.target.files[0]);
    } catch (error) {
      setMessage(error.message || "配置读取失败", "error");
      fileInput.value = "";
    }
  });

  if (mockMode) {
    start({
      DEVICE_ID: "Lab_Device_01",
      POLL_INTERVAL_MS: 2500,
      DIRECT_HUAWEI: { ENABLED: false }
    }).catch((error) => setMessage(error.message || "演示模式启动失败", "error"));
  }
})();
