export const APP_META = Object.freeze({
  productName: "奇妙知识岛",
  version: "1.3.0",
  releaseTag: "v1.3.0",
  releaseLabel: "1.3 闯关世界与答题体验升级版",
  releasedAt: "2026-06-03",
  repositoryUrl: "https://github.com/zdhgg/Wonder-Trivia-Island",
  releaseUrl: "https://github.com/zdhgg/Wonder-Trivia-Island/releases/tag/v1.3.0",
  architectureSummary: "Vue 3 + Vite 8 · Node.js 24 + Express 5 · SQLite",
  dataModeLabel: "单学习档案 · 本机优先",
  changelog: Object.freeze([
    Object.freeze({
      version: "1.3.0",
      tag: "v1.3.0",
      date: "2026-06-03",
      channel: "正式版",
      title: "闯关世界地图、气球答题和结算体验升级",
      summary: "重做答题冒险的关卡入口、年级主题、答题反馈与结算卡，并修正一年级《比尾巴》题目事实。",
      highlights: Object.freeze([
        "新增闯关世界大地图，按年级分册展示岛屿进度和星星收集状态。",
        "答题页改为年级主题化体验，一二三年级支持更轻量的气球选项与关卡进度动效。",
        "结算卡、顶部冒险栏、静音入口和背景音乐整体升级，减少答题时的界面干扰。",
        "修正一年级《比尾巴》题目为公鸡尾巴弯，并补充对应 SVG 资产和回归测试。"
      ])
    }),
    Object.freeze({
      version: "1.2.0",
      tag: "v1.2.0",
      date: "2026-05-04",
      channel: "正式版",
      title: "首页欢迎语、模型库和二三年级图片题同步升级",
      summary: "统一首页欢迎语规则，扩展二三年级闯关图片题，并把自定义模型库升级为更稳的资产化绑定。",
      highlights: Object.freeze([
        "首页欢迎语新增标题、短句和播报三段式生成，显式约束时段词、标题风格和前后端共享规则。",
        "补齐二三年级多组闯关图片题素材与同步脚本，挑战题 SVG 审查继续保持可自动验收。",
        "AI 模型库改为按稳定资产 ID 绑定，编辑、重命名和删除后不再依赖模型名硬匹配。",
        "闯关页收拢关卡信息与章节成就展示，减少主界面噪音并突出新解锁内容。"
      ])
    }),
    Object.freeze({
      version: "1.1.0",
      tag: "v1.1.0",
      date: "2026-05-03",
      channel: "正式版",
      title: "一年级图片题与版本中心上线",
      summary: "打通题目配图链路，补齐一年级上下册闯关图片题，并新增版本与系统状态中心。",
      highlights: Object.freeze([
        "题库新增 imageUrl 字段，支持配图题的导入、编辑、抽题和答题展示。",
        "一年级上下册前 14 关全部切到图片题体验，并补齐本地 SVG 素材。",
        "新增挑战题 SVG 审查脚本，自动检查缺图、未引用和图中直接给答案的问题。",
        "设置中心新增关于与版本页，可查看发布记录、后端健康状态和当前题库规模。"
      ])
    }),
    Object.freeze({
      version: "1.0.0",
      tag: "v1.0.0",
      date: "2026-05-03",
      channel: "正式版",
      title: "首个公开版本",
      summary: "完成答题、学习、题库、AI 点评与音频链路的首次整合发布。",
      highlights: Object.freeze([
        "上线首页、答题冒险、知识学习、错题温习和设置中心。",
        "支持题库查看、CSV/XLSX 导入、批量编辑和 AI 草稿出题。",
        "接入 AI 单题点评、整轮学习总结、首页欢迎语和点评语音。",
        "补齐发布说明、环境示例、依赖审计和首发安全边界。"
      ])
    })
  ])
});
