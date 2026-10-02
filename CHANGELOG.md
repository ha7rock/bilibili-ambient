# Changelog

## Chrome 扩展 / Chrome extension

### 0.1.1 — 2026-10-02
- 修复：圆角的悬停预览视频四角露出未着色的白边——遮罩洞口现在按实际裁切元素的四个圆角绘制；悬停预览不再被当作「播放器」。
- 修复：头像、图标、表情等小元素（小于 56px 或圆形）不再被挖洞保护，而是和页面其他部分一起着色，不再显得被「高亮」。
- Fix: rounded hover-preview videos showed untinted white corners — mask holes now follow each corner radius of whatever clips the media, and hover previews are no longer treated as "the player".
- Fix: avatars, icons and emoji (under 56px or circular) are no longer cut out of the light, so they take the tint with the rest of the page instead of looking highlighted.

### 0.1.0 — 2026-10-01
- 首个版本：悬停卡片发光、播放器氛围光、两种播放器光源模式、深浅主题自适应。
- 页内设置面板（`Alt+Shift+B` 或工具栏弹窗按钮打开）与工具栏弹窗，设置多标签页实时同步。
- First release: hover-to-glow cards, player ambient light, two player light-source modes, light/dark theme blending.
- In-page settings panel (`Alt+Shift+B` or the popup button) plus toolbar popup; settings sync live across tabs.

## 油猴脚本 / Userscript

### 0.1.1 — 2026-10-02
- 修复：圆角的悬停预览视频四角露出未着色的白边——遮罩洞口现在按实际裁切元素的四个圆角绘制；悬停预览不再被当作「播放器」。
- 修复：头像、图标、表情等小元素（小于 56px 或圆形）不再被挖洞保护，而是和页面其他部分一起着色，不再显得被「高亮」。
- Fix: rounded hover-preview videos showed untinted white corners — mask holes now follow each corner radius of whatever clips the media, and hover previews are no longer treated as "the player".
- Fix: avatars, icons and emoji (under 56px or circular) are no longer cut out of the light, so they take the tint with the rest of the page instead of looking highlighted.

### 0.1.0 — 2026-10-01
- 首个版本，功能与 Chrome 扩展一致；设置面板从 Tampermonkey 菜单打开。
- First release with the same features as the extension; the settings panel opens from the Tampermonkey menu.
