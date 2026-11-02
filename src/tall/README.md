# TALL 题目怎么填

题目都在 `public/tall/tall_items.json`，图片和录音也放在 `public/tall/` 下面，配置里写相对路径就行。

现在用的是书面版 Set A。试听页特意用了 Set B 的一段录音，这样不会让用户提前多听一遍 Set A。

改完跑一下 `npm test`。题数不对、答案写错、文件缺了，都会报出来。

| 字段 | 填什么 |
| --- | --- |
| `version` | 写 `1` |
| `placeholder` | 填真题时写 `false`。写 `true` 页面会标“占位材料” |
| `set` | 用的哪一套，只是留个记录 |
| `vl.studySeconds` | 学习时长，120 |
| `vl.items[20]` | `id`、`image`、`word`。排列顺序就是学习页的布局 |
| `sd.timeLimitSeconds` | 每题上限，15 |
| `sd.audition` | 试听用的录音 |
| `sd.sounds[3]` | 三个基本音：`id`、`image`、`audio`。用官方读两遍的 `_twice` 录音 |
| `sd.lead[3]` | 基本音之后的第一组短语（L2），顺序固定：`id`、`audio`、`sound` |
| `sd.phraseSets[4][3]` | 后面四组短语（L3 到 L6），组序和组内顺序都会打乱 |
| `sd.items[30]` | `id`、`audio`、`answer`、`block`。三个音各 10 题，`block` 小的先出，不写就全部随机 |
| `la.studySeconds` | 学习时长，300 |
| `la.study[20]` | `id`、`image`、`text`。顺序对应按钮 1 到 20 |
| `la.items[30]` | `id`、`image`、`options`（4 句）、`answer`（0 到 3）。选项显示时会打乱，所以正确答案放第几个都行 |
