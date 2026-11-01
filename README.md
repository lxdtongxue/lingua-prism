# 语棱 Lingua Prism

面向第二、第三外语选择的五维决策框架网站样稿。内容依据 `../ASJP.md` 整理，“语棱”是暂定名。

## 运行

```bash
PATH=/opt/homebrew/bin:$PATH npm run dev
```

打开 http://localhost:5173 。构建用 `npm run build`，产物在 `dist/`。

## 部署

推送到 `main` 后，`.github/workflows/deploy.yml` 会自动构建并发布到 GitHub Pages。线上路径跟随仓库名，改名后无需改配置。

## 结构

| 位置 | 内容 |
| --- | --- |
| `src/content/content.ts` | 所有中英文文案、文献列表和实验台占位数据 |
| `src/sections/` | 页面各段：首屏、框架、五维、能力、实验台、路线、页脚 |
| `src/components/Glass.tsx` | 玻璃面板。普通 DOM 元素包上它，背后就有真实折射 |
| `src/gl/engine.ts` | 渲染引擎：滚动同步、指针、弹簧动画、自适应画质 |
| `src/gl/shaders.ts` | 全部 GLSL：场景、模糊、镜面地面、玻璃 |
| `public/fonts/` | 未修改的 HarmonyOS Sans 字体和许可文本 |

## 新增内容

- 改文字或数据：只动 `content.ts`，中英文要同时改。
- 新增一块玻璃：`<Glass radius={30} bevel={13} frost={0.74} dim={0.42}>…</Glass>`。
- 悬浮在 DOM 内容之上的元素（导航、弹窗）用 CSS 类 `.chrome`。WebGL 看不到 DOM，所以这类元素不能用 `Glass`。
- 带自有动画的玻璃（比如滑块）要自己写 `transform`，并传 `reveal={false}`。
- 需要液态选中效果的标签组用 `useLens`（见 `src/components/useLens.ts`），滑块会自动跟随布局变化。滑块的 `Glass` 要传 `layer={1}`，否则会被父面板盖住。

## 两种玻璃

| | `Glass`（WebGL） | `.chrome`（CSS） |
| --- | --- | --- |
| 用在 | 页面内容里的面板和按钮 | 浮在内容上方的导航、语言切换 |
| 折射内容 | 背景场景，看不到 DOM 文字 | 浏览器合成的全部内容 |
| 效果 | 折射、色散、反射、涟漪 | 模糊和高光 |

## 关于字体许可

HarmonyOS Sans 免费，但有条件：

- 不能修改字体文件，所以**不能做子集化或转 WOFF2**。
- 必须在软件里显著声明使用了该字体，页脚已包含。
- 必须保留版权声明和许可文本，见 `public/fonts/LICENSE.txt`。
- 不能单独分发或出售字体。

部署时给 `.ttf` 开启服务器的 gzip 或 brotli 传输压缩。这只压缩传输过程，不改动文件。

## 开发调试

- 引擎是带 WebGL 上下文的单例，所以 `src/gl/` 的改动会触发整页刷新，这是 `vite.config.ts` 特意设置的。
- 开发模式下控制台有 `__engine`：`__engine.bench()` 直接测各画质档的 GPU 耗时，`__engine.settle()` 立即完成所有入场动画。
- 后台或隐藏的标签页会节流 `requestAnimationFrame`，这时看到的帧率不代表真实性能。
