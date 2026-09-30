# Wonder Trivia Island

面向小学生的趣味答题系统，前端使用 Vite + Vue 3，后端使用 Node.js + Express + SQLite。
当前正式版本为 `v1.6.0`，已经覆盖每日学习冒险首页、答题冒险、闯关世界地图、知识岛成长、讲堂地图、弱项专项练习、探险收藏册、成长纪念册、题库管理、外部 Harness 出题导入、本地整轮学习总结、首页欢迎语、错题温习、知识学习、闯关进度和设置中心。

当前实现使用 Node.js 24+ 自带的 `node:sqlite` 访问 SQLite 数据库，避免额外安装原生驱动带来的兼容问题。

## 目录结构

```text
.
|-- backend/
|   |-- data/                # SQLite 数据、CSV 种子题、replace 备份
|   |-- scripts/             # 初始化、导出、题量盘点脚本
|   |-- src/
|   |   |-- db/              # SQLite 连接与事务辅助
|   |   |-- questions/       # 题目仓储、类型、知识标签别名
|   |   |-- routes/          # questions / challenge / study record API
|   |   `-- services/        # 导入校验、本地整轮学习总结
|   `-- test/
|-- frontend/
|   |-- src/
|   |   |-- audio/           # 背景音、音效、学习讲解音频索引
|   |   |-- components/      # 弹窗、设置面板、学习卡片等
|   |   |-- composables/     # 答题、导入、闯关、设置、学习运行时
|   |   |-- stores/          # Pinia 状态
|   |   `-- views/           # 首页、答题、题库、导入、学习、错题、设置
|   `-- package.json
|-- docs/                    # 流程文档与生成产物
|-- scripts/                 # 根目录开发与音频处理脚本
|-- .gitignore
|-- .env.example
|-- package.json
`-- README.md
```

## 表结构

```sql
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL CHECK (subject IN ('语文', '数学', '英语')),
  grade TEXT NOT NULL CHECK (grade IN ('一年级', '二年级', '三年级', '四年级', '五年级', '六年级')),
  semester TEXT NOT NULL CHECK (semester IN ('上册', '下册', '通用')),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  options TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  CHECK (NOT (grade = '一年级' AND subject = '英语'))
);
```

## 快速开始

```bash
git clone https://github.com/zdhgg/Wonder-Trivia-Island.git
cd Wonder-Trivia-Island
npm run setup
npm run backend:init-db
npm run dev
```

推荐环境：

- `Node.js 24.14+`
- `npm 11+`

首次安装：

```bash
npm run setup
```

初始化数据库并启动联调：

```bash
npm run backend:init-db
npm run dev
```

如果你只想单独启动后端：

```bash
npm run backend:start
```

如果你只想单独构建前端：

```bash
npm run frontend:build
```

如果你要导出当前内置的分册种子题为 CSV：

```bash
cd backend
npm run export-seed-csv
```

生成文件位置：

- `backend/data/question-seed.csv`

项目根目录提供了 `.env.example`，可按需创建 `.env` 覆盖端口、数据库和 AI 运行时默认值。

推荐的联调方式：

```bash
npm run setup
npm run backend:init-db
npm run dev
```

这会同时启动：

- 后端开发服务
- 前端 Vite 开发服务

如果项目根目录存在 `.env`，当前会自动读取以下端口配置：

- `PORT`：前端开发端口
- `API_PORT`：后端 API 端口
- `HOST`：开发服务监听地址
- `TRIVIA_DB_PATH`：SQLite 数据库文件路径
- `CORS_ORIGIN`：需要跨域访问时允许的来源列表，多个来源可用英文逗号分隔

例如当前门户环境里的 `PORT=3008`、`API_PORT=8008` 会让前端起在 `3008`，并把 `/api` 代理到 `8008`。

默认部署模型是“前端和后端同源，通过 `/api` 通信”，因此默认不会对所有来源开放 CORS。
如果你要把前端和后端分开部署，再显式配置 `CORS_ORIGIN`。

如果你要在非本机环境启用题库导入，建议先配置管理口令：

```bash
# PowerShell
$env:ADMIN_IMPORT_KEY="your-import-key"
npm run backend:start
```

如果未配置 `ADMIN_IMPORT_KEY`，导入接口默认只允许本机访问。
External AI Gateway 是 **localhost-only 的本机进程间接口**：只供 DSH / External Harness 直连 `http://127.0.0.1:8008/api/external-ai/...` 使用。它只认真实 socket loopback，**不需要也不接受任何凭证**——既没有网关专用密钥，也不接受 `ADMIN_IMPORT_KEY`。它不经过 Vite，也不应通过任何远程代理或浏览器暴露给局域网。它只提供白名单查询、proposal 提交和 proposal 状态读取，不提供题库或学习记录写入。
系统运行时不调用任何模型，也不需要任何 `OPENAI_*` 配置：首页欢迎语（本地规则）和整轮学习总结（本地确定性逻辑）在本地生成；题目生成和教学演示由外部 Harness 通过 External AI Gateway 完成。现有题库查看、导入、答题、学习和闯关功能均不受影响。

启动后访问：

- `GET /api/questions/random`：按题数随机返回题目，支持按年级 / 学期 / 难度筛选
- `POST /api/questions/submit`：提交答案并返回判题结果
- `POST /api/questions/review/summary`：为整轮练习生成学习总结（本地确定性逻辑，不调用模型）
- `GET /api/questions/stats`：返回当前题库总数
- `POST /api/questions/coverage`：返回多个目标条件下的题量盘点
- `GET /api/questions`：按分页 / 学科 / 年级 / 学期 / 难度 / 关键词查看当前题库
- `PATCH /api/questions/batch/update`：批量更新题目的学科 / 年级 / 学期 / 难度
- `POST /api/questions/batch/delete`：批量删除题目
- `PATCH /api/questions/:id`：更新指定题目
- `DELETE /api/questions/:id`：删除指定题目
- `POST /api/questions/import/stage`：预检并暂存为待确认批次（不写题库）
- `GET /api/questions/import/pending`：读取当前待确认批次
- `POST /api/questions/import/confirm`：确认待确认批次并写入题库
- `DELETE /api/questions/import/pending`：丢弃当前待确认批次
- `POST /api/questions/import/preview`：预检题库数据（harness 与调试使用）
- `GET /api/challenge-progress` / `PUT /api/challenge-progress`：读取或保存闯关进度
- `GET /api/study-record-book` / `PUT /api/study-record-book`：读取或保存错题温习档案
- `GET /api/external-ai/question-stats`：External AI Gateway 查询题库统计（localhost-only）
- `GET /api/external-ai/questions`：External AI Gateway 查询白名单题目上下文（localhost-only）
- `GET /api/external-ai/learning-evidence?profileId=...`：按必填 profileId 查询聚合后的学习证据，不返回 profile 列表、profile ID 或完整学习记录 JSON（localhost-only）
- `GET/POST /api/external-ai/proposals`：读取 accepted、或按 `sourceId` 筛选 pending/rejected proposal，或提交 pending proposal（localhost-only）
- `GET /api/external-ai/proposals/:id`：查询 accepted，或按 `sourceId` 筛选单条 pending/rejected proposal（localhost-only）
- `GET /api/external-ai/teaching-demo-requests`：查询“已 accepted 且用户明确请求制作”的教学演示待生成请求（localhost-only）
- `POST /api/external-ai/teaching-demo-drafts`：提交外部 Harness 生成的受控 demo spec，校验后保存为 draft（localhost-only）
- `GET /api/proposals?status=pending|accepted|rejected`：后台审核页读取 proposal（复用 `ADMIN_IMPORT_KEY` / 本机规则）
- `POST /api/proposals/:id/accept`、`POST /api/proposals/:id/reject`：后台审核 proposal（复用 `ADMIN_IMPORT_KEY` / 本机规则）
- `GET /api/proposals/:id/teaching-demo`：后台读取教学演示的请求状态与草稿（复用 `ADMIN_IMPORT_KEY` / 本机规则）
- `POST /api/proposals/:id/teaching-demo/request`：用户点击“制作教学演示草稿”，只登记待外部生成请求，不调用任何模型（复用 `ADMIN_IMPORT_KEY` / 本机规则）
- `POST /api/proposals/:id/teaching-demo/approve`、`POST /api/proposals/:id/teaching-demo/reject`：人工审核教学演示草稿，只有内部管理接口能改状态（复用 `ADMIN_IMPORT_KEY` / 本机规则）
- `GET /health`：服务健康检查

### External AI Proposal Gateway MVP

Gateway 支持 `focus_mark`、`common_mistake`、`knowledge_update` 和 `question_type_advice` 四种类型。
proposal 只在 `pending`、`accepted`、`rejected` 三种状态之间停留；accepted 是已确认的动态知识补充，不会自动写入题库、错题记录、复习计划、题型枚举或 `henanGrade*Knowledge.js` / `studyWeakPoints.js`。

请求示例：

```bash
curl -X POST http://127.0.0.1:8008/api/external-ai/proposals `
  -H "Content-Type: application/json" `
  -d '{
    "type": "focus_mark",
    "scope": {"grade": "二年级", "subject": "数学", "semester": "上册", "knowledgeTag": "两步连推"},
    "suggestion": {"label": "近期教学重点", "reason": "课堂练习连续出现理解断点"},
    "source": {"harnessId": "teacher-ai-runner", "runId": "2026-09-28-001"},
    "evidence": {"questionIds": [123, 456], "wrongCount": 8, "note": "来自课堂错题汇总"}
  }'
```

审核入口在“工具台 → 知识提案”。审核接受后，后续 Harness 可通过 `GET /api/external-ai/proposals?status=accepted` 查询动态补充。

`source.harnessId` / `sourceId` 目前只是 proposal 的来源筛选值，不是 Harness 身份认证或安全隔离。`learning-evidence` 的 `profileId` 是必填的 opaque 精确筛选值；缺少时返回 400，不提供跨 profile 的默认聚合模式。接口不会返回 profile 列表、profile ID 或原始 `study_record_book` JSON。

### 教学演示（Teaching Demo）外部生成

所有 AI 推理与生成都在外部 Harness 完成，Wonder-Trivia-Island 只做：提供受控数据 → 接收候选结果 → 人工审核 → 校验 → 保存 → 安全渲染。系统不需要 `OPENAI_API_KEY`，不绑定任何模型供应商，也不存在 `OPENAI_TEACHING_DEMO_MODEL`。

1. 用户在“工具台 → 知识提案”里接受 proposal。proposal 的 `suggestion.teachingIntervention`（`problemType` / `recommendedIntervention` / `reason` / `suggestedDemo`）由外部 Harness 提交，旧 proposal 没有该字段时继续兼容。
2. 只有已 accepted 且 `recommendedIntervention` 为 `comparison_demo` / `micro_animation` 的 proposal，才显示“制作教学演示草稿”。点击只登记请求（`teaching_demo_requests` 表，状态 `requested`），**不调用任何模型**，页面上显示“已请求生成，等待外部 AI 提交草稿”。
3. Harness 轮询 `GET /api/external-ai/teaching-demo-requests` 取回待生成请求；请求只包含 `proposalId`、`proposalType`、`interventionType`、`scope`、`suggestion`、`teachingIntervention`、`source`、`evidence`、`requestedAt`。
4. Harness 用自己的模型（DeepSeek / Codex / 其他）生成受控 spec，再提交：

```bash
curl -X POST http://127.0.0.1:8008/api/external-ai/teaching-demo-drafts `
  -H "Content-Type: application/json" `
  -d '{
    "proposalId": 12,
    "interventionType": "comparison_demo",
    "spec": {
      "template": "comparison_demo",
      "title": "乘法口诀和乘法算式",
      "summary": "两种写法相关，但形式和题目要求不同。",
      "scene": {
        "left": {"label": "乘法口诀", "value": "三六十八", "description": "用语言记住乘法关系。"},
        "right": {"label": "乘法算式", "value": "3×6=18", "description": "用数字和运算符表示计算关系。"}
      },
      "steps": [
        {"title": "先看题目要求", "text": "题目要求填写乘法口诀。", "focus": "both"},
        {"title": "区分表达形式", "text": "三六十八是口诀，3×6=18 是算式。", "focus": "left"},
        {"title": "记住关系", "text": "两种写法相关，但不能互相替代。", "focus": "takeaway"}
      ],
      "labels": ["口诀", "算式"],
      "takeaway": "3×6=18 是正确的算式，只是没有按题目要求写成口诀。",
      "question": "题目要求写乘法口诀，应该选择哪一种？"
    }
  }'
```

5. 服务端强制检查：proposal 存在且 accepted、用户确实请求过制作、`interventionType` 与 recommendation 一致、只允许 `comparison_demo` / `micro_animation`、spec 通过白名单校验（拒绝未知字段、HTML/JS/Vue、SVG path、组件名、越界数值）。通过后保存为 `draft`，并写回 `teaching_demo_requests.status = 'submitted'`。
6. 用户在审核页用现有 Renderer 预览草稿，再“确认可用”或“不采用”。Harness 无法 approve/reject proposal 或 demo，也不能修改题库、学习记录，更不能绕过“制作”按钮主动塞 demo。

Harness 的覆盖规则（服务端强制）：一次成功的提交会把 `teaching_demo_requests.status` 从 `requested` 变为 `submitted`；此后等待人工审核中的 draft、以及已 `approved` 的 draft 都不允许 Harness 再次提交（409）。draft 被判为 `rejected` 后，必须先由用户在系统内重新登记请求（request 恢复为 `requested`，不新增第三个 request 状态），Harness 才能再次提交并得到一个新的 `draft`。`teaching_demo_requests.status` 只有 `requested` / `submitted`；`teaching_demo_drafts.status` 只有 `draft` / `approved` / `rejected`。draft 落库与 request → `submitted` 在同一个 savepoint 中完成，不会出现只有一个成功的脏状态。

`practice` 不生成演示，`guided_example` 第一版只展示推荐，均保持原有边界。草稿只停留在后台，尚未接入孩子端。

## 题库导入

前端当前主要包含这些视图：

- `首页`
- `答题冒险`
- `知识学习`
- `错题温习`
- `题库查看`
- `题库导入`
- `设置中心`
- `工具台`

其中“题库查看”和“题库导入”共享同一套管理访问规则。`v1.6.0` 当前支持：

- 初始化脚本当前会写入 `2146` 道示例题
- 答题页支持独立的出题设置面板，可设置每轮题数、每题限时、每题分值和抽题难度
- 出题设置会自动记住上次选择
- 支持 AI 单题点评和点评语音；整轮总结由本地确定性规则生成，首页欢迎语由本地规则按时段生成（均不调用模型）
- 支持错题温习与学习记录持久化
- 支持按年级 / 学期组织的闯关进度持久化
- 支持闯关世界大地图，按分册岛屿展示星星收集和章节进度
- 答题页支持年级主题、气球选项、顶部冒险栏和自动反馈弹窗
- 结算卡支持更聚焦的关卡星级、奖励、成就和下一关入口
- 答题玩法按年级提供奖励目标，四至六年级可选择稳扎稳打或冲刺策略
- 闯关关卡规则按年级区分题量、限时和通关目标
- 支持二、三年级新增闯关图片题与 SVG 审计
- 支持知识学习与配套学习讲解音频
- 支持讲堂地图，按年级分册铺开六年学习路线和讲堂进度
- 支持弱项专项练习，把薄弱点翻成知识标签后定向抽题
- 讲堂卡片支持步骤与概念动画，动画时间轴跟随旁白时长
- 设置中心支持按模型资产 ID 管理自定义 AI 模型库
- 通过命令行 harness 导入 `CSV`、`XLSX`（`npm run questions:import`）
- 查看当前题库
- 按学科筛选当前题目
- 按年级筛选当前题目
- 按学期筛选当前题目
- 按难度筛选当前题目
- 按关键词搜索题目 / 题型 / 解析 / 答案
- 直接在题库列表里编辑题目
- 直接在题库列表里删除题目
- 手工新增题目（表单填写，保存前走后端校验）
- 支持多选后批量修改学科 / 年级 / 学期 / 难度
- 支持多选后批量删除题目
- 预检并展示错误 / 警告
- 在“导入”页核对外部 harness 提交的待确认批次
- 逐行查看重复题 / 相似题的处理建议
- 确认入库或丢弃批次
- `append` 追加导入
- `replace` 覆盖导入

`replace` 模式会先自动备份现有数据库，再用新题目整体替换。
`GET /api/questions` 与导入接口、题库写接口共用同一套管理访问规则（见下一节）。

### 管理面 / External Harness 面的本机边界

三类接口的边界是「学习 vs 管理」，不是「读 vs 写」：

| 面 | 例子 | 谁能用 |
| --- | --- | --- |
| A 学习面 | `random` / `stats` / `coverage` / `submit` / `review/summary`、`study-record-book`、`challenge-progress`、`growth-*` | 本机 + 手机 / 局域网都正常使用（即使里面是 PUT / POST / PATCH / DELETE） |
| B 管理面 | `proposals`、`questions/import`、`questions/batch`、裸 `questions`、数字 id 的 PATCH / DELETE | 本机浏览器；非本机必须带 `x-admin-key` |
| C External Harness 面 | `/api/external-ai/**` | 只有本机的 DSH 直连 `http://127.0.0.1:8008`，任何浏览器都不经 Vite 代理它 |

管理面的后端语义是：

```
real socket is loopback  OR  valid ADMIN_IMPORT_KEY
```

- PC 本机浏览器做管理：**不需要** `ADMIN_IMPORT_KEY`；
- 非本机直连 backend 做管理：**必须**提供正确的 `ADMIN_IMPORT_KEY`（`x-admin-key`）；
- 判定只依据内核给出的 socket 对端地址，**完全忽略** `X-Forwarded-For` / `Forwarded` / `X-Real-IP` / `req.ip`，也不设置 `trust proxy`。

因为 Vite 代理是「服务端发起的新连接」，后端看到的对端永远是 `127.0.0.1`，所以“局域网浏览器不得调用管理面”由 **Vite 边缘**先拦：`frontend/vite.config.js` 的 `server.proxy["/api"].bypass` 读取**浏览器 → Vite 的真实 socket 地址**，非本机来源的管理面请求直接返回 404（fail-closed），根本到不了后端。External Harness 面则对**任何**来源都不代理。

`frontend/security/managementPaths.js` 是这张路径表的唯一真源（纯函数，无 I/O），`frontend/security/managementPaths.test.js` 覆盖 A / B / C 三类与易错点。

**⚠️ 换一个服务方式运行前端时，必须重新核对这条边界。** 上面的 Vite 边缘守卫只在**由本仓库的 Vite dev / preview server 提供前端**时生效：

- `frontend/vite.config.proxy.ts` 由门户系统自动生成，它本身不实现守卫，而是通过 `loadConfigFromFile` + `mergeConfig` 继承 `vite.config.js` 的 `proxy.bypass` 与 `fs.allow/fs.deny`。**如果它被重新生成成不再加载基础配置，守卫会静默消失。**
- 如果用 nginx、静态托管、门户自己的服务器或任何其它方式提供前端（`frontend/dist` 是构建产物），Vite 守卫一行都不会执行。

在以上任何一种情况下，**必须配置 `ADMIN_IMPORT_KEY`**，否则局域网设备可以管理题库。`ADMIN_IMPORT_KEY` 是显式的远程管理凭证，也是这些部署形态下唯一的兜底，请保留它。

另外，dev server 的 `/@fs/` 文件面也属于这条边界：`server.fs.allow` 只允许 `frontend/` 与 `shared/`，并对 `backend/**`、`*.db`、`*.sqlite` 加了 `fs.deny`。否则局域网里一条 `GET /@fs/<repo>/backend/data/trivia.db` 就能拿走整个题库（含答案）。

### 导入流程：harness 提交，页面确认

导入能力被拆成“机器做搬运、人做判断”两半：

1. 命令行 harness 解析表格并完成预检；
2. 预检通过后，批次被暂存到 `backend/data/staging/pending.json`，此时还没有写入题库；
3. “工具台 → 导入”页面只展示这个待确认批次，逐行列出错误、重复题和相似题的处理建议；
4. 人在页面上点确认，才会真正写入题库。

有错误的批次不会被暂存，需要先修正源数据再重新提交。

```bash
# 只预检并打印报告，不写任何东西
npm run questions:import -- backend/data/question-seed.csv --limit 1000

# 预检并提交到导入页面，等待人工确认
npm run questions:import -- backend/data/question-seed.csv --limit 1000 --mode replace --stage

# 直接用种子数据作为来源
npm run questions:import -- --from-seed --limit 20
```

`npm run` 会把 `--limit 1000`、`--mode replace` 这类“参数名 + 值”的写法当成自己的配置吃掉，只把值当位置参数传给脚本，所以 harness 参数必须用 `--` 和 npm 自身参数隔开（如上例），或者直接调用 `node scripts/import-questions.js <参数>`。

常用参数：`--mode append|replace`、`--source <标记>`、`--limit <n>`、`--stage`、`--json`、`--from-seed`。单次上限 `1000` 行，仓库自带的 `backend/data/question-seed.csv` 有 2146 行，需要配合 `--limit` 分批。
默认是 dry-run，只有显式加 `--stage` 才会暂存；预检有错误时退出码为 `1`，行数超限时退出码为 `2`，`--json` 方便在脚本或 CI 里断言预检结果。

导入页面不再解析文件，也不再决定导入模式，这些都属于 harness 的职责。

#### 过期批次保护

批次在暂存时会记录当时的题库指纹（题量、最大 id、最新更新时间）。如果预检之后题库被其他写入路径改动过：

- `replace` 模式的确认会被拒绝，需要重新预检，避免覆盖掉期间新增的数据；
- `append` 模式可以继续确认，但结果里会带 `fingerprintDrift: true` 供调用方提示。

`backend/scripts/sync-*-image-questions.js` 这类脚本仍然直接写库，会绕过预检和人工确认，使用时需要自行承担风险。

### 题目从哪里来：External Harness 出题，系统只做校验与人工放行

系统自身**不调用模型生成题目**。补题的真实链路是：

```
用户向 External Harness / Agent 提出补题需求
→ Harness 从 localhost External Gateway 查询题库上下文（/api/external-ai/*，只读）
→ Harness 自己生成现有 import row（学科/年级/学期/题型/题干/A-D/答案/解析/难度）
→ POST /api/questions/import/stage
→ 系统预检：字段校验、查重、相似度检测
→ 批次落盘 pending，等待人工
→ 用户在「工具台 → 导入」逐题核对（题干/选项/答案/解析）
→ 用户本人点 confirm
→ 写入正式 questions 表
```

边界约定：

- 系统不调用任何模型出题；历史上保留的单题 AI 点评、在线 TTS 与 AI 连接探针（runtime-check）已删除；整轮总结与首页欢迎语由本地确定性规则生成，不调用模型；
- Harness 不直接写 `questions`，唯一写库入口是人工 confirm；
- 不存在 Question Draft / Request / Queue 这类中间态；
- 正式入库必须经人在导入页确认，`confirm` 之外没有第二条写题库路径。

### 表格字段

推荐使用以下表头：

```text
学科,年级,学期,知识标签,题型,题目,选项A,选项B,选项C,选项D,答案,解析,难度
```

CSV 示例：

```csv
学科,年级,学期,知识标签,题型,题目,选项A,选项B,选项C,选项D,答案,解析,难度
语文,一年级,上册,限时稳步,拼读练习,把“b”和“a”拼起来，正确的音节是什么？,ba,ab,bi,bo,A,声母b和韵母a拼成ba。,1
数学,三年级,通用,,情景计算,小明有10颗糖，先送给妹妹2颗，又自己吃掉1颗，还剩几颗？,7颗,8颗,9颗,6颗,A,10 - 2 - 1 = 7。,1
```

### 校验规则

- `学科` 仅支持 `语文`、`数学`、`英语`
- `年级` 仅支持 `一年级` 到 `六年级`
- `学期` 仅支持 `上册`、`下册`、`通用`
- 一年级题目必须标注 `上册` 或 `下册`
- 一年级暂不支持 `英语`
- `答案` 必须是 `A`、`B`、`C`、`D`
- `难度` 必须是 `1` 到 `3` 的整数
- 当前固定为四选一题型
- 预检会提示文件内重复题，以及题库中已存在的同学科同年级同学期同题目内容
- 预检会提示与题库中已有题目高度相似的题，帮助在导入前做人工判断
- 对于相似题，预检面板会展示对应题号或文件行号与题干摘要，方便快速比对
- 对于重复题和相似题，预检面板会额外给出“建议删除 / 建议合并 / 建议保留”的操作提示
- `XLSX` 默认读取第一个工作表
