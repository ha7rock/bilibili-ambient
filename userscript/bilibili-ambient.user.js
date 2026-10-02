// ==UserScript==
// @name         Bilibili Ambient 氛围光
// @namespace    https://github.com/mmnga/x-ambient
// @version      0.1.1
// @description  悬停视频卡片时，让封面/预览的颜色柔和地照亮整个页面；播放页的播放器也会像 YouTube 氛围模式一样向四周发光。移植自 X Ambient。
// @author       adapted from mmnga/x-ambient (MIT)
// @license      MIT
// @match        https://www.bilibili.com/*
// @match        https://search.bilibili.com/*
// @match        https://t.bilibili.com/*
// @match        https://space.bilibili.com/*
// @match        https://live.bilibili.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*
 * Rendering approach (ray projection, media mask, display-only canvases) is
 * adapted from X Ambient — https://github.com/mmnga/x-ambient
 * MIT License, Copyright (c) 2026 mmnga
 */

(() => {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Settings                                                           */
  /* ------------------------------------------------------------------ */

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

  const hasGM = typeof GM_getValue === "function" && typeof GM_setValue === "function";
  const store = {
    load() {
      try {
        return hasGM ? GM_getValue(STORAGE_KEY) : JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      } catch {
        return null;
      }
    },
    save(value) {
      try {
        if (hasGM) GM_setValue(STORAGE_KEY, value);
        else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {}
    },
    watch(callback) {
      if (typeof GM_addValueChangeListener !== "function") return;
      GM_addValueChangeListener(STORAGE_KEY, (_key, _old, value, remote) => {
        if (remote) callback(value);
      });
    },
  };

  /* ------------------------------------------------------------------ */
  /* Geometry core (from X Ambient's ambient-core.js)                   */
  /* ------------------------------------------------------------------ */

  const Core = (() => {
    function unionRects(rects) {
      if (!rects.length) return null;
      const left = Math.min(...rects.map((rect) => rect.left));
      const top = Math.min(...rects.map((rect) => rect.top));
      const right = Math.max(...rects.map((rect) => rect.right));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    }

    function isVisibleRect(rect, viewport, minSize = 48, minIntersection = 16) {
      return rect.width >= minSize && rect.height >= minSize
        && Math.min(rect.right, viewport.width) - Math.max(rect.left, 0) >= minIntersection
        && Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0) >= minIntersection;
    }

    function overlapFraction(rect, covering) {
      const width = Math.max(0, Math.min(rect.right, covering.right) - Math.max(rect.left, covering.left));
      const height = Math.max(0, Math.min(rect.bottom, covering.bottom) - Math.max(rect.top, covering.top));
      return rect.width * rect.height > 0 ? width * height / (rect.width * rect.height) : 0;
    }

    function intersectRect(rect, clip, clipX = true, clipY = true) {
      const left = clipX ? Math.max(rect.left, clip.left) : rect.left;
      const right = clipX ? Math.min(rect.right, clip.right) : rect.right;
      const top = clipY ? Math.max(rect.top, clip.top) : rect.top;
      const bottom = clipY ? Math.min(rect.bottom, clip.bottom) : rect.bottom;
      if (right <= left || bottom <= top) return null;
      return { left, right, top, bottom, width: right - left, height: bottom - top };
    }

    // Map the source's visible crop to its position in a small media mosaic.
    function fitImage(sourceWidth, sourceHeight, target, fit = "cover", position = [0.5, 0.5]) {
      if (sourceWidth <= 0 || sourceHeight <= 0 || target.width <= 0 || target.height <= 0) return null;
      const scale = fit === "contain"
        ? Math.min(target.width / sourceWidth, target.height / sourceHeight)
        : Math.max(target.width / sourceWidth, target.height / sourceHeight);
      if (fit === "fill") {
        return { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight, dx: target.left, dy: target.top, dw: target.width, dh: target.height };
      }
      if (fit === "contain") {
        const dw = sourceWidth * scale;
        const dh = sourceHeight * scale;
        return { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight, dx: target.left + (target.width - dw) * position[0], dy: target.top + (target.height - dh) * position[1], dw, dh };
      }
      const sw = Math.min(sourceWidth, target.width / scale);
      const sh = Math.min(sourceHeight, target.height / scale);
      return { sx: (sourceWidth - sw) * position[0], sy: (sourceHeight - sh) * position[1], sw, sh, dx: target.left, dy: target.top, dw: target.width, dh: target.height };
    }

    function axisMask(start, end, size, direction, feather = 32) {
      const a = Math.max(0, Math.min(size, start));
      const b = Math.max(a, Math.min(size, end));
      const f = Math.min(feather, (b - a) / 3);
      return `linear-gradient(to ${direction}, #000 ${Math.max(0, a - f)}px, transparent ${a}px, transparent ${b}px, #000 ${Math.min(size, b + f)}px)`;
    }

    function contentRect(sourceWidth, sourceHeight, rect, fit, position = [.5, .5]) {
      if (fit !== "contain" && fit !== "scale-down") return rect;
      const crop = fitImage(sourceWidth, sourceHeight, rect, "contain", position);
      if (!crop) return rect;
      const scale = fit === "scale-down" ? Math.min(1, crop.dw / sourceWidth) : crop.dw / sourceWidth;
      const width = sourceWidth * scale;
      const height = sourceHeight * scale;
      const left = rect.left + (rect.width - width) * position[0];
      const top = rect.top + (rect.height - height) * position[1];
      return { left, top, width, height, right: left + width, bottom: top + height };
    }

    function buildPostMask(rect, viewport) {
      const horizontal = axisMask(rect.left, rect.right, viewport.width, "right");
      return `${horizontal}, ${axisMask(rect.top, rect.bottom, viewport.height, "bottom", 24)}`;
    }

    function buildMediaMask(rects, viewport) {
      // This SVG describes only DOM rectangles; it contains no image or video pixels.
      const number = (value) => Math.round(value * 2) / 2;
      const holes = rects.map((rect) => {
        const [x, y, w, h] = [rect.left, rect.top, rect.width, rect.height].map(number);
        const cap = Math.min(w, h) / 2;
        // Per-corner radii (top-left, top-right, bottom-right, bottom-left), so rounded media leave no square corners.
        const [tl, tr, br, bl] = (rect.radii || Array(4).fill(rect.radius || 0)).map((r) => number(Math.min(cap, Math.max(0, r))));
        return `<path d="M${x + tl} ${y}H${x + w - tr}A${tr} ${tr} 0 0 1 ${x + w} ${y + tr}V${y + h - br}A${br} ${br} 0 0 1 ${x + w - br} ${y + h}H${x + bl}A${bl} ${bl} 0 0 1 ${x} ${y + h - bl}V${y + tl}A${tl} ${tl} 0 0 1 ${x + tl} ${y}Z" fill="black"/>`;
      }).join("");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="0 0 ${viewport.width} ${viewport.height}"><defs><mask id="media" maskUnits="userSpaceOnUse" x="0" y="0" width="${viewport.width}" height="${viewport.height}"><rect width="100%" height="100%" fill="white"/>${holes}</mask></defs><rect width="100%" height="100%" fill="white" mask="url(#media)"/></svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    }

    function buildRayProjection(source, target, frame, reach) {
      if (source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0 || reach <= 0) return [];
      const cx = target.left + target.width / 2;
      const cy = target.top + target.height / 2;
      const halfWidth = target.width / 2;
      const halfHeight = target.height / 2;
      const outerScale = Math.max(1, cx / halfWidth, (frame.width - cx) / halfWidth, cy / halfHeight, (frame.height - cy) / halfHeight);
      const steps = Math.max(24, Math.min(96, Math.ceil(Math.max(frame.width, frame.height) / 3)));
      const edgeX = Math.max(1, Math.round(source.width * .04));
      const edgeY = Math.max(1, Math.round(source.height * .04));
      const strips = [];
      // Concentric edge strips fan out from the media's own center. drawImage works
      // with cross-origin sources without reading pixels or uploading a WebGL texture.
      for (let i = 0; i < steps; i++) {
        const inner = 1 + (outerScale - 1) * i / steps;
        const outer = 1 + (outerScale - 1) * (i + 1) / steps;
        const left = cx - halfWidth * outer;
        const top = cy - halfHeight * outer;
        const dx = halfWidth * (outer - inner) + .6;
        const dy = halfHeight * (outer - inner) + .6;
        const alphaX = Math.exp(-halfWidth * (inner - 1) / reach);
        const alphaY = Math.exp(-halfHeight * (inner - 1) / reach);
        strips.push(
          { sx: 0, sy: 0, sw: source.width, sh: edgeY, dx: left, dy: top, dw: target.width * outer, dh: dy, alpha: alphaY },
          { sx: 0, sy: source.height - edgeY, sw: source.width, sh: edgeY, dx: left, dy: cy + halfHeight * inner - .3, dw: target.width * outer, dh: dy, alpha: alphaY },
          { sx: 0, sy: 0, sw: edgeX, sh: source.height, dx: left, dy: cy - halfHeight * inner, dw: dx, dh: target.height * inner + .6, alpha: alphaX },
          { sx: source.width - edgeX, sy: 0, sw: edgeX, sh: source.height, dx: cx + halfWidth * inner - .3, dy: cy - halfHeight * inner, dw: dx, dh: target.height * inner + .6, alpha: alphaX },
        );
      }
      return strips;
    }

    function isDarkColor(color, fallback = true) {
      const match = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/);
      if (!match || (match[4] !== undefined && Number(match[4]) < 0.1)) return fallback;
      return 0.2126 * Number(match[1]) + 0.7152 * Number(match[2]) + 0.0722 * Number(match[3]) < 128;
    }

    return { unionRects, isVisibleRect, overlapFraction, intersectRect, fitImage, contentRect, buildPostMask, buildMediaMask, buildRayProjection, isDarkColor };
  })();

  /* ------------------------------------------------------------------ */
  /* Bilibili page structure                                            */
  /* ------------------------------------------------------------------ */

  // Cards whose cover / inline preview lights the page on hover.
  const CARD_SELECTOR = [
    ".bili-video-card", // 首页推荐、搜索、分区
    ".floor-single-card",
    ".bili-live-card",
    ".video-page-card-small", // 播放页右侧推荐
    ".video-page-game-card-small",
    ".video-page-operator-card-small",
    ".bili-dyn-item", // 动态
    ".bili-album", ".bili-dyn-card-video",
    ".small-item", ".video-card", ".rank-item", // 旧版空间 / 排行榜
    ".upload-video-card", ".bili-cover-card",
    ".pgc-card", ".bangumi-card", ".media-card",
    ".room-card-wrapper", ".index_item", // 直播
  ].join(",");
  const PLAYER_VIDEO_SELECTOR = [
    ".bpx-player-video-wrap video",
    ".bpx-player-video-wrap bwp-video",
    "#bilibili-player video",
    "#live-player video",
    ".live-player-mounter video",
  ].join(",");
  const PLAYER_AREA_SELECTOR = ".bpx-player-video-area, #live-player, .live-player-mounter";
  const AVATAR_SELECTOR = '[class*="avatar"], [class*="Avatar"], [class*="face"], .bili-dyn-item__avatar, .up-avatar';
  const INLINE_PREVIEW_SELECTOR = ".v-inline-player";
  const MIN_PROTECTED = 56;   // px: smaller images are UI (avatars, icons), not media worth a hole in the light
  const HUG = 4;              // px tolerance when matching a clipping ancestor to its media

  /* ------------------------------------------------------------------ */
  /* Renderer                                                           */
  /* ------------------------------------------------------------------ */

  globalThis.__biliAmbientDispose?.();

  const FRAME_INTERVAL = 1000 / 12;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const colorScheme = matchMedia("(prefers-color-scheme: dark)");
  const removers = [];
  let settings = normalize(store.load());
  let pointer = null;
  let activeRoot = null;
  let activeKind = "";
  let pendingRoot = null;
  let hoverTimer = 0;
  let reconcileFrame = 0;
  let lazyTimer = 0;
  let frameHandle = null;
  let lastPaint = 0;
  let media = [];
  let signature = "";
  let bounds = null;
  let projection = null;
  let protectionKey = "";
  let front = 0;
  let disposed = false;

  const host = document.createElement("div");
  host.id = "bili-ambient-light";
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483600;pointer-events:none;display:block;overflow:hidden;contain:strict;";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { --ba-opacity: .65; --ba-blur: 56px; }
    .light { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity 320ms ease; mask-repeat:no-repeat; mask-composite:add; -webkit-mask-composite:source-over; }
    .light.visible { opacity:var(--ba-opacity); }
    .field { position:absolute; inset:0; pointer-events:none; }
    canvas { position:absolute; inset:0; width:100%; height:100%; opacity:0; transition:opacity 300ms ease; filter:blur(var(--ba-blur)) saturate(1.65); }
    canvas.front { opacity:1; }
    @media (prefers-reduced-motion:reduce) { .light, canvas { transition:none; } }
  `;
  const light = document.createElement("div");
  light.className = "light";
  const field = document.createElement("div");
  field.className = "field";
  const canvases = [document.createElement("canvas"), document.createElement("canvas")];
  for (const canvas of canvases) {
    canvas.width = 144;
    canvas.height = 96;
    field.append(canvas);
  }
  light.append(field);
  shadow.append(style, light);
  document.documentElement.append(host);
  const contexts = canvases.map((canvas) => canvas.getContext("2d"));
  const mosaic = document.createElement("canvas");
  mosaic.width = 144;
  const mosaicContext = mosaic.getContext("2d");
  if (!mosaicContext || contexts.some((context) => !context)) {
    host.remove();
    return;
  }

  function listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    removers.push(() => target.removeEventListener(type, callback, options));
  }

  function viewport() {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  function eligible() {
    return settings.enabled && settings.intensity > 0 && (settings.cards || settings.player)
      && !document.hidden && !document.fullscreenElement;
  }

  function scheduleReconcile() {
    if (disposed || reconcileFrame) return;
    reconcileFrame = requestAnimationFrame(() => {
      reconcileFrame = 0;
      reconcile();
    });
  }

  // For noisy page-wide signals (lazy images, live chat): coalesce to ~5 Hz.
  function scheduleReconcileLazy() {
    if (disposed || lazyTimer) return;
    lazyTimer = window.setTimeout(() => {
      lazyTimer = 0;
      scheduleReconcile();
    }, 200);
  }

  function updateTheme() {
    let dark = colorScheme.matches;
    for (const element of [document.documentElement, document.body]) {
      if (element) dark = Core.isDarkColor(getComputedStyle(element).backgroundColor, dark);
    }
    host.style.mixBlendMode = dark ? "screen" : "multiply";
  }

  function applySettings(value) {
    settings = normalize(value);
    host.style.setProperty("--ba-opacity", String(settings.intensity / 100));
    host.style.setProperty("--ba-blur", `${settings.blur}px`);
    panel?.sync();
    protectionKey = "";
    if (!eligible()) deactivate();
    else scheduleReconcile();
  }

  function saveSettings(patch) {
    const next = normalize({ ...settings, ...patch });
    store.save(next);
    applySettings(next);
  }

  function stopFrames() {
    if (!frameHandle) return;
    if (frameHandle.type === "video") frameHandle.video.cancelVideoFrameCallback(frameHandle.id);
    else cancelAnimationFrame(frameHandle.id);
    frameHandle = null;
  }

  function cancelPending() {
    clearTimeout(hoverTimer);
    hoverTimer = 0;
    pendingRoot = null;
  }

  function deactivate() {
    cancelPending();
    activeRoot = null;
    activeKind = "";
    media = [];
    signature = "";
    bounds = null;
    projection = null;
    activeObserver.disconnect();
    stopFrames();
    light.classList.remove("visible");
  }

  function visibleRect(element, fullRect, minSize = 48, minIntersection = 16) {
    const view = viewport();
    if (!Core.isVisibleRect(fullRect, view, minSize, minIntersection)) return null;
    const computed = getComputedStyle(element);
    if (computed.visibility === "hidden" || computed.visibility === "collapse" || computed.opacity === "0") return null;
    let rect = Core.intersectRect(fullRect, { left: 0, top: 0, right: view.width, bottom: view.height });
    for (let parent = element.parentElement; rect && parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.opacity === "0" || style.display === "none") return null;
      const clipX = ["hidden", "clip", "auto", "scroll"].includes(style.overflowX);
      const clipY = ["hidden", "clip", "auto", "scroll"].includes(style.overflowY);
      if (clipX || clipY) rect = Core.intersectRect(rect, parent.getBoundingClientRect(), clipX, clipY);
      if (parent === activeRoot) break;
    }
    return rect && rect.width >= minIntersection && rect.height >= minIntersection ? rect : null;
  }

  function sourceSize(source) {
    return {
      width: source.videoWidth || source.naturalWidth || (source.tagName === "CANVAS" ? source.width : 0),
      height: source.videoHeight || source.naturalHeight || (source.tagName === "CANVAS" ? source.height : 0),
    };
  }

  function imageDescriptor(source, owner, rect, fullRect) {
    const computed = getComputedStyle(owner);
    const backgroundImage = owner !== source && owner.tagName !== "VIDEO";
    const values = (backgroundImage ? computed.backgroundPosition : computed.objectPosition).split(" ");
    const position = values.map((value) => value.endsWith("%") ? Math.max(0, Math.min(1, parseFloat(value) / 100)) : 0.5);
    const fit = backgroundImage ? (computed.backgroundSize === "contain" ? "contain" : "cover") : computed.objectFit;
    const normalizedPosition = [position[0] ?? 0.5, position[1] ?? 0.5];
    const size = sourceSize(source);
    const content = Core.contentRect(size.width, size.height, fullRect, fit, normalizedPosition);
    const visible = Core.intersectRect(rect, content);
    if (!visible) return null;
    return { source, owner, rect: visible, fullRect: content, fit: fit === "contain" || fit === "scale-down" ? "fill" : fit, position: normalizedPosition };
  }

  // Bilibili's <bwp-video> (WASM decoder) is not drawable itself; use its inner video/canvas.
  function drawableVideo(element) {
    if (!element) return null;
    if (element.tagName === "VIDEO") return element;
    return element.shadowRoot?.querySelector("video, canvas") || element.querySelector("video, canvas") || null;
  }

  function videoReady(source) {
    if (!source) return false;
    if (source.tagName === "CANVAS") return source.width > 0 && source.height > 0;
    return source.readyState >= 2 && source.videoWidth > 0;
  }

  function findPlayer() {
    const view = viewport();
    let best = null;
    for (const element of document.querySelectorAll(PLAYER_VIDEO_SELECTOR)) {
      if (isInlinePreview(element)) continue;
      const area = element.closest(PLAYER_AREA_SELECTOR) || element;
      const container = element.closest(".bpx-player-container");
      const screen = container?.dataset.screen;
      // Skip web-fullscreen / fullscreen / the floating mini player.
      if (screen === "web" || screen === "full" || screen === "mini") continue;
      const rect = area.getBoundingClientRect();
      if (rect.width >= view.width * .96 && rect.height >= view.height * .96) continue;
      if (!Core.isVisibleRect(rect, view, 160, 48)) continue;
      const score = rect.width * rect.height;
      if (!best || score > best.score) best = { area, element, score };
    }
    return best?.area || null;
  }

  function findPlayerMedia(area) {
    const source = drawableVideo(area.querySelector(PLAYER_VIDEO_SELECTOR) || (area.matches("video") ? area : null));
    if (!videoReady(source)) return [];
    if (settings.playerFit === "content") {
      // X Ambient's behaviour: light starts at the picture itself, so portrait videos glow into the letterbox.
      const fullRect = source.getBoundingClientRect();
      const rect = visibleRect(source, fullRect);
      const descriptor = rect && imageDescriptor(source, source, rect, fullRect);
      return descriptor ? [descriptor] : [];
    }
    const fullRect = area.getBoundingClientRect();
    const rect = visibleRect(area, fullRect, 48, 16);
    if (!rect) return [];
    // Stretch the frame over the whole player so the glow starts at the player's edges,
    // not inside the letterbox of portrait / ultrawide videos.
    return [{ source, owner: area, rect, fullRect, fit: "fill", position: [.5, .5], player: true }];
  }

  function findCardMedia(card) {
    const videos = [];
    for (const video of card.querySelectorAll("video")) {
      const fullRect = video.getBoundingClientRect();
      const rect = visibleRect(video, fullRect);
      if (!rect || !videoReady(video)) continue;
      const descriptor = imageDescriptor(video, video, rect, fullRect);
      if (descriptor) videos.push(descriptor);
    }
    const images = [];
    for (const image of card.querySelectorAll("img")) {
      if (image.closest(AVATAR_SELECTOR) || !image.complete || !image.naturalWidth) continue;
      const fullRect = image.getBoundingClientRect();
      const rect = visibleRect(image, fullRect, 64, 24);
      if (!rect || videos.some((video) => Core.overlapFraction(rect, video.rect) > 0.8)) continue;
      if (images.some((other) => Core.overlapFraction(rect, other.rect) > 0.9)) continue;
      const descriptor = imageDescriptor(image, image, rect, fullRect);
      if (descriptor) images.push(descriptor);
    }
    return [...videos, ...images].slice(0, 4);
  }

  function sourceKey(item) {
    return `${item.source.tagName}:${item.source.currentSrc || item.source.src || ""}:${Math.round(item.rect.width)}x${Math.round(item.rect.height)}:${Math.round(item.rect.left - item.fullRect.left)},${Math.round(item.rect.top - item.fullRect.top)}`;
  }

  // Bilibili's hover previews are tiny bpx players living inside cards: they are card media, not "the player".
  function isInlinePreview(element) {
    return Boolean(element.closest(`${INLINE_PREVIEW_SELECTOR}, ${CARD_SELECTOR}`));
  }

  /** Corner radii [tl, tr, br, bl] of whatever visibly clips `element`: the element and every ancestor hugging its box. */
  function holeRadii(element, rect, box) {
    const radii = [0, 0, 0, 0];
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      const r = node.getBoundingClientRect();
      const hugs = Math.abs(r.left - box.left) <= HUG && Math.abs(r.top - box.top) <= HUG
        && Math.abs(r.right - box.right) <= HUG && Math.abs(r.bottom - box.bottom) <= HUG;
      if (!hugs) {
        if (node === element) continue;
        break;
      }
      const style = getComputedStyle(node);
      const size = Math.min(r.width, r.height);
      [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].forEach((value, i) => {
        radii[i] = Math.max(radii[i], value.endsWith("%") ? size * parseFloat(value) / 100 : parseFloat(value) || 0);
      });
    }
    // Sides cut off by a scroll container or the viewport keep square corners.
    const top = rect.top > box.top + HUG, right = rect.right < box.right - HUG;
    const bottom = rect.bottom < box.bottom - HUG, left = rect.left > box.left + HUG;
    return [top || left ? 0 : radii[0], top || right ? 0 : radii[1], bottom || right ? 0 : radii[2], bottom || left ? 0 : radii[3]];
  }

  function isAvatarLike(element, rect, radii) {
    if (element.closest(AVATAR_SELECTOR)) return true;
    const half = Math.min(rect.width, rect.height) / 2;
    return radii.every((r) => r >= half * 0.9);
  }

  function protectedRects() {
    const rects = [];
    // In "edge" mode the whole player (letterbox included) stays unlit; in "content" mode only the picture does.
    const areas = settings.playerFit === "edge"
      ? [...document.querySelectorAll(PLAYER_AREA_SELECTOR)].filter((area) => !isInlinePreview(area))
      : [];
    for (const area of areas) {
      const box = area.getBoundingClientRect();
      const rect = visibleRect(area, box, 8, 8);
      if (rect) rects.push({ ...rect, radii: holeRadii(area, rect, box) });
    }
    for (const element of document.querySelectorAll("img, video, canvas")) {
      if (areas.some((area) => area.contains(element))) continue;
      const box = element.getBoundingClientRect();
      // Avatars, icons, emoji and badges are UI, not media: they take the light like everything else.
      if (Math.min(box.width, box.height) < MIN_PROTECTED) continue;
      // Inline previews keep their whole rounded box (letterbox included); other media only their visible picture.
      const picture = element.tagName === "VIDEO" && isInlinePreview(element)
        ? box
        : imageDescriptor(element, element, box, box)?.fullRect || box;
      const rect = visibleRect(element, picture, 8, 8);
      if (!rect) continue;
      const letterboxed = Math.abs(picture.width - box.width) > 2 || Math.abs(picture.height - box.height) > 2;
      const radii = letterboxed ? [0, 0, 0, 0] : holeRadii(element, rect, box);
      if (isAvatarLike(element, rect, radii)) continue;
      rects.push({ ...rect, radii });
    }
    return rects;
  }

  function updateLayout() {
    if (!activeRoot || !bounds) return;
    const view = viewport();
    host.dataset.scope = settings.scope;
    host.dataset.kind = activeKind;
    let region;
    if (settings.scope === "page") {
      const rects = protectedRects();
      const nextKey = `${view.width}:${view.height}:${rects.map((rect) => [rect.left, rect.top, rect.width, rect.height, ...rect.radii].map(Math.round).join(",")).join(";")}`;
      if (nextKey !== protectionKey) {
        light.style.maskImage = Core.buildMediaMask(rects, view);
        protectionKey = nextKey;
      }
      const padding = settings.blur * 2;
      region = { left: -padding, top: -padding, width: view.width + padding * 2, height: view.height + padding * 2 };
    } else {
      protectionKey = "";
      light.style.maskImage = Core.buildPostMask(activeRoot.getBoundingClientRect(), view);
      const padding = 60 + settings.spread * 3.4;
      region = { left: bounds.left - padding, top: bounds.top - padding, width: bounds.width + padding * 2, height: bounds.height + padding * 2 };
    }
    field.style.cssText = `position:absolute;left:${region.left}px;top:${region.top}px;width:${region.width}px;height:${region.height}px;`;
    const scale = 256 / Math.max(region.width, region.height);
    const size = { width: Math.round(region.width * scale), height: Math.round(region.height * scale) };
    const target = {
      left: (bounds.left - region.left) / region.width * size.width,
      top: (bounds.top - region.top) / region.height * size.height,
      width: bounds.width / region.width * size.width,
      height: bounds.height / region.height * size.height,
    };
    const source = { width: mosaic.width, height: Math.max(48, Math.min(144, Math.round(144 * bounds.height / bounds.width))) };
    projection = { size, source, target, strips: Core.buildRayProjection(source, target, size, (120 + settings.spread * 12) * scale) };
    updateTheme();
  }

  function paint(index) {
    if (!bounds || !media.length || !projection) return false;
    const canvas = canvases[index];
    const context = contexts[index];
    if (mosaic.height !== projection.source.height) mosaic.height = projection.source.height;
    mosaicContext.clearRect(0, 0, mosaic.width, mosaic.height);
    let drawn = false;
    for (const item of media) {
      const source = item.source;
      const size = sourceSize(source);
      const target = {
        left: (item.fullRect.left - bounds.left) / bounds.width * mosaic.width,
        top: (item.fullRect.top - bounds.top) / bounds.height * mosaic.height,
        width: item.fullRect.width / bounds.width * mosaic.width,
        height: item.fullRect.height / bounds.height * mosaic.height,
      };
      const crop = Core.fitImage(size.width, size.height, target, item.fit, item.position);
      if (!crop) continue;
      mosaicContext.save();
      try {
        mosaicContext.beginPath();
        mosaicContext.rect((item.rect.left - bounds.left) / bounds.width * mosaic.width, (item.rect.top - bounds.top) / bounds.height * mosaic.height, item.rect.width / bounds.width * mosaic.width, item.rect.height / bounds.height * mosaic.height);
        mosaicContext.clip();
        // Display-only: never read/export pixels, so cross-origin covers (hdslb.com) work too.
        mosaicContext.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, crop.dx, crop.dy, crop.dw, crop.dh);
        drawn = true;
      } catch {
        // The player may swap its media source while the element is reused.
        scheduleReconcile();
      } finally {
        mosaicContext.restore();
      }
    }
    if (canvas.width !== projection.size.width) canvas.width = projection.size.width;
    if (canvas.height !== projection.size.height) canvas.height = projection.size.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (drawn) {
      const target = projection.target;
      context.drawImage(mosaic, target.left, target.top, target.width, target.height);
      for (const strip of projection.strips) {
        context.globalAlpha = strip.alpha;
        context.drawImage(mosaic, strip.sx, strip.sy, strip.sw, strip.sh, strip.dx, strip.dy, strip.dw, strip.dh);
      }
      context.globalAlpha = 1;
    }
    return drawn;
  }

  function startFrames() {
    stopFrames();
    if (!eligible() || !settings.animateVideo || reducedMotion.matches) return;
    const source = media.find((item) => item.source.tagName === "CANVAS"
      || (item.source.tagName === "VIDEO" && !item.source.paused && !item.source.ended))?.source;
    if (!source) return;
    const type = source.tagName === "VIDEO" && typeof source.requestVideoFrameCallback === "function" ? "video" : "raf";
    const next = (time) => {
      frameHandle = null;
      if (!eligible() || !activeRoot?.isConnected) return;
      if (source.tagName === "VIDEO" && (source.paused || source.ended)) return;
      if (time - lastPaint >= FRAME_INTERVAL) {
        paint(front);
        lastPaint = time;
      }
      queue();
    };
    const queue = () => {
      frameHandle = type === "video"
        ? { type, video: source, id: source.requestVideoFrameCallback(next) }
        : { type, id: requestAnimationFrame(next) };
    };
    queue();
  }

  function refreshMedia(changedRoot = false) {
    if (!activeRoot) return;
    const nextMedia = activeKind === "player" ? findPlayerMedia(activeRoot) : findCardMedia(activeRoot);
    const nextSignature = nextMedia.map(sourceKey).join("|");
    const changed = changedRoot || nextSignature !== signature
      || nextMedia.some((item, index) => item.source !== media[index]?.source);
    media = nextMedia;
    signature = nextSignature;
    bounds = Core.unionRects(media.map((item) => item.rect));
    host.dataset.mediaCount = String(media.length);
    if (!media.length || !bounds?.width || !bounds.height) {
      light.classList.remove("visible");
      stopFrames();
      return;
    }
    updateLayout();
    if (changed) {
      const back = 1 - front;
      if (paint(back)) {
        canvases[front].classList.remove("front");
        canvases[back].classList.add("front");
        front = back;
        light.classList.add("visible");
      }
    } else if (paint(front)) light.classList.add("visible");
    startFrames();
  }

  function activate(root, kind) {
    if (disposed || !eligible() || !root.isConnected) return;
    cancelPending();
    activeRoot = root;
    activeKind = kind;
    activeObserver.disconnect();
    if (kind === "player") {
      // Danmaku constantly mutates the player subtree; only watch for a swapped <video>.
      const wrap = root.querySelector(".bpx-player-video-wrap") || root;
      activeObserver.observe(wrap, { childList: true });
      const video = root.querySelector("video");
      if (video) activeObserver.observe(video, { attributes: true, attributeFilter: ["src"] });
    } else {
      activeObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "srcset", "poster"] });
    }
    refreshMedia(true);
  }

  function hoveredCard(element) {
    if (!settings.cards || !element) return null;
    const card = element.closest(CARD_SELECTOR);
    // Text-only cards fall through to the player light instead of blanking it.
    return card && card.querySelector("img, video") ? card : null;
  }

  function reconcile() {
    if (!eligible()) {
      deactivate();
      return;
    }
    const card = pointer ? hoveredCard(document.elementFromPoint(pointer.x, pointer.y)) : null;
    if (card) {
      if (card === activeRoot) {
        refreshMedia();
        return;
      }
      if (card === pendingRoot) return;
      cancelPending();
      pendingRoot = card;
      hoverTimer = window.setTimeout(() => {
        hoverTimer = 0;
        if (pendingRoot === card) activate(card, "card");
      }, 70);
      // Keep the player glowing until the card takes over; otherwise go dark now.
      if (activeKind === "card") {
        activeRoot = null;
        activeKind = "";
        activeObserver.disconnect();
        stopFrames();
        light.classList.remove("visible");
      }
      return;
    }
    cancelPending();
    const player = settings.player ? findPlayer() : null;
    if (!player) {
      deactivate();
      return;
    }
    if (player === activeRoot) refreshMedia();
    else activate(player, "player");
  }

  const activeObserver = new MutationObserver(scheduleReconcile);
  const pageObserver = new MutationObserver((records) => {
    if (!eligible()) return;
    if (activeRoot && !activeRoot.isConnected) {
      scheduleReconcile();
      return;
    }
    const relevant = `${CARD_SELECTOR}, video, bwp-video`;
    if (records.some((record) => [...record.addedNodes, ...record.removedNodes].some((node) =>
      node.nodeType === Node.ELEMENT_NODE && (node.matches(relevant) || node.querySelector(relevant))))) scheduleReconcileLazy();
  });
  pageObserver.observe(document.body, { childList: true, subtree: true });
  const themeObserver = new MutationObserver(scheduleReconcileLazy);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });

  listen(document, "pointermove", (event) => {
    if (event.pointerType === "touch") return;
    pointer = { x: event.clientX, y: event.clientY };
    if (event.target instanceof Element) {
      const card = hoveredCard(event.target);
      // Nothing to do while the pointer stays on the lit card, or wanders outside cards under the player light.
      if (card ? card === activeRoot || card === pendingRoot : activeKind === "player" && !pendingRoot) return;
    }
    scheduleReconcile();
  }, { passive: true });
  listen(document, "pointerout", (event) => {
    if (!event.relatedTarget) {
      pointer = null;
      scheduleReconcile();
    }
  }, { passive: true });
  listen(document, "scroll", scheduleReconcile, { passive: true, capture: true });
  listen(window, "resize", scheduleReconcile, { passive: true });
  listen(window, "blur", () => {
    pointer = null;
    scheduleReconcile();
  });
  listen(document, "visibilitychange", scheduleReconcile);
  listen(document, "fullscreenchange", scheduleReconcile);
  for (const type of ["loadeddata", "play", "pause", "ended", "seeked", "emptied", "resize"]) {
    listen(document, type, (event) => {
      if (event.target instanceof Element && activeRoot?.contains(event.target)) scheduleReconcile();
      else if (type === "loadeddata" && settings.player && !activeRoot) scheduleReconcileLazy();
    }, true);
  }
  listen(document, "load", (event) => {
    if (!(event.target instanceof Element) || !activeRoot) return;
    if (activeRoot.contains(event.target)) scheduleReconcile();
    else scheduleReconcileLazy(); // keeps the page-wide media holes in sync with lazy images
  }, true);
  listen(reducedMotion, "change", scheduleReconcile);
  listen(colorScheme, "change", scheduleReconcile);
  // Player screen mode (wide / web-fullscreen / mini) lives on data-screen.
  const screenObserver = new MutationObserver(scheduleReconcile);
  const watchScreen = () => {
    screenObserver.disconnect();
    for (const container of document.querySelectorAll(".bpx-player-container")) {
      screenObserver.observe(container, { attributes: true, attributeFilter: ["data-screen"] });
    }
  };
  watchScreen();
  const screenRewatch = window.setInterval(watchScreen, 3000);
  removers.push(() => clearInterval(screenRewatch));

  /* ------------------------------------------------------------------ */
  /* Settings panel                                                     */
  /* ------------------------------------------------------------------ */

  const panel = (() => {
    let root = null;
    let shadowRoot = null;

    const css = `
      :host { all: initial; }
      .panel { position: fixed; right: 20px; bottom: 20px; width: 280px; padding: 16px 16px 12px; border-radius: 12px;
        font: 13px/1.5 -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
        color: #18191c; background: rgba(255,255,255,.96); box-shadow: 0 8px 32px rgba(0,0,0,.18); backdrop-filter: blur(12px); }
      @media (prefers-color-scheme: dark) { .panel { color: #e3e5e7; background: rgba(30,31,34,.96); } }
      h2 { margin: 0 0 10px; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; }
      h2 button { border: 0; background: none; color: inherit; font-size: 18px; cursor: pointer; opacity: .6; padding: 0 2px; }
      label { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 8px 0; }
      input[type=range] { flex: 1; accent-color: #00aeec; }
      input[type=checkbox] { accent-color: #00aeec; width: 16px; height: 16px; }
      select { font: inherit; padding: 2px 6px; border-radius: 6px; }
      output { width: 46px; text-align: right; font-variant-numeric: tabular-nums; opacity: .75; }
      .row-label { white-space: nowrap; }
      .foot { display: flex; justify-content: flex-end; margin-top: 10px; }
      .foot button { font: inherit; border: 1px solid rgba(127,127,127,.35); background: none; color: inherit; border-radius: 6px; padding: 3px 10px; cursor: pointer; }
      hr { border: 0; border-top: 1px solid rgba(127,127,127,.2); margin: 10px 0; }
    `;
    const html = `
      <div class="panel" role="dialog" aria-label="Bilibili Ambient 设置">
        <h2>Bilibili 氛围光 <button data-close title="关闭">×</button></h2>
        <label><span class="row-label">启用</span><input type="checkbox" data-key="enabled"></label>
        <label><span class="row-label">悬停卡片时发光</span><input type="checkbox" data-key="cards"></label>
        <label><span class="row-label">播放器氛围光</span><input type="checkbox" data-key="player"></label>
        <label><span class="row-label">播放器光源</span>
          <select data-key="playerFit"><option value="edge">铺满播放器</option><option value="content">按画面实际位置</option></select></label>
        <label><span class="row-label">跟随视频颜色</span><input type="checkbox" data-key="animateVideo"></label>
        <label><span class="row-label">光照范围</span>
          <select data-key="scope"><option value="page">整个页面</option><option value="post">仅媒体周围</option></select></label>
        <hr>
        <label><span class="row-label">强度</span><input type="range" min="0" max="100" data-key="intensity"><output data-out="intensity"></output></label>
        <label><span class="row-label">模糊</span><input type="range" min="24" max="160" data-key="blur"><output data-out="blur"></output></label>
        <label><span class="row-label">扩散</span><input type="range" min="20" max="100" data-key="spread"><output data-out="spread"></output></label>
        <div class="foot"><button data-reset>恢复默认</button></div>
      </div>
    `;
    const units = { intensity: "%", blur: "px", spread: "%" };

    function sync() {
      if (!shadowRoot) return;
      for (const input of shadowRoot.querySelectorAll("[data-key]")) {
        const value = settings[input.dataset.key];
        if (input.type === "checkbox") input.checked = value;
        else input.value = String(value);
      }
      for (const output of shadowRoot.querySelectorAll("[data-out]")) {
        output.textContent = `${settings[output.dataset.out]}${units[output.dataset.out]}`;
      }
    }

    function open() {
      if (root?.isConnected) return;
      root = document.createElement("div");
      root.id = "bili-ambient-panel";
      root.style.cssText = "all:initial;position:fixed;z-index:2147483647;";
      shadowRoot = root.attachShadow({ mode: "open" });
      shadowRoot.innerHTML = `<style>${css}</style>${html}`;
      shadowRoot.addEventListener("input", (event) => {
        const input = event.target;
        const key = input.dataset?.key;
        if (!key) return;
        const value = input.type === "checkbox" ? input.checked : input.tagName === "SELECT" ? input.value : Number(input.value);
        saveSettings({ [key]: value });
      });
      shadowRoot.querySelector("[data-close]").addEventListener("click", close);
      shadowRoot.querySelector("[data-reset]").addEventListener("click", () => saveSettings(DEFAULTS));
      document.documentElement.append(root);
      sync();
    }

    function close() {
      root?.remove();
      root = null;
      shadowRoot = null;
    }

    return { open, close, sync, toggle: () => (root?.isConnected ? close() : open()) };
  })();

  if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("⚙️ 氛围光设置", panel.toggle);
    GM_registerMenuCommand("💡 开启 / 关闭氛围光", () => saveSettings({ enabled: !settings.enabled }));
  }
  store.watch(applySettings);
  applySettings(settings);

  function dispose() {
    disposed = true;
    deactivate();
    cancelAnimationFrame(reconcileFrame);
    clearTimeout(lazyTimer);
    activeObserver.disconnect();
    pageObserver.disconnect();
    themeObserver.disconnect();
    screenObserver.disconnect();
    for (const remove of removers) remove();
    panel.close();
    host.remove();
  }
  globalThis.__biliAmbientDispose = dispose;
  globalThis.__biliAmbientPanel = panel;
  listen(window, "pagehide", (event) => { if (!event.persisted) dispose(); });
})();
