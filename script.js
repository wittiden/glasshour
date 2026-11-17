/* =========================================================
   Glasshour — логика страницы
   ========================================================= */

(() => {
  "use strict";

  /* ---------- Циферблат ---------- */

  const ticksEl = document.getElementById("ticks");
  const hourHand = document.getElementById("hourHand");
  const minuteHand = document.getElementById("minuteHand");
  const secondHand = document.getElementById("secondHand");
  const digitalClock = document.getElementById("digitalClock");

  const QUARTER_COLORS = {
    0: "is-blue",    // 12
    15: "is-red",    // 3
    30: "is-yellow", // 6
    45: "is-green",  // 9
  };

  const fragment = document.createDocumentFragment();

  // Деления идут от краёв самого блока часов: на углах они длиннее,
  // потому что угол дальше от центра, чем середина стороны.
  const clockEl = document.querySelector(".clock");
  const clockRect = clockEl.getBoundingClientRect();
  const clockSize = clockRect.width || 1;
  const clockPad = parseFloat(getComputedStyle(clockEl).paddingLeft) || 0;
  const tickScale = Math.max(0.5, (clockSize - clockPad * 2) / clockSize);
  const cornerPx = parseFloat(getComputedStyle(clockEl).borderTopLeftRadius) || 0;

  const HALF = 50;
  const CORNER = Math.min(20, Math.max(2, (cornerPx / clockSize) * 100));

  function edgeRadius(theta) {
    const sx = Math.abs(Math.sin(theta));
    const cy = Math.abs(Math.cos(theta));
    const tSquare = HALF / Math.max(sx, cy, 1e-6);

    const x = sx * tSquare;
    const y = cy * tSquare;
    const flat = HALF - CORNER;

    if (x <= flat || y <= flat) return tSquare;

    const b = (sx + cy) * flat;
    const disc = b * b - (2 * flat * flat - CORNER * CORNER);
    return b + Math.sqrt(Math.max(0, disc));
  }

  for (let i = 0; i < 60; i++) {
    const theta = (i * 6 * Math.PI) / 180;
    const isQuarter = i % 15 === 0;
    const isHour = i % 5 === 0;

    const edge = edgeRadius(theta) - 0.6;
    const inner = (isQuarter ? 40 : isHour ? 41.5 : 44) * tickScale;
    const len = Math.max(1, edge - inner);
    const mid = (edge + inner) / 2;

    const tick = document.createElement("span");
    tick.className = "tick-mark";
    if (isHour) tick.classList.add("is-hour");
    if (QUARTER_COLORS[i]) tick.classList.add(QUARTER_COLORS[i]);

    tick.style.left = (50 + Math.sin(theta) * mid).toFixed(3) + "%";
    tick.style.top = (50 - Math.cos(theta) * mid).toFixed(3) + "%";
    tick.style.setProperty("--len", len.toFixed(3) + "%");
    tick.style.setProperty("--rot", i * 6 + "deg");

    fragment.appendChild(tick);
  }

  ticksEl.appendChild(fragment);

  /* ---------- Только 12, 3, 6, 9 ---------- */

  const numeralsEl = document.getElementById("numerals");
  const numeralFragment = document.createDocumentFragment();
  const NUM_RADIUS = 34;

  for (const h of [12, 3, 6, 9]) {
    const rad = (h * 30 * Math.PI) / 180;

    const numeral = document.createElement("span");
    numeral.className = "numeral";
    numeral.textContent = String(h);
    numeral.style.left = (50 + Math.sin(rad) * NUM_RADIUS).toFixed(3) + "%";
    numeral.style.top = (50 - Math.cos(rad) * NUM_RADIUS).toFixed(3) + "%";

    numeralFragment.appendChild(numeral);
  }

  numeralsEl.appendChild(numeralFragment);

  /* ---------- Фон: python-код и бинарный шум ---------- */

  const CODE_LINES = [
    "def liquid_glass(x):",
    "    return blur(x, 40)",
    "",
    "for i in range(60):",
    "    alpha = i / 60",
    "    if alpha > 0.5:",
    "        render(alpha)",
    "",
    "class Crystal:",
    "    pass",
    "",
    "glass = [0, 1, 0, 1, 1, 0]",
    "import math",
    "t = math.tau",
    "while True:",
    "    refract(light)",
    "",
    "01011010 10100101",
    "1110 0101 1010 0011",
    "0110 1111 0000 1010",
    "0101 1111 0000 1010",
    "1101 0010 1011 0110",
    "# liquid = glass + light",
    "y = a * x + b",
    "print('glass')",
    "01101001 01101100",
  ];

  const escapeCode = (text) => text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const CODE_TOKEN_RE = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(\b(?:def|class|for|in|if|else|elif|while|import|return|pass|break|continue|and|or|not|True|False|None)\b)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\w\s])/g;

  function highlightCodeLine(line) {
    if (!line) return "";

    const trimmed = line.trim();
    if (trimmed && /^[01]+$/.test(trimmed)) {
      return `<span class="tok-num">${line}</span>`;
    }

    const hashIndex = line.indexOf("#");
    const code = hashIndex >= 0 ? line.slice(0, hashIndex) : line;
    const comment = hashIndex >= 0 ? line.slice(hashIndex) : "";

    CODE_TOKEN_RE.lastIndex = 0;

    let html = "";
    let last = 0;
    let match;

    while ((match = CODE_TOKEN_RE.exec(code))) {
      if (match.index > last) html += escapeCode(code.slice(last, match.index));

      const token = match[0];

      if (match[1]) {
        html += `<span class="tok-str">${escapeCode(token)}</span>`;
      } else if (match[2]) {
        html += `<span class="tok-kw">${escapeCode(token)}</span>`;
      } else if (match[3]) {
        html += `<span class="tok-num">${escapeCode(token)}</span>`;
      } else if (match[4]) {
        const isCall = /^\s*\(/.test(code.slice(CODE_TOKEN_RE.lastIndex));
        const isDefinition = /(?:def|class)\s+$/.test(code.slice(0, match.index));

        // Обычные имена не оборачиваем: они наследуют базовый цвет строки.
        html += isCall || isDefinition
          ? `<span class="tok-fn">${escapeCode(token)}</span>`
          : escapeCode(token);
      } else {
        // Пробелы и пунктуация тоже не создают лишних DOM-узлов.
        html += escapeCode(token);
      }

      last = CODE_TOKEN_RE.lastIndex;
    }

    if (last < code.length) html += escapeCode(code.slice(last));
    if (comment) html += `<span class="tok-comment">${escapeCode(comment)}</span>`;

    return html;
  }

  const codeGrid = document.getElementById("codeGrid");

  if (codeGrid) {
    // Количество строк/колонок зависит от экрана: меньше DOM — меньше памяти
    const COLUMNS = Math.min(22, Math.max(10, Math.ceil(window.innerWidth / 150) + 2));
    const LINES_PER_COLUMN = Math.min(120, Math.max(40, Math.ceil((window.innerHeight * 1.3) / 24) + 4));
    const grid = document.createDocumentFragment();

    for (let c = 0; c < COLUMNS; c++) {
      const lines = [];

      for (let i = 0; i < LINES_PER_COLUMN; i++) {
        if ((i + c) % 4 === 3) {
          const bits = [];
          for (let k = 0; k < 24; k++) {
            bits.push((k * 7 + c * 13 + i * 3) % 3 === 0 ? "1" : "0");
          }
          lines.push(bits.join(""));
        } else {
          lines.push(CODE_LINES[(i * 5 + c * 7) % CODE_LINES.length]);
        }
      }

      const col = document.createElement("div");
      col.className = "code__col";
      col.innerHTML = lines.map(highlightCodeLine).join("\n");
      grid.appendChild(col);
    }

    codeGrid.appendChild(grid);
  }

  /* ---------- Календарь ---------- */

  const calWeekday = document.getElementById("calWeekday");
  const calDay = document.getElementById("calDay");
  const calMonth = document.getElementById("calMonth");
  const calYear = document.getElementById("calYear");

  if (calDay) {
    const now = new Date();
    const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short" })
      .format(now)
      .replace(".", "");
    const month = new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(now);

    calWeekday.textContent = weekday.toUpperCase();
    calDay.textContent = String(now.getDate());
    calMonth.textContent = month;
    calYear.textContent = String(now.getFullYear());

    const calTitle = document.getElementById("calTitle");
    const calGrid = document.getElementById("calGrid");

    if (calTitle && calGrid) {
      const year = now.getFullYear();
      const monthIndex = now.getMonth();

      calTitle.textContent = `${month} ${year}`;

      const firstDay = new Date(year, monthIndex, 1);
      const offset = (firstDay.getDay() + 6) % 7; // понедельник — первый
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

      const grid = document.createDocumentFragment();

      for (let i = 0; i < offset; i++) {
        const blank = document.createElement("span");
        blank.className = "calendar__daycell is-empty";
        grid.appendChild(blank);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement("span");
        cell.className = "calendar__daycell";
        cell.textContent = String(d);
        if (d === now.getDate()) cell.classList.add("is-today");
        grid.appendChild(cell);
      }

      calGrid.appendChild(grid);
    }
  }

  /* ---------- Увеличенный фон под стеклом ---------- */

  document.querySelectorAll(".clock, .search, .calendar").forEach((el, i) => {
    if (el.querySelector(":scope > .lens")) return;

    const lens = document.createElement("span");
    lens.className = "lens";
    lens.setAttribute("aria-hidden", "true");
    lens.style.backgroundPosition =
      (12 + ((i * 31) % 72)) + "% " + (8 + ((i * 43) % 76)) + "%";

    el.prepend(lens);
  });

  /* ---------- Ход стрелок ---------- */

  const angle = (el, deg) => el.style.setProperty("--angle", deg.toFixed(3) + "deg");

  // Часы обновляются раз в секунду и полностью останавливаются,
  // когда вкладка скрыта — в фоне не тратятся CPU и батарея.
  let clockTimer = null;
  let clockInView = true;
  let lastMinute = -1;

  function canRunClock() {
    return !document.hidden && clockInView;
  }

  function tickClock() {
    if (!canRunClock()) {
      clockTimer = null;
      return;
    }

    const now = new Date();
    const sec = now.getSeconds();
    const minute = now.getMinutes();
    const min = minute + sec / 60;

    // Часовая рука двигается раз в минуту: за секунду она смещается
    // на сотые доли градуса, поэтому пересчитывать её чаще не нужно.
    if (minute !== lastMinute) {
      lastMinute = minute;

      angle(hourHand, (now.getHours() % 12) * 30 + minute * 0.5);

      if (digitalClock) {
        const label = String(now.getHours()).padStart(2, "0") + ":" +
          String(minute).padStart(2, "0");

        if (digitalClock.textContent !== label) {
          digitalClock.textContent = label;
          clockEl.setAttribute("aria-label", "Текущее время: " + label);
        }
      }
    }

    angle(minuteHand, min * 6);
    angle(secondHand, sec * 6);

    clockTimer = window.setTimeout(tickClock, 1000 - (Date.now() % 1000));
  }

  function stopClock() {
    if (clockTimer !== null) {
      window.clearTimeout(clockTimer);
      clockTimer = null;
    }
  }

  function startClock() {
    if (clockTimer !== null || !canRunClock()) return;
    tickClock();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopClock();
    else startClock();
  });

  // На мобильных часах можно уйти вниз по странице — вне экрана
  // стрелки не пересчитываются, пока часы снова не появятся.
  if ("IntersectionObserver" in window && clockEl) {
    const clockObserver = new IntersectionObserver((entries) => {
      clockInView = entries.some(
        (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.1,
      );

      if (clockInView) startClock();
      else stopClock();
    }, { threshold: [0, 0.1] });

    clockObserver.observe(clockEl);
  }

  startClock();

  /* ---------- Поиск ---------- */

  // Поисковик можно заменить, например на "https://ya.ru/search/?text="
  const SEARCH_URL = "https://www.google.com/search?q=";
  const AI_URL = "https://www.google.com/search?udm=50&q=";

  const form = document.getElementById("searchForm");
  const input = document.getElementById("q");
  const aiBtn = document.getElementById("aiBtn");

  const hasScheme = /^(https?:\/\/|about:|view-source:)/i;
  const isDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d{1,5})?(\/\S*)?(\?\S*)?$/i;
  const isLocal = /^localhost(:\d{1,5})?(\/\S*)?$/i;

  function navigate(raw) {
    const q = raw.trim();
    if (!q) return;

    if (hasScheme.test(q)) { location.href = q; return; }
    if (isLocal.test(q) || isDomain.test(q)) { location.href = "https://" + q; return; }

    location.href = SEARCH_URL + encodeURIComponent(q);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;

    navigate(q);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      form.requestSubmit();
      return;
    }

    if (e.key === "Escape") {
      if (input.value) {
        input.value = "";
      } else {
        input.blur();
      }
    }
  });

  form.addEventListener("click", (e) => {
    if (e.target === input) return;
    if (e.target.closest(".search__tools")) return;
    input.focus();
  });

  /* ---------- Голосовой ввод ---------- */

  const micBtn = document.getElementById("micBtn");
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (micBtn && Speech) {
    const recognizer = new Speech();
    recognizer.lang = "ru-RU";
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;
    let listening = false;

    micBtn.addEventListener("click", () => {
      if (listening) {
        recognizer.stop();
        return;
      }
      try {
        recognizer.start();
      } catch (err) {
        /* повторный запуск до завершения предыдущего — игнорируем */
      }
    });

    recognizer.addEventListener("start", () => {
      listening = true;
      micBtn.classList.add("is-listening");
      micBtn.setAttribute("aria-pressed", "true");
    });

    recognizer.addEventListener("end", () => {
      listening = false;
      micBtn.classList.remove("is-listening");
      micBtn.setAttribute("aria-pressed", "false");
    });

    recognizer.addEventListener("error", () => {
      listening = false;
      micBtn.classList.remove("is-listening");
      micBtn.setAttribute("aria-pressed", "false");
    });

    recognizer.addEventListener("result", (e) => {
      const text = e.results?.[0]?.[0]?.transcript;
      if (!text) return;
      input.value = text;
      input.focus();
      input.select();
    });
  } else if (micBtn) {
    // если браузер не умеет распознавание — просто ставим курсор в строку
    micBtn.addEventListener("click", () => input.focus());
  }

  // «/» или Ctrl/⌘ + K — фокус на поиске
  document.addEventListener("keydown", (e) => {
    const ts = document.getElementById("tabsearch");
    if (ts && !ts.hidden) return;

    const el = document.activeElement;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;

    if (((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !typing)) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  /* ---------- Поиск по открытым вкладкам ---------- */

  const tabsBtn = document.getElementById("tabsBtn");
  const tabsearch = document.getElementById("tabsearch");
  const tabsearchInput = document.getElementById("tabsearchInput");
  const tabsearchList = document.getElementById("tabsearchList");
  const tabsearchBackdrop = document.querySelector("[data-tabsearch-close]");

  const hasTabsApi = typeof chrome !== "undefined" &&
    !!chrome.tabs && typeof chrome.tabs.query === "function" &&
    typeof chrome.tabs.getCurrent === "function";

  const TAB_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" stroke-width="1.6"/>' +
    '<path d="M4 9.5h16" stroke="currentColor" stroke-width="1.6"/></svg>';

  let tabCache = [];
  let tabFiltered = [];
  let tabActive = 0;
  let currentTabID = null;
  let currentWindowID = null;

  function hostOf(url) {
    try {
      const u = new URL(url);
      if (u.protocol === "chrome:" || u.protocol === "edge:") {
        return u.protocol + "//" + u.hostname;
      }
      return u.hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }

  function setTabActive(index) {
    if (!tabFiltered.length) return;

    tabActive = Math.max(0, Math.min(index, tabFiltered.length - 1));

    [...tabsearchList.children].forEach((row, i) => {
      const on = i === tabActive;
      row.classList.toggle("is-active", on);
      row.setAttribute("aria-selected", String(on));
    });

    tabsearchList.children[tabActive]?.scrollIntoView({ block: "nearest" });
  }

  function activateTab(tab) {
    closeTabSearch();
    if (!hasTabsApi || !tab) return;

    chrome.tabs.update(tab.id, { active: true });
    if (typeof chrome.windows !== "undefined" && tab.windowId != null) {
      chrome.windows.update(tab.windowId, { focused: true });
    }
  }

  function renderTabList() {
    const query = tabsearchInput.value.trim().toLowerCase();

    tabFiltered = tabCache.filter((tab) => {
      if (!query) return true;
      return (tab.title + " " + tab.url).toLowerCase().includes(query);
    });

    tabsearchList.textContent = "";

    if (!tabFiltered.length) {
      const empty = document.createElement("div");
      empty.className = "tabsearch__empty";

      if (!hasTabsApi) {
        empty.textContent = "Поиск по вкладкам доступен в установленном расширении Chrome";
      } else if (!tabCache.length) {
        empty.textContent = "Открытых вкладок нет";
      } else {
        empty.textContent = "Ничего не найдено";
      }

      tabsearchList.appendChild(empty);
      return;
    }

    tabFiltered.forEach((tab, index) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "tabsearch__row";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", "false");

      const favicon = document.createElement("span");
      favicon.className = "tabsearch__favicon";
      favicon.innerHTML = TAB_ICON;

      if (tab.favicon) {
        const img = document.createElement("img");
        img.alt = "";
        img.src = tab.favicon;
        img.loading = "lazy";
        img.addEventListener("error", () => img.remove());
        favicon.appendChild(img);
      }

      const text = document.createElement("span");
      text.className = "tabsearch__text";

      const title = document.createElement("span");
      title.className = "tabsearch__title";
      title.textContent = tab.title;

      const domain = document.createElement("span");
      domain.className = "tabsearch__domain";
      domain.textContent = hostOf(tab.url);

      text.append(title, domain);
      row.append(favicon, text);

      row.addEventListener("click", () => activateTab(tab));

      tabsearchList.appendChild(row);
    });

    setTabActive(0);
  }

  function openTabSearch() {
    if (!tabsearch) return;

    tabsearch.hidden = false;
    tabsearchInput.value = "";
    tabsearchList.textContent = "";

    const loading = document.createElement("div");
    loading.className = "tabsearch__empty";
    loading.textContent = hasTabsApi
      ? "Загружаем вкладки…"
      : "Поиск по вкладкам доступен в установленном расширении Chrome";
    tabsearchList.appendChild(loading);

    tabsearchInput.focus();

    if (!hasTabsApi) return;

    chrome.tabs.getCurrent((current) => {
      currentTabID = current?.id ?? null;
      currentWindowID = current?.windowId ?? null;

      chrome.tabs.query({}, (tabs) => {
        tabCache = (tabs || [])
          .filter((tab) => tab.id !== currentTabID)
          .map((tab) => ({
            id: tab.id,
            windowId: tab.windowId,
            title: tab.title || tab.url || "Без названия",
            url: tab.url || "",
            favicon: tab.favIconUrl || "",
          }))
          .sort((a, b) => {
            const aw = a.windowId === currentWindowID ? 0 : 1;
            const bw = b.windowId === currentWindowID ? 0 : 1;
            return aw - bw;
          });

        renderTabList();
      });
    });
  }

  function closeTabSearch() {
    if (!tabsearch) return;
    tabsearch.hidden = true;
  }

  if (tabsBtn && tabsearch) {
    tabsBtn.addEventListener("click", openTabSearch);
    tabsearchBackdrop?.addEventListener("click", closeTabSearch);
    tabsearchInput?.addEventListener("input", renderTabList);

    // Стрелки работают независимо от того, где фокус внутри окна поиска вкладок
    document.addEventListener("keydown", (e) => {
      if (!tabsearch.hidden) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeTabSearch();
          return;
        }

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          if (!tabFiltered.length) return;
          setTabActive(tabActive + (e.key === "ArrowDown" ? 1 : -1));
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();
          if (tabFiltered[tabActive]) activateTab(tabFiltered[tabActive]);
        }
      }
    });
  }

  /* ---------- Загрузка фото ---------- */

  const lensBtn = document.getElementById("lensBtn");
  const lensPop = document.getElementById("lensPop");
  const lensDrop = document.getElementById("lensDrop");
  const lensFile = document.getElementById("lensFile");
  const lensPreview = document.getElementById("lensPreview");
  const lensImage = document.getElementById("lensImage");
  const lensCancel = document.getElementById("lensCancel");
  const lensSubmit = document.getElementById("lensSubmit");
  const lensFileActions = document.getElementById("lensFileActions");
  const lensChange = document.getElementById("lensChange");
  const lensClear = document.getElementById("lensClear");

  /* ---------- AI Mode ---------- */

  const aiPop = document.getElementById("aiPop");
  const aiInput = document.getElementById("aiInput");
  const aiCancel = document.getElementById("aiCancel");
  const aiSubmit = document.getElementById("aiSubmit");

  let lensObjectUrl = null;
  let lensSelectedFile = null;

  function positionMenu(pop, trigger) {
    if (!pop || !trigger) return;
    const searchRect = trigger.closest(".search").getBoundingClientRect();
    const spaceBelow = window.innerHeight - searchRect.bottom;
    pop.classList.toggle("lenspop--up", spaceBelow < 380);
  }

  function resetLens() {
    lensSelectedFile = null;
    if (lensSubmit) lensSubmit.disabled = true;
    if (lensPreview) lensPreview.hidden = true;
    if (lensFileActions) lensFileActions.hidden = true;
    if (lensDrop) lensDrop.hidden = false;
    if (lensImage) lensImage.removeAttribute("src");
    if (lensObjectUrl) {
      URL.revokeObjectURL(lensObjectUrl);
      lensObjectUrl = null;
    }
    if (lensFile) lensFile.value = "";
    lensDrop?.classList.remove("is-drag");
  }

  function closeLensPop() {
    if (!lensPop) return;
    lensPop.hidden = true;
    lensBtn?.classList.remove("is-active");
    lensBtn?.setAttribute("aria-expanded", "false");
    resetLens();
  }

  function openLensPop() {
    if (!lensPop || !lensBtn) return;

    closeAiPop();

    positionMenu(lensPop, lensBtn);
    lensPop.hidden = false;
    lensBtn.classList.add("is-active");
    lensBtn.setAttribute("aria-expanded", "true");
    lensDrop?.focus();
  }

  function setLensFile(file) {
    if (!file || !file.type.startsWith("image/")) return;

    if (lensObjectUrl) URL.revokeObjectURL(lensObjectUrl);

    lensSelectedFile = file;
    lensObjectUrl = URL.createObjectURL(file);

    if (lensImage) lensImage.src = lensObjectUrl;
    if (lensPreview) lensPreview.hidden = false;
    if (lensFileActions) lensFileActions.hidden = false;
    if (lensDrop) lensDrop.hidden = true;
    if (lensSubmit) lensSubmit.disabled = false;
  }

  function closeAiPop() {
    if (!aiPop) return;
    aiPop.hidden = true;
    aiBtn?.classList.remove("is-active");
    aiBtn?.setAttribute("aria-expanded", "false");
    if (aiInput) aiInput.value = "";
  }

  function openAiPop() {
    if (!aiPop || !aiBtn) return;

    closeLensPop();

    positionMenu(aiPop, aiBtn);
    aiPop.hidden = false;
    aiBtn.classList.add("is-active");
    aiBtn.setAttribute("aria-expanded", "true");
    aiInput?.focus();
  }

  function submitAiQuestion() {
    const q = aiInput?.value.trim();
    if (!q) {
      aiInput?.focus();
      return;
    }

    window.open(AI_URL + encodeURIComponent(q), "_blank", "noopener");
    closeAiPop();
  }

  if (lensBtn && lensPop) {
    lensBtn.addEventListener("click", () => {
      if (lensPop.hidden) openLensPop();
      else closeLensPop();
    });

    lensDrop?.addEventListener("click", (e) => {
      if (e.target === lensFile) return;
      lensFile?.click();
    });

    lensDrop?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        lensFile?.click();
      }
    });

    lensFile?.addEventListener("change", () => {
      if (lensFile.files && lensFile.files[0]) setLensFile(lensFile.files[0]);
    });

    lensChange?.addEventListener("click", () => lensFile?.click());

    lensClear?.addEventListener("click", () => {
      resetLens();
      lensDrop?.focus();
    });

    ["dragenter", "dragover"].forEach((type) => {
      lensDrop?.addEventListener(type, (e) => {
        e.preventDefault();
        e.stopPropagation();
        lensDrop.classList.add("is-drag");
      });
    });

    ["dragleave", "drop"].forEach((type) => {
      lensDrop?.addEventListener(type, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (type === "dragleave" && e.relatedTarget && lensDrop.contains(e.relatedTarget)) return;
        lensDrop.classList.remove("is-drag");
      });
    });

    lensDrop?.addEventListener("drop", (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) setLensFile(file);
    });

    lensCancel?.addEventListener("click", closeLensPop);

    lensSubmit?.addEventListener("click", () => {
      if (!lensSelectedFile) return;

      const form = document.createElement("form");
      form.action = "https://www.google.com/searchbyimage/upload";
      form.method = "POST";
      form.enctype = "multipart/form-data";
      form.target = "_blank";
      form.style.display = "none";

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.name = "encoded_image";

      const transfer = new DataTransfer();
      transfer.items.add(lensSelectedFile);
      fileInput.files = transfer.files;

      const extra = document.createElement("input");
      extra.type = "hidden";
      extra.name = "image_content";
      extra.value = "";

      form.append(fileInput, extra);
      document.body.appendChild(form);
      form.submit();

      window.setTimeout(() => form.remove(), 0);
      closeLensPop();
    });
  }

  if (aiBtn && aiPop) {
    aiBtn.addEventListener("click", () => {
      if (aiPop.hidden) openAiPop();
      else closeAiPop();
    });

    aiCancel?.addEventListener("click", closeAiPop);
    aiSubmit?.addEventListener("click", submitAiQuestion);

    aiInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitAiQuestion();
      }
    });
  }

  document.addEventListener("pointerdown", (e) => {
    if (lensPop && lensBtn && !lensPop.hidden &&
        !lensPop.contains(e.target) && !lensBtn.contains(e.target)) {
      closeLensPop();
    }

    if (aiPop && aiBtn && !aiPop.hidden &&
        !aiPop.contains(e.target) && !aiBtn.contains(e.target)) {
      closeAiPop();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    if (lensPop && !lensPop.hidden) {
      e.preventDefault();
      closeLensPop();
    }

    if (aiPop && !aiPop.hidden) {
      e.preventDefault();
      closeAiPop();
    }
  });

  ["dragover", "drop"].forEach((type) => {
    document.addEventListener(type, (e) => {
      if (lensPop && !lensPop.hidden) e.preventDefault();
    });
  });

  /* ---------- Кнопки Chrome ---------- */

  const extensionsBtn = document.getElementById("extensionsBtn");
  const settingsBtn = document.getElementById("settingsBtn");

  function openChromePage(url) {
    const tabs = window.chrome?.tabs;

    if (tabs?.create) {
      try {
        tabs.create({ url }, () => {
          if (window.chrome.runtime?.lastError) location.href = url;
        });
        return;
      } catch (err) {
        /* переходим к запасному варианту */
      }
    }

    location.href = url;
  }

  extensionsBtn?.addEventListener("click", () => openChromePage("chrome://extensions/"));
  settingsBtn?.addEventListener("click", () => openChromePage("chrome://settings/"));

  /* ---------- Переключение окон Chrome ---------- */

  const windowsBtn = document.getElementById("windowsBtn");
  const windowsCount = document.getElementById("windowsCount");

  function setWindowsState(count) {
    if (!windowsBtn) return;

    const total = Number.isFinite(count) && count > 0 ? count : 0;
    const multiple = total > 1;

    if (windowsCount) {
      windowsCount.textContent = String(total);
      windowsCount.hidden = total < 1;
    }

    windowsBtn.disabled = !multiple;
    windowsBtn.classList.toggle("is-single", !multiple);

    windowsBtn.title = multiple
      ? "Следующее окно Chrome · открыто: " + total
      : total === 1
        ? "Открыто одно окно Chrome"
        : "Не удалось получить список окон";

    windowsBtn.setAttribute(
      "aria-label",
      multiple
        ? "Переключить на следующее окно Chrome, открыто окон: " + total
        : windowsBtn.title,
    );
  }

  function refreshWindows() {
    if (!windowsBtn) return;

    const windowsApi = window.chrome?.windows;

    if (!windowsApi?.getAll) {
      windowsBtn.hidden = true;
      return;
    }

    try {
      windowsApi.getAll({ populate: false, windowTypes: ["normal"] }, (list) => {
        if (window.chrome.runtime?.lastError) {
          setWindowsState(0);
          return;
        }

        setWindowsState(Array.isArray(list) ? list.length : 0);
      });
    } catch (err) {
      setWindowsState(0);
    }
  }

  function focusNextWindow() {
    const windowsApi = window.chrome?.windows;
    if (!windowsApi?.getAll || !windowsApi?.getCurrent || !windowsApi?.update) return;

    try {
      windowsApi.getCurrent((current) => {
        if (window.chrome.runtime?.lastError || !current) return;

        windowsApi.getAll({ populate: false, windowTypes: ["normal"] }, (list) => {
          if (window.chrome.runtime?.lastError) return;

          const windows = (Array.isArray(list) ? list : [])
            .filter((item) => typeof item.id === "number")
            .sort((a, b) => a.id - b.id);

          if (windows.length < 2) {
            setWindowsState(windows.length);
            return;
          }

          const index = windows.findIndex((item) => item.id === current.id);
          const next = windows[(index + 1) % windows.length] || windows[0];

          const options = { focused: true };
          if (next.state === "minimized") options.state = "normal";

          windowsApi.update(next.id, options, () => {
            if (window.chrome.runtime?.lastError) {
              refreshWindows();
              return;
            }

            setWindowsState(windows.length);
          });
        });
      });
    } catch (err) {
      refreshWindows();
    }
  }

  if (windowsBtn) {
    windowsBtn.addEventListener("click", focusNextWindow);
    refreshWindows();

    window.addEventListener("focus", refreshWindows);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshWindows();
    });

    const windowsApi = window.chrome?.windows;
    windowsApi?.onCreated?.addListener(refreshWindows);
    windowsApi?.onRemoved?.addListener(refreshWindows);
  }

  /* ---------- Статичные блики ---------- */
  // Эффекты при наведении удалены: цветные блики остаются статичными,
  // никаких pointermove/rAF-циклов на странице нет.
})();
