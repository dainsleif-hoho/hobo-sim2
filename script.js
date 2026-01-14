(() => {
  "use strict";

  const SAVE_KEY = "hobo_sim_save_v2";
  const MAX = 100;

  const el = (id) => document.getElementById(id);

  const ui = {
    money: el("money"),
    hungerBar: el("hunger-bar"),
    healthBar: el("health-bar"),
    moodBar: el("mood-bar"),
    hungerValue: el("hunger-value"),
    healthValue: el("health-value"),
    moodValue: el("mood-value"),
    day: el("day"),
    actionsLeft: el("actions-left"),
    eventText: el("event-text"),
    choices: el("choices"),
    log: el("log"),

    modeSelect: el("mode-select"),

    begBtn: el("beg-btn"),
    workBtn: el("work-btn"),
    eatBtn: el("eat-btn"),
    sleepBtn: el("sleep-btn"),
    scavengeBtn: el("scavenge-btn"),

    sellMagBtn: el("sell-mag-btn"),
    sellFlowerBtn: el("sell-flower-btn"),
    subsidyBtn: el("subsidy-btn"),
    pigeonBtn: el("pigeon-btn"),
    chocoBtn: el("choco-btn"),

    nextDayBtn: el("next-day-btn"),
    resetBtn: el("reset-btn"),
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const chance = (p) => Math.random() < p;

  function fmtMoney(n) {
    const sign = n < 0 ? "-" : "";
    return `${sign}$${Math.abs(n)}`;
  }

  function nowTimeTag() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function addLog(text) {
    const div = document.createElement("div");
    div.className = "log-entry";
    div.innerHTML = `${text}<br><small>${nowTimeTag()}</small>`;
    ui.log.appendChild(div);
    ui.log.scrollTop = ui.log.scrollHeight;
  }

  function setEvent(text) {
    ui.eventText.textContent = text;
  }

  function clearChoices() {
    ui.choices.innerHTML = "";
  }

  function showChoices(choices) {
    clearChoices();
    for (const c of choices) {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = c.label;
      btn.addEventListener("click", () => c.onPick());
      ui.choices.appendChild(btn);
    }
  }

  // ===== 狀態 =====
  const defaultState = () => ({
    day: 1,
    money: 0,
    hunger: 100,
    health: 100,
    mood: 50,
    mode: "normal", // normal | fentanyl
    actionsPerDay: 3,
    actionsLeft: 3,
    alive: true,
    lastEventDay: 0,
    lastSubsidyDay: -999, // 補助冷卻
  });

  let state = defaultState();

  function modeConfig(mode) {
    if (mode === "fentanyl") {
      return {
        actionsPerDay: 4,
        dailyHungerMin: 16,
        dailyHungerMax: 24,
        extraEventChance: 0.35,
        badLuckBoost: 0.10,
        lowHungerThreshold: 25,
      };
    }
    return {
      actionsPerDay: 3,
      dailyHungerMin: 12,
      dailyHungerMax: 18,
      extraEventChance: 0.12,
      badLuckBoost: 0.00,
      lowHungerThreshold: 20,
    };
  }

  function applyMode(mode) {
    state.mode = mode;
    const cfg = modeConfig(mode);
    state.actionsPerDay = cfg.actionsPerDay;
    state.actionsLeft = clamp(state.actionsLeft, 0, state.actionsPerDay);
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      state = { ...defaultState(), ...parsed };
      state.hunger = clamp(state.hunger, 0, MAX);
      state.health = clamp(state.health, 0, MAX);
      state.mood = clamp(state.mood, 0, MAX);
      applyMode(state.mode || "normal");
      state.actionsLeft = clamp(state.actionsLeft, 0, state.actionsPerDay);
      state.alive = !!state.alive;
      return true;
    } catch (_) {
      return false;
    }
  }

  function resetGame() {
    state = defaultState();
    applyMode("normal");
    try { localStorage.removeItem(SAVE_KEY); } catch (_) {}

    ui.log.innerHTML = `<div class="log-entry">遊戲開始！<br><small>${nowTimeTag()}</small></div>`;
    setEvent("你醒來在一個陰冷的早晨。街頭的每一天都不簡單。");
    clearChoices();
    updateUI();
    addLog("重新開始。祝你好運。");
    triggerDailyEvent(true);
  }

  function moodBadLuckBoost() {
    // 心情越低，越容易遇到壞事
    const missing = (50 - state.mood);
    const base = clamp(missing / 300, 0, 0.18);
    const cfg = modeConfig(state.mode);
    return base + cfg.badLuckBoost;
  }

  function spendAction(cost = 1) {
    state.actionsLeft = clamp(state.actionsLeft - cost, 0, state.actionsPerDay);
  }

  function passiveDecay() {
    const cfg = modeConfig(state.mode);

    if (state.hunger <= cfg.lowHungerThreshold) {
      const dmg = state.hunger <= 10 ? 12 : (state.hunger <= 18 ? 8 : 5);
      state.health = clamp(state.health - dmg, 0, MAX);
      addLog(`飢餓讓你身體撐不住（健康 -${dmg}）。`);
    }

    // 吃飽一點會慢慢恢復
    if (state.hunger >= 80 && state.health < 100) {
      const heal = state.mode === "fentanyl" ? 2 : 3;
      state.health = clamp(state.health + heal, 0, MAX);
    }
  }

  function checkStatus() {
    passiveDecay();

    if (state.health <= 0 || state.hunger <= 0) {
      state.alive = false;
      setEvent("你倒下了。街頭不會等任何人。");
      addLog("❌ 遊戲結束。你沒能撐過去。");
      showChoices([{ label: "🔁 重新開始", onPick: () => resetGame() }]);
    }
  }

  function applyEffects(eff, reason = "") {
    if (!state.alive) return;

    if (typeof eff.money === "number") state.money += eff.money;
    if (typeof eff.hunger === "number") state.hunger += eff.hunger;
    if (typeof eff.health === "number") state.health += eff.health;
    if (typeof eff.mood === "number") state.mood += eff.mood;

    state.hunger = clamp(state.hunger, 0, MAX);
    state.health = clamp(state.health, 0, MAX);
    state.mood = clamp(state.mood, 0, MAX);

    if (reason) addLog(reason);

    checkStatus();
    updateUI();
    save();
  }

  function updateUI() {
    ui.money.textContent = fmtMoney(state.money);
    ui.day.textContent = `第 ${state.day} 天`;
    ui.actionsLeft.textContent = `${state.actionsLeft}/${state.actionsPerDay}`;

    ui.hungerBar.style.width = `${state.hunger}%`;
    ui.healthBar.style.width = `${state.health}%`;
    ui.moodBar.style.width = `${state.mood}%`;

    ui.hungerValue.textContent = `${state.hunger}%`;
    ui.healthValue.textContent = `${state.health}%`;
    ui.moodValue.textContent = `${state.mood}%`;

    ui.modeSelect.value = state.mode;

    const noAction = state.actionsLeft <= 0 || !state.alive;

    ui.begBtn.disabled = noAction;
    ui.workBtn.disabled = noAction;
    ui.sleepBtn.disabled = noAction;
    ui.scavengeBtn.disabled = noAction;

    ui.sellMagBtn.disabled = noAction;
    ui.sellFlowerBtn.disabled = noAction;
    ui.pigeonBtn.disabled = noAction;
    ui.chocoBtn.disabled = noAction;

    // 買食物不一定要行動點（只是花錢）
    ui.eatBtn.disabled = !state.alive;

    // 申請補助：需要 2 行動點 + 冷卻 7 天
    const canSubsidy = state.alive && state.actionsLeft >= 2 && (state.day - state.lastSubsidyDay) >= 7;
    ui.subsidyBtn.disabled = !canSubsidy;

    // 行動用完仍可按下一天
    ui.nextDayBtn.disabled = !state.alive ? true : false;
  }

  // ===== 事件池 =====
  function influencerEvent() {
    return {
      title: "滋事型網紅",
      text: "一群滋事型網紅開直播靠嘲諷街友吸流量，鏡頭對著你猛拍。",
      choices: [
        {
          label: "🚶 低頭快走離開",
          pick: () => applyEffects({ mood: -6, hunger: -3 }, "你選擇離開（心情 -6，飢餓 -3）。"),
        },
        {
          label: "🏪 走進店家求助",
          pick: () => {
            if (chance(0.55)) {
              applyEffects({ mood: +3 }, "店員幫你擋一下，網紅轉去鬧別人（心情 +3）。");
            } else {
              applyEffects({ mood: -4 }, "店員不想惹事，只叫你走（心情 -4）。");
            }
          },
        },
        {
          label: "📱 蒐證並檢舉（不衝突）",
          pick: () => {
            if (chance(0.50 + (state.mood >= 50 ? 0.1 : 0))) {
              applyEffects({ mood: +6 }, "你把證據交出去，對方收斂了（心情 +6）。");
            } else {
              applyEffects({ mood: -5 }, "對方發現你在蒐證，改成更難聽的話（心情 -5）。");
            }
          },
        },
      ],
    };
  }

  function welfareEvent() {
    return {
      title: "社福窗口",
      text: "你看到社福宣導攤位：有熱飲、資源資訊，還有協助申請補助的說明。",
      choices: [
        {
          label: "☕ 先拿熱飲休息一下",
          pick: () => applyEffects({ hunger: +10, mood: +4 }, "熱飲讓你稍微回神（飢餓 +10，心情 +4）。"),
        },
        {
          label: "📄 問資源但先不申請",
          pick: () => applyEffects({ mood: +2 }, "你拿到一些資訊（心情 +2）。"),
        },
      ],
    };
  }

  function magazineEvent() {
    return {
      title: "雜誌攤位",
      text: "有人提供寄賣雜誌的機會：你幫忙推廣，賣出有分潤，但會被拒絕很多次。",
      choices: [
        { label: "📰 試試看", pick: () => actionSellMagazine(true) },
        { label: "↩️ 先算了", pick: () => applyEffects({ mood: -1 }, "你先不接（心情 -1）。") },
      ],
    };
  }

  function flowerEvent() {
    return {
      title: "玉蘭花小攤",
      text: "你看到有人批貨玉蘭花。賣得出去就有錢，賣不出去就枯掉。",
      choices: [
        { label: "🌸 進貨去賣", pick: () => actionSellFlowers(true) },
        { label: "↩️ 先不冒險", pick: () => applyEffects({ mood: +1 }, "你保守一點（心情 +1）。") },
      ],
    };
  }

  const baseEvents = [
    () => ({
      title: "便利商店門口",
      text: "你在便利商店外徘徊，聞到便當香味。店員看起來有點不耐煩。",
      choices: [
        {
          label: "🙏 小聲拜託看能不能給點即期品",
          pick: () => {
            const ok = chance(0.55);
            if (ok) applyEffects({ hunger: +18, mood: +6 }, "店員丟給你一份即期飯糰（飢餓 +18，心情 +6）。");
            else applyEffects({ mood: -6 }, "店員要你離開（心情 -6）。");
          },
        },
        { label: "🚶 離開，別惹事", pick: () => applyEffects({ mood: +1 }, "你決定不自找麻煩（心情 +1）。") },
      ],
    }),

    () => ({
      title: "路邊善心人士",
      text: "一位路人注意到你，似乎在猶豫要不要幫忙。",
      choices: [
        {
          label: "🙂 誠實說明今天狀況",
          pick: () => {
            const gain = randInt(10, 70);
            applyEffects({ money: +gain, mood: +8 }, `對方給了你 ${fmtMoney(gain)}（金錢 +${gain}，心情 +8）。`);
          },
        },
        { label: "😶 裝沒事", pick: () => applyEffects({ mood: -2 }, "你什麼也沒說，對方也離開了（心情 -2）。") },
      ],
    }),

    () => ({
      title: "天氣轉冷",
      text: "寒風變強。你沒有厚外套，今晚會很難熬。",
      choices: [
        { label: "🧥 去找能避風的地方", pick: () => applyEffects({ health: +2, mood: -2, hunger: -4 }, "你找到一個角落（健康 +2，心情 -2，飢餓 -4）。") },
        {
          label: "🔥 想辦法取暖（有風險）",
          pick: () => {
            if (chance(0.35 + moodBadLuckBoost())) applyEffects({ health: -12, mood: -8 }, "你吃了悶虧（健康 -12，心情 -8）。");
            else applyEffects({ health: +6, mood: +3, hunger: -4 }, "你撐過最冷的時段（健康 +6，心情 +3，飢餓 -4）。");
          },
        },
      ],
    }),

    () => welfareEvent(),
  ];

  function buildEventPool() {
    if (state.mode === "fentanyl") {
      // 混亂模式：多加入「網紅滋事」等事件
      return [
        ...baseEvents,
        () => influencerEvent(),
        () => magazineEvent(),
        () => flowerEvent(),
      ];
    }
    // 正常模式：雜誌/玉蘭花較少見
    return [
      ...baseEvents,
      () => (chance(0.25) ? magazineEvent() : welfareEvent()),
      () => (chance(0.20) ? flowerEvent() : baseEvents[0]()),
    ];
  }

  function triggerDailyEvent(force = false) {
    if (!state.alive) return;
    if (!force && state.lastEventDay === state.day) return;

    state.lastEventDay = state.day;

    const pool = buildEventPool();
    const ev = pool[randInt(0, pool.length - 1)]();

    setEvent(`【${ev.title}】${ev.text}`);
    showChoices(
      ev.choices.map((c) => ({
        label: c.label,
        onPick: () => {
          clearChoices();
          c.pick();
        },
      }))
    );

    addLog(`📌 今日事件：${ev.title}`);
    save();
  }

  function maybeExtraChaosEvent() {
    if (!state.alive) return;
    const cfg = modeConfig(state.mode);
    if (chance(cfg.extraEventChance)) {
      addLog("⚠️ 混亂加劇：今天又來一件事。");
      triggerDailyEvent(true);
    }
  }

  // ===== 行動（原本）=====
  function actionBeg() {
    if (!state.alive || state.actionsLeft <= 0) return;
    spendAction(1);

    let gain = randInt(0, 35);
    let moodDelta = randInt(-3, 4);

    if (chance(0.12 + moodBadLuckBoost())) {
      gain = 0;
      moodDelta -= 6;
      applyEffects(
        { money: +gain, mood: moodDelta, health: -2, hunger: -5 },
        `乞討時遇到不友善的人（心情 ${moodDelta}，健康 -2，飢餓 -5）。`
      );
      setEvent("有人冷嘲熱諷，你只能吞下去。");
    } else {
      applyEffects(
        { money: +gain, mood: moodDelta, hunger: -5 },
        `你乞討到 ${fmtMoney(gain)}（金錢 +${gain}，心情 ${moodDelta >= 0 ? "+" : ""}${moodDelta}，飢餓 -5）。`
      );
      setEvent("你在人群邊緣等待下一份好意。");
    }
    clearChoices();
  }

  function actionWork() {
    if (!state.alive || state.actionsLeft <= 0) return;
    spendAction(1);

    const
