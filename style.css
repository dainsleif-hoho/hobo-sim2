(() => {
  "use strict";

  const SAVE_KEY = "hobo_sim_save_v2_1";
  const MAX = 100;

  const $ = (id) => document.getElementById(id);

  // ===== DOM =====
  const ui = {
    money: $("money"),
    hungerBar: $("hunger-bar"),
    healthBar: $("health-bar"),
    moodBar: $("mood-bar"),
    hungerValue: $("hunger-value"),
    healthValue: $("health-value"),
    moodValue: $("mood-value"),
    day: $("day"),
    actionsLeft: $("actions-left"),
    eventText: $("event-text"),
    choices: $("choices"),
    log: $("log"),

    modeSelect: $("mode-select"),

    begBtn: $("beg-btn"),
    workBtn: $("work-btn"),
    eatBtn: $("eat-btn"),
    sleepBtn: $("sleep-btn"),
    scavengeBtn: $("scavenge-btn"),

    sellMagBtn: $("sell-mag-btn"),
    sellFlowerBtn: $("sell-flower-btn"),
    subsidyBtn: $("subsidy-btn"),
    pigeonBtn: $("pigeon-btn"),
    chocoBtn: $("choco-btn"),

    nextDayBtn: $("next-day-btn"),
    resetBtn: $("reset-btn"),
  };

  // 防呆：如果 HTML 少了某個 id，立刻在 console 提示
  for (const [k, v] of Object.entries(ui)) {
    if (!v) throw new Error(`缺少 DOM 元素: ${k}（HTML id 不存在或拼錯）`);
  }

  // ===== Utils =====
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const chance = (p) => Math.random() < p;

  const fmtMoney = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n)}`;
  const timeTag = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  function addLog(htmlText) {
    const div = document.createElement("div");
    div.className = "log-entry";
    div.innerHTML = `${htmlText}<br><small>${timeTag()}</small>`;
    ui.log.appendChild(div);
    ui.log.scrollTop = ui.log.scrollHeight;
  }

  function setEvent(text) {
    ui.eventText.textContent = text;
  }

  function clearChoices() {
    ui.choices.innerHTML = "";
  }

  function showChoices(list) {
    clearChoices();
    for (const it of list) {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = it.label;
      btn.addEventListener("click", it.onPick);
      ui.choices.appendChild(btn);
    }
  }

  // ===== State =====
  const defaults = () => ({
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
    lastSubsidyDay: -999, // 冷卻 7 天
  });

  let state = defaults();

  function modeCfg() {
    if (state.mode === "fentanyl") {
      return {
        actionsPerDay: 4,
        dayHungerMin: 16,
        dayHungerMax: 24,
        extraEventChance: 0.35,
        badLuckBoost: 0.10,
        lowHungerThreshold: 25,
      };
    }
    return {
      actionsPerDay: 3,
      dayHungerMin: 12,
      dayHungerMax: 18,
      extraEventChance: 0.12,
      badLuckBoost: 0.0,
      lowHungerThreshold: 20,
    };
  }

  function applyMode(mode) {
    state.mode = mode;
    const cfg = modeCfg();
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
      state = { ...defaults(), ...parsed };

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
    state = defaults();
    applyMode("normal");
    try { localStorage.removeItem(SAVE_KEY); } catch (_) {}

    ui.log.innerHTML = `<div class="log-entry">遊戲開始！<br><small>${timeTag()}</small></div>`;
    setEvent("你醒來在一個陰冷的早晨。街頭的每一天都不簡單。");
    clearChoices();
    updateUI();
    addLog("重新開始。祝你好運。");
    triggerDailyEvent(true);
  }

  function badLuckBoost() {
    const missing = 50 - state.mood; // mood < 50 才會加霉運
    const base = clamp(missing / 300, 0, 0.18);
    return base + modeCfg().badLuckBoost;
  }

  function spendAction(n = 1) {
    state.actionsLeft = clamp(state.actionsLeft - n, 0, state.actionsPerDay);
  }

  function passiveDecay() {
    const cfg = modeCfg();
    if (state.hunger <= cfg.lowHungerThreshold) {
      const dmg = state.hunger <= 10 ? 12 : (state.hunger <= 18 ? 8 : 5);
      state.health = clamp(state.health - dmg, 0, MAX);
      addLog(`飢餓讓你身體撐不住（健康 -${dmg}）。`);
    }
    if (state.hunger >= 80 && state.health < 100) {
      const heal = state.mode === "fentanyl" ? 2 : 3;
      state.health = clamp(state.health + heal, 0, MAX);
    }
  }

  function checkDeath() {
    passiveDecay();
    if (state.health <= 0 || state.hunger <= 0) {
      state.alive = false;
      setEvent("你倒下了。街頭不會等任何人。");
      addLog("❌ 遊戲結束。你沒能撐過去。");
      showChoices([{ label: "🔁 重新開始", onPick: () => resetGame() }]);
    }
  }

  function apply(eff, logText = "") {
    if (!state.alive) return;

    if (typeof eff.money === "number") state.money += eff.money;
    if (typeof eff.hunger === "number") state.hunger += eff.hunger;
    if (typeof eff.health === "number") state.health += eff.health;
    if (typeof eff.mood === "number") state.mood += eff.mood;

    state.hunger = clamp(state.hunger, 0, MAX);
    state.health = clamp(state.health, 0, MAX);
    state.mood = clamp(state.mood, 0, MAX);

    if (logText) addLog(logText);

    checkDeath();
    updateUI();
    save();
  }

  function updateUI() {
    ui.money.textContent = fmtMoney(state.money);
    ui.day.textContent = `第 ${state.day} 天`;

    ui.hungerBar.style.width = `${state.hunger}%`;
    ui.healthBar.style.width = `${state.health}%`;
    ui.moodBar.style.width = `${state.mood}%`;

    ui.hungerValue.textContent = `${state.hunger}%`;
    ui.healthValue.textContent = `${state.health}%`;
    ui.moodValue.textContent = `${state.mood}%`;

    ui.modeSelect.value = state.mode;

    ui.actionsLeft.textContent = `${state.actionsLeft}/${state.actionsPerDay}`;

    const noAction = !state.alive || state.actionsLeft <= 0;

    ui.begBtn.disabled = noAction;
    ui.workBtn.disabled = noAction;
    ui.sleepBtn.disabled = noAction;
    ui.scavengeBtn.disabled = noAction;

    ui.sellMagBtn.disabled = noAction;
    ui.sellFlowerBtn.disabled = noAction;
    ui.pigeonBtn.disabled = noAction;
    ui.chocoBtn.disabled = noAction;

    ui.eatBtn.disabled = !state.alive;

    const subsidyReady = state.alive && state.actionsLeft >= 2 && (state.day - state.lastSubsidyDay) >= 7;
    ui.subsidyBtn.disabled = !subsidyReady;

    ui.nextDayBtn.disabled = !state.alive ? true : false;
  }

  // ===== Events =====
  function evInfluencer() {
    return {
      title: "滋事型網紅",
      text: "一群滋事型網紅開直播靠嘲諷街友吸流量，鏡頭對著你猛拍。",
      choices: [
        { label: "🚶 低頭快走離開", pick: () => apply({ mood: -6, hunger: -3 }, "你離開現場（心情 -6，飢餓 -3）。") },
        {
          label: "🏪 走進店家求助",
          pick: () => {
            if (chance(0.55)) apply({ mood: +3 }, "店員幫你擋一下，網紅轉去鬧別人（心情 +3）。");
            else apply({ mood: -4 }, "店員不想惹事，只叫你走（心情 -4）。");
          },
        },
        {
          label: "📱 蒐證並檢舉",
          pick: () => {
            if (chance(0.5 + (state.mood >= 50 ? 0.1 : 0))) apply({ mood: +6 }, "你把證據交出去，對方收斂了（心情 +6）。");
            else apply({ mood: -5 }, "對方發現你在蒐證，改成更難聽的話（心情 -5）。");
          },
        },
      ],
    };
  }

  function evWelfare() {
    return {
      title: "社福窗口",
      text: "你看到社福宣導攤位：有熱飲、資源資訊。",
      choices: [
        { label: "☕ 拿熱飲休息", pick: () => apply({ hunger: +10, mood: +4 }, "熱飲讓你回神（飢餓 +10，心情 +4）。") },
        { label: "📄 拿資源資訊", pick: () => apply({ mood: +2 }, "你拿到一些資訊（心情 +2）。") },
      ],
    };
  }

  function evBaseStore() {
    return {
      title: "便利商店門口",
      text: "你在便利商店外徘徊，聞到便當香味。店員看起來有點不耐煩。",
      choices: [
        {
          label: "🙏 拜託即期品",
          pick: () => {
            if (chance(0.55)) apply({ hunger: +18, mood: +6 }, "店員丟給你一份即期飯糰（飢餓 +18，心情 +6）。");
            else apply({ mood: -6 }, "店員要你離開（心情 -6）。");
          },
        },
        { label: "🚶 離開", pick: () => apply({ mood: +1 }, "你決定不自找麻煩（心情 +1）。") },
      ],
    };
  }

  function evGoodPerson() {
    return {
      title: "路邊善心人士",
      text: "一位路人注意到你，似乎在猶豫要不要幫忙。",
      choices: [
        {
          label: "🙂 誠實說明",
          pick: () => {
            const gain = rint(10, 70);
            apply({ money: +gain, mood: +8 }, `對方給了你 ${fmtMoney(gain)}（金錢 +${gain}，心情 +8）。`);
          },
        },
        { label: "😶 裝沒事", pick: () => apply({ mood: -2 }, "你什麼也沒說，對方也離開了（心情 -2）。") },
      ],
    };
  }

  function evCold() {
    return {
      title: "天氣轉冷",
      text: "寒風變強。你沒有厚外套，今晚會很難熬。",
      choices: [
        { label: "🧥 找避風處", pick: () => apply({ health: +2, mood: -2, hunger: -4 }, "你找到角落（健康 +2，心情 -2，飢餓 -4）。") },
        {
          label: "🔥 硬撐取暖（風險）",
          pick: () => {
            if (chance(0.35 + badLuckBoost())) apply({ health: -12, mood: -8 }, "你吃了悶虧（健康 -12，心情 -8）。");
            else apply({ health: +6, mood: +3, hunger: -4 }, "你撐過最冷的時段（健康 +6，心情 +3，飢餓 -4）。");
          },
        },
      ],
    };
  }

  function evMag() {
    return {
      title: "雜誌攤位",
      text: "有人提供寄賣雜誌：賣出有分潤，但會被拒絕很多次。",
      choices: [
        { label: "📰 試試看", pick: () => actSellMag(true) },
        { label: "↩️ 先算了", pick: () => apply({ mood: -1 }, "你先不接（心情 -1）。") },
      ],
    };
  }

  function evFlower() {
    return {
      title: "玉蘭花小攤",
      text: "你看到有人批貨玉蘭花。賣得出去就有錢，賣不出去就枯掉。",
      choices: [
        { label: "🌸 進貨去賣", pick: () => actSellFlower(true) },
        { label: "↩️ 不冒險", pick: () => apply({ mood: +1 }, "你保守一點（心情 +1）。") },
      ],
    };
  }

  function eventPool() {
    const base = [evBaseStore, evGoodPerson, evCold, evWelfare];
    if (state.mode === "fentanyl") return [...base, evInfluencer, evMag, evFlower];
    return [...base, () => (chance(0.25) ? evMag() : evWelfare()), () => (chance(0.20) ? evFlower() : evBaseStore())];
  }

  function triggerDailyEvent(force = false) {
    if (!state.alive) return;
    if (!force && state.lastEventDay === state.day) return;
    state.lastEventDay = state.day;

    const pool = eventPool();
    const ev = pool[rint(0, pool.length - 1)]();

    setEvent(`【${ev.title}】${ev.text}`);
    showChoices(ev.choices.map((c) => ({
      label: c.label,
      onPick: () => { clearChoices(); c.pick(); },
    })));

    addLog(`📌 今日事件：${ev.title}`);
    save();
  }

  function maybeExtraChaos() {
    if (!state.alive) return;
    if (chance(modeCfg().extraEventChance)) {
      addLog("⚠️ 混亂加劇：今天又來一件事。");
      triggerDailyEvent(true);
    }
  }

  // ===== Actions =====
  function actBeg() {
    if (!state.alive || state.actionsLeft <= 0) return;
    spendAction(1);

    let gain = rint(0, 35);
    let moodDelta = rint(-3, 4);

    if (chance(0.12 + badLuckBoost())) {
      gain = 0;
      moodDelta -= 6;
      apply({ money: +gain, mood: moodDelta, health: -2, hunger: -5 }, `乞討遇到不友善（心情 ${moodDelta}，健康 -2，飢餓 -5）。`);
      setEvent("有人冷嘲熱諷，你只能吞下去。");
    } else {
      apply({ money: +gain, mood: moodDelta, hunger: -5 }, `乞討到 ${fmtMoney(gain)}（金錢 +${gain}，心情 ${moodDelta >= 0 ? "+" : ""}${moodDelta}，飢餓 -5）。`);
      setEvent("你在人群邊緣等待下一份好意。");
    }
  }

  function actWork() {
    if (!state.alive || state.actionsLeft <= 0) return;
    spendAction(1);

    const weak = state.hunger < 20 || state.health < 25;
    const pay = weak ? rint(20, 70) : rint(80, 190);
    const hungerCost = weak ? 12 : 9;
    const healthCost = weak ? 9 : 4;
    const moodDelta = weak ? -5 : +2;

    apply(
      { money: +pay, hunger: -hungerCost, health: -healthCost, mood: moodDelta },
      `臨時工作收入 ${fmtMoney(pay)}（飢餓 -${hungerCost}，健康 -${healthCost}，心情 ${moodDelta >= 0 ? "+" : ""}${moodDelta}）。`
    );
    setEvent(weak ? "你撐著做完，但感覺快散架。" : "你完成了工作，至少今天有點著落。");
  }

  function actEat() {
    if (!state.alive) return;
    setEvent("你要買什麼？（選擇會扣錢）");
    showChoices([
      {
        label: "🥖 麵包 $25（飢餓 +12，心情 +1）",
        onPick: () => {
          if (state.money < 25) return notEnough();
          apply({ money: -25, hunger: +12, mood: +1 }, "你買了麵包（-25，飢餓 +12，心情 +1）。");
          clearChoices();
        },
      },
      {
        label: "🍱 便當 $80（飢餓 +28，心情 +3）",
        onPick: () => {
          if (state.money < 80) return notEnough();
          apply({ money: -80, hunger: +28, mood: +3 }, "你買了便當（-80，飢餓 +28，心情 +3）。");
          clearChoices();
        },
      },
      {
        label: "🍲 熱湯 $140（飢餓 +38，健康 +4，心情 +4）",
        onPick: () => {
          if (state.money < 140) return notEnough();
          apply({ money: -140, hunger: +38, health: +4, mood: +4 }, "你喝了熱湯（-140，飢餓 +38，健康 +4，心情 +4）。");
          clearChoices();
        },
      },
      { label: "↩️ 取消", onPick: () => { clearChoices(); setEvent("你暫時沒買，繼續盤算下一步。"); } },
    ]);
  }

  function notEnough() {
    addLog("錢不夠，買不起。");
    setEvent("你翻遍口袋：錢不夠。");
  }

  function actSleep() {
    if (!state.alive || state.actionsLeft <= 0) return;
    spendAction(1);

    const heal = rint(10, 18);
    const hungerCost = rint(8, 14);

    if (chance(0.10 + badLuckBoost())) {
      const stolen = Math.min(state.money, rint(10, 70));
      apply(
        { health: +heal, hunger: -hungerCost, mood: -6, money: -stolen },
        `你睡了一覺（健康 +${heal}，飢餓 -${hungerCost}），但錢被偷了 ${fmtMoney(stolen)}（心情 -6）。`
      );
      setEvent("你醒來發現口袋變輕了。");
    } else {
      apply({ health: +heal, hunger: -hungerCost, mood: +2 }, `你睡了一覺（健康 +${heal}，飢餓 -${hungerCost}，心情 +2）。`);
      setEvent("你醒來精神好了一些。");
    }
  }

  function actScavenge() {
    if (!state.alive || state.actionsLeft <= 0) return;
    spendAction(1);

    if (chance(0.30 + badLuckBoost())) {
      const dmg = rint(6, 14);
      apply({ health: -dmg, hunger: -6, mood: -4 }, `你翻找時受傷（健康 -${dmg}，飢餓 -6，心情 -4）。`);
      setEvent("你被尖銳物劃到，只能忍著。");
    } else {
      const gain = rint(10, 95);
      const md = gain >= 60 ? 3 : 1;
      apply({ money: +gain, hunger: -6, mood: +md }, `你找到可回收物（+${fmtMoney(gain)}，飢餓 -6，心情 +${md}）。`);
      setEvent("你把找到的東西整理好，準備換點錢。");
    }
  }

  // 新行動：賣雜誌 / 賣玉蘭花 / 申請補助 / 鴿子 / 巧克力
  function actSellMag(fromEvent = false) {
    if (!state.alive || state.actionsLeft <= 0) return;
    if (!fromEvent) spendAction(1);

    const rejected = chance(0.45 + badLuckBoost());
    if (rejected) {
      apply({ mood: -3, hunger: -5 }, "你推銷雜誌但被拒絕（心情 -3，飢餓 -5）。");
      setEvent("你拿著雜誌站了很久，卻很少人停下來。");
    } else {
      const gain = rint(40, 120);
      apply({ money: +gain, mood: +2, hunger: -5 }, `你賣出雜誌拿到 ${fmtMoney(gain)}（心情 +2，飢餓 -5）。`);
      setEvent("你今天遇到願意停下來的人。");
    }
  }

  function actSellFlower(fromEvent = false) {
    if (!state.alive || state.actionsLeft <= 0) return;
    if (!fromEvent) spendAction(1);

    const cost = 20;
    if (state.money < cost) {
      apply({ mood: -2 }, "你連進貨玉蘭花的錢都不夠（心情 -2）。");
      setEvent("你摸摸口袋：錢不夠進貨。");
      return;
    }

    apply({ money: -cost }, `你先花 ${fmtMoney(cost)} 進貨玉蘭花（-20）。`);

    if (chance(0.35 + badLuckBoost())) {
      apply({ mood: -3, hunger: -4 }, "花賣不太掉，慢慢枯掉（心情 -3，飢餓 -4）。");
      setEvent("你抱著花站到手都冷了。");
    } else {
      const gain = rint(50, 160);
      apply({ money: +gain, mood: +3, hunger: -4 }, `你賣出幾串玉蘭花（金錢 +${gain}，心情 +3，飢餓 -4）。`);
      setEvent("花香引來一些善意。");
    }
  }

  function actSubsidy() {
    if (!state.alive) return;
    if (state.actionsLeft < 2) {
      setEvent("申請補助需要 2 點行動（跑窗口、填資料、等候）。");
      addLog("行動點不足，今天辦不了。");
      return;
    }
    if ((state.day - state.lastSubsidyDay) < 7) {
      setEvent("補助冷卻中（7 天）。你最近才申請過。");
      addLog("補助冷卻中。");
      return;
    }

    spendAction(2);
    state.lastSubsidyDay = state.day;

    const money = rint(200, 420);
    const mood = rint(2, 6);
    apply({ money: +money, mood: +mood, hunger: -6 }, `你申請補助拿到 ${fmtMoney(money)}（心情 +${mood}，飢餓 -6）。`);
    setEvent("你拿著文件走出窗口：至少今天能喘口氣。");
  }

  function actPigeon() {
    if (!state.alive || state.actionsLeft <= 0) return;
    spendAction(1);

    if (chance(0.30 + badLuckBoost())) {
      apply({ mood: -4, hunger: -4 }, "鴿子亂飛引來抱怨，你被趕走（心情 -4，飢餓 -4）。");
      setEvent("有人嫌你鬧，你只好離開。");
    } else {
      const gain = rint(10, 60);
      apply({ money: +gain, mood: +3, hunger: -4 }, `鴿子吸引注意，有人丟了點小錢（+${fmtMoney(gain)}，心情 +3，飢餓 -4）。`);
      setEvent("你短暫成為路人的焦點。");
    }
  }

  function actChoco() {
    if (!state.alive || state.actionsLeft <= 0) return;
    spendAction(1);

    setEvent("你拿出一顆『大便巧克力』…要怎麼用？（純遊戲惡搞）");
    showChoices([
      {
        label: "😈 近距離惡搞（高風險）",
        onPick: () => {
          clearChoices();
          if (chance(0.55 + badLuckBoost())) {
            const fine = rint(50, 180);
            apply({ money: -fine, mood: -10, health: -6 }, `你被抓到惹事（罰款 -${fine}，心情 -10，健康 -6）。`);
            setEvent("你後悔：這招不值得。");
          } else {
            const gain = rint(0, 40);
            apply({ money: +gain, mood: +2, hunger: -4 }, `你搞笑了一下（+${fmtMoney(gain)}，心情 +2，飢餓 -4）。`);
            setEvent("你趕快溜走，別玩過頭。");
          }
        },
      },
      {
        label: "🎭 當道具表演（較安全）",
        onPick: () => {
          clearChoices();
          const gain = rint(10, 55);
          apply({ money: +gain, mood: +4, hunger: -4 }, `你用巧克力當道具表演（+${fmtMoney(gain)}，心情 +4，飢餓 -4）。`);
          setEvent("你把它當成表演道具，效果還行。");
        },
      },
      {
        label: "↩️ 不用了",
        onPick: () => {
          clearChoices();
          apply({ mood: +1 }, "你決定不做蠢事（心情 +1）。");
          setEvent("你把巧克力收起來：今天不惹事。");
        },
      },
    ]);
  }

  function nextDay() {
    if (!state.alive) return;

    state.day += 1;
    state.actionsLeft = state.actionsPerDay;

    const cfg = modeCfg();
    const hungerCost = rint(cfg.dayHungerMin, cfg.dayHungerMax);

    const moodShift = (state.mode === "fentanyl")
      ? (chance(0.65) ? rint(-7, 2) : rint(-4, 4))
      : (chance(0.55) ? rint(-4, 2) : rint(-2, 4));

    apply({ hunger: -hungerCost, mood: moodShift }, `⏭️ 進入第 ${state.day} 天（飢餓 -${hungerCost}，心情 ${moodShift >= 0 ? "+" : ""}${moodShift}）。`);

    triggerDailyEvent(true);
    maybeExtraChaos();
  }

  // ===== Bind =====
  ui.begBtn.addEventListener("click", actBeg);
  ui.workBtn.addEventListener("click", actWork);
  ui.eatBtn.addEventListener("click", actEat);
  ui.sleepBtn.addEventListener("click", actSleep);
  ui.scavengeBtn.addEventListener("click", actScavenge);

  ui.sellMagBtn.addEventListener("click", () => actSellMag(false));
  ui.sellFlowerBtn.addEventListener("click", () => actSellFlower(false));
  ui.subsidyBtn.addEventListener("click", actSubsidy);
  ui.pigeonBtn.addEventListener("click", actPigeon);
  ui.chocoBtn.addEventListener("click", actChoco);

  ui.nextDayBtn.addEventListener("click", nextDay);

  ui.resetBtn.addEventListener("click", () => {
    if (confirm("確定要重開？目前進度會清除。")) resetGame();
  });

  ui.modeSelect.addEventListener("change", () => {
    applyMode(ui.modeSelect.value);
    addLog(`🧪 切換模式：${state.mode === "fentanyl" ? "芬太尼 MODE（混亂）" : "正常模式"}`);
    setEvent(state.mode === "fentanyl"
      ? "混亂上升：事件更兇、飢餓掉更快，小心別被弄死。"
      : "回到正常節奏：比較容易活下去。"
    );
    updateUI();
    save();
  });

  // ===== Start =====
  const loaded = load();
  updateUI();

  if (loaded) {
    addLog("✅ 已從瀏覽器自動讀取存檔。");
    setEvent("你回到街頭的某一天。先看看狀態，再決定下一步。");
    if (state.lastEventDay !== state.day && state.alive) triggerDailyEvent(true);
  } else {
    setEvent("你醒來在一個陰冷的早晨。街頭的每一天都不簡單。");
    triggerDailyEvent(true);
  }

  save();
})();
