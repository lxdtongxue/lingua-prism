# 语棱 Lingua Prism · GRP 权重自动分配与 A 分数计算技术规范

| 项 | 内容 |
|---|---|
| 文档编号 | LP-ALG-GRP-001 |
| 版本 | **v1.3（定稿 · 含 A 公式修订）** |
| 日期 | 2026-11-06 |
| 适用范围 | GRP 权重生成/锁定/展示 + A 分数计算 |
| 状态 | **归档 · 可落地** |

## 版本历史

| 版本 | 日期 | 修订 |
|---|---|---|
| v1.0 | 2026-11-06 | 初稿 |
| v1.1 | 2026-11-06 | 修正 0.5 偏移解释；新增置信加权；CR 阈值调整 |
| v1.2 | 2026-11-06 | 补入敏感性/方差分析；发现 A 失效 |
| **v1.3** | **2026-11-06** | **A 公式改为余弦相似度；两轮对比定稿；更新代码与测试** |

---

# 摘要

**结论 1**：GRP 权重分配算法数学稳健，Top-3 零翻转（实测）。

**结论 2**：**A 分数（加权平均）失效** —— 25 门语言 SD=1.28，均衡型用户必塌缩为常数。

**结论 3**：**余弦相似度全面胜出** —— 四种能力画像 SD = 4.79 ~ 11.18，均衡型与极端型均修复。

**落地**：权重算法按 §5–§8 实施；**A 公式按附录 B 替换**。

---

# 目录

1. 概述与约束
2. 符号表
3. 理论基础
4. 数据输入
5. GRP 算法（πL / πS / 合成）
6. 权重分配与锁定
7. 边界与稳定性
8. 可解释性
9. 技术实现
10. 算例
11. 单元测试
12. 实测：敏感性与方差分析
13. **落地实施清单**
14. **参数定稿**
15. 参考文献
- **附录 A 归档脚本**
- **附录 B A 分数公式修订（本次新增）**

---

# 1–11. GRP 权重部分

（同 v1.2 §1–§11，含 πL / πS / 置信加权 / 守恒 / 比例不变 / 单调性全部证明、边界处理、evidence 输出、TypeScript 实现、完整算例、11 条单测。此处从略，完整内容见 v1.2 归档。）

**核心公式**：

$$\pi = \lambda\pi^L + (1-\lambda)\pi^S,\quad \lambda = \min\left(1, \frac{\max s - \min s}{2.0}\right)$$

$$\mathrm{rest} = 100 - T - A,\qquad w_d = \mathrm{rest}\cdot\pi_d$$

---

# 12. 实测

## 12.1 敏感性分析

| 画像 | Top-3（k 全区间） | 判定 |
|---|---|---|
| A 目标导向 | de > fr > ja | ✅ 稳健 |
| B 兴趣导向 | de > fr > es | ✅ 稳健 |
| C 全中性 | de > fr > ja | ✅ 稳健 |

**参数敏感度**：c < 4%、τ 影响 25%（Top-3 不变）、k 全区间不翻转。λ 退化机制（spread=0 ⟹ λ=0）实测验证 ✅

## 12.2 方差分析

| 维度 | 方差 | 占比 |
|---|---|---|
| T | 50.76 | 2.0% |
| **A** | **1.64** | **0.1%** |
| G | 896.20 | 35.1% |
| R | 1189.56 | 46.6% |
| P | 414.00 | 16.2% |

**诊断**：H1（T/A 主导）不成立；**H3（头部语言结构性断层）成立** —— de/fr/ja 的 G、R 在 82–100，第二梯队 0–50。

**H4（A 失效）成立** —— 见附录 B。

---

# 13. 落地实施清单

## 13.1 阻塞 V9.2 发布

| # | 项 | 文件 | 说明 |
|---|---|---|---|
| 1 | **排查"等分"原因** | `Lab.tsx` | 打印 `answers.confirmed` / `weightInput` |
| 2 | **G/R/P 锁定** | `Lab.tsx` | `<Slider locked>` |
| 3 | **改 blendConfident** | `score.ts` | 替换固定 k |
| 4 | **A 公式替换** | `src/a/score.ts` | **见附录 B** |
| 5 | 数值动画 | `Lab.tsx` | 200ms 过渡 |
| 6 | 单元测试 | `score.test.ts` | 补 §11 + 附录 B |

## 13.2 验收标准

```
□ G/R/P 在 PREVIEW/LOCKED 不可拖动
□ T/A 拖动时 G:R:P 比例不变
□ T+A+G+R+P ≡ 100
□ A 在 25 门语言上 SD > 4（均衡型用户）
□ 11 + 3 条单测全绿
```

---

# 14. 参数定稿

| 参数 | 定稿值 | 依据 |
|---|---|---|
| `c`（偏移） | 0.5 | 实测不敏感（<4%） |
| `τ`（置信阈值） | 2.0 | Top-3 钝感 |
| Saaty 标度 | `{1/4,1/2,2,4}` | 四档语义 |
| `RI(3)` | 0.58 | Saaty |
| CR 阈值 | 0.16 | 小矩阵放宽 |
| T/A 上限 | 40 | 防单维独大 |
| **A 公式** | **余弦相似度** | **见附录 B** |
| **A 归一化** | **线性拉伸** | 改善绝对值观感 |

---

# 15. 参考文献

1. Likert (1932) · 2. Saaty (1980) · 3. Choo & Wedley (1985) · 4. Aguarón & Moreno-Jiménez (2003) · 5. Bana e Costa & Vansnick (2008) · 6. Barzilai (2005) · 7. Crowne & Marlowe (1960) · 8. Gardner & Lambert (1972) · 9. Deci & Ryan (2000) · 10. Hidi & Renninger (2006)

---

# 附录 A · 归档脚本

| 脚本 | 用途 |
|---|---|
| `sensitivity.ts` | 参数敏感性 + Top-3 稳定性 |
| `variance.ts` | 各维度方差分析 |
| `variance-a.ts` | A 区分度诊断（4 画像） |
| `a-formula-compare.ts` | A 公式第一轮（加权/短板/交互） |
| `a-formula-v2.ts` | **A 公式第二轮（余弦/几何/z-score）** |

---

# 附录 B · A 分数公式修订

## B.1 问题诊断

### B.1.1 现象

```
25 门语言 A 分数：60.9 ~ 65.2
SD = 1.28   方差 = 1.64   极差 = 4.34
```

**接近常数，在总分中实际不起作用。**

### B.1.2 根因：加权平均是凸组合

$$A(L) = \frac{\sum_k \beta_k D_k(L) P_k}{\sum_k \beta_k D_k(L)} = \sum_k w_k(L)\cdot P_k,\quad \sum_k w_k = 1$$

**这是 $P$ 向量的凸组合，结果必落在 $[\min P, \max P]$ 内。**

### B.1.3 数学必然性（实测验证）

| 画像 | P 极差 | 加权平均 SD | 判定 |
|---|---|---|---|
| 本次 (71,55,62) | 16 | 1.28 | ❌ |
| **均衡 (60,60,60)** | **0** | **0.00** | 🔴 **必塌缩** |
| 分化 (90,30,50) | 60 | 5.18 | ⚠️ |
| 极端 (95,5,45) | 90 | 7.18 | ⚠️ |

**A_SD ≈ P极差 × 0.08**，线性关系。

**当 $P_{LA}=P_{SD}=P_{VL}$ 时，凸组合恒等于 $P$** —— 对所有语言完全相同。这是数学性质，不是 bug。

## B.2 六种公式对比（两轮实测）

| 公式 | 本次 | **均衡** | 分化 | **极端** | 判定 |
|---|---|---|---|---|---|
| ① 加权平均 | 1.28 | **0.00** | 5.18 | 7.18 | ❌ 均衡型塌缩 |
| ② 短板惩罚 | 4.59 | 4.35 ✅ | 4.81 | **0.21** | ❌ 极端型塌缩 |
| ③ 交互项 | 0.40 | 0.42 | 0.51 | 0.63 | ❌ 全部太弱 |
| ⑤ 几何短板 | 3.58 | 3.49 | 4.63 | **0.88** | ❌ 极端型塌缩 |
| **④ 余弦相似度** | **4.98** | **4.79** | **8.39** | **11.18** | ✅ **胜出** |
| ⑥z 标准化 | 10.00 | 10.00 | 10.00 | 10.00 | ✅ 兜底 |

## B.3 定稿：余弦相似度

$$\boxed{\ A(L) = \cos\big(D(L),\ P\big) \times 100 = \frac{\sum_k D_k(L)\,P_k}{\sqrt{\sum_k D_k(L)^2}\cdot\sqrt{\sum_k P_k^2}} \times 100\ }$$

其中 $D(L) = (D_{LA}(L), D_{SD}(L), D_{VL}(L))$，$P = (P_{LA}, P_{SD}, P_{VL})$。

### B.3.1 为什么余弦赢

| 场景 | 加权平均 | **余弦** |
|---|---|---|
| 均衡型 P=(60,60,60) | 凸组合恒等于 60 → SD=0 | $P$ 方向固定，$D(L)$ 方向变 → **SD=4.79** ✅ |
| 极端型 P=(95,5,45) | 被 $\bar P$ 主导 | 夹角随 $D(L)$ 变 → **SD=11.18** ✅ |
| 分化越大越好 | 波动大 | **SD 单调递增** ✅ |

**几何意义**：测「你的能力画像朝向」与「这门语言的难点画像朝向」的**夹角**。夹角越小越匹配。

### B.3.2 数学性质

**命题 B1（有界）**：$A \in [0, 100]$（Cauchy-Schwarz 不等式）
**命题 B2（均衡型不塌缩）**：$P = c\mathbf{1}$ 时，$A = 100\cdot\frac{\sum D_k}{\sqrt3\|D\|}$，随 $D$ 的方向变 ✅
**命题 B3（尺度不变）**：$A(D, \alpha P) = A(D, P)$，对 $P$ 整体缩放不敏感 ✅

### B.3.3 归一化（可选，改善绝对值观感）

余弦分数偏高（大部分 80–100），因为 $D$、$P$ 均为正。线性拉伸：

$$A'(L) = 100 \times \frac{A(L)/100 - c_{min}}{1 - c_{min}},\qquad c_{min} = \min_L \cos(D(L), P)$$

**效果**：最匹配 = 100，最不匹配 = 0。**建议在 UI 展示 $A'$，计算用 $A$。**

## B.4 TypeScript 实现

```ts
// src/a/score.ts —— 替换 scoreA
export function scoreA(lang: Lang, p: Partial<Record<Ability, number>>): number | null {
  const P = [p.LA, p.SD, p.VL] as number[]
  const D = [lang.D_LA, lang.D_SD, lang.D_VL] as number[]
  const known = [0, 1, 2].filter((i) => P[i] != null)
  if (!known.length) return null

  let dot = 0, nd = 0, np = 0
  for (const i of known) {
    dot += D[i] * (P[i] as number)
    nd  += D[i] * D[i]
    np  += (P[i] as number) ** 2
  }
  const den = Math.sqrt(nd) * Math.sqrt(np)
  return den > 0 ? (dot / den) * 100 : null
}

// 归一化（25 门语言内）
export function normalizeA(raw: Map<string, number>): Map<string, number> {
  const vals = [...raw.values()]
  const lo = Math.min(...vals), hi = Math.max(...vals)
  if (hi - lo < 1e-9) return new Map([...raw].map(([k]) => [k, 50]))
  return new Map([...raw].map(([k, v]) => [k, 100 * (v - lo) / (hi - lo)]))
}
```

## B.5 单元测试

```ts
describe('A 公式（余弦相似度）', () => {
  it('均衡型 P=(60,60,60) 仍有区分度', () => {
    const P = { LA: 60, SD: 60, VL: 60 }
    const vals = LANGS.map((l) => scoreA(l as unknown as Lang, P)!)
    const sd = stddev(vals)
    expect(sd).toBeGreaterThan(4)      // 实测 4.79
  })

  it('极端型 P=(95,5,45) 不塌缩', () => {
    const P = { LA: 95, SD: 5, VL: 45 }
    const vals = LANGS.map((l) => scoreA(l as unknown as Lang, P)!)
    expect(stddev(vals)).toBeGreaterThan(4)   // 实测 11.18
  })

  it('输出范围 0-100', () => {
    for (const l of LANGS) {
      const a = scoreA(l as unknown as Lang, { LA: 71, SD: 55, VL: 62 })
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThanOrEqual(100)
    }
  })

  it('尺度不变：P 整体缩放不改结果', () => {
    const l = LANGS[0] as unknown as Lang
    expect(scoreA(l, { LA: 71, SD: 55, VL: 62 })).toBeCloseTo(
      scoreA(l, { LA: 142, SD: 110, VL: 124 })!, 6)
  })

  it('缺失子测验时只用已有项', () => {
    expect(scoreA(LANGS[0] as unknown as Lang, { LA: 70 })).not.toBeNull()
  })
})
```

## B.6 影响面与兼容性

| 影响 | 说明 |
|---|---|
| **A 分数** | 变化显著（0-100 分布，不再是 60-65） |
| **总分排序** | A 权重 20%，A 变化会改变排序 |
| **历史记录** | 建议在 CHANGELOG 标注「A 计算方式变更」 |
| **解释文案** | `explainA` 需同步改（A 的含义从"加权能力"变为"画像匹配度"） |
| **A 的显示** | 建议加 ⓘ 说明"反映能力画像与语言难点画像的匹配程度" |

## B.7 文档同步

| 文件 | 改什么 |
|---|---|
| `五项指标计算方法.md` | A 的公式 |
| `A量化_网站实现说明.md` | §4 公式 + §6 解释文案 |
| `官网二级页面文案.md` | A 的描述 |
| `README.md` / `CHANGELOG.md` | 标注变更 |

---

**文档结束 · v1.3**
