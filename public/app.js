const state = {
  authenticated: false,
  authConfigured: false,
  config: null,
  status: null,
  license: null,
  jobs: [],
  printers: [],
  printedFiles: [],
  logFiles: [],
  updateInfo: null,
  registration: null,
  currentPage: "dashboard",
  currentSettingsTab: "printer",
  currentMessagesTab: "flow",
  currentPrinterIndex: 0,
  currentPrinterTabs: [],
  connectedSince: null
};

const translations = {
  he: {
    dashboard: "לוח בקרה", settings: "הגדרות", contacts: "מורשים וקבוצות", logs: "לוג הדפסות",
    files: "קבצים שהודפסו", pricing: "תמחור", diagnostics: "קבצי לוג", advanced: "מתקדם", about: "אודות",
    dashboardSub: "מבט מלא על פעילות ההדפסות", settingsSub: "מדפסות, הודעות, פרופילים והתראות",
    contactsSub: "ניהול לקוחות, מספרים וקבוצות", logsSub: "מעקב עבודות והיסטוריית הדפסה",
    filesSub: "קבצים שנשמרו לאחר הדפסה", pricingSub: "מחירונים, מדרגות וחישוב עלויות",
    diagnosticsSub: "פלט מערכת ודיאגנוסטיקה", advancedSub: "בדיקות Office ושליטה עדינה", aboutSub: "MY-PC ופרטי גרסה",
    connect: "חבר WhatsApp", disconnect: "נתק", newQr: "QR חדש", logout: "התנתקות",
    loginTitle: "כניסה למערכת ניהול ההדפסות", setupTitle: "הגדרת סיסמת מנהל ראשונית", password: "סיסמה", login: "כניסה", setup: "הגדר סיסמה"
  },
  en: {
    dashboard: "Dashboard", settings: "Settings", contacts: "Allowed Contacts", logs: "Print Log",
    files: "Printed Files", pricing: "Pricing", diagnostics: "Log Files", advanced: "Advanced", about: "About", license: "License",
    dashboardSub: "Full view of print activity", settingsSub: "Printers, messages, profiles and alerts",
    contactsSub: "Customers, numbers and groups", logsSub: "Jobs and print history",
    filesSub: "Files saved after printing", pricingSub: "Price rules and calculations",
    diagnosticsSub: "System output and diagnostics", advancedSub: "Office tests and fine control", aboutSub: "MY-PC and system version",
    connect: "Connect WhatsApp", disconnect: "Disconnect", newQr: "New QR", logout: "Logout",
    loginTitle: "Print management login", setupTitle: "Set initial admin password", password: "Password", login: "Login", setup: "Set Password"
  },
  ru: {
    dashboard: "Панель", settings: "Настройки", contacts: "Доступ", logs: "Журнал печати",
    files: "Напечатанные файлы", pricing: "Цены", diagnostics: "Логи", advanced: "Расширенные", about: "О системе",
    dashboardSub: "Обзор активности печати", settingsSub: "Принтеры, сообщения, профили и уведомления",
    contactsSub: "Клиенты, номера и группы", logsSub: "История заданий печати",
    filesSub: "Файлы после печати", pricingSub: "Правила цен и расчет",
    diagnosticsSub: "Системные логи и диагностика", advancedSub: "Тесты Office и тонкая настройка", aboutSub: "MY-PC и версия системы",
    connect: "Подключить WhatsApp", disconnect: "Отключить", newQr: "Новый QR", logout: "Выйти",
    loginTitle: "Вход в систему печати", setupTitle: "Создать пароль администратора", password: "Пароль", login: "Войти", setup: "Создать пароль"
  }
};

const phraseTranslations = {
  "טוען...": { en: "Loading...", ru: "Загрузка..." },
  "הצלחה": { en: "Success", ru: "Успешно" },
  "שים לב": { en: "Notice", ru: "Внимание" },
  "שגיאה": { en: "Error", ru: "Ошибка" },
  "עדכון": { en: "Update", ru: "Обновление" },
  "לוח בקרה עסקי להדפסות WhatsApp": { en: "Business WhatsApp Print Dashboard", ru: "Панель печати WhatsApp" },
  "סטטוס מערכת, תור הדפסות, תקלות, מדפסות ולקוחות במקום אחד.": { en: "System status, queue, issues, printers and customers in one place.", ru: "Статус системы, очередь, ошибки, принтеры и клиенты в одном месте." },
  "WhatsApp מחובר": { en: "WhatsApp Connected", ru: "WhatsApp подключен" },
  "WhatsApp מנותק": { en: "WhatsApp Disconnected", ru: "WhatsApp отключен" },
  "מדפסת זמינה": { en: "Printer Available", ru: "Принтер доступен" },
  "מדפסת דורשת בדיקה": { en: "Printer Needs Check", ru: "Требуется проверка принтера" },
  "הדפסות": { en: "Prints", ru: "Печать" },
  "כל העבודות שנקלטו": { en: "All received jobs", ru: "Все полученные задания" },
  "הושלמו": { en: "Completed", ru: "Завершено" },
  "הצלחה": { en: "Success", ru: "Успех" },
  "ממתינות": { en: "Waiting", ru: "Ожидают" },
  "בתהליך או ממתינות": { en: "Processing or waiting", ru: "В процессе или ожидании" },
  "נכשלו": { en: "Failed", ru: "Ошибки" },
  "דורשות בדיקה": { en: "Need review", ru: "Требуют проверки" },
  "התפלגות סטטוסים": { en: "Status Breakdown", ru: "Статусы" },
  "הושלם": { en: "Completed", ru: "Завершено" },
  "ממתין": { en: "Waiting", ru: "Ожидает" },
  "נכשל": { en: "Failed", ru: "Ошибка" },
  "תור ועבודות אחרונות": { en: "Queue and Recent Jobs", ru: "Очередь и последние задания" },
  "עצור הדפסה": { en: "Stop Printing", ru: "Остановить печать" },
  "חיבור WhatsApp": { en: "WhatsApp Connection", ru: "Подключение WhatsApp" },
  "לא מחובר": { en: "Disconnected", ru: "Отключено" },
  "מחובר": { en: "Connected", ru: "Подключено" },
  "אין QR פעיל": { en: "No active QR", ru: "Нет активного QR" },
  "שמור הגדרות": { en: "Save Settings", ru: "Сохранить настройки" },
  "הגדרת מדפסות": { en: "Printer Setup", ru: "Настройка принтеров" },
  "כמה מדפסות יש בעסק ומה התפקיד של כל אחת": { en: "How many printers are in the business and what each one does", ru: "Сколько принтеров в бизнесе и роль каждого" },
  "כמה מדפסות יש לי?": { en: "How many printers?", ru: "Сколько принтеров?" },
  "מדפסת ראשית במערכת": { en: "Primary System Printer", ru: "Основной принтер системы" },
  "עותקים": { en: "Copies", ru: "Копии" },
  "אם יש מדפסת צבעונית, שאל לקוח צבעוני או שחור־לבן": { en: "If a color printer exists, ask the customer color or B/W", ru: "Если есть цветной принтер, спросить цвет или ч/б" },
  "הדפסה אוטומטית": { en: "Automatic Printing", ru: "Автоматическая печать" },
  "מחיקה לאחר הדפסה": { en: "Delete After Print", ru: "Удалять после печати" },
  "רענן מדפסות": { en: "Refresh Printers", ru: "Обновить принтеры" },
  "בדוק תאימות": { en: "Check Compatibility", ru: "Проверить совместимость" },
  "הודעות ללקוח": { en: "Customer Messages", ru: "Сообщения клиенту" },
  "עריכת כל נוסחי WhatsApp": { en: "Edit all WhatsApp templates", ru: "Редактирование всех шаблонов WhatsApp" },
  "תהליך הזמנה": { en: "Order Flow", ru: "Процесс заказа" },
  "סטטוסים ותקלות": { en: "Statuses and Issues", ru: "Статусы и ошибки" },
  "שיווק": { en: "Marketing", ru: "Маркетинг" },
  "סוגי קבצים וגודל": { en: "File Types and Size", ru: "Типы файлов и размер" },
  "מה מותר להדפסה": { en: "What can be printed", ru: "Что можно печатать" },
  "סוגי קבצים": { en: "File Types", ru: "Типы файлов" },
  "גודל מקסימלי MB": { en: "Maximum Size MB", ru: "Максимальный размер MB" },
  "שלח אישור ב-WhatsApp": { en: "Send WhatsApp Confirmation", ru: "Отправить подтверждение WhatsApp" },
  "אפשר הדפסה מתוך קבוצות": { en: "Allow Printing From Groups", ru: "Разрешить печать из групп" },
  "התראות מערכת": { en: "System Alerts", ru: "Системные уведомления" },
  "WhatsApp למנהל": { en: "WhatsApp to admin", ru: "WhatsApp администратору" },
  "שלח התראות מערכת": { en: "Send System Alerts", ru: "Отправлять системные уведомления" },
  "מספר לקבלת התראות": { en: "Alert Phone Number", ru: "Телефон для уведомлений" },
  "בדוק שליחת הודעה": { en: "Test Message", ru: "Проверить отправку" },
  "דואר Gmail": { en: "Gmail Email", ru: "Почта Gmail" },
  "שליחה במקרה ש-WhatsApp מנותק": { en: "Send when WhatsApp is disconnected", ru: "Отправлять если WhatsApp отключен" },
  "הפעל שליחת מייל": { en: "Enable Email Sending", ru: "Включить отправку email" },
  "כתובת Gmail": { en: "Gmail Address", ru: "Адрес Gmail" },
  "סיסמת אפליקציה": { en: "App Password", ru: "Пароль приложения" },
  "מייל מנהל": { en: "Manager Email", ru: "Email администратора" },
  "שלח מייל אם WhatsApp מנותק": { en: "Send email if WhatsApp disconnects", ru: "Отправить email если WhatsApp отключен" },
  "שפה ומיתוג": { en: "Language and Branding", ru: "Язык и бренд" },
  "עברית, אנגלית, רוסית והחלק התחתון של המערכת": { en: "Hebrew, English, Russian and footer settings", ru: "Иврит, английский, русский и нижний блок" },
  "שפת מערכת": { en: "System Language", ru: "Язык системы" },
  "שינוי סיסמת מנהל": { en: "Change Admin Password", ru: "Изменить пароль администратора" },
  "טקסט Footer": { en: "Footer Text", ru: "Текст нижнего блока" },
  "טקסט קישור Footer": { en: "Footer Link Text", ru: "Текст ссылки нижнего блока" },
  "כתובת קישור Footer": { en: "Footer Link URL", ru: "URL ссылки нижнего блока" },
  "הגדרות מתקדמות": { en: "Advanced Settings", ru: "Расширенные настройки" },
  "נתיבים, בדיקות ושליטה": { en: "Paths, tests and control", ru: "Пути, тесты и управление" },
  "בדיקת Excel": { en: "Excel Test", ru: "Проверка Excel" },
  "בדיקת PowerPoint": { en: "PowerPoint Test", ru: "Проверка PowerPoint" },
  "עצור הדפסה מיד": { en: "Stop Printing Now", ru: "Остановить печать сейчас" },
  "עדכוני מערכת": { en: "System Updates", ru: "Обновления системы" },
  "בדיקת עדכונים והתקנה מתוך GitHub": { en: "Check and install updates from GitHub", ru: "Проверка и установка обновлений из GitHub" },
  "לא בוצעה בדיקת עדכונים.": { en: "No update check was performed.", ru: "Проверка обновлений еще не выполнялась." },
  "בדוק עדכונים": { en: "Check Updates", ru: "Проверить обновления" },
  "התקן עדכון עכשיו": { en: "Install Update Now", ru: "Установить обновление сейчас" },
  "כללי": { en: "General", ru: "Общие" },
  "פרופיל PDF": { en: "PDF Profile", ru: "Профиль PDF" },
  "שם פנימי": { en: "Internal Name", ru: "Внутреннее имя" },
  "מדפסת Windows": { en: "Windows Printer", ru: "Принтер Windows" },
  "תפקיד": { en: "Role", ru: "Роль" },
  "ראשית": { en: "Primary", ru: "Основной" },
  "שחור־לבן": { en: "Black and White", ru: "Черно-белый" },
  "צבעונית": { en: "Color", ru: "Цветной" },
  "מיוחדת": { en: "Special", ru: "Специальный" },
  "זו המדפסת הראשית": { en: "This is the primary printer", ru: "Это основной принтер" },
  "שאל לקוח אם להשתמש במדפסת זו לצבע": { en: "Ask customer to use this printer for color", ru: "Спросить клиента использовать этот принтер для цвета" },
  "צבע": { en: "Color", ru: "Цвет" },
  "דו צדדי": { en: "Duplex", ru: "Двусторонняя" },
  "חד צדדי": { en: "Single-sided", ru: "Односторонняя" },
  "דו צדדי צד ארוך": { en: "Duplex long edge", ru: "Двусторонняя длинный край" },
  "דו צדדי צד קצר": { en: "Duplex short edge", ru: "Двусторонняя короткий край" },
  "כיוון PDF": { en: "PDF Orientation", ru: "Ориентация PDF" },
  "אוטומטי": { en: "Auto", ru: "Авто" },
  "לאורך": { en: "Portrait", ru: "Книжная" },
  "לרוחב": { en: "Landscape", ru: "Альбомная" },
  "גודל דף": { en: "Paper Size", ru: "Размер бумаги" },
  "התאמה": { en: "Scaling", ru: "Масштаб" },
  "מלא דף": { en: "Fill Page", ru: "На всю страницу" },
  "אחוז הגדלה": { en: "Scale Percent", ru: "Процент масштаба" },
  "איכות": { en: "Quality", ru: "Качество" },
  "מצב תאימות PDF": { en: "PDF Compatibility Mode", ru: "Режим совместимости PDF" },
  "התאם Office לרוחב דף": { en: "Fit Office to page width", ru: "Подогнать Office по ширине" },
  "מדפסת אחת": { en: "One printer", ru: "Один принтер" },
  "2 מדפסות": { en: "2 printers", ru: "2 принтера" },
  "3 מדפסות": { en: "3 printers", ru: "3 принтера" },
  "4 מדפסות": { en: "4 printers", ru: "4 принтера" },
  "5 מדפסות": { en: "5 printers", ru: "5 принтеров" },
  "הודפס": { en: "Printed", ru: "Напечатано" },
  "מספרים מורשים": { en: "Allowed Numbers", ru: "Разрешенные номера" },
  "קבוצות מורשות": { en: "Allowed Groups", ru: "Разрешенные группы" },
  "שולחים אחרונים": { en: "Recent Senders", ru: "Последние отправители" },
  "קבצים שהודפסו": { en: "Printed Files", ru: "Напечатанные файлы" },
  "קבצי לוג": { en: "Log Files", ru: "Файлы логов" },
  "תצוגת לוג": { en: "Log Preview", ru: "Просмотр лога" },
  "אודות": { en: "About", ru: "О системе" },
  "גרסת מערכת": { en: "System Version", ru: "Версия системы" },
  "אתר": { en: "Website", ru: "Сайт" },
  "מפתח": { en: "Developer", ru: "Разработчик" }
};

const $ = (selector) => document.querySelector(selector);

function lang() {
  return state.config?.language || "he";
}

function t(key) {
  return translations[lang()]?.[key] || translations.he[key] || key;
}

function translatePhrase(text) {
  const currentLang = lang();
  if (currentLang === "he") return text;
  return phraseTranslations[text]?.[currentLang] || text;
}

function translateDom(root = document.body) {
  if (lang() === "he" || !root) return;

  const skippedTags = new Set(["TEXTAREA", "INPUT", "PRE", "CODE", "SCRIPT", "STYLE"]);
  const textNodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || skippedTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    const original = node.nodeValue.trim();
    const translated = translatePhrase(original);
    if (translated !== original) {
      node.nodeValue = node.nodeValue.replace(original, translated);
    }
  });

  root.querySelectorAll("[placeholder]").forEach((element) => {
    const placeholder = element.getAttribute("placeholder") || "";
    const translated = translatePhrase(placeholder.trim());
    if (translated !== placeholder.trim()) element.setAttribute("placeholder", translated);
  });
}

function getPages() {
  if (isLocked()) {
    return [
      ["license", "key-round", lang() === "he" ? "רישוי ואודות" : "License & About", lang() === "he" ? "המערכת נעולה עד להפעלת רישיון" : "System is locked until a license is activated"]
    ];
  }

  if (isTrial()) {
    return [
      ["dashboard", "layout-dashboard", t("dashboard"), t("dashboardSub")],
      ["settings", "settings", t("settings"), lang() === "he" ? "הגדרת מדפסת אחת, התראות ושפה" : "One printer, alerts and language"],
      ["logs", "list-checks", t("logs"), t("logsSub")],
      ["license", "key-round", lang() === "he" ? "רישוי ואודות" : "License & About", lang() === "he" ? "Trial, בחירת מסלול והפעלת רישיון" : "Trial, plan request and activation"],
      ["diagnostics", "file-terminal", t("diagnostics"), t("diagnosticsSub")]
    ];
  }

  return [
    ["dashboard", "layout-dashboard", t("dashboard"), t("dashboardSub")],
    ["settings", "settings", t("settings"), t("settingsSub")],
    ["contacts", "users", t("contacts"), t("contactsSub")],
    ["logs", "list-checks", t("logs"), t("logsSub")],
    ["files", "folder-open", t("files"), t("filesSub")],
    ["pricing", "calculator", t("pricing"), t("pricingSub")],
    ["license", "key-round", lang() === "he" ? "רישוי ואודות" : "License & About", lang() === "he" ? "Trial, קוד מחשב, מסלול ואודות MY-PC" : "Trial, machine code, plan and MY-PC details"],
    ["diagnostics", "file-terminal", t("diagnostics"), t("diagnosticsSub")],
    ["advanced", "sliders-horizontal", t("advanced"), t("advancedSub")],
    ["about", "info", t("about"), t("aboutSub")]
  ];
}

function getSettingsTabs() {
  if (isTrial()) {
    return [
      ["printer", "printer", lang() === "he" ? "מדפסת Trial" : "Trial Printer"],
      ["alerts", "bell-ring", lang() === "he" ? "התראות בסיסיות" : "Basic Alerts"],
      ["language", "languages", lang() === "he" ? "שפה" : "Language"]
    ];
  }

  return [
    ["printer", "printer", lang() === "he" ? "מדפסות" : "Printers"],
    ["messages", "message-square-text", lang() === "he" ? "הודעות" : "Messages"],
    ["files", "file-type", lang() === "he" ? "סוגי קבצים" : "File Types"],
    ["alerts", "bell-ring", lang() === "he" ? "התראות" : "Alerts"],
    ["language", "languages", lang() === "he" ? "שפה" : "Language"],
    ["advanced", "wrench", lang() === "he" ? "מתקדם" : "Advanced"]
  ];
}

function isTrial() {
  return state.license?.mode === "trial" || state.license?.mode === "invalid";
}

function isLocked() {
  return state.license && !state.license.canRun;
}

async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseError(text));
  }
  return response.json();
}

function parseError(text) {
  try {
    return JSON.parse(text).error || text;
  } catch {
    return text;
  }
}

function setLoading(active, text = "טוען...") {
  $("#loaderText").textContent = text;
  $("#loader").classList.toggle("hidden", !active);
}

function notify(type, message) {
  const titles = { success: "הצלחה", warning: "שים לב", error: "שגיאה" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${titles[type] || "עדכון"}</strong><span>${escapeHtml(message)}</span>`;
  $("#toastHost").append(toast);
  setTimeout(() => toast.remove(), 4500);
}

function renderIcons() {
  if (window.lucide) window.lucide.createIcons();
}

async function init() {
  bindLogin();
  renderNav();
  bindHeaderActions();
  bindFooterActions();

  try {
    const [auth, config] = await Promise.all([
      api("/api/auth/status"),
      api("/api/config").catch(() => null)
    ]);
    if (config) {
      state.config = config;
      $("#languageSelect").value = config.language || "he";
    }
    state.authConfigured = Boolean(auth.configured);
    applyStaticTranslations();
  } catch {
    state.authConfigured = false;
  }

  renderIcons();
}

function bindLogin() {
  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = $("#loginPassword").value;
    if (!password || password.length < 4) {
      notify("warning", "יש להזין סיסמה באורך 4 תווים לפחות.");
      return;
    }

    setLoading(true, "בודק הרשאות...");
    try {
      if (state.authConfigured) {
        await api("/api/auth/login", postJson({ password }));
      } else {
        await api("/api/auth/setup", postJson({ password }));
        state.authConfigured = true;
      }
      state.authenticated = true;
      $("#loginView").classList.add("hidden");
      $("#appShell").classList.remove("hidden");
      $("#appFooter").classList.remove("hidden");
      await loadAll();
      render();
    } catch (error) {
      notify("error", error.message || "כניסה נכשלה.");
    } finally {
      setLoading(false);
    }
  });
}

function postJson(body) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function renderNav() {
  $("#mainNav").innerHTML = getPages()
    .map(([id, icon, label]) => `
      <button class="nav-item ${state.currentPage === id ? "active" : ""}" data-page="${id}">
        <i data-lucide="${icon}"></i><span>${label}</span>
      </button>
    `)
    .join("") + `
      <button class="nav-item nav-logout" id="logoutBtn">
        <i data-lucide="log-out"></i><span>${t("logout")}</span>
      </button>
    `;

  $("#mainNav").querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentPage = button.dataset.page;
      render();
    });
  });

  $("#logoutBtn")?.addEventListener("click", () => {
    state.authenticated = false;
    $("#appShell").classList.add("hidden");
    $("#appFooter").classList.add("hidden");
    $("#loginView").classList.remove("hidden");
    $("#loginPassword").value = "";
    notify("success", lang() === "he" ? "התנתקת מהמערכת." : lang() === "ru" ? "Вы вышли из системы." : "Logged out.");
  });
}

function bindHeaderActions() {
  document.querySelectorAll(".brand-logo").forEach((logo) => {
    logo.addEventListener("click", () => {
      if (!isLocked()) {
        state.currentPage = "dashboard";
        render();
      }
    });
  });

  $("#languageSelect").addEventListener("change", async (event) => {
    state.config.language = event.target.value;
    await saveConfig(false);
    applyStaticTranslations();
    render();
    notify("success", lang() === "he" ? "השפה נשמרה." : lang() === "ru" ? "Язык сохранен." : "Language saved.");
  });

  $("#startBtn").addEventListener("click", async () => action("מחבר WhatsApp...", "/api/whatsapp/start", "בקשת חיבור נשלחה."));
  $("#stopBtn").addEventListener("click", async () => action("מנתק WhatsApp...", "/api/whatsapp/stop", "WhatsApp נותק."));
  $("#resetBtn").addEventListener("click", async () => action("יוצר QR חדש...", "/api/whatsapp/reset", "נוצר QR חדש."));
}

function bindFooterActions() {
  document.querySelector("[data-footer-action='docs']")?.addEventListener("click", () => {
    if (isLocked()) {
      state.currentPage = "license";
    } else {
      state.currentPage = "diagnostics";
    }
    showDocumentation();
  });
  document.querySelector("[data-footer-action='website']")?.addEventListener("click", () => {
    window.open("https://my-pc.co.il", "_blank", "noopener,noreferrer");
  });
  document.querySelector("[data-footer-action='whatsapp']")?.addEventListener("click", () => {
    window.open("https://wa.me/972522250223?text=%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A1%D7%99%D7%95%D7%A2%20%D7%91%D7%9E%D7%A2%D7%A8%D7%9B%D7%AA%20%D7%94%D7%93%D7%A4%D7%A1%D7%AA%20WhatsApp", "_blank", "noopener,noreferrer");
  });
}

function showDocumentation() {
  $("#pageHost").innerHTML = renderDocumentation();
  $("#pageTitle").textContent = "תיעוד ועזרה";
  $("#pageSubtitle").textContent = "מדריך משתמש מלא למערכת";
  renderIcons();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js?v=1.0.5").catch(() => {});
  });
}

function applyStaticTranslations() {
  document.documentElement.lang = lang();
  document.documentElement.dir = lang() === "he" ? "rtl" : "ltr";
  $("#loginSubtitle").textContent = state.authConfigured ? t("loginTitle") : t("setupTitle");
  $("#loginPasswordLabel").textContent = t("password");
  $("#loginButtonText").textContent = state.authConfigured ? t("login") : t("setup");
  $("#resetBtn span").textContent = t("newQr");
  $("#startBtn span").textContent = t("connect");
  $("#stopBtn span").textContent = t("disconnect");
  renderFooter();
  translateDom($("#loginView"));
}

function renderFooter() {
  const footerUrl = "https://my-pc.co.il";
  const footerUrlLabel = "my-pc.co.il";
  $(".footer-center p").textContent = "כל הזכויות שמורות ל-MY-PC - המחשב שלי | מחלקת פיתוח";
  const link = $(".footer-center a");
  link.textContent = footerUrlLabel;
  link.href = footerUrl;
}

async function action(loadingText, path, successText) {
  setLoading(true, loadingText);
  try {
    await api(path, { method: "POST" });
    await loadAll();
    render();
    notify("success", successText);
  } catch (error) {
    notify("error", error.message || "הפעולה נכשלה.");
  } finally {
    setLoading(false);
  }
}

async function loadAll() {
  const [status, jobs, printers, printedFiles, logFiles, updateInfo] = await Promise.all([
    api("/api/status"),
    api("/api/jobs"),
    api("/api/printers/details").catch(() => []),
    api("/api/printed/files").catch(() => []),
    api("/api/log-files").catch(() => []),
    api("/api/updates/check").catch(() => null)
  ]);
  state.status = status;
  state.license = status.license;
  state.registration = status.registration || null;
  state.updateInfo = updateInfo;
  state.config = status.config;
  state.jobs = jobs;
  state.printers = printers;
  state.printedFiles = printedFiles;
  state.logFiles = logFiles;
  $("#languageSelect").value = state.config.language || "he";
  if (status.whatsapp?.connected && !state.connectedSince) state.connectedSince = new Date();
  if (!status.whatsapp?.connected) state.connectedSince = null;
}

function render() {
  applyStaticTranslations();
  const pageList = getPages();
  const page = pageList.find(([id]) => id === state.currentPage) || pageList[0];
  state.currentPage = page[0];
  $("#pageTitle").textContent = page[2];
  $("#pageSubtitle").textContent = page[3];
  renderNav();

  const renderers = {
    dashboard: renderDashboard,
    settings: renderSettings,
    contacts: renderContacts,
    logs: renderLogs,
    files: renderFiles,
    pricing: renderPricing,
    license: renderLicense,
    diagnostics: renderDiagnostics,
    advanced: renderAdvanced,
    about: renderAbout
  };

  $("#pageHost").innerHTML = renderers[state.currentPage]();
  bindPage();
  translateDom($("#appShell"));
  translateDom($("#appFooter"));
  renderIcons();
}

function bindPage() {
  if (state.currentPage === "settings") bindSettings();
  if (state.currentPage === "pricing") bindPricing();
  if (state.currentPage === "license") bindLicense();
  if (state.currentPage === "contacts") bindContacts();
  if (state.currentPage === "diagnostics") bindDiagnostics();
  if (state.currentPage === "advanced") bindAdvanced();
  document.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", async () => {
      await loadAll();
      render();
      notify("success", "הנתונים רועננו.");
    });
  });
  document.querySelectorAll("[data-page-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentPage = button.dataset.pageJump;
      render();
    });
  });
  document.querySelectorAll("[data-run-update]").forEach((button) => {
    button.addEventListener("click", runUpdate);
  });
}

function renderDashboard() {
  const stats = getStats();
  const whatsapp = state.status?.whatsapp || {};
  const printer = state.printers.find((item) => item.name === state.config.printerName);
  return `
    <section class="dashboard-grid fade-in">
      ${renderTrialNotice()}
      ${renderUpdateNotice()}
      <article class="panel hero-panel">
        <div>
          <p class="eyebrow">MY-PC WhatsApp Print Server</p>
          <h2>לוח בקרה עסקי להדפסות WhatsApp</h2>
          <p>סטטוס מערכת, תור הדפסות, תקלות, מדפסות ולקוחות במקום אחד.</p>
        </div>
        <div class="hero-status">
          ${statusPill(whatsapp.connected ? "success" : "warning", whatsapp.connected ? "WhatsApp מחובר" : "WhatsApp מנותק")}
          ${statusPill(printer?.available ? "success" : "warning", printer?.available ? "מדפסת זמינה" : "מדפסת דורשת בדיקה")}
        </div>
      </article>
      ${metricCard("printer", "הדפסות", stats.total, "כל העבודות שנקלטו")}
      ${metricCard("check-circle-2", "הושלמו", stats.printed, `${stats.successRate}% הצלחה`)}
      ${metricCard("clock", "ממתינות", stats.waiting, "בתהליך או ממתינות")}
      ${metricCard("triangle-alert", "נכשלו", stats.failed, "דורשות בדיקה")}
      <article class="panel chart-panel">
        <div class="panel-title"><h3>התפלגות סטטוסים</h3><button class="icon-btn" data-refresh><i data-lucide="refresh-cw"></i></button></div>
        <div class="bar-chart">
          ${bar("הושלם", stats.printed, stats.total, "success")}
          ${bar("ממתין", stats.waiting, stats.total, "warning")}
          ${bar("נכשל", stats.failed, stats.total, "error")}
        </div>
      </article>
      <article class="panel queue-panel">
        <div class="panel-title"><h3>תור ועבודות אחרונות</h3><button id="stopPrintingBtn" class="btn btn-danger-outline"><i data-lucide="octagon-x"></i><span>עצור הדפסה</span></button></div>
        ${jobsTable(state.jobs.slice(0, 8))}
      </article>
      <article class="panel qr-panel">
        <div class="panel-title"><h3>חיבור WhatsApp</h3><span>${state.connectedSince ? state.connectedSince.toLocaleTimeString("he-IL") : "לא מחובר"}</span></div>
        <div class="qr-box">${whatsapp.qrDataUrl ? `<img src="${whatsapp.qrDataUrl}" alt="QR" />` : `<i data-lucide="${whatsapp.connected ? "check-circle-2" : "qr-code"}"></i><span>${whatsapp.connected ? "מחובר" : "אין QR פעיל"}</span>`}</div>
      </article>
    </section>
  `;
}

function renderTrialNotice() {
  const license = state.license || {};
  if (license.mode !== "trial" && license.mode !== "invalid") return "";
  const usage = license.trialUsage || {};
  const limits = license.trialLimits || {};
  return `
    <article class="panel wide trial-banner">
      <div>
        <strong>מערכת Trial פעילה - נותרו ${license.trialDaysLeft || 0} ימים</strong>
        <span>מותר: מדפסת אחת, שחור לבן, PDF/JPG/JPEG/PNG בלבד, עד ${limits.documentsPerDay || 5} מסמכים ביום ועד ${limits.sendersPerDay || 5} שולחים ביום.</span>
      </div>
      <div class="trial-counters">
        <span>${usage.documentCount || 0}/${limits.documentsPerDay || 5} מסמכים היום</span>
        <span>${usage.senderCount || 0}/${limits.sendersPerDay || 5} שולחים היום</span>
      </div>
      <button class="btn btn-primary" data-page-jump="license"><i data-lucide="badge-check"></i><span>בחר מסלול ובקש רישיון</span></button>
    </article>
  `;
}

function renderUpdateNotice() {
  const update = state.updateInfo;
  if (!update?.available) return "";
  return `
    <article class="panel wide update-banner">
      <div>
        <strong>יש עדכון חדש, נא לעדכן</strong>
        <span>גרסה נוכחית: ${escapeHtml(update.current)} | גרסה ב-GitHub: ${escapeHtml(update.latest)}</span>
      </div>
      <button class="btn btn-primary" data-run-update><i data-lucide="download-cloud"></i><span>עדכן עכשיו</span></button>
    </article>
  `;
}

function metricCard(icon, title, value, caption) {
  return `<article class="metric-tile panel"><i data-lucide="${icon}"></i><span>${title}</span><strong>${value}</strong><small>${caption}</small></article>`;
}

function bar(label, value, total, tone) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return `<div class="bar-row"><span>${label}</span><div><b class="${tone}" style="width:${percent}%"></b></div><strong>${percent}%</strong></div>`;
}

function renderSettings() {
  return `
    <section class="settings-layout fade-in">
      <aside class="tabs-panel panel">
        ${getSettingsTabs().map(([id, icon, label]) => `<button class="tab-button ${state.currentSettingsTab === id ? "active" : ""}" data-tab="${id}"><i data-lucide="${icon}"></i><span>${label}</span></button>`).join("")}
      </aside>
      <form id="settingsForm" class="panel settings-panel">
        ${renderSettingsTab()}
        <div class="form-actions">
          <button class="btn btn-primary" type="submit"><i data-lucide="save"></i><span>שמור הגדרות</span></button>
        </div>
      </form>
    </section>
  `;
}

function renderSettingsTab() {
  const config = state.config;
  const profile = config.pdfPrintProfile || {};
  const office = config.officePrintProfile || {};
  const roles = config.printerRoles || {};
  const email = config.email || {};
  const messages = config.customerMessages || {};
  const tab = state.currentSettingsTab;

  if (tab === "printer") return `
    ${sectionTitle("printer", "הגדרת מדפסות", "כמה מדפסות יש בעסק ומה התפקיד של כל אחת")}
    ${isTrial() ? `<div class="license-inline-note"><strong>Trial פעיל:</strong> ניתן להגדיר מדפסת אחת בלבד, שחור לבן בלבד.</div>` : ""}
    <div class="form-grid">
      ${selectField("printerProfileCount", "כמה מדפסות יש לי?", isTrial() ? options([[1, "מדפסת אחת (Trial)"]], 1) : printerCountOptions((config.printerProfiles || []).length || 1))}
      ${selectField("printerName", "מדפסת ראשית במערכת", printerOptions(config.printerName))}
      ${isTrial() ? "" : numberField("copies", "עותקים", config.copies, 1)}
      ${isTrial() ? "" : checkField("roleAskColorPreference", "אם יש מדפסת צבעונית, שאל לקוח צבעוני או שחור־לבן", roles.askColorPreference)}
      ${checkField("autoPrint", "הדפסה אוטומטית", config.autoPrint)}
      ${checkField("deleteAfterPrint", "מחיקה לאחר הדפסה", config.deleteAfterPrint)}
    </div>
    <div id="printerProfilesHost" class="printer-profiles-grid">
      ${renderPrinterProfileCards()}
    </div>
    <div class="inline-actions">
      <button id="refreshPrintersBtn" type="button" class="btn btn-muted"><i data-lucide="refresh-cw"></i><span>רענן מדפסות</span></button>
      <button id="checkPrinterBtn" type="button" class="btn btn-primary"><i data-lucide="shield-check"></i><span>בדוק תאימות</span></button>
    </div>
    ${printerCompatibilityCard()}
  `;

  if (tab === "messages") return `
    ${sectionTitle("message-square-text", "הודעות ללקוח", "עריכת כל נוסחי WhatsApp")}
    <div class="inner-tabs">
      ${messageTabButton("flow", "תהליך הזמנה")}
      ${messageTabButton("status", "סטטוסים ותקלות")}
      ${messageTabButton("marketing", "שיווק")}
    </div>
    <div class="form-grid one">
      ${renderMessageFields(messages)}
    </div>
  `;

  if (tab === "profile") return `
    ${sectionTitle("file-cog", "פרופיל הדפסה", "PDF ו-Office")}
    <div class="form-grid">
      ${selectField("pdfColorMode", "צבע PDF", options([["color","צבעוני"],["grayscale","שחור־לבן"]], profile.colorMode))}
      ${selectField("pdfDuplex", "דו צדדי PDF", options([["simplex","חד צדדי"],["long-edge","דו צדדי צד ארוך"],["short-edge","דו צדדי צד קצר"]], profile.duplex))}
      ${selectField("pdfOrientation", "כיוון PDF", options([["auto","אוטומטי"],["portrait","לאורך"],["landscape","לרוחב"]], profile.orientation))}
      ${selectField("pdfPaperSize", "גודל דף", options([["A4","A4"],["A3","A3"],["LETTER","Letter"],["LEGAL","Legal"]], profile.paperSize))}
      ${selectField("pdfScaling", "התאמה לדף", options([["fill-page","מלא דף"],["fit","Fit"],["actual-size","Actual Size"],["shrink","Shrink"]], profile.scaling))}
      ${numberField("pdfScalePercent", "אחוז הגדלה", profile.scalePercent, 50, 200)}
      ${numberField("pdfDpi", "DPI", profile.dpi, 72, 2400)}
      ${selectField("pdfQuality", "איכות", options([["draft","Draft"],["normal","Normal"],["high","High"]], profile.quality))}
      ${checkField("pdfCompatibilityMode", "מצב תאימות PDF", profile.compatibilityMode !== false)}
      ${selectField("officeExcelOrientation", "Excel", options([["auto","אוטומטי"],["portrait","לאורך"],["landscape","לרוחב"]], office.excelOrientation))}
      ${selectField("officePowerPointOrientation", "PowerPoint", options([["auto","אוטומטי"],["portrait","לאורך"],["landscape","לרוחב"]], office.powerPointOrientation))}
      ${checkField("officeFitToWidth", "התאם Office לרוחב דף", office.fitToWidth !== false)}
    </div>
  `;

  if (tab === "files") return `
    ${sectionTitle("file-type", "סוגי קבצים וגודל", "מה מותר להדפסה")}
    <div class="form-grid">
      ${inputField("allowedFileTypes", "סוגי קבצים", (config.allowedFileTypes || []).join(", "))}
      ${numberField("maxFileSizeMB", "גודל מקסימלי MB", config.maxFileSizeMB, 1)}
      ${checkField("sendWhatsappReply", "שלח אישור ב-WhatsApp", config.sendWhatsappReply)}
      ${checkField("allowGroupPrinting", "אפשר הדפסה מתוך קבוצות", config.allowGroupPrinting)}
    </div>
  `;

  if (tab === "alerts") return `
    ${sectionTitle("bell-ring", "התראות מערכת", "WhatsApp למנהל")}
    <div class="form-grid">
      ${checkField("alertsEnabled", "שלח התראות מערכת", config.alertsEnabled)}
      ${inputField("alertsPhone", "מספר לקבלת התראות", config.alertsPhone, "972501234567")}
    </div>
    <button id="testAlertBtn" type="button" class="btn btn-muted"><i data-lucide="send"></i><span>בדוק שליחת הודעה</span></button>
  `;

  if (tab === "email") return `
    ${sectionTitle("mail", "דואר Gmail", "שליחה במקרה ש-WhatsApp מנותק")}
    <div class="form-grid">
      ${checkField("emailEnabled", "הפעל שליחת מייל", email.enabled)}
      ${inputField("emailGmailAddress", "כתובת Gmail", email.gmailAddress, "example@gmail.com")}
      ${inputField("emailAppPassword", "סיסמת אפליקציה", email.appPassword, "Gmail app password", "password")}
      ${inputField("emailManagerEmail", "מייל מנהל", email.managerEmail, "manager@example.com")}
      ${checkField("emailWhatsappDisconnected", "שלח מייל אם WhatsApp מנותק", email.sendWhenWhatsappDisconnected)}
    </div>
  `;

  if (tab === "language") return `
    ${sectionTitle("languages", "שפה", "בחירת שפת הממשק ללקוח")}
    <div class="form-grid">
      ${selectField("language", "שפת מערכת", options([["he","עברית"],["en","English"]], config.language))}
      ${inputField("adminPassword", "שינוי סיסמת מנהל", config.adminPassword, "השאר ריק כדי להסיר סיסמה", "password")}
    </div>
  `;

  return `
    ${sectionTitle("wrench", "הגדרות מתקדמות", "נתיבים, בדיקות ושליטה")}
    <div class="form-grid">
      ${inputField("sumatraPdfPath", "SumatraPDF Path", config.sumatraPdfPath)}
      ${inputField("port", "Port", config.port)}
    </div>
    <div class="inline-actions">
      <button type="button" class="btn btn-muted" data-office-test="excel"><i data-lucide="sheet"></i><span>בדיקת Excel</span></button>
      <button type="button" class="btn btn-muted" data-office-test="powerpoint"><i data-lucide="presentation"></i><span>בדיקת PowerPoint</span></button>
      <button type="button" class="btn btn-danger-outline" id="stopPrintingBtn"><i data-lucide="octagon-x"></i><span>עצור הדפסה מיד</span></button>
    </div>
  `;
}

function renderPrinterProfileCards() {
  const profiles = ensureUiPrinterProfiles();
  const activeIndex = Math.min(state.currentPrinterIndex || 0, profiles.length - 1);
  state.currentPrinterIndex = activeIndex;
  const tabs = profiles
    .map((profile, index) => `
      <button type="button" class="inner-tab-button ${activeIndex === index ? "active" : ""}" data-printer-profile-tab="${index}">
        ${escapeHtml(profile.displayName || `מדפסת ${index + 1}`)}
      </button>
    `)
    .join("");

  return `
    <div class="inner-tabs printer-profile-tabs">${tabs}</div>
    ${renderPrinterProfileCard(profiles[activeIndex], activeIndex)}
  `;
}

function messageTabButton(id, label) {
  return `<button type="button" class="inner-tab-button ${state.currentMessagesTab === id ? "active" : ""}" data-message-tab="${id}">${label}</button>`;
}

function renderMessageFields(messages) {
  if (state.currentMessagesTab === "status") {
    return [
      textareaField("messagePrinted", "הודפס בהצלחה", messages.printed),
      textareaField("messageReminder", "תזכורת", messages.reminder),
      textareaField("messageCanceled", "ביטול", messages.canceled),
      textareaField("messageExpired", "פג תוקף", messages.expired),
      textareaField("messageFailed", "כשל הדפסה", messages.failed)
    ].join("");
  }

  if (state.currentMessagesTab === "marketing") {
    const marketing = state.config.customerMarketing || {};
    return `
      <label class="field full"><span>הודעת MY-PC קבועה</span><textarea rows="5" disabled>${escapeHtml(messages.promo || "")}</textarea></label>
      ${checkField("customerMarketingEnabled", "אפשר הודעה שיווקית נוספת של העסק", marketing.enabled)}
      ${selectField("customerMarketingDelay", "מועד שליחה", options([[1, "אחרי דקה"], [5, "אחרי 5 דקות"], [30, "אחרי 30 דקות"], [60, "אחרי שעה"]], marketing.delayMinutes || 5))}
      ${textareaField("customerMarketingMessage", "הודעה שיווקית של העסק", marketing.message || "")}
    `;
  }

  return [
    textareaField("messageOrderPrompt", "שאלה אחרי קובץ ראשון", messages.orderPrompt),
    textareaField("messageFileAdded", "קובץ נוסף התקבל", messages.fileAdded),
    textareaField("messageQueued", "נכנס לתור", messages.queued)
  ].join("");
}

function ensureUiPrinterProfiles() {
  const count = Math.max(1, Number(document.querySelector("[name='printerProfileCount']")?.value || state.config.printerProfiles?.length || 1));
  const profiles = [...(state.config.printerProfiles || [])];
  while (profiles.length < count) {
    profiles.push(createUiPrinterProfile(profiles.length));
  }
  return profiles.slice(0, count).map((profile, index) => ({
    ...createUiPrinterProfile(index),
    ...profile,
    isPrimary: profile.isPrimary || index === 0
  }));
}

function createUiPrinterProfile(index) {
  return {
    id: `printer-${index + 1}`,
    displayName: index === 0 ? "מדפסת ראשית" : `מדפסת ${index + 1}`,
    printerName: index === 0 ? state.config.printerName || "" : "",
    role: index === 0 ? "default" : "special",
    isPrimary: index === 0,
    askCustomerColor: false,
    printProfile: { ...(state.config.pdfPrintProfile || {}) },
    officeProfile: { ...(state.config.officePrintProfile || {}) }
  };
}

function renderPrinterProfileCard(profile, index) {
  const prefix = `printerProfile_${index}`;
  const printProfile = profile.printProfile || state.config.pdfPrintProfile || {};
  const officeProfile = profile.officeProfile || state.config.officePrintProfile || {};
  const activeTab = state.currentPrinterTabs[index] || "general";
  const tabButton = (id, label) =>
    `<button type="button" class="printer-tab-button ${activeTab === id ? "active" : ""}" data-printer-index="${index}" data-printer-tab="${id}">${label}</button>`;
  const tabSection = (id, content) =>
    `<div class="form-grid printer-card-section ${activeTab === id ? "active" : "hidden-tab"}" data-printer-section="${id}">${content}</div>`;
  return `
    <article class="printer-profile-card">
      <div class="panel-title">
        <h3>${escapeHtml(profile.displayName || `מדפסת ${index + 1}`)}</h3>
        <span class="status-pill ${profile.role === "color" ? "success" : "warning"}">${printerRoleLabel(profile.role)}</span>
      </div>
      <div class="printer-card-tabs">
        ${tabButton("general", "כללי")}
        ${tabButton("pdf", "פרופיל PDF")}
        ${tabButton("office", "Office")}
      </div>
      <input type="hidden" name="${prefix}_id" value="${escapeAttr(profile.id || `printer-${index + 1}`)}" />
      ${tabSection("general", `
        ${inputField(`${prefix}_displayName`, "שם פנימי", profile.displayName || "")}
        ${selectField(`${prefix}_printerName`, "מדפסת Windows", printerOptions(profile.printerName, true))}
        ${selectField(`${prefix}_role`, "תפקיד", options([["default","ראשית"],["blackWhite","שחור־לבן"],["color","צבעונית"],["special","מיוחדת"]], profile.role))}
        ${checkField(`${prefix}_isPrimary`, "זו המדפסת הראשית", profile.isPrimary)}
        ${checkField(`${prefix}_askCustomerColor`, "שאל לקוח אם להשתמש במדפסת זו לצבע", profile.askCustomerColor)}
      `)}
      ${tabSection("pdf", `
        ${selectField(`${prefix}_colorMode`, "צבע", options([["color","צבעוני"],["grayscale","שחור־לבן"]], printProfile.colorMode))}
        ${selectField(`${prefix}_duplex`, "דו צדדי", options([["simplex","חד צדדי"],["long-edge","דו צדדי צד ארוך"],["short-edge","דו צדדי צד קצר"]], printProfile.duplex))}
        ${selectField(`${prefix}_orientation`, "כיוון PDF", options([["auto","אוטומטי"],["portrait","לאורך"],["landscape","לרוחב"]], printProfile.orientation))}
        ${selectField(`${prefix}_paperSize`, "גודל דף", options([["A4","A4"],["A3","A3"],["LETTER","Letter"],["LEGAL","Legal"]], printProfile.paperSize))}
        ${selectField(`${prefix}_scaling`, "התאמה", options([["fill-page","מלא דף"],["fit","Fit"],["actual-size","Actual Size"],["shrink","Shrink"]], printProfile.scaling))}
        ${numberField(`${prefix}_scalePercent`, "אחוז הגדלה", printProfile.scalePercent || 90, 50, 200)}
        ${numberField(`${prefix}_dpi`, "DPI", printProfile.dpi || 600, 72, 2400)}
        ${selectField(`${prefix}_quality`, "איכות", options([["draft","Draft"],["normal","Normal"],["high","High"]], printProfile.quality))}
        ${checkField(`${prefix}_compatibilityMode`, "מצב תאימות PDF", printProfile.compatibilityMode !== false)}
      `)}
      ${tabSection("office", `
        ${selectField(`${prefix}_excelOrientation`, "Excel", options([["auto","אוטומטי"],["portrait","לאורך"],["landscape","לרוחב"]], officeProfile.excelOrientation))}
        ${selectField(`${prefix}_powerPointOrientation`, "PowerPoint", options([["auto","אוטומטי"],["portrait","לאורך"],["landscape","לרוחב"]], officeProfile.powerPointOrientation))}
        ${checkField(`${prefix}_fitToWidth`, "התאם Office לרוחב דף", officeProfile.fitToWidth !== false)}
      `)}
    </article>
  `;
}

function printerRoleLabel(role) {
  return role === "default" ? "ראשית" : role === "blackWhite" ? "שחור־לבן" : role === "color" ? "צבעונית" : "מיוחדת";
}

function printerCountOptions(selected) {
  return options([[1, "מדפסת אחת"], [2, "2 מדפסות"], [3, "3 מדפסות"], [4, "4 מדפסות"], [5, "5 מדפסות"]], Number(selected));
}

function bindSettings() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentSettingsTab = button.dataset.tab;
      render();
    });
  });

  document.querySelectorAll("[data-message-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      readSettingsForm();
      state.currentMessagesTab = button.dataset.messageTab;
      render();
    });
  });

  document.querySelectorAll("[data-printer-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      readSettingsForm();
      const index = Number(button.dataset.printerIndex || 0);
      state.currentPrinterTabs[index] = button.dataset.printerTab || "general";
      render();
    });
  });

  document.querySelectorAll("[data-printer-profile-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      readSettingsForm();
      state.currentPrinterIndex = Number(button.dataset.printerProfileTab || 0);
      render();
    });
  });

  $("#settingsForm").elements.printerProfileCount?.addEventListener("change", (event) => {
    readSettingsForm();
    const desiredCount = Number(event.target.value) || 1;
    while (state.config.printerProfiles.length < desiredCount) {
      state.config.printerProfiles.push(createUiPrinterProfile(state.config.printerProfiles.length));
    }
    state.config.printerProfiles = state.config.printerProfiles.slice(0, desiredCount);
    state.currentPrinterIndex = Math.min(state.currentPrinterIndex || 0, desiredCount - 1);
    render();
  });

  $("#settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    readSettingsForm();
    await saveConfig(true);
  });

  $("#refreshPrintersBtn")?.addEventListener("click", async () => {
    state.printers = await api("/api/printers/details").catch(() => []);
    render();
    notify("success", "רשימת המדפסות רועננה.");
  });

  $("#checkPrinterBtn")?.addEventListener("click", async () => {
    const result = await api("/api/printers/check", postJson({ printerName: state.config.printerName }));
    notify(result.ok ? "success" : "warning", result.message || "בדיקת תאימות הסתיימה.");
  });

  $("#testAlertBtn")?.addEventListener("click", async () => {
    readSettingsForm();
    await saveConfig(false);
    await api("/api/alerts/test", { method: "POST" });
    notify("success", "הודעת בדיקה נשלחה לתור.");
  });

  $("#stopPrintingBtn")?.addEventListener("click", stopPrinting);
  document.querySelectorAll("[data-office-test]").forEach((button) => {
    button.addEventListener("click", () => runOfficeTest(button.dataset.officeTest));
  });
}

function readSettingsForm() {
  const form = $("#settingsForm");
  const config = state.config;
  const get = (name) => form.elements[name]?.value;
  const checked = (name) => Boolean(form.elements[name]?.checked);

  if (form.elements.printerName) config.printerName = get("printerName");
  if (form.elements.language) config.language = get("language");
  if (form.elements.adminPassword) config.adminPassword = get("adminPassword");
  if (form.elements.sumatraPdfPath) config.sumatraPdfPath = get("sumatraPdfPath");
  if (form.elements.port) config.port = Number(get("port")) || 3010;
  if (form.elements.allowedFileTypes) config.allowedFileTypes = get("allowedFileTypes").split(",").map((x) => x.trim()).filter(Boolean);
  if (form.elements.maxFileSizeMB) config.maxFileSizeMB = Number(get("maxFileSizeMB")) || 25;
  if (form.elements.copies) config.copies = Number(get("copies")) || 1;

  ["autoPrint", "deleteAfterPrint", "sendWhatsappReply", "allowGroupPrinting", "duplex", "color", "alertsEnabled"].forEach((name) => {
    if (form.elements[name]) config[name] = checked(name);
  });
  if (form.elements.alertsPhone) config.alertsPhone = get("alertsPhone");

  if (form.elements.printerProfileCount) {
    config.printerProfiles = readPrinterProfiles(form);
    const primaryProfile = config.printerProfiles.find((profile) => profile.isPrimary) || config.printerProfiles[0];
    if (primaryProfile?.printerName) {
      config.printerName = primaryProfile.printerName;
      config.pdfPrintProfile = primaryProfile.printProfile;
      config.officePrintProfile = primaryProfile.officeProfile;
    }
  }

  config.printerRoles = {
    defaultPrinter: config.printerName,
    blackWhitePrinter:
      config.printerProfiles?.find((profile) => profile.role === "blackWhite")?.printerName ??
      config.printerRoles?.blackWhitePrinter ??
      "",
    colorPrinter:
      config.printerProfiles?.find((profile) => profile.role === "color")?.printerName ??
      config.printerRoles?.colorPrinter ??
      "",
    askColorPreference: form.elements.roleAskColorPreference ? checked("roleAskColorPreference") : Boolean(config.printerRoles?.askColorPreference)
  };

  config.pdfPrintProfile = {
    colorMode: get("pdfColorMode") ?? config.pdfPrintProfile.colorMode,
    duplex: get("pdfDuplex") ?? config.pdfPrintProfile.duplex,
    orientation: get("pdfOrientation") ?? config.pdfPrintProfile.orientation,
    paperSize: get("pdfPaperSize") ?? config.pdfPrintProfile.paperSize,
    scaling: get("pdfScaling") ?? config.pdfPrintProfile.scaling,
    scalePercent: Number(get("pdfScalePercent") ?? config.pdfPrintProfile.scalePercent),
    copies: config.copies,
    dpi: Number(get("pdfDpi") ?? config.pdfPrintProfile.dpi),
    quality: get("pdfQuality") ?? config.pdfPrintProfile.quality,
    compatibilityMode: form.elements.pdfCompatibilityMode ? checked("pdfCompatibilityMode") : config.pdfPrintProfile.compatibilityMode
  };

  config.officePrintProfile = {
    excelOrientation: get("officeExcelOrientation") ?? config.officePrintProfile?.excelOrientation ?? "landscape",
    powerPointOrientation: get("officePowerPointOrientation") ?? config.officePrintProfile?.powerPointOrientation ?? "landscape",
    fitToWidth: form.elements.officeFitToWidth ? checked("officeFitToWidth") : true,
    paperSize: get("pdfPaperSize") ?? config.officePrintProfile?.paperSize ?? "A4"
  };

  config.customerMessages = {
    orderPrompt: get("messageOrderPrompt") ?? config.customerMessages.orderPrompt,
    fileAdded: get("messageFileAdded") ?? config.customerMessages.fileAdded,
    queued: get("messageQueued") ?? config.customerMessages.queued,
    printed: get("messagePrinted") ?? config.customerMessages.printed,
    canceled: get("messageCanceled") ?? config.customerMessages.canceled,
    expired: get("messageExpired") ?? config.customerMessages.expired,
    reminder: get("messageReminder") ?? config.customerMessages.reminder,
    failed: get("messageFailed") ?? config.customerMessages.failed,
    promo: get("messagePromo") ?? config.customerMessages.promo
  };

  config.customerMarketing = {
    enabled: form.elements.customerMarketingEnabled ? checked("customerMarketingEnabled") : Boolean(config.customerMarketing?.enabled),
    message: get("customerMarketingMessage") ?? config.customerMarketing?.message ?? "",
    delayMinutes: Number(get("customerMarketingDelay") ?? config.customerMarketing?.delayMinutes ?? 5)
  };

  config.email = {
    enabled: form.elements.emailEnabled ? checked("emailEnabled") : Boolean(config.email?.enabled),
    gmailAddress: get("emailGmailAddress") ?? config.email?.gmailAddress ?? "",
    appPassword: get("emailAppPassword") ?? config.email?.appPassword ?? "",
    managerEmail: get("emailManagerEmail") ?? config.email?.managerEmail ?? "",
    sendWhenWhatsappDisconnected: form.elements.emailWhatsappDisconnected ? checked("emailWhatsappDisconnected") : Boolean(config.email?.sendWhenWhatsappDisconnected)
  };

  config.branding = {
    footerText: get("footerText") ?? config.branding?.footerText ?? "",
    footerUrl: get("footerUrl") ?? config.branding?.footerUrl ?? "",
    footerUrlLabel: get("footerUrlLabel") ?? config.branding?.footerUrlLabel ?? ""
  };
}

function readPrinterProfiles(form) {
  const count = Math.max(1, Number(form.elements.printerProfileCount?.value || 1));
  const profiles = [];
  for (let index = 0; index < count; index++) {
    const prefix = `printerProfile_${index}`;
    const current = {
      ...createUiPrinterProfile(index),
      ...(state.config.printerProfiles?.[index] || {})
    };
    const currentPrintProfile = {
      ...(current.printProfile || state.config.pdfPrintProfile || {})
    };
    const currentOfficeProfile = {
      ...(current.officeProfile || state.config.officePrintProfile || {})
    };
    const has = (name) => Boolean(form.elements[`${prefix}_${name}`]);
    const value = (name, fallback) => (has(name) ? form.elements[`${prefix}_${name}`].value : fallback);
    const checkedValue = (name, fallback) => (has(name) ? Boolean(form.elements[`${prefix}_${name}`].checked) : fallback);
    profiles.push({
      id: value("id", current.id) || `printer-${index + 1}`,
      displayName: value("displayName", current.displayName) || `מדפסת ${index + 1}`,
      printerName: value("printerName", current.printerName) || "",
      role: value("role", current.role) || (index === 0 ? "default" : "special"),
      isPrimary: checkedValue("isPrimary", current.isPrimary),
      askCustomerColor: checkedValue("askCustomerColor", current.askCustomerColor),
      printProfile: {
        colorMode: value("colorMode", currentPrintProfile.colorMode) || "grayscale",
        duplex: value("duplex", currentPrintProfile.duplex) || "simplex",
        orientation: value("orientation", currentPrintProfile.orientation) || "auto",
        paperSize: value("paperSize", currentPrintProfile.paperSize) || "A4",
        scaling: value("scaling", currentPrintProfile.scaling) || "fill-page",
        scalePercent: Number(value("scalePercent", currentPrintProfile.scalePercent) || 90),
        copies: Number(form.elements.copies?.value || state.config.copies || 1),
        dpi: Number(value("dpi", currentPrintProfile.dpi) || 600),
        quality: value("quality", currentPrintProfile.quality) || "high",
        compatibilityMode: checkedValue("compatibilityMode", currentPrintProfile.compatibilityMode !== false)
      },
      officeProfile: {
        excelOrientation: value("excelOrientation", currentOfficeProfile.excelOrientation) || "landscape",
        powerPointOrientation: value("powerPointOrientation", currentOfficeProfile.powerPointOrientation) || "landscape",
        fitToWidth: checkedValue("fitToWidth", currentOfficeProfile.fitToWidth !== false),
        paperSize: value("paperSize", currentOfficeProfile.paperSize) || "A4"
      }
    });
  }

  const primaryIndex = profiles.reduce((selectedIndex, profile, index) => (profile.isPrimary ? index : selectedIndex), -1);
  return profiles.map((profile, index) => ({
    ...profile,
    isPrimary: primaryIndex >= 0 ? index === primaryIndex : index === 0
  }));
}

async function saveConfig(showToast) {
  setLoading(true, "שומר הגדרות...");
  try {
    state.config = await api("/api/config", postJson(state.config));
    if (showToast) notify("success", "ההגדרות נשמרו.");
  } catch (error) {
    notify("error", error.message || "שמירת ההגדרות נכשלה.");
  } finally {
    setLoading(false);
  }
}

function renderContacts() {
  const numbers = state.config.allowedNumbers || [];
  const groups = state.config.allowedGroups || [];
  const senders = uniqueSenders();
  return `
    <section class="two-column fade-in">
      <article class="panel">
        ${sectionTitle("contact", "מספרים מורשים", "הוסף שם, מספר והערות בעתיד")}
        <textarea id="allowedNumbersBox" class="big-textarea">${numbers.join("\n")}</textarea>
        <button id="saveContactsBtn" class="btn btn-primary"><i data-lucide="save"></i><span>שמור מורשים</span></button>
      </article>
      <article class="panel">
        ${sectionTitle("users", "קבוצות מורשות", "שליטה בהדפסה מתוך קבוצות")}
        <textarea id="allowedGroupsBox" class="big-textarea">${groups.join("\n")}</textarea>
        <label class="check-tile">${checkbox("allowGroupsQuick", state.config.allowGroupPrinting)}<span>אפשר הדפסה מקבוצות</span></label>
      </article>
      <article class="panel wide">
        ${sectionTitle("user-plus", "שולחים אחרונים", "סינון מהיר לפי מי שכבר שלח קובץ")}
        <div class="contact-list">${senders.map((sender) => `<div><strong>${escapeHtml(sender.name || "לקוח")}</strong><span>${escapeHtml(sender.phone || "")}</span><button class="btn btn-muted" data-add-phone="${escapeHtml(sender.phone || "")}">אשר</button></div>`).join("") || emptyState("אין שולחים להצגה")}</div>
      </article>
    </section>
  `;
}

function bindContacts() {
  $("#saveContactsBtn").addEventListener("click", async () => {
    state.config.allowedNumbers = lines($("#allowedNumbersBox").value);
    state.config.allowedGroups = lines($("#allowedGroupsBox").value);
    state.config.allowGroupPrinting = $("#allowGroupsQuick").checked;
    await saveConfig(true);
  });
  document.querySelectorAll("[data-add-phone]").forEach((button) => {
    button.addEventListener("click", async () => {
      const phone = button.dataset.addPhone;
      if (phone && !state.config.allowedNumbers.includes(phone)) state.config.allowedNumbers.push(phone);
      await saveConfig(true);
      render();
    });
  });
}

function renderLogs() {
  return `<section class="panel fade-in">${sectionTitle("list-checks", "לוג הדפסות", "עבודות אחרונות")} ${jobsTable(state.jobs)}</section>`;
}

function renderFiles() {
  return `
    <section class="panel fade-in">
      <div class="panel-title"><h3>קבצים שהודפסו</h3><button id="cleanupPrintedBtn" class="btn btn-danger-outline"><i data-lucide="trash-2"></i><span>מחק קבצים שהודפסו</span></button></div>
      ${filesTable(state.printedFiles)}
    </section>
  `;
}

function renderPricing() {
  const pricing = state.config.pricing || {};
  return `
    <form id="pricingForm" class="panel fade-in">
      ${sectionTitle("calculator", "תמחור", "הפעל מחירון וחישוב לפי דפים")}
      <div class="form-grid">
        ${checkField("pricingEnabled", "הפעל תמחור", pricing.enabled)}
        ${numberField("bwFirst", "שחור־לבן דף ראשון", pricing.blackWhiteFirstPage, 0)}
        ${numberField("bwMore", "שחור־לבן כל דף נוסף", pricing.blackWhiteAdditionalPage, 0)}
        ${numberField("colorFirst", "צבעוני דף ראשון", pricing.colorFirstPage, 0)}
        ${numberField("colorMore", "צבעוני כל דף נוסף", pricing.colorAdditionalPage, 0)}
        ${numberField("minimumOrder", "מינימום הזמנה", pricing.minimumOrder, 0)}
        ${numberField("duplexDiscount", "הנחת דו צדדי %", pricing.duplexDiscountPercent, 0, 100)}
      </div>
      <div class="pricing-preview">דוגמה: 10 דפי שחור־לבן = ${pricePreview(10, false)} ₪ | 10 דפי צבע = ${pricePreview(10, true)} ₪</div>
      <button class="btn btn-primary"><i data-lucide="save"></i><span>שמור תמחור</span></button>
    </form>
  `;
}

function bindPricing() {
  $("#pricingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    state.config.pricing = {
      enabled: form.pricingEnabled.checked,
      blackWhiteFirstPage: Number(form.bwFirst.value),
      blackWhiteAdditionalPage: Number(form.bwMore.value),
      colorFirstPage: Number(form.colorFirst.value),
      colorAdditionalPage: Number(form.colorMore.value),
      minimumOrder: Number(form.minimumOrder.value),
      duplexDiscountPercent: Number(form.duplexDiscount.value)
    };
    await saveConfig(true);
    render();
  });
}

function renderLicense() {
  const license = state.license || {};
  const registration = state.registration || {};
  const statusText = license.mode === "licensed"
    ? "רישיון פעיל"
    : license.mode === "trial"
      ? `תקופת ניסיון פעילה - נותרו ${license.trialDaysLeft || 0} ימים`
      : license.mode === "expired"
        ? "תקופת הניסיון הסתיימה"
        : "הרישיון אינו תקין";
  const statusType = license.canRun ? "success" : "error";
  const requestText = buildLicenseRequestText(registration, license);

  return `
    <section class="two-column fade-in">
      <article class="panel">
        ${sectionTitle("key-round", "רישוי מערכת", "רישיון חתום דיגיטלית, Trial וקוד מחשב")}
        <div class="license-status-card ${statusType}">
          <strong>${statusText}</strong>
          <span>${escapeHtml(license.reason || (license.expiresAt ? `בתוקף עד ${formatDate(license.expiresAt)}` : "Trial ל-14 יום מההפעלה הראשונה"))}</span>
        </div>
        <div class="compat-card">
          <div><span>קוד מחשב</span><b>${escapeHtml(license.machineCode || "")}</b></div>
          <div><span>Machine ID</span><b>${escapeHtml(license.machineId || "")}</b></div>
          <div><span>תחילת Trial</span><b>${formatDate(license.trialStartedAt)}</b></div>
          <div><span>סיום Trial</span><b>${formatDate(license.trialEndsAt)}</b></div>
          <div><span>לקוח</span><b>${escapeHtml(license.customerName || "-")}</b></div>
          <div><span>מספר רישיון</span><b>${escapeHtml(license.licenseId || "-")}</b></div>
        </div>
      </article>
      <article class="panel">
        ${sectionTitle("clipboard-list", "רישום לקוח ובחירת מסלול", "מלאו פרטים ושלחו בקשת רישוי ל-MY-PC")}
        <div class="form-grid">
          ${inputField("licenseBusinessName", "שם העסק", registration.businessName || "")}
          ${inputField("licenseContactName", "שם איש קשר", registration.contactName || "")}
          ${inputField("licenseCustomerPhone", "טלפון לקבלת התראות", registration.phone || "", "0522250223")}
          ${inputField("licenseCustomerEmail", "אימייל", registration.email || "", "name@example.com")}
          ${inputField("licenseBusinessAddress", "כתובת העסק", registration.address || "")}
          ${selectField("licensePlan", "מסלול", options([
            ["monthly", "חודשי - 100 ש״ח לפני מע״מ"],
            ["sixMonths", "חצי שנה - 500 ש״ח לפני מע״מ"],
            ["yearly", "שנתי - 1000 ש״ח לפני מע״מ"]
          ], registration.plan || ""))}
        </div>
        <label class="field full"><span>בקשת רישיון</span><textarea id="licenseRequestText" rows="8">${escapeHtml(requestText)}</textarea></label>
        <div class="inline-actions">
          <button id="copyMachineCodeBtn" type="button" class="btn btn-muted"><i data-lucide="copy"></i><span>העתק קוד מחשב</span></button>
          <button id="copyLicenseRequestBtn" type="button" class="btn btn-primary"><i data-lucide="clipboard"></i><span>העתק בקשת רישיון</span></button>
          <button id="sendLicenseWhatsappBtn" type="button" class="btn btn-success"><i data-lucide="message-circle"></i><span>שלח ל-MY-PC ב-WhatsApp</span></button>
        </div>
      </article>
      <article class="panel wide">
        ${sectionTitle("badge-check", "הפעלת רישיון", "הדבק כאן את תוכן license.json שקיבלת מ-MY-PC")}
        <label class="field full"><span>license.json</span><textarea id="licenseInput" rows="10" placeholder='{"payload":...,"signature":"..."}'></textarea></label>
        <div class="inline-actions">
          <button id="activateLicenseBtn" type="button" class="btn btn-success"><i data-lucide="shield-check"></i><span>הפעל רישיון</span></button>
        </div>
      </article>
      <article class="panel wide about-hero">
        <img class="brand-logo about-logo" src="/assets/my-pc-logo-white.png" alt="MY-PC" />
        <h2>המחשב שלי - מחברים אותך לעולם הטכנולוגי</h2>
        <p>שרת הדפסה אוטומטי דרך WhatsApp, פותח ומתוחזק על ידי MY-PC.</p>
        <div class="about-grid">
          <span>גרסת מערכת</span><strong>${escapeHtml(state.status?.version || "1.0.2")}</strong>
          <span>טלפון</span><strong>052-225-0223</strong>
          <span>אימייל</span><a href="mailto:office@my-pc.co.il">office@my-pc.co.il</a>
          <span>אתר</span><a href="https://my-pc.co.il" target="_blank" rel="noreferrer">my-pc.co.il</a>
        </div>
        <p class="legal-note">כל הזכויות שמורות ל-MY-PC. המערכת עושה שימוש בכלים בקוד פתוח, אך האפיון, האינטגרציה, החיבור והאריזה למערכת אחת הם יצירה של MY-PC.</p>
      </article>
    </section>
  `;
}

function bindLicense() {
  const refreshRequestText = () => {
    const license = state.license || {};
    const businessName = document.querySelector("[name='licenseBusinessName']")?.value || "";
    const contactName = document.querySelector("[name='licenseContactName']")?.value || "";
    const phone = document.querySelector("[name='licenseCustomerPhone']")?.value || "";
    const email = document.querySelector("[name='licenseCustomerEmail']")?.value || "";
    const address = document.querySelector("[name='licenseBusinessAddress']")?.value || "";
    const plan = document.querySelector("[name='licensePlan']")?.value || "";
    const registration = { businessName, contactName, phone, email, address, plan };
    state.registration = registration;
    $("#licenseRequestText").value = buildLicenseRequestText(registration, license);
  };

  ["licenseBusinessName", "licenseContactName", "licenseCustomerPhone", "licenseCustomerEmail", "licenseBusinessAddress", "licensePlan"].forEach((name) => {
    document.querySelector(`[name='${name}']`)?.addEventListener("input", refreshRequestText);
    document.querySelector(`[name='${name}']`)?.addEventListener("change", refreshRequestText);
  });

  $("#copyMachineCodeBtn")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(state.license?.machineCode || "");
    notify("success", "קוד המחשב הועתק.");
  });

  $("#copyLicenseRequestBtn")?.addEventListener("click", async () => {
    await saveRegistrationFromLicenseForm();
    await navigator.clipboard.writeText($("#licenseRequestText").value);
    notify("success", "בקשת הרישיון הועתקה.");
  });

  $("#sendLicenseWhatsappBtn")?.addEventListener("click", async () => {
    await saveRegistrationFromLicenseForm();
    window.open(`https://wa.me/972522250223?text=${encodeURIComponent($("#licenseRequestText").value)}`, "_blank", "noopener,noreferrer");
  });

  $("#activateLicenseBtn")?.addEventListener("click", async () => {
    setLoading(true, "מפעיל רישיון...");
    try {
      const licenseText = $("#licenseInput").value.trim();
      state.license = await api("/api/license/activate", postJson({ license: licenseText }));
      await loadAll();
      render();
      notify("success", "הרישיון הופעל בהצלחה.");
    } catch (error) {
      notify("error", error.message || "הפעלת הרישיון נכשלה.");
    } finally {
      setLoading(false);
    }
  });
}

async function saveRegistrationFromLicenseForm() {
  const registration = {
    businessName: document.querySelector("[name='licenseBusinessName']")?.value || "",
    contactName: document.querySelector("[name='licenseContactName']")?.value || "",
    phone: document.querySelector("[name='licenseCustomerPhone']")?.value || "",
    email: document.querySelector("[name='licenseCustomerEmail']")?.value || "",
    address: document.querySelector("[name='licenseBusinessAddress']")?.value || "",
    plan: document.querySelector("[name='licensePlan']")?.value || ""
  };
  state.registration = await api("/api/license/registration", postJson(registration));
  if (state.config) {
    state.config.alertsPhone = state.registration.phone || state.config.alertsPhone;
  }
}

function buildLicenseRequestText(registration, license) {
  return [
    "לקוח חדש במערכת הדפסת WhatsApp מבקש רישוי",
    "",
    `שם העסק: ${registration?.businessName || ""}`,
    `איש קשר: ${registration?.contactName || ""}`,
    `טלפון: ${registration?.phone || ""}`,
    `אימייל: ${registration?.email || ""}`,
    `כתובת העסק: ${registration?.address || ""}`,
    `מסלול מבוקש: ${planLabel(registration?.plan || "")}`,
    "",
    `קוד מחשב: ${license?.machineCode || ""}`,
    `Machine ID: ${license?.machineId || ""}`,
    `מצב רישיון: ${license?.mode || ""}`,
    `ימים שנותרו ב-Trial: ${license?.trialDaysLeft ?? ""}`,
    "",
    "נא להפיק קובץ רישיון חתום למחשב זה."
  ].join("\n");
}

function planLabel(plan) {
  if (plan === "monthly") return "חודשי - 100 ש״ח לפני מע״מ";
  if (plan === "sixMonths") return "חצי שנה - 500 ש״ח לפני מע״מ";
  if (plan === "yearly") return "שנתי - 1000 ש״ח לפני מע״מ";
  return "לא נבחר";
}

function renderDiagnostics() {
  return `
    <section class="two-column fade-in">
      <article class="panel">
        ${sectionTitle("file-terminal", "קבצי לוג", "פלט טכני מלא")}
        <div class="file-list">${state.logFiles.map((file) => `<button data-log="${escapeHtml(file.name)}"><strong>${escapeHtml(file.name)}</strong><span>${formatSize(file.size)} · ${formatDate(file.modifiedAt)}</span></button>`).join("") || emptyState("אין קבצי לוג")}</div>
      </article>
      <article class="panel">
        ${sectionTitle("terminal", "תצוגת לוג", "20KB אחרונים")}
        <pre id="logPreview" class="log-preview">בחר קובץ לוג להצגה</pre>
      </article>
    </section>
  `;
}

function bindDiagnostics() {
  document.querySelectorAll("[data-log]").forEach((button) => {
    button.addEventListener("click", async () => {
      const log = await api(`/api/log-files/${encodeURIComponent(button.dataset.log)}`);
      $("#logPreview").textContent = log.content || "";
    });
  });
}

function renderAdvanced() {
  return `
    <section class="two-column fade-in">
      <article class="panel">
        ${sectionTitle("test-tube-2", "בדיקות Office", "בדיקות עיצוב לפני שימוש")}
        <p>שליחת דף בדיקה למדפסת שנבחרה לפי הגדרות Office.</p>
        <div class="inline-actions">
          <button type="button" class="btn btn-muted" data-office-test="excel"><i data-lucide="sheet"></i><span>בדיקת Excel</span></button>
          <button type="button" class="btn btn-muted" data-office-test="powerpoint"><i data-lucide="presentation"></i><span>בדיקת PowerPoint</span></button>
          <button id="stopPrintingBtn" class="btn btn-danger-outline"><i data-lucide="octagon-x"></i><span>עצור הדפסה מיד</span></button>
          <button data-refresh class="btn btn-muted"><i data-lucide="refresh-cw"></i><span>רענן מערכת</span></button>
        </div>
      </article>
      <article class="panel">
        ${sectionTitle("panel-top", "Windows Service", "הפעלה עם Windows")}
        <p id="startupText">בודק סטטוס...</p>
        <div class="inline-actions">
          <button id="enableStartupBtn" class="btn btn-success"><i data-lucide="panel-top"></i><span>הפעל עם Windows</span></button>
          <button id="disableStartupBtn" class="btn btn-muted"><i data-lucide="ban"></i><span>בטל הפעלה</span></button>
        </div>
      </article>
      <article class="panel wide">
        ${sectionTitle("download-cloud", "עדכוני מערכת", "בדיקת עדכונים והתקנה מתוך GitHub")}
        <p id="updateStatusText">לא בוצעה בדיקת עדכונים.</p>
        <div class="inline-actions">
          <button id="checkUpdatesBtn" type="button" class="btn btn-muted"><i data-lucide="refresh-cw"></i><span>בדוק עדכונים</span></button>
          <button id="runUpdateBtn" type="button" class="btn btn-primary"><i data-lucide="download-cloud"></i><span>התקן עדכון עכשיו</span></button>
        </div>
      </article>
    </section>
  `;
}

function bindAdvanced() {
  $("#stopPrintingBtn")?.addEventListener("click", stopPrinting);
  document.querySelectorAll("[data-office-test]").forEach((button) => {
    button.addEventListener("click", () => runOfficeTest(button.dataset.officeTest));
  });
  $("#enableStartupBtn")?.addEventListener("click", async () => action("מפעיל עלייה עם Windows...", "/api/startup/enable", "הפעלה אוטומטית הופעלה."));
  $("#disableStartupBtn")?.addEventListener("click", async () => action("מבטל עלייה עם Windows...", "/api/startup/disable", "הפעלה אוטומטית בוטלה."));
  $("#checkUpdatesBtn")?.addEventListener("click", checkUpdates);
  $("#runUpdateBtn")?.addEventListener("click", runUpdate);
  api("/api/startup").then((result) => {
    $("#startupText").textContent = result.enabled ? "המערכת תעלה אוטומטית עם Windows" : "הפעלה אוטומטית כבויה";
  }).catch(() => {});
}

async function checkUpdates() {
  setLoading(true, "בודק עדכונים...");
  try {
    const result = await api("/api/updates/check");
    $("#updateStatusText").textContent = `${result.message} גרסה נוכחית: ${result.current}. גרסה ב-GitHub: ${result.latest}.`;
    notify(result.available ? "warning" : "success", result.message);
  } catch (error) {
    notify("error", error.message || "בדיקת העדכונים נכשלה.");
  } finally {
    setLoading(false);
  }
}

async function runUpdate() {
  setLoading(true, "מתקין עדכון... המערכת תתרענן אוטומטית בעוד כשתי דקות. עדכונים נוספים בדרך.");
  try {
    const result = await api("/api/updates/run", { method: "POST" });
    notify("success", result.message || "העדכון הסתיים.");
    $("#updateStatusText").textContent = result.message || "העדכון הסתיים.";
    setTimeout(() => window.location.reload(), 120000);
  } catch (error) {
    notify("error", error.message || "העדכון נכשל.");
    setLoading(false);
  } finally {
    // Keep the loader visible while the updater replaces files and restarts the server.
  }
}

function renderAbout() {
  return `
    <section class="about-layout fade-in">
      <article class="panel about-hero">
        <img class="brand-logo about-logo" src="/assets/my-pc-logo-white.png" alt="MY-PC" />
        <h2>MY-PC WhatsApp Print Server</h2>
        <p>מערכת ניהול הדפסות אוטומטית שפותחה ומתוחזקת על ידי MY-PC - מחברים אותך לעולם הטכנולוגי.</p>
        <div class="about-grid">
          <span>גרסת מערכת</span><strong>${escapeHtml(state.status?.version || "1.0.1")} / Licensed Release</strong>
          <span>אתר</span><a href="https://my-pc.co.il" target="_blank" rel="noreferrer">my-pc.co.il</a>
          <span>WhatsApp</span><strong>052-225-0223</strong>
          <span>מפתח</span><strong>מחלקת פיתוח MY-PC</strong>
        </div>
      </article>
    </section>
  `;
}

function renderDocumentation() {
  return `
    <section class="panel fade-in docs-page">
      ${sectionTitle("book-open-check", "תיעוד מערכת", "איך עובדים עם MY-PC WhatsApp Print Server")}
      <div class="docs-grid">
        <article>
          <h3>1. חיבור WhatsApp</h3>
          <p>לחץ על “חבר WhatsApp”, סרוק QR מתוך WhatsApp בטלפון, והמתן לסטטוס מחובר.</p>
        </article>
        <article>
          <h3>2. בחירת מדפסת</h3>
          <p>בהגדרות בוחרים את מדפסת Windows הפעילה. ב-Trial ניתן לבחור מדפסת אחת בלבד ובשחור לבן.</p>
        </article>
        <article>
          <h3>3. קבלת קבצים</h3>
          <p>לקוח שולח קובץ, המערכת שומרת אותו, שואלת אם סיים לשלוח קבצים, ומכניסה לתור רק אחרי אישור.</p>
        </article>
        <article>
          <h3>4. ביטול הדפסה</h3>
          <p>לקוח יכול לכתוב “ביטול הדפסה”. מתוך הממשק ניתן ללחוץ “עצור הדפסה מיד” כדי לבטל עבודות בתור Windows.</p>
        </article>
        <article>
          <h3>5. רישוי</h3>
          <p>ה-Trial נמשך 14 יום. לאחר מכן WhatsApp מתנתק ולא ניתן להדפיס או לחבר WhatsApp עד הכנסת רישיון תקף.</p>
        </article>
        <article>
          <h3>6. עדכונים</h3>
          <p>כאשר מופיע עדכון חדש בדשבורד, לחץ “עדכן עכשיו”. המערכת תוריד מ-GitHub, תבנה ותיטען מחדש.</p>
        </article>
      </div>
    </section>
  `;
}

async function stopPrinting() {
  setLoading(true, "עוצר עבודות בתור...");
  try {
    const result = await api("/api/printing/stop", { method: "POST" });
    notify("success", `נעצרו ${result.stopped || 0} עבודות.`);
  } catch (error) {
    notify("error", error.message || "עצירת ההדפסה נכשלה.");
  } finally {
    setLoading(false);
  }
}

async function runOfficeTest(type) {
  const normalized = type === "powerpoint" ? "powerpoint" : "excel";
  setLoading(true, normalized === "excel" ? "שולח בדיקת Excel..." : "שולח בדיקת PowerPoint...");
  try {
    const result = await api(`/api/office-test/${normalized}`, { method: "POST" });
    notify("success", result.message || "בדיקת Office נשלחה למדפסת.");
  } catch (error) {
    notify("error", error.message || "בדיקת Office נכשלה.");
  } finally {
    setLoading(false);
  }
}

function getStats() {
  const total = state.jobs.length;
  const printed = state.jobs.filter((job) => job.status === "printed").length;
  const failed = state.jobs.filter((job) => ["failed", "rejected"].includes(job.status)).length;
  const waiting = Math.max(0, total - printed - failed);
  return { total, printed, failed, waiting, successRate: total ? Math.round((printed / total) * 100) : 0 };
}

function jobsTable(jobs) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>סטטוס</th><th>קובץ</th><th>שולח</th><th>סוג</th><th>גודל</th><th>מדפסת</th><th>זמן</th></tr></thead>
        <tbody>${jobs.map((job) => `
          <tr>
            <td>${jobStatus(job.status)}</td>
            <td title="${escapeHtml(job.failure_reason || "")}">${escapeHtml(job.file_name || "")}</td>
            <td><strong>${escapeHtml(job.sender_name || "")}</strong><small>${escapeHtml(job.sender_phone || "")}</small></td>
            <td>${escapeHtml(job.file_type || "")}</td>
            <td>${formatSize(job.size_bytes)}</td>
            <td>${escapeHtml(job.printer_name || "")}</td>
            <td>${formatDate(job.created_at)}</td>
          </tr>`).join("") || `<tr><td colspan="7">${emptyState("אין עבודות להצגה")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function jobStatus(status) {
  const normalized = status === "printed" ? "printed" : ["failed", "rejected"].includes(status) ? "failed" : "waiting";
  const text = normalized === "printed" ? "הודפס" : normalized === "failed" ? "נכשל" : "ממתין";
  return `<span class="job-status ${normalized}">${text}</span>`;
}

function filesTable(files) {
  return `<div class="table-wrap"><table><thead><tr><th>שם קובץ</th><th>גודל</th><th>עודכן</th></tr></thead><tbody>${files.map((file) => `<tr><td>${escapeHtml(file.name)}</td><td>${formatSize(file.size)}</td><td>${formatDate(file.modifiedAt)}</td></tr>`).join("") || `<tr><td colspan="3">${emptyState("אין קבצים")}</td></tr>`}</tbody></table></div>`;
}

function printerCompatibilityCard() {
  const detail = state.printers.find((item) => item.name === state.config.printerName);
  return `
    <div class="compat-card">
      <strong>תאימות מדפסת</strong>
      <div><span>יצרן</span><b>${escapeHtml(detail?.manufacturer || "לא ידוע")}</b></div>
      <div><span>סטטוס</span><b>${detail ? (detail.available ? "זמינה" : "לא זמינה") : "לא נבחרה"}</b></div>
      <div><span>חיבור</span><b>${escapeHtml(detail?.connectionType || "-")}</b></div>
      <div><span>צבעוני</span><b>${capability(detail?.capabilities?.color)}</b></div>
      <div><span>דו צדדי</span><b>${capability(detail?.capabilities?.duplex)}</b></div>
      <p>${escapeHtml(detail?.compatibilityNote || "בחר מדפסת ובדוק תאימות.")}</p>
    </div>
  `;
}

function capability(value) {
  if (value === "yes") return "כן";
  if (value === "no") return "לא";
  return "לא ידוע";
}

function printerOptions(selected, allowEmpty = false) {
  const rows = allowEmpty ? [["", "לא מוגדר"]] : [];
  return options([...rows, ...state.printers.map((printer) => [printer.name, printer.name])], selected);
}

function options(items, selected) {
  return items.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function sectionTitle(icon, title, subtitle) {
  return `<div class="section-title"><i data-lucide="${icon}"></i><div><h3>${title}</h3><p>${subtitle}</p></div></div>`;
}

function inputField(name, label, value = "", placeholder = "", type = "text") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" /></label>`;
}

function numberField(name, label, value = 0, min = 0, max = "") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="number" min="${min}" ${max !== "" ? `max="${max}"` : ""} value="${escapeAttr(value)}" /></label>`;
}

function selectField(name, label, optionsHtml) {
  return `<label class="field"><span>${label}</span><select name="${name}">${optionsHtml}</select></label>`;
}

function textareaField(name, label, value = "") {
  return `<label class="field full"><span>${label}</span><textarea name="${name}" rows="4">${escapeHtml(value)}</textarea></label>`;
}

function checkField(name, label, checked) {
  return `<label class="check-tile">${checkbox(name, checked)}<span>${label}</span></label>`;
}

function checkbox(name, checked) {
  return `<input id="${name}" name="${name}" type="checkbox" ${checked ? "checked" : ""} />`;
}

function statusPill(type, text) {
  return `<span class="status-pill ${type}">${text}</span>`;
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function uniqueSenders() {
  const map = new Map();
  for (const job of state.jobs) {
    if (job.sender_phone && !map.has(job.sender_phone)) {
      map.set(job.sender_phone, { phone: job.sender_phone, name: job.sender_name });
    }
  }
  return [...map.values()];
}

function lines(value) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function pricePreview(pages, color) {
  const pricing = state.config.pricing || {};
  const first = color ? pricing.colorFirstPage : pricing.blackWhiteFirstPage;
  const more = color ? pricing.colorAdditionalPage : pricing.blackWhiteAdditionalPage;
  return Math.max(pricing.minimumOrder || 0, (first || 0) + Math.max(0, pages - 1) * (more || 0)).toFixed(2);
}

function formatSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("he-IL");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

init();
