# Website: cjinn.org / 收礼人网站风格：cjinn.org

An example **website profile** — the recipient's side of the card, the end point (`--t = 1`). It describes only the visual style of the birthday person's website, not the person. Write one like it from the recipient's own site (or Instagram, portfolio, a place they love) before designing. The sender's side is a separate file (see `persona-wendy.md`).

一份**收礼人网站风格**的示例：卡片的终点（`--t = 1`）。只描述寿星网站的视觉风格，不写这个人的私人信息。每张新卡先从寿星自己的网站（或者主页、作品集、他喜欢的地方）整理一份，再开始设计。送礼人那一边是另一份文件（见 `persona-wendy.md`）。

Source / 来源：https://cjinn.org/

> Many personal sites render with JavaScript; a plain fetch returns almost nothing. Open them in a real or headless browser, take a screenshot, and read computed styles.
> 很多个人网站是 JavaScript 渲染的，直接抓取几乎拿不到内容。用浏览器（或无头浏览器）打开、截图、读取实际样式。

---

## Look / 视觉

- **Wordmark / 字标**：`CJINN.` in DM Sans 500, very large, ink `#202322`, the full stop in terracotta. Used for `.logo-his`, `.h-his` and the edition masthead.
  `CJINN.`，DM Sans 500，很大，句点是陶土红。
- **Type / 字体**
  - Headlines and letters: Georgia with Noto Serif SC / Songti SC (`--font-his-serif`).
    标题和信件：Georgia 配 Noto Serif SC。
  - Small labels: DM Sans 700, ~11px, uppercase, widely spaced, often terracotta (e.g. `CJINN.ORG / 个人网站`).
    小标签：DM Sans 粗体、全大写、字距宽，常用陶土红。
- **Colour / 颜色**（`TO` in `app.js`）
  - Paper `#F6F3EC` · page `#F7F6F2` · ink `#202322` · body text `#292E2D` · muted `#777777` · rules `#DDDCD5` / `#D8D4CB`.
  - One accent only: terracotta `#B75C45` (light `#C98B78`).
  - Confetti `HIS_COLORS`: `#B75C45 #202322 #F6F3EC #C98B78 #8A8984 #DDDCD5` — paper strips.
- **Paper / 纸张**：fine dotted grain on warm paper (`radial-gradient` dots), square corners (`--radius` goes to ~2px at `t = 1`).
  暖色纸张上有细小的点状颗粒；圆角在终点几乎变成直角。

## Structures borrowed / 借用的结构

- **Inaugural issue (创刊号)**: a single newspaper sheet — top line `CJINN.ORG — EST. 2026`, calligraphic masthead, thin double rules with `NO. 001` and the date, a small centred kicker, a centred serif headline, then a letter. → the card's **birthday edition** (`.edition`): masthead `CJINN.`, `N° 01 · 2026 · FROM WENDY`, headline "Happy Birthday.", the list of greetings, the letter.
  网站的「创刊号」：单页报纸，报头、双细线、期号和日期、居中标题、一封信。卡片的**生日特刊**照这个结构做。
- **Language row**: 简体中文 / 繁體中文 / English / 한국어 / 朝漢混用 / Español / 日本語 — slash-separated, current one underlined. → the card's seven languages and `.lang-row`, in the same order.
  网站的语言切换，斜杠分隔、当前项加下划线。卡片的七种语言和语言栏按同样顺序。
- **Travel map** (探索旅行地图) → the finale's dotted world map; `VISITED` capitals land first and larger.
  网站的旅行地图 → 大结局的点阵世界地图。
- **Tone**: quiet, editorial, letter-like («亲爱的读者»); calls to action are outlined boxes with `↗`.
  安静、像报刊、像写信；按钮是描边方框加 `↗`。

## Role in the card / 在卡片里的位置

- Each tap: after her nickname, **his half answers** with the greeting in his serif (`.cap-his`).
  每次触碰，她的昵称之后，由他那一半用衬线体说出祝福。
- With every finger the page moves toward this style; the last finger lands fully here and opens the edition.
  每碰一根手指，页面就更接近这个风格；最后一根完全变成这里，并打开特刊。
