<p align="center">
  <img src="docs/images/logo.png" width="128" alt="Bilibili Ambient logo">
</p>

<h1 align="center">Bilibili Ambient · 流光溢彩</h1>

<p align="center">
  给 B 站装上一圈「氛围灯带」——画面是什么颜色，页面就亮成什么颜色。
</p>

<p align="center">
  <b>中文</b> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <a href="../../releases"><img alt="Release" src="https://img.shields.io/badge/release-v0.1.0-fb7299"></a>
  <img alt="Chrome Extension" src="https://img.shields.io/badge/Chrome-MV3%20扩展-00aeec">
  <img alt="Userscript" src="https://img.shields.io/badge/油猴-Tampermonkey%20%7C%20Violentmonkey-a77bff">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-green"></a>
</p>

<p align="center">
  <img src="docs/images/cover.jpg" alt="Bilibili Ambient 封面" width="860">
</p>

---

## 目录

- [简介](#简介)
- [功能特性](#功能特性)
- [效果预览](#效果预览)
- [安装](#安装)
  - [方式一：Chrome 扩展（推荐）](#方式一chrome-扩展推荐)
  - [方式二：油猴脚本](#方式二油猴脚本)
- [使用说明](#使用说明)
- [设置项](#设置项)
- [支持的页面](#支持的页面)
- [常见问题](#常见问题)
- [工作原理](#工作原理)
- [隐私与权限](#隐私与权限)
- [开发与打包](#开发与打包)
- [致谢](#致谢)
- [许可证与声明](#许可证与声明)

## 简介

还记得电视或显示器背后的那圈氛围灯带吗？画面偏蓝，墙就泛起蓝光；画面是夕阳，墙就染成橙红。

**Bilibili Ambient** 把这件事搬进了浏览器：

- **鼠标悬停**在视频卡片上，封面（或正在播放的预览）的颜色会从卡片边缘向外扩散，柔和地照亮整个页面；
- **打开播放页**，播放器四周会像电视灯带一样持续发光，并**实时跟随画面变色**；
- 图片和视频本身**始终清晰**，光只落在它们之外。

项目提供两个形态，功能一致，任选其一：

| 形态 | 适合谁 | 设置入口 |
| --- | --- | --- |
| **Chrome 扩展** | 使用 Chrome / Edge / Brave 等 Chromium 浏览器 | 工具栏弹窗 + 页内设置面板（`Alt+Shift+B`） |
| **油猴脚本** | 已在使用 Tampermonkey / Violentmonkey | 油猴菜单 → 页内设置面板 |

## 功能特性

- 🎨 **悬停即亮**：首页推荐、搜索结果、播放页推荐、动态、空间、直播卡片，封面与预览视频都能发光。
- 📺 **播放器灯带**：播放页无需悬停，播放器四周持续发光；最高每秒 12 帧跟随画面，暂停、拖动进度同步更新。
- 🔀 **两种光源模式**（竖屏视频尤其明显）：
  - **铺满播放器**：光从播放器边框打出，黑边保持暗；
  - **按画面实际位置**：光从画面本身打出，会照进竖屏视频两侧的黑边（与原版 X Ambient 一致）。
- 🌗 **深浅主题自适应**：深色页面用 `screen` 混合（辉光），浅色页面用 `multiply` 混合（柔和染色），跟随 B 站主题与系统主题自动切换。
- 🎚️ **随手调光**：强度、模糊、扩散、光照范围可调，改动即时生效、多标签页同步。
- 🧠 **自动避让**：网页全屏、全屏、小窗播放时自动关闭播放器光；尊重系统「减少动态效果」设置。
- 🪶 **轻量安全**：只用 `drawImage` 绘制，不读取像素、不截屏、不联网，扩展只申请 `storage` 一项权限。

## 效果预览

**开灯前后（同一帧画面）**

![开灯前后对比](docs/images/before-after.jpg)

![开灯前后对比：夕阳](docs/images/before-after-sunset.jpg)

**悬停卡片** · **播放器灯带**

<p>
  <img src="docs/images/demo-hover.gif" width="49%" alt="悬停卡片发光">
  <img src="docs/images/demo-player.gif" width="49%" alt="播放器氛围光">
</p>

**两种光源模式**（左：铺满播放器 · 右：按画面实际位置）

![两种光源模式](docs/images/player-modes.jpg)

## 安装

> 两种方式选一种即可，**不要同时启用**，否则页面上会叠加两层光。

### 方式一：Chrome 扩展（推荐）

适用于 Chrome、Edge、Brave、Arc 等基于 Chromium 的浏览器（需支持 Manifest V3）。

1. 打开本仓库的 [Releases](../../releases) 页面，找到标签为 **`extension-v…`** 的版本，下载 `bilibili-ambient-extension-v0.1.0.zip`。
2. 解压，得到 `bilibili-ambient-extension` 文件夹（里面有 `manifest.json`）。
   > 请把文件夹放在一个**长期保留**的位置，Chrome 会一直从这里读取扩展，删掉文件夹扩展就会失效。
3. 在地址栏打开 `chrome://extensions`（Edge 为 `edge://extensions`），打开右上角的 **开发者模式**。
4. 点击 **加载已解压的扩展程序**，选择第 2 步的文件夹。
5. **刷新**已经打开的 B 站页面（扩展只会注入到安装后新加载的页面）。
6. （可选）点击工具栏的拼图图标，把 **Bilibili Ambient** 固定到工具栏，方便打开设置。

**更新**：下载新版本 zip，替换文件夹中的文件 → 在 `chrome://extensions` 点扩展卡片上的刷新按钮 ↻ → 刷新 B 站页面。设置会保留。

**卸载**：在 `chrome://extensions` 中点击「移除」。

### 方式二：油猴脚本

适用于已安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/) 的浏览器。

1. 打开 [Releases](../../releases)，找到标签为 **`userscript-v…`** 的版本，下载 `bilibili-ambient.user.js`。
2. 安装脚本（任选一种）：
   - **新建脚本粘贴**：打开油猴「管理面板」→ 点击「+」新建脚本 → 清空编辑器，粘贴 `bilibili-ambient.user.js` 的全部内容 → `Ctrl/⌘ + S` 保存。
   - **拖拽安装**：在油猴扩展详情里开启「允许访问文件网址」后，把 `.user.js` 文件拖进浏览器窗口，在弹出的安装页点击「安装」。
3. 刷新 B 站页面。

> **Chrome 用户注意**：新版 Chrome 中，Tampermonkey 需要额外授权才能运行脚本。请在 `chrome://extensions` 打开 **开发者模式**；Chrome 138 及以上还需在 Tampermonkey 的「详情」页打开 **允许用户脚本（Allow User Scripts）**。
>
> 本仓库为私有仓库，`raw` 链接需要登录，因此无法通过「从网址安装」或自动更新；更新时请重复以上步骤覆盖安装。

## 使用说明

### 1. 悬停卡片发光

把鼠标停在任意视频卡片的封面上（约 70 毫秒后），封面颜色会从卡片向外扩散，照亮整个页面。

- 移到另一张卡片，光会切换到新卡片的颜色；
- 卡片正在播放 B 站的悬停预览时，光会**跟随预览视频实时变色**；
- 只有文字、没有图片的卡片不会发光；在播放页上，此时会自动回到播放器的光。

### 2. 播放器氛围光

打开任意视频播放页（`/video/…`）或直播间，播放器四周会持续发光，就像电视背后的灯带：

- 播放中最高每秒 12 帧更新颜色；暂停、拖动进度都会同步更新；
- 悬停右侧推荐卡片时，光会临时切换为该卡片；移开后回到播放器；
- **网页全屏 / 全屏 / 小窗**播放时自动关闭，不会遮挡画面。

### 3. 选择光源模式（竖屏视频）

竖屏视频在横向播放器里会有左右黑边，此时两种模式差别最明显：

| 模式 | 效果 | 适合 |
| --- | --- | --- |
| 铺满播放器（默认） | 画面拉伸到整个播放区取色，光从播放器边框打出，黑边保持暗 | 想要「电视灯带」式的整齐边框光 |
| 按画面实际位置 | 光从画面本身打出，会照进黑边 | 想要与原版 X Ambient 一致的效果 |

### 4. 打开设置

| 形态 | 打开方式 |
| --- | --- |
| Chrome 扩展 | ① 点击工具栏中的扩展图标打开弹窗；② 在 B 站页面按 **`Alt+Shift+B`**，或在弹窗中点「在页面上打开设置面板」，打开**页内设置面板**，可以一边调节一边看效果 |
| 油猴脚本 | 点击浏览器中的油猴图标 → **⚙️ 氛围光设置**，打开页内设置面板；**💡 开启 / 关闭氛围光** 可一键开关 |

- 快捷键可在 `chrome://extensions/shortcuts` 中修改；若与其他扩展冲突，Chrome 不会分配它，弹窗里也不会显示快捷键，此时请手动指定。
- 所有改动立即生效，并同步到所有已打开的 B 站标签页；点「恢复默认」可还原。

<p align="center"><img src="docs/images/panel.jpg" width="560" alt="页内设置面板"></p>

## 设置项

| 设置 | 默认值 | 范围 / 选项 | 说明 |
| --- | --- | --- | --- |
| 启用 | 开 | 开 / 关 | 总开关 |
| 悬停卡片时发光 | 开 | 开 / 关 | 首页、搜索、推荐、动态、空间、直播卡片 |
| 播放器氛围光 | 开 | 开 / 关 | 播放页、直播间的播放器持续发光 |
| 播放器光源 | 铺满播放器 | 铺满播放器 / 按画面实际位置 | 见上文「选择光源模式」 |
| 跟随视频颜色 | 开 | 开 / 关 | 关闭后只在切换、暂停、拖动时更新颜色，更省电 |
| 光照范围 | 整个页面 | 整个页面 / 仅媒体周围 | 「仅媒体周围」只照亮当前卡片或播放器附近 |
| 强度 | 65% | 0–100% | 光的不透明度 |
| 模糊 | 56px | 24–160px | 越大越柔和 |
| 扩散 | 75% | 20–100% | 光传播的距离 |

> 小贴士：在密集的深色首页上，可以把强度调到 85–95%，效果更明显；浅色模式下建议保持 50–65%。

## 支持的页面

| 页面 | 地址 | 悬停卡片 | 播放器光 |
| --- | --- | :---: | :---: |
| 首页 / 分区 | `www.bilibili.com` | ✅ | — |
| 视频播放页 | `www.bilibili.com/video/…` | ✅（右侧推荐） | ✅ |
| 番剧 / 影视 | `www.bilibili.com/bangumi/…` | ✅ | ✅（无 DRM 时） |
| 搜索 | `search.bilibili.com` | ✅ | — |
| 动态 | `t.bilibili.com` | ✅ | — |
| 个人空间 | `space.bilibili.com` | ✅ | — |
| 直播 | `live.bilibili.com` | ✅ | ✅ |

> 首页、视频播放页、搜索页已在真实页面上测试；番剧、动态、空间、直播为按页面结构适配，尚未逐一验证，如遇问题欢迎反馈。

## 常见问题

<details>
<summary><b>安装后没有任何效果？</b></summary>

1. 刷新 B 站页面（扩展/脚本只注入新加载的页面）；
2. 确认设置里「启用」已打开、强度大于 0；
3. 确认没有同时安装扩展和油猴脚本；
4. 油猴用户：检查 Chrome 的开发者模式 / 允许用户脚本（见安装说明）；
5. 浏览器处于全屏时会自动关闭。
</details>

<details>
<summary><b>某些番剧或电影没有光？</b></summary>

带 DRM 保护的视频无法绘制到 canvas 上，浏览器会返回黑色画面，这是浏览器的安全限制，无法绕过。
</details>

<details>
<summary><b>浅色模式下页面被染得发灰？</b></summary>

浅色模式使用 `multiply`（正片叠底）混合，深色画面会让页面变暗。可以调低强度，或开启 B 站深色模式（深色下只会增亮）。
</details>

<details>
<summary><b>Alt+Shift+B 没反应？</b></summary>

可能与其他扩展的快捷键冲突。打开 `chrome://extensions/shortcuts`（Edge 为 `edge://extensions/shortcuts`），为「Bilibili Ambient → 在页面上打开 / 关闭氛围光设置面板」手动设置一个快捷键；也可以直接从工具栏弹窗打开面板。
</details>

<details>
<summary><b>会不会卡？</b></summary>

光场在 256px 的小画布上计算，再用 GPU 模糊放大；视频取色最高每秒 12 帧，并使用 <code>requestVideoFrameCallback</code>。如果设备性能较弱，可关闭「跟随视频颜色」，或把光照范围改为「仅媒体周围」。
</details>

<details>
<summary><b>B 站改版后失效？</b></summary>

卡片与播放器是通过 CSS 选择器识别的，B 站改版后可能需要更新 <code>extension/src/content.js</code>（或脚本中）顶部的 <code>CARD_SELECTOR</code>、<code>PLAYER_*</code> 选择器。欢迎提 Issue。
</details>

## 工作原理

<details>
<summary>展开</summary>

1. **取边缘色**：把悬停卡片的封面 / 预览视频，或播放器当前帧，绘制到一张 144px 宽的小画布上；
2. **向外打光**：取画面四周约 4% 的边缘条带，按同心矩形逐层向外拉伸投射，并按指数衰减透明度（光线投射）；
3. **柔化光晕**：对光场整体做 CSS `blur()` 与 `saturate()`，以 `screen`（深色）或 `multiply`（浅色）叠加到整页；
4. **保护画面**：用一张 SVG 遮罩在页面上所有图片、视频（及播放器）的位置「挖洞」，保证媒体本身始终清晰；
5. 视频播放时通过 `requestVideoFrameCallback` 最高每秒 12 帧重绘，两张画布交替淡入淡出，切换平滑。

整个过程只调用 `drawImage` 绘制，**从不读取或导出像素**，因此跨域的封面图片也能正常使用。
</details>

## 隐私与权限

- Chrome 扩展只申请 **`storage`** 权限，仅用于在本地保存设置；
- 内容脚本只在 `*.bilibili.com` 的上述页面运行；
- 不截屏、不录屏、不联网、不收集或上传任何数据，不会额外创建视频播放器；
- 油猴脚本仅使用 `GM_getValue` / `GM_setValue` / `GM_registerMenuCommand` / `GM_addValueChangeListener`。

## 开发与打包

```text
bilibili-ambient/
├── extension/                 Chrome 扩展（Manifest V3）
│   ├── manifest.json
│   ├── icons/
│   └── src/
│       ├── settings.js        设置默认值与校验（内容脚本与弹窗共用）
│       ├── ambient-core.js    几何与光线投射算法（源自 X Ambient）
│       ├── content.js         页面渲染 + 页内设置面板
│       ├── background.js      快捷键 → 打开页内面板
│       └── popup.html/css/js  工具栏弹窗
├── userscript/
│   └── bilibili-ambient.user.js   油猴脚本（单文件，功能与扩展一致）
├── docs/images/               README 图片
├── scripts/package.sh         打包发布资产
├── CHANGELOG.md
└── LICENSE
```

- 无需 Node.js、无需构建，修改后直接「加载已解压的扩展程序」或在油猴中保存即可调试；
- 打包发布资产（需要 `zip` 与 `python3`）：

  ```bash
  ./scripts/package.sh
  ```

  生成 `dist/bilibili-ambient-extension-v<版本>.zip` 与 `dist/bilibili-ambient.user.js`。
- 发布约定：扩展使用 `extension-v<版本>` 标签，油猴脚本使用 `userscript-v<版本>` 标签，分别发布。

## 致谢

本项目的灵感与核心渲染思路来自 **[mmnga/x-ambient](https://github.com/mmnga/x-ambient)**——一个让 X（Twitter）时间线随图片与视频发光的 Chrome 扩展。光线投射、媒体遮罩、只绘制不读像素等关键做法都源于它，`ambient-core.js` 也直接沿用了原项目的实现（MIT 许可）。

衷心感谢原作者 **[@mmnga](https://github.com/mmnga)** 开源了这个出色的 IDEA 🙏

## 许可证与声明

- 本项目以 [MIT](LICENSE) 许可证发布，并保留原项目 X Ambient 的版权声明。
- 本项目为个人作品，**与哔哩哔哩（bilibili）官方无任何关联**，也未获其认可或背书；「bilibili」「哔哩哔哩」及相关标识归其各自所有者所有。
- README 中的效果截图为真实录屏，画面中的视频与封面版权归各自的 UP 主所有。
- 「流光溢彩」在此仅作为描述效果的中文成语使用。
