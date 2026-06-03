# Wonder Trivia Island

面向小学生的趣味答题系统，前端使用 Vite + Vue 3，后端使用 Node.js + Express + SQLite。
当前正式版本为 `v1.3.0`，已经覆盖答题冒险、闯关世界地图、题库管理、AI 草稿出题、AI 点评与语音、首页欢迎语、错题温习、知识学习、闯关进度和设置中心。

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
|   |   `-- services/        # 导入、AI 出题、AI 点评、TTS、首页欢迎语
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
$env:OPENAI_API_KEY="your-openai-api-key"
# 可选：如果你使用兼容网关，可以额外配置
# $env:OPENAI_BASE_URL="https://api.openai.com/v1"
# 可选：覆盖默认模型，当前默认使用 gpt-5.4-mini
$env:OPENAI_QUESTION_MODEL="gpt-5.4-mini"
npm run backend:start
```

如果未配置 `ADMIN_IMPORT_KEY`，导入接口默认只允许本机访问。
如果未配置 `OPENAI_API_KEY`，AI 出题、AI 点评、首页欢迎语和语音播报会返回不可用提示，但现有题库查看、导入、答题、学习和闯关功能不受影响。
如果你在前端设置里为某条模型填写了自定义 `Base URL`，需要同时填写该模型自己的 `API Key`；服务端不会再把默认密钥转发到任意自定义网关。

启动后访问：

- `GET /api/questions/random`：按题数随机返回题目，支持按年级 / 学期 / 难度筛选
- `POST /api/questions/submit`：提交答案并返回判题结果
- `POST /api/questions/review`：为单题生成 AI 点评
- `POST /api/questions/review/speech`：把点评文案转成语音
- `POST /api/questions/review/summary`：为整轮练习生成 AI 学习总结
- `POST /api/questions/review/home-welcome`：生成首页欢迎语
- `GET /api/questions/stats`：返回当前题库总数
- `POST /api/questions/coverage`：返回多个目标条件下的题量盘点
- `GET /api/questions`：按分页 / 学科 / 年级 / 学期 / 难度 / 关键词查看当前题库
- `POST /api/questions/generate`：根据学科 / 年级 / 学期 / 难度生成 AI 题目草稿
- `POST /api/questions/ai/runtime-check`：测试当前 AI 运行时连接
- `PATCH /api/questions/batch/update`：批量更新题目的学科 / 年级 / 学期 / 难度
- `POST /api/questions/batch/delete`：批量删除题目
- `PATCH /api/questions/:id`：更新指定题目
- `DELETE /api/questions/:id`：删除指定题目
- `POST /api/questions/import/preview`：预检题库数据
- `POST /api/questions/import/commit`：确认导入题库数据
- `GET /api/challenge-progress` / `PUT /api/challenge-progress`：读取或保存闯关进度
- `GET /api/study-record-book` / `PUT /api/study-record-book`：读取或保存错题温习档案
- `GET /health`：服务健康检查

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

其中“题库查看”和“题库导入”共享同一套管理访问规则。`v1.3.0` 当前支持：

- 初始化脚本当前会写入 `2146` 道示例题
- 答题页支持独立的出题设置面板，可设置每轮题数、每题限时、每题分值和抽题难度
- 出题设置会自动记住上次选择
- 支持 AI 单题点评、整轮总结、首页欢迎语和点评语音
- 首页欢迎语支持标题 / 欢迎短句 / 播报三段式生成，并按时段自动调整文案
- 支持错题温习与学习记录持久化
- 支持按年级 / 学期组织的闯关进度持久化
- 支持闯关世界大地图，按分册岛屿展示星星收集和章节进度
- 答题页支持年级主题、气球选项、顶部冒险栏和自动反馈弹窗
- 结算卡支持更聚焦的关卡星级、奖励、成就和下一关入口
- 支持二、三年级新增闯关图片题与 SVG 审计
- 支持知识学习与配套学习讲解音频
- 设置中心支持按模型资产 ID 管理自定义 AI 模型库
- 上传 `CSV`、`XLSX`
- 查看当前题库
- 按学科筛选当前题目
- 按年级筛选当前题目
- 按学期筛选当前题目
- 按难度筛选当前题目
- 按关键词搜索题目 / 题型 / 解析 / 答案
- 直接在题库列表里编辑题目
- 直接在题库列表里删除题目
- 在“新增题目”面板里使用 AI 生成草稿，再人工确认保存
- 在“题库导入”页里批量生成 AI 题目，并自动进入预检流程
- 支持多选后批量修改学科 / 年级 / 学期 / 难度
- 支持多选后批量删除题目
- 预检并展示错误 / 警告
- `append` 追加导入
- `replace` 覆盖导入

`replace` 模式会先自动备份现有数据库，再用新题目整体替换。
`GET /api/questions` 与导入接口共用同一套管理访问规则：未配置 `ADMIN_IMPORT_KEY` 时仅允许本机访问，配置后需要通过 `x-admin-key` 请求头访问。
`POST /api/questions/generate` 也沿用同一套管理访问规则，并且只会生成草稿，不会直接写入题库。
`POST /api/questions/ai/runtime-check` 可以测试服务端默认 AI 配置，或测试“自带 API Key 的自定义运行时”；仅提供 `Base URL` 而不提供 `API Key` 的请求会被拒绝。

### AI 出题草稿

当前接入方式不是“答题页实时联网出题”，而是“管理员先生成草稿，再人工确认保存”。这样可以复用现有校验规则，降低不适龄、重复项、结构错误直接进入题库的风险。

AI 草稿支持补充：

- 主题
- 补充要求
- 参考材料

其中：

- 题库查看页更适合生成单题草稿，再人工微调后保存
- 题库导入页更适合一次生成 3 / 5 / 10 道题，并直接走现有预检与导入流程

如果你想做节日、校园活动、热点阅读等更强调时效性的题目，建议把原始材料粘贴进“参考材料”后再生成。这样模型会优先依据你提供的内容出题，而不是自行猜测最新事实。

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
