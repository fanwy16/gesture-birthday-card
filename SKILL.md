---
name: gesture-birthday-card
description: Make a personal birthday card web page controlled by finger gestures (webcam + MediaPipe hand tracking) — touch a fingertip to the thumb and the card calls one of the recipient's nicknames, then says happy birthday in a language; each finger shifts the card's style from the sender's world toward the recipient's, stamps a passport, and the last finger plays a finale (all languages, a world map with flags flying home, a birthday newspaper page). Works without a camera by clicking or keys 1–8. Use when someone wants to make an interactive / gesture / webcam birthday card (手势生日贺卡, 生日网页, 生日惊喜) for a friend.
---

# 手势生日贺卡

一张用手指操作的生日贺卡网页：拇指碰一下某根手指，卡片喊出寿星的一个昵称，再用一种语言说「生日快乐」。八根手指 = 八个昵称；每碰一根，整张卡的风格就从**送礼人的世界**往**寿星的世界**走一步，护照上多一个邮戳；最后一根手指放大结局：所有语言轮播 → 世界地图上各国国旗飞回首都 → 一页「生日特刊」报纸。

`template/` 是一张做好的示例卡：作者 Wendy 送给 CJINN。起点是 Wendy 自己的风格（WF 标志、配色、两只像素猫），终点是 CJINN 个人网站 https://cjinn.org/ 的风格。结构照抄，内容全部换掉。纯静态网页，没有构建步骤。

本 skill 里的文件：
- `template/`：示例卡，每张新卡都从它复制。
- `references/persona-wendy.md`：**送礼人档案**示例（起点，`t = 0`）：送礼人自己的字体、配色、标志、吉祥物、语气。
- `references/website-cjinn.md`：**收礼人网站风格**示例（终点，`t = 1`）：从寿星的网站整理出的视觉风格和可以借用的结构，只写风格，不写个人信息。

## 开始之前

1. 用户说什么语言就用什么语言回复。一次做一步，每步做完让用户看效果。
2. 先问清楚，不要猜：
   - **谁送给谁**：两个人的名字，卡上怎么称呼对方。
   - **八根手指**：7 个昵称 + 1 个最后的称呼（触发大结局），每个配一种语言的「生日快乐」。
   - **送礼人**：自己的网站或作品集、喜欢的颜色和字体、宠物或吉祥物、平时怎么说话。
   - **收礼人的网站**：寿星的个人网站（没有的话，用主页、作品集或他喜欢的地方代替）。
   - **大结局**：地图上先落地的国家（比如对方去过的）；报纸特刊里要不要写一封信。
   - 用户用 Mac 还是 Windows（决定语音怎么生成）。
3. 昵称和信是私人内容。不要发给外部服务；部署前跟用户确认愿意把页面放到网上。

## 两份风格档案（动手设计之前）

送礼人和收礼人分开写，各写一份，让用户确认后再开始设计。之后所有设计决定都以这两份为准。
1. **Persona（送礼人）**：照 `references/persona-wendy.md` 的格式写 `persona-<名字>.md`，内容包括字体、配色（对应 `FROM`）、标志、吉祥物、语气，以及在卡片里的位置（每次触碰先出现的那一半：昵称）。
2. **Website（收礼人）**：照 `references/website-cjinn.md` 的格式写 `website-<名字>.md`。用浏览器打开对方网站，截图并读取实际样式（很多个人网站是 JavaScript 渲染的，直接抓取拿不到内容），整理出字标、字体、配色（对应 `TO`）、纸张或质感，以及可以借用的结构（报头、语言栏、地图等），对应到特刊、语言栏和大结局。只写风格，不抄对方的私人信息。
3. 卡片上注明收礼人网站的出处（示例卡把页脚的 CJINN 链到 cjinn.org）。

## 新建项目

```bash
cp -R "<本 skill 目录>/template" "<用户选的位置>/<名字>-birthday"
cd "<…>/<名字>-birthday" && python3 -m http.server 4321 --bind 127.0.0.1
# 打开 http://127.0.0.1:4321 （摄像头只在 localhost 或 HTTPS 下可用）
```

先让用户原样打开示例，按 1–8 走一遍，看到最后的效果再开始改。

## 要改的地方

改完用 `grep -n -i -E "wendy|wenyu|cjinn|大鱼|小竹子" *.js *.html *.css` 检查，示例内容应该一条都不剩。

| 文件 | 位置 | 内容 |
|---|---|---|
| `fingers.js` | `FINGERS` | 八根手指，字段说明在文件顶部注释里。最后一个是 `finale: true`。 |
| `fingers.js` | `VOICES` | 每种语言用哪个 macOS 声音（`say -v '?'` 列出全部）。 |
| `app.js` 顶部 | `EDITION` | `letter`：报纸特刊里的信，一段一个字符串，空数组就不显示。`stamp`：大结局邮戳上的小字。 |
| `app.js` 顶部 | `SHORTCUT` | 彩蛋：连续碰某根手指几次，直接跳到大结局。 |
| `app.js` | `CUSTOM_KEY`、`STORE_KEY`、`bday-card-board-hidden` | localStorage 键名，换成新名字，免得和别的卡混在一起。 |
| `app.js` | `FROM` / `TO` | 送礼人（persona）和收礼人（website）的配色，进度 0 → 1 之间逐渐混合。`styles.css` 开头的 token 是 t = 0 时的值，要和 `FROM` 一致。 |
| `app.js` | `catSvg`、`CAT_PALETTES` | Wendy 的两只像素猫。换成送礼人自己宠物的配色，或者整段删掉（连带 `buddy`、`edition-cat`、`world-cat`、护照角上的猫）。 |
| `app.js` | `HER_COLORS` / `HIS_COLORS` / `FESTIVE` 等 | 彩纸颜色，跟着两套配色改。 |
| `app.js` | `VISITED` / `ELSEWHERE` | 大结局地图：`VISITED` 先落地、画得更大，其余国家放在 `ELSEWHERE`。格式 `[ISO 代码, 纬度, 经度]`。 |
| `index.html` | 标题、`.logo`、`.journey-end`、`.eyebrow`、`h1`、页脚、`.world-title`、`.edition-*` | 名字、标志、开头问候、署名、报头。 |
| `index.html` | Google Fonts 链接 | 只保留用到的字体。 |
| `styles.css` | 开头的字体和 token、`.logo-her`、纸张纹理、`.edition` | 按两个人的风格重画。`--t` 从 0 走到 1，很多样式靠它插值，保留这个机制。命名约定：`her` = 送礼人，`his` = 寿星。 |
| `fonts/` | 自托管字体 | 换字体时同时换掉对应的 OFL 许可证文件。 |

页脚的「Adapted from TapTalk」致谢要保留。

**不要动**：`contact-tracker.mjs`、`models/hand_landmarker.task`、`LIVE_CONTACT_OPTIONS`，这些参数都是调好的。

## 语音

- 默认播放录好的 `audio/name-<i>.m4a`、`audio/greet-<i>.m4a`，比浏览器朗读稳定。
- **Mac**：改完 `fingers.js` 后运行 `node make-audio.mjs`，16 段全部重录。缺某种语言的声音，就去「系统设置 → 辅助功能 → 朗读内容 → 系统声音」下载。
- **Windows / 没有 Node**：改用浏览器朗读。把 `fingers.js` 改成 `export const audioFor = () => undefined;`，删掉 `app.js` 里预加载那行（`FINGERS.forEach(... getClip(audioFor(i, part)))`），再删掉 `audio/`。只删文件不改代码的话，可能会念两遍。
- 页面右上角 ✎ 可以直接在网页里改昵称、祝福和语言，改过的行用浏览器朗读；「复制链接」会把修改带进网址里。

## 检查

给用户看之前，自己先完整走一遍：
- 不开摄像头：按 1–8，颜色一步步变化，护照邮戳对得上；最后一根放完整个结局，报纸里的昵称和信都是新的。
- 开摄像头：左手食指到小指是 1–4，右手是 5–8。
- 按 S 显示 / 隐藏手指栏，↺ 重新开始，彩蛋可用。
- 手机竖屏和桌面各看一次布局。

## 发给寿星

摄像头需要 HTTPS，所以要放到网上：
- **Netlify Drop**：把项目文件夹拖到 https://app.netlify.com/drop 。
- **Vercel**：在项目文件夹里运行 `npx vercel`，Framework 选 Other。

部署前提醒用户：拿到网址的任何人都能打开。
