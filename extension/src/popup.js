(() => {
  "use strict";
  const { STORAGE_KEY, DEFAULTS, normalize } = globalThis.BiliAmbientSettings;
  const ids = ["enabled", "intensity", "blur", "spread", "scope", "cards", "player", "playerFit", "animateVideo"];
  const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const status = document.getElementById("status");
  let settings = { ...DEFAULTS };
  let writes = Promise.resolve();

  function render() {
    for (const [id, input] of Object.entries(elements)) {
      if (input.type === "checkbox") input.checked = settings[id];
      else input.value = settings[id];
    }
    for (const id of ["intensity", "blur", "spread"]) {
      document.getElementById(`${id}-value`).value = `${settings[id]}${id === "blur" ? "px" : "%"}`;
    }
    const on = settings.enabled && settings.intensity > 0 && (settings.cards || settings.player);
    document.body.dataset.enabled = String(on);
    elements.playerFit.disabled = !settings.player;
    status.textContent = !on ? "氛围光已关闭。"
      : settings.cards && settings.player ? "悬停卡片或打开播放页即可看到光。"
      : settings.cards ? "悬停视频卡片即可看到光。"
      : "打开播放页即可看到光。";
  }

  function save() {
    const next = { ...settings };
    writes = writes.then(() => chrome.storage.local.set({ [STORAGE_KEY]: next })).catch(() => {
      status.textContent = "保存失败，请重新打开扩展。";
    });
  }

  for (const [id, input] of Object.entries(elements)) {
    input.addEventListener(input.type === "range" ? "input" : "change", () => {
      settings = normalize({ ...settings, [id]: input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value });
      render();
      save();
    });
  }
  document.getElementById("reset").addEventListener("click", () => {
    settings = { ...DEFAULTS };
    render();
    save();
  });

  document.getElementById("open-panel").addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: "bili-ambient:toggle-panel" });
      window.close();
    } catch {
      status.textContent = "请在 B 站页面使用（装好后需刷新页面）。";
    }
  });

  // Show the shortcut the user actually configured (it may differ from the suggested one).
  chrome.commands?.getAll().then((commands) => {
    const shortcut = commands.find((command) => command.name === "toggle-panel")?.shortcut;
    const kbd = document.getElementById("shortcut");
    if (shortcut) kbd.textContent = shortcut;
    else kbd.remove();
  }).catch(() => {});

  chrome.storage.local.get(STORAGE_KEY).then((result) => {
    settings = normalize(result[STORAGE_KEY]);
    render();
    document.getElementById("controls").disabled = false;
    elements.enabled.disabled = false;
    document.getElementById("reset").disabled = false;
  }).catch(() => {
    status.textContent = "读取设置失败，请重新打开扩展。";
  });
})();
