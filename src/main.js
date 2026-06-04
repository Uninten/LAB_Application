(function () {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const els = {
    onlineStatus: $("#onlineStatus"),
    lastUpdated: $("#lastUpdated"),
    globalSafety: $("#globalSafety"),
    commandState: $("#commandState"),
    deviceStates: $("#deviceStates"),
    activityFeed: $("#activityFeed"),
    accessLogs: $("#accessLogs"),
    alarmLogs: $("#alarmLogs"),
    chart: $("#historyChart"),
    metrics: {
      temperatureValue: $("#temperatureValue"),
      humidityValue: $("#humidityValue"),
      smokeValue: $("#smokeValue"),
      lightValue: $("#lightValue"),
      temperatureState: $("#temperatureState"),
      humidityState: $("#humidityState"),
      smokeState: $("#smokeState"),
      lightState: $("#lightState")
    }
  };

  const commandNames = {
    openDoor: "开门",
    closeDoor: "关门",
    openLight: "开灯",
    closeLight: "关灯",
    openFan: "开风扇",
    closeFan: "关风扇",
    resetAlarm: "解除报警"
  };

  function classify(status) {
    if (status === null || status === undefined) return "等待数据";
    return status ? "开启" : "关闭";
  }

  function metricState(type, value) {
    if (value === null || value === undefined) return ["neutral", "等待数据"];
    const rules = {
      temperature: value >= 32 ? ["danger", "温度异常"] : value >= 30 ? ["warn", "温度偏高"] : ["ok", "正常"],
      humidity: value >= 75 || value <= 35 ? ["warn", "湿度注意"] : ["ok", "正常"],
      smoke: value >= 650 ? ["danger", "烟雾报警"] : value >= 450 ? ["warn", "烟雾偏高"] : ["ok", "正常"],
      light: value < 220 ? ["warn", "光照偏低"] : ["ok", "正常"]
    };
    return rules[type];
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function statusTag(text, type) {
    return `<span class="tag ${type}">${text}</span>`;
  }

  function updateMetrics(properties) {
    setText(
      els.metrics.temperatureValue,
      properties.temperature === null ? "--" : `${properties.temperature.toFixed(1)} ℃`
    );
    setText(
      els.metrics.humidityValue,
      properties.humidity === null ? "--" : `${properties.humidity.toFixed(1)} %`
    );
    setText(els.metrics.smokeValue, properties.smoke === null ? "--" : `${properties.smoke} ppm`);
    setText(els.metrics.lightValue, properties.light === null ? "--" : `${properties.light} lx`);

    [
      ["temperature", properties.temperature, els.metrics.temperatureState],
      ["humidity", properties.humidity, els.metrics.humidityState],
      ["smoke", properties.smoke, els.metrics.smokeState],
      ["light", properties.light, els.metrics.lightState]
    ].forEach(([type, value, element]) => {
      const [level, text] = metricState(type, value);
      element.textContent = text;
      element.className = level;
    });
  }

  function updateDeviceStates(properties) {
    const states = [
      ["门锁", classify(properties.doorStatus), properties.doorStatus ? "ok" : "neutral"],
      ["灯光", classify(properties.lightStatus), properties.lightStatus ? "ok" : "neutral"],
      ["风扇", classify(properties.fanStatus), properties.fanStatus ? "ok" : "neutral"],
      [
        "报警器",
        properties.alarmStatus === null ? "等待数据" : properties.alarmStatus ? "报警中" : "正常",
        properties.alarmStatus ? "danger" : properties.alarmStatus === 0 ? "ok" : "neutral"
      ],
      [
        "RFID",
        properties.rfidIdentity || properties.rfidStatus || "等待数据",
        properties.rfidStatus === "非法刷卡" ? "danger" : properties.rfidStatus ? "ok" : "neutral"
      ]
    ];

    els.deviceStates.innerHTML = states
      .map(
        ([name, value, type]) => `
          <article class="device-state">
            <p>${name}</p>
            <strong>${statusTag(value, type)}</strong>
          </article>
        `
      )
      .join("");
  }

  function updateSafety(status) {
    const p = status.properties;
    if (p.temperature === null && p.smoke === null && p.alarmStatus === null) {
      els.globalSafety.textContent = "等待云平台数据";
      els.globalSafety.className = "alert-chip neutral";
      return;
    }
    const dangerous = p.alarmStatus || p.smoke >= 650 || p.temperature >= 32;
    const warning = p.smoke >= 450 || p.temperature >= 30 || p.light < 220;
    els.globalSafety.className = "alert-chip";
    if (dangerous) {
      els.globalSafety.textContent = "异常报警";
      els.globalSafety.classList.add("danger");
    } else if (warning) {
      els.globalSafety.textContent = "需要关注";
      els.globalSafety.classList.add("warn");
    } else {
      els.globalSafety.textContent = "运行正常";
      els.globalSafety.classList.add("safe");
    }
  }

  function updateHeader(status) {
    els.onlineStatus.textContent = status.online ? "设备在线" : "设备离线";
    els.onlineStatus.classList.toggle("offline", !status.online);
    els.lastUpdated.textContent = status.updatedAt ? `最后更新 ${status.updatedAt}` : "等待云平台数据";
  }

  function renderFeed(feed) {
    if (!feed.length) {
      els.activityFeed.innerHTML = `
        <article class="empty-state">
          <strong>暂无实时事件</strong>
          <span>等待云平台推送 RFID、报警或控制反馈事件</span>
        </article>
      `;
      return;
    }
    els.activityFeed.innerHTML = feed
      .map(
        (item) => `
          <article class="feed-item">
            <strong>${item.title}</strong>
            <span>${item.detail} · ${item.time}</span>
          </article>
        `
      )
      .join("");
  }

  function renderAccessLogs(logs) {
    if (!logs.length) {
      els.accessLogs.innerHTML = `<tr><td colspan="3" class="empty-cell">暂无门禁记录，等待 RFID 数据上报</td></tr>`;
      return;
    }
    els.accessLogs.innerHTML = logs
      .map((item) => {
        return `
          <tr>
            <td>${item.time || "--"}</td>
            <td>${item.cardId}</td>
            <td>${item.person}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderAlarmLogs(logs) {
    if (!logs.length) {
      els.alarmLogs.innerHTML = `<tr><td colspan="5" class="empty-cell">暂无报警记录，等待云平台告警事件</td></tr>`;
      return;
    }
    els.alarmLogs.innerHTML = logs
      .map((item) => {
        const type = item.status === "未处理" ? "danger" : "neutral";
        const level = item.level === "严重" ? "danger" : "warn";
        return `
          <tr>
            <td>${item.time}</td>
            <td>${item.type}</td>
            <td>${statusTag(item.level, level)}</td>
            <td>${item.value}</td>
            <td>${statusTag(item.status, type)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function normalize(value, min, max, height, padding) {
    const safe = Math.max(min, Math.min(max, value));
    return height - padding - ((safe - min) / (max - min)) * (height - padding * 2);
  }

  function drawChart(history) {
    const canvas = els.chart;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width));
    const height = 260;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padding = 32;
    ctx.strokeStyle = "#d8dee8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const y = padding + ((height - padding * 2) / 4) * i;
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
    }
    ctx.stroke();

    if (!history.length) {
      ctx.fillStyle = "#667085";
      ctx.font = "14px Microsoft YaHei, Arial";
      ctx.textAlign = "center";
      ctx.fillText("暂无历史曲线数据，等待云平台上报", width / 2, height / 2);
      ctx.textAlign = "left";
      return;
    }

    const series = [
      { key: "temperature", color: "#b45309", min: 18, max: 38, unit: "℃", digits: 1 },
      { key: "humidity", color: "#2563eb", min: 25, max: 90, unit: "%", digits: 1 },
      { key: "smoke", color: "#b91c1c", min: 0, max: 900, unit: "ppm", digits: 0 },
      { key: "light", color: "#15803d", min: 50, max: 1000, unit: "lx", digits: 0 }
    ];

    const latestLabels = [];
    series.forEach((line) => {
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 2.5;
      let firstPoint = true;
      let lastPoint = null;
      history.forEach((point, index) => {
        const rawValue = point[line.key];
        if (rawValue === null || rawValue === undefined) return;
        const x =
          padding + ((width - padding * 2) / Math.max(1, history.length - 1)) * index;
        const y = normalize(rawValue, line.min, line.max, height, padding);
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        }
        else ctx.lineTo(x, y);
        lastPoint = { x, y, value: rawValue };
      });
      ctx.stroke();
      if (lastPoint) {
        latestLabels.push({ ...lastPoint, ...line });
        ctx.beginPath();
        ctx.fillStyle = line.color;
        ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    drawLatestLabels(ctx, latestLabels, width, height, padding);

    ctx.fillStyle = "#667085";
    ctx.font = "12px Microsoft YaHei, Arial";
    const first = history[0];
    const last = history[history.length - 1];
    if (first && last) {
      ctx.fillText(first.time, padding, height - 8);
      const labelWidth = ctx.measureText(last.time).width;
      ctx.fillText(last.time, width - padding - labelWidth, height - 8);
    }
  }

  function drawLatestLabels(ctx, labels, width, height, padding) {
    const sorted = labels
      .map((item) => ({
        ...item,
        label: `${Number(item.value).toFixed(item.digits)} ${item.unit}`
      }))
      .sort((a, b) => a.y - b.y);
    const rowHeight = 18;
    let previousY = padding - rowHeight;

    sorted.forEach((item) => {
      const targetY = Math.max(padding + 10, Math.min(height - padding - 12, item.y));
      const y = Math.max(targetY, previousY + rowHeight);
      previousY = y;

      ctx.font = "12px Microsoft YaHei, Arial";
      const textWidth = ctx.measureText(item.label).width;
      const x = Math.max(padding + 4, Math.min(width - padding - textWidth - 12, item.x - textWidth - 10));

      ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
      ctx.fillRect(x - 5, y - 12, textWidth + 10, 16);
      ctx.fillStyle = item.color;
      ctx.fillText(item.label, x, y);
    });
  }

  async function refreshAll() {
    try {
      if (window.LabApi.isMockMode && window.LabMock) {
        window.LabMock.tick();
      }
      const status = await window.LabApi.getStatus();
      const [history, accessLogs, alarmLogs, feed] = await Promise.all([
        window.LabApi.getHistory(),
        window.LabApi.getAccessLogs(),
        window.LabApi.getAlarmLogs(),
        window.LabApi.getFeed()
      ]);

      updateHeader(status);
      updateSafety(status);
      updateMetrics(status.properties);
      updateDeviceStates(status.properties);
      drawChart(history);
      renderAccessLogs(accessLogs);
      renderAlarmLogs(alarmLogs);
      renderFeed(feed);
      if (els.commandState.textContent === "读取失败") {
        setCommandState("待命", "");
      }
    } catch (error) {
      console.error("页面读取云平台数据失败：", error);
      els.globalSafety.textContent = "读取失败";
      els.globalSafety.className = "alert-chip danger";
      els.lastUpdated.textContent = error.message || "请打开 F12 查看错误";
      setCommandState("读取失败", "fail");
    }
  }

  function setCommandState(text, className) {
    els.commandState.textContent = text;
    els.commandState.className = `command-state ${className || ""}`.trim();
  }

  async function handleCommand(command) {
    if (
      (command === "openDoor" || command === "resetAlarm") &&
      !window.confirm(`确认执行${commandNames[command]}？`)
    ) {
      return;
    }

    setCommandState(`${commandNames[command]}中`, "busy");
    try {
      const result = await window.LabApi.sendCommand(command);
      if (!result.success) throw new Error(result.message);
      setCommandState("命令成功", "done");
      await refreshAll();
    } catch (error) {
      setCommandState(error.message || "命令失败", "fail");
    } finally {
      window.setTimeout(() => setCommandState("待命", ""), 1800);
    }
  }

  function bindEvents() {
    $$("[data-command]").forEach((button) => {
      button.addEventListener("click", () => handleCommand(button.dataset.command));
    });

    window.addEventListener("resize", async () => {
      const history = await window.LabApi.getHistory();
      drawChart(history);
    });
  }

  bindEvents();
  refreshAll();
  window.setInterval(refreshAll, window.LabConfig?.POLL_INTERVAL_MS || 2500);
})();
