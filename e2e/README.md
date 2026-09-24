# E2E（Playwright）

浏览器级整链路测试：前端 + 后端 + SQLite 一起跑，保护真实用户操作路径上的跨模块断裂。

## 运行

```bash
npm run e2e      # 串行跑一遍全部场景
npm run e2e:ui   # 带 UI 模式调试
```

首次在本机运行前需要一次浏览器安装（只装 Chromium）：

```bash
npx playwright install chromium
```

不需要提前 `npm run dev`：Playwright 会自行拉起并在结束后关闭前后端。

## 测试数据库隔离（硬性约束）

- E2E 后端进程固定带 `TRIVIA_DB_PATH`，只打开测试库 `tmp/e2e/trivia-e2e.db`。
- **绝不触碰真实用户库 `backend/data/trivia.db`**：`e2e/e2e-environment.js` 里的
  `assertE2EDatabasePathIsSafe()` 会在路径等于真实库、或不在 `tmp/e2e/` 内时直接抛错。
- 每次运行前由 `e2e/global-setup.js` 删除并重建测试库（复用后端现有
  `backend/scripts/init-db.js` 与项目种子数据），因此第二次运行不依赖第一次的残留数据。
- `tmp/` 已在 `.gitignore` 中，测试库与失败产物都不会入库。

## 端口

| 服务 | 端口 | 说明 |
| --- | --- | --- |
| 后端 | 3100 | 刻意避开开发默认端口，避免误连开发者正在运行的服务 |
| 前端 | 3101 | vite dev server，`/api` 代理到 3100 |

端口可用 `E2E_BACKEND_PORT` / `E2E_FRONTEND_PORT` 覆盖。

`webServer` 使用 `reuseExistingServer: false`：端口被占用时直接失败，而不是连到别的服务。

## 结构

```
playwright.config.js          # 只跑 Chromium，workers: 1，负责拉起前后端
e2e/e2e-environment.js        # 端口/路径/隔离校验的唯一事实来源
e2e/prepare-e2e-database.js   # 重建隔离测试库（单一职责）
e2e/global-setup.js           # 每次运行前调用上面的重建
e2e/support/quiz-flow.js      # 练习流程共享辅助（识别当前题目、确定性选择选项）
e2e/specs/                    # 六组核心场景
```

## 场景

1. `specs/router-pages.spec.js` — 工具台/设置页的路由状态（第一阶段 Router 迁移回归）：
   首页进入、分栏切换、URL 同步、刷新恢复、浏览器后退、非法 slug 收敛、设置页深链接。
2. `specs/quiz-practice.spec.js` — 核心练习流程：首页进入自由练习、题目真实渲染、
   真实作答、进度前进、进入下一题。
3. `specs/wrong-book-review.spec.js` — 错题闭环：故意答错 → 对比正确答案的反馈 →
   错题温习列表出现该题 → 重新开练并回到同一道题。
4. `specs/daily-chest.spec.js` — 今日任务 → 今日宝箱 → 长期成长：预置今日 3/3 →
   首页领取宝箱 → 显示「获得 1 枚探险印章」→ reload 后仍是今日已领取 →
   重复领取不会让累计数 +1（幂等），2/3 时不能领取。
5. `specs/adventure-collection-book.spec.js` — 探险收藏册：首页与闯关地图都能打开，
   且各自使用自己那一章（首页 = 首页成长区章节，闯关地图 = 当前选中章节），
   印章按最近日期展示、无印章时是儿童化空状态。
6. `specs/home-reward-loop.spec.js` — 首页奖励闭环优化：3/3 时「宝箱可以打开啦」
   把宝箱滚进视野（不自动领取）、领取后提示消失、一次性奖励可点开收藏册、
   成长区印章摘要整行可点、欢迎区不再重复主线建议、1024 双列 / 390 单列不回归。

## 说明

- `workers: 1`：单文件 SQLite + 本地家庭学习系统，串行换取确定性。
- 测试**不访问互联网**、不调用任何 AI 服务：AI 相关能力在测试路径中被避开，
  且干净浏览器上下文里没有任何 AI 配置。
- 正确答案通过项目自身的 `POST /api/questions/submit` 取得（该接口只判题、不写库）。
- 当前没有新增 `data-testid`：场景所需的元素都能用 role / aria 语义定位。
