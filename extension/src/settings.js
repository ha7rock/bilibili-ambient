(() => {
  "use strict";

  const STORAGE_KEY = "biliAmbientSettings";
  const DEFAULTS = Object.freeze({
    enabled: true,
    cards: true,
    player: true,
    playerFit: "edge",
    scope: "page",
    intensity: 65,
    blur: 56,
    spread: 75,
    animateVideo: true,
  });

  function numberInRange(value, fallback, min, max) {
    return typeof value === "number" && Number.isFinite(value)
      ? Math.round(Math.min(max, Math.max(min, value)))
      : fallback;
  }

  function normalize(value) {
    const input = value && typeof value === "object" ? value : {};
    const bool = (key) => typeof input[key] === "boolean" ? input[key] : DEFAULTS[key];
    return {
      enabled: bool("enabled"),
      cards: bool("cards"),
      player: bool("player"),
      playerFit: input.playerFit === "content" ? "content" : "edge",
      scope: input.scope === "post" ? "post" : "page",
      intensity: numberInRange(input.intensity, DEFAULTS.intensity, 0, 100),
      blur: numberInRange(input.blur, DEFAULTS.blur, 24, 160),
      spread: numberInRange(input.spread, DEFAULTS.spread, 20, 100),
      animateVideo: bool("animateVideo"),
    };
  }

  const api = Object.freeze({ STORAGE_KEY, DEFAULTS, normalize });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.BiliAmbientSettings = api;
})();
