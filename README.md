# 语棱 Lingua Prism

语棱 Lingua Prism 是一个面向第二、第三外语选择的决策支持网站。系统从五个维度评估候选语言：跨语言相似性（T）、语言学能与适应性（A）、学习目标匹配度（G）、学习资源可获得性（R）和个人偏好匹配度（P）。

线上地址：https://lxdtongxue.github.io/lingua-prism/

## 本地运行

```bash
PATH=/opt/homebrew/bin:$PATH npm run dev
```

启动后访问 http://localhost:5173 。

| 命令 | 用途 |
| --- | --- |
| `npm test` | 运行单元测试 |
| `npm run build` | 类型检查并构建到 `dist/` |

推送到 `main` 后，GitHub Actions 自动发布到 GitHub Pages。

## 项目结构

| 位置 | 内容 |
| --- | --- |
| `index.html`、`test/`、`survey/` | 首页、测验页和问卷页三个入口。后两者不加载 WebGL 引擎 |
| `src/content/content.ts` | 中英文文案和文献列表 |
| `src/a/` | A 与 T 的算法 |
| `src/decision/` | G、R、P 的算法、权重生成和问卷 |
| `src/tall/` | 站内测验流程和题目校验，题目配置说明见 `src/tall/README.md` |
| `src/data/` | 常模、语言需求、决策数据和 ASJP 距离矩阵，来源见 `src/data/LICENSE.md` |
| `src/components/pager.ts` | 移动端分页，`GROUPS` 须与 `App.tsx` 的 `.tabpage` 保持一致 |
| `src/gl/` | WebGL 渲染引擎和着色器 |
| `public/tall/`、`public/fonts/` | 测验材料和字体 |

## 开发规范

- 新增或修改文案时，须同时更新中英文。
- 页面内的卡片和按钮使用 `Glass`。该组件由 WebGL 绘制于 DOM 之后，不受 `overflow` 裁剪，因此不得用于悬浮导航或随面板滚动的元素；此类元素应使用 CSS 玻璃。
- 自行控制 `transform` 的 `Glass` 须传入 `reveal={false}`。
- `src/gl/` 的改动会触发整页刷新，以避免引擎单例重复实例化。
- “自动作答”开关仅在开发环境提供，不进入生产构建。

## 许可与数据

- TALL 题目与常模采用 CC BY-NC-SA，本站不得用于商业用途；A 在基础版与进阶版中必须保持一致。
- HarmonyOS Sans 字体文件不得修改或单独分发，须保留页脚声明和 `public/fonts/LICENSE.txt`。
- 测验结果和问卷答案仅保存在用户本地浏览器，不上传服务器。

## 已知限制

- T 目前仅包含 ASJP 基本词汇相似性，汉字词和语法相似性尚未接入。
- 进阶版尚无账号与付费机制，目前为开放试用。
- G、R 中的就业、学术、线上三列为经验定档，尚待统计数据替换。
- A 的部分语法数据由 AI 编码，尚未经人工核实。
- 尚未在真实移动设备和 Safari 上完成测试。

## 更新日志

各版本变更见 [CHANGELOG.md](CHANGELOG.md)。
