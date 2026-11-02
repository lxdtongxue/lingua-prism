# TALL 题目配置

题目全部在 `public/tall/tall_items.json`，图片和音频放在同目录，配置里写相对 `public/tall/` 的路径。
当前内容是 TALL 书面版 Set A，试听页用 Set B 的一个录音，避免多给 Set A 一次练习。改动后运行 `npm test`：数量、答案或文件写错时，测试会逐条列出，网站加载时也会做同样的检查。

| 路径 | 内容 |
| --- | --- |
| `version` | 固定为 `1` |
| `placeholder` | `true` 时每个测验页都显示“占位材料”，结果也会带上标记 |
| `set` | 使用的平行版本，只作记录 |
| `vl.studySeconds` | 学习时长，120 |
| `vl.items[20]` | `id`、`image` 图片、`word` 悬停时显示的新词。数组顺序就是学习阶段的固定布局 |
| `sd.timeLimitSeconds` | 每题上限，15 |
| `sd.highlightDelaySeconds` | 混合短语阶段，录音开始后多久高亮答案，2 |
| `sd.audition` | 试听页播放的录音 |
| `sd.sounds[3]` | `id`、`image` 图片、`audio` 基本音录音（题目表的 L1） |
| `sd.lead[3]` | 紧接基本音、按固定顺序播放的短语（L2）：`id`、`audio`、`sound` 对应的基本音 `id` |
| `sd.phraseSets[4][3]` | 其余 4 组短语（L3 到 L6），12 个一起打乱播放，字段同上 |
| `sd.items[30]` | `id`、`audio`、`answer` 正确基本音的 `id`、`block`。三个基本音各 10 题；`block` 小的先出，同一 block 内随机，全部不写 `block` 就是完全随机 |
| `la.studySeconds` | 学习时长，300 |
| `la.study[20]` | `id`、`image` 图片、`text` 句子。数组顺序就是按钮 1 到 20，每行 5 个 |
| `la.items[30]` | `id`、`image` 图片、`options` 4 个句子、`answer` 正确选项的序号（0 到 3）。显示时选项顺序会打乱 |
