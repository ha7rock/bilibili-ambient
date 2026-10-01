"use strict";

// Keyboard shortcut (chrome://extensions/shortcuts) → toggle the in-page settings panel.
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "toggle-panel") return;
  const id = tab?.id ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
  if (id === undefined) return;
  // Non-Bilibili tabs have no content script to answer; that is fine.
  chrome.tabs.sendMessage(id, { type: "bili-ambient:toggle-panel" }).catch(() => {});
});
