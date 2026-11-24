# Persona: Wendy / 送礼人档案：Wendy

An example **persona** — the sender's side of the card, the starting point (`--t = 0`). Write one like it for each new sender before designing anything. A persona is *who is giving the card*: their own look, marks, mascots and voice. The recipient's side is a separate file (see `website-cjinn.md`).

一份**送礼人档案**的示例：卡片的起点（`--t = 0`），也就是「谁送的」。每个新的送礼人先照这个格式写一份，再开始设计。收礼人那一边是另一份文件（见 `website-cjinn.md`）。

Source / 来源：https://wenyufan.vercel.app

---

## Look / 视觉

- **Type / 字体**
  - Her lines (the nickname, "Hi, CJINN.", the monogram): Source Serif 4 Light (300), often italic. `--font-her`
    她那一半（昵称、「Hi, CJINN.」、标志）：Source Serif 4 Light，常用斜体。
  - Body: Open Sans. `--font-her-sans` · Labels and counters: IBM Plex Mono. `--font-her-mono`
    正文 Open Sans；标签和计数 IBM Plex Mono。
- **Colour / 颜色**（`FROM` in `app.js`, `:root` in `styles.css`）
  - Ink `#1B2D42` (deep navy, never pure black) · accent `#1D5C82` · soft `#7397AB` · tint `#E6EEF3` · page `#F6F8FA`.
  - Sage `#A8C3BC` as the second identity colour.
  - Confetti `HER_COLORS`: `#7397AB #A8C3BC #1D5C82 #8BA391 #E8A6B0 #E9A23B #FFFFFF` — small pixel squares.
- **Camera-off card / 未开摄像头时**：night-blue gradient (`--stage-bg #1B2D42`) that turns to the recipient's paper as names are collected.
  夜蓝色渐变，随着收集进度变成对方的纸色。

## Marks / 标志

- **WF monogram**: "W" over "F", set vertically; on hover the rest unfolds to WENYU FAN with a small stagger (`.logo-her`).
  竖排的 W / F，鼠标移上去展开成 WENYU FAN，逐字错开。

## Mascots / 吉祥物

- Two pixel British Shorthairs in party hats (`catSvg`, `CAT_PALETTES`):
  - 大鱼 Big Fish — blue-white, orange eyes, white blaze and socks (`fish`, the default).
  - 小竹子 Small Bamboo — golden, green eyes, tabby stripes (`bamboo`).
- Where they appear: the buddy on the stage (hops on each tap, says 喵～ on the `meow` finger), the corner of each passport stamp, the world map, the edition signature, and a cat parade at the end of the finale.
  出现的位置：舞台上的小猫（每次触碰会跳一下，`meow` 那根手指会说「喵～」）、护照邮戳角落、世界地图、特刊署名处，以及大结局最后的猫咪游行。
- The hat's stripes use the recipient's terracotta: her cat, dressed for his party.
  帽子条纹用收礼人的陶土红：她的猫，穿着他派对的颜色。

## Voice / 语气

- Short, warm, bilingual labels with a middle dot: 「打开摄像头 · Open the card」「重新开始 · Start over」.
  短、温暖，中英双语用间隔号连接。
- Signs off as "— Wendy" and "Love, Wendy".

## Role in the card / 在卡片里的位置

- Each tap: **her half first** — the nickname, in her serif and blue (`.cap-her`) — then the recipient's half answers with the greeting.
  每次触碰先出现她那一半：昵称，用她的衬线体和蓝色；然后收礼人那一半用祝福回应。
- Everything that blends from her to him reads `--t`; her values are the `t = 0` end.
