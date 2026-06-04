(function () {
  const randomBetween = (min, max, digits) => {
    const value = min + Math.random() * (max - min);
    return Number(value.toFixed(digits));
  };

  const timeText = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const dateTimeText = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${timeText(date)}`;
  };

  const state = {
    deviceId: "Lab_Device_01",
    online: true,
    updatedAt: dateTimeText(new Date()),
    properties: {
      temperature: 26.2,
      humidity: 58.5,
      smoke: 135,
      light: 640,
      doorStatus: 0,
      fanStatus: 0,
      lightStatus: 1,
      alarmStatus: 0,
      rfidStatus: "InternalPerson",
      rfidCard: "A1B2C3D4",
      dateTime: dateTimeText(new Date(Date.now() - 90000))
    },
    history: [],
    accessLogs: [
      {
        time: dateTimeText(new Date(Date.now() - 90000)),
        cardId: "A1B2C3D4",
        person: "管理员卡",
        result: "允许进入",
        doorAction: "开门"
      },
      {
        time: dateTimeText(new Date(Date.now() - 220000)),
        cardId: "F8E7D6C5",
        person: "未知卡",
        result: "拒绝进入",
        doorAction: "拒绝"
      },
      {
        time: dateTimeText(new Date(Date.now() - 360000)),
        cardId: "B3C4D5E6",
        person: "学生卡",
        result: "允许进入",
        doorAction: "开门"
      }
    ],
    alarmLogs: [
      {
        time: dateTimeText(new Date(Date.now() - 220000)),
        type: "非法刷卡",
        level: "一般",
        value: "cardId=F8E7D6C5",
        status: "已解除"
      }
    ],
    feed: [
      {
        title: "系统进入监测状态",
        detail: "环境数据周期刷新",
        time: timeText(new Date(Date.now() - 60000))
      },
      {
        title: "RFID 合法刷卡",
        detail: "管理员卡允许进入",
        time: timeText(new Date(Date.now() - 90000))
      }
    ]
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  function pushHistory() {
    const p = state.properties;
    state.history.push({
      time: timeText(new Date()),
      temperature: p.temperature,
      humidity: p.humidity,
      smoke: p.smoke,
      light: p.light
    });
    state.history = state.history.slice(-24);
  }

  function pushFeed(title, detail) {
    state.feed.unshift({
      title,
      detail,
      time: timeText(new Date())
    });
    state.feed = state.feed.slice(0, 5);
  }

  function pushAlarm(type, level, value, status) {
    const last = state.alarmLogs[0];
    if (last && last.type === type && last.status === "未处理") {
      last.value = value;
      return;
    }
    state.alarmLogs.unshift({
      time: dateTimeText(new Date()),
      type,
      level,
      value,
      status
    });
    state.alarmLogs = state.alarmLogs.slice(0, 8);
    pushFeed(type, value);
  }

  function maybeAccessEvent() {
    if (Math.random() > 0.12) return;

    const legal = Math.random() > 0.24;
    const log = legal
      ? {
          time: dateTimeText(new Date()),
          cardId: "B3C4D5E6",
          person: "学生卡",
          result: "允许进入",
          doorAction: "开门"
        }
      : {
          time: dateTimeText(new Date()),
          cardId: "F8E7D6C5",
          person: "未知卡",
          result: "拒绝进入",
          doorAction: "拒绝"
        };

    state.accessLogs.unshift(log);
    state.accessLogs = state.accessLogs.slice(0, 8);
    state.properties.rfidStatus = log.person;
    state.properties.rfidCard = log.cardId;
    state.properties.dateTime = log.time;
    pushFeed(legal ? "RFID 合法刷卡" : "RFID 非法刷卡", `${log.cardId} ${log.result}`);

    if (!legal) {
      state.properties.alarmStatus = 1;
      pushAlarm("非法刷卡", "一般", `cardId=${log.cardId}`, "未处理");
    }
  }

  function tick() {
    const p = state.properties;
    const nextTemp = p.temperature + randomBetween(-0.6, 0.8, 1);
    const nextHumidity = p.humidity + randomBetween(-1.2, 1.2, 1);
    const nextSmoke = p.smoke + randomBetween(-45, 58, 0);
    const nextLight = p.light + randomBetween(-70, 70, 0);

    p.temperature = Math.min(36.5, Math.max(20, Number(nextTemp.toFixed(1))));
    p.humidity = Math.min(84, Math.max(32, Number(nextHumidity.toFixed(1))));
    p.smoke = Math.min(900, Math.max(80, Math.round(nextSmoke)));
    p.light = Math.min(1000, Math.max(100, Math.round(nextLight)));

    if (Math.random() > 0.9) {
      p.smoke = Math.round(randomBetween(660, 850, 0));
    }

    const smokeDanger = p.smoke >= 650;
    const tempDanger = p.temperature >= 32;
    if (smokeDanger || tempDanger) {
      p.alarmStatus = 1;
      p.fanStatus = 1;
      if (smokeDanger) {
        pushAlarm("烟雾异常", "严重", `smoke=${p.smoke}`, "未处理");
      } else {
        pushAlarm("温度异常", "一般", `temperature=${p.temperature}`, "未处理");
      }
    }

    state.updatedAt = dateTimeText(new Date());
    maybeAccessEvent();
    pushHistory();
  }

  function command(commandName) {
    const p = state.properties;
    const commandMap = {
      openDoor: () => {
        p.doorStatus = 1;
        state.accessLogs.unshift({
          time: dateTimeText(new Date()),
          cardId: "REMOTE",
          person: "管理员远程",
          result: "允许进入",
          doorAction: "远程开门"
        });
        pushFeed("远程开门", "门锁状态已开启");
      },
      closeDoor: () => {
        p.doorStatus = 0;
        pushFeed("远程关门", "门锁状态已关闭");
      },
      openFan: () => {
        p.fanStatus = 1;
        pushFeed("打开风扇", "风扇状态已开启");
      },
      closeFan: () => {
        p.fanStatus = 0;
        pushFeed("关闭风扇", "风扇状态已关闭");
      },
      openLight: () => {
        p.lightStatus = 1;
        pushFeed("打开灯光", "灯光状态已开启");
      },
      closeLight: () => {
        p.lightStatus = 0;
        pushFeed("关闭灯光", "灯光状态已关闭");
      },
      resetAlarm: () => {
        p.alarmStatus = 0;
        state.alarmLogs = state.alarmLogs.map((item) =>
          item.status === "未处理" ? { ...item, status: "已解除" } : item
        );
        pushFeed("解除报警", "报警器恢复正常");
      }
    };

    if (!commandMap[commandName]) {
      return { success: false, message: "未知命令" };
    }

    commandMap[commandName]();
    state.updatedAt = dateTimeText(new Date());
    return { success: true, message: "命令已下发" };
  }

  for (let i = 0; i < 18; i += 1) {
    tick();
  }

  window.LabMock = {
    tick,
    command,
    getStatus: () => clone({
      deviceId: state.deviceId,
      online: state.online,
      updatedAt: state.updatedAt,
      properties: state.properties
    }),
    getHistory: () => clone(state.history),
    getAccessLogs: () => clone(state.accessLogs),
    getAlarmLogs: () => clone(state.alarmLogs),
    getFeed: () => clone(state.feed)
  };
})();
