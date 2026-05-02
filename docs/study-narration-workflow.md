# 讲堂语音素材流程

讲堂卡片现在支持两层旁白来源:

1. 默认旁白
由系统根据卡片标题、正文和补充说明自动拼出 `narrationText`，即使教研还没单独写旁白，也能先导出清单。

2. 自定义旁白
在课程脚本对象里增加可选字段 `studyNarration`，按卡片 `cardId` 覆盖默认文案。

## 配置字段

示例:

```js
studyNarration: Object.freeze({
  "step-1": "第一步，摆摆好。进教室先把书包放好，小手轻轻放，小眼睛看前面。",
  "step-2": "第二步，学礼貌。见到老师会问好，回答问题声音亮亮的。",
  example: "跟我做一遍。小手放好，背挺一挺，再说一说写字三个一。",
  memory: "记住上课小口令。会问好，坐端正，写字三个一。"
})
```

常见 `cardId`:

- `step-1`
- `step-2`
- `step-3`
- `opening`
- `reason`
- `example`
- `reminder`
- `memory`

说明:

- 一个模块只会实际使用其中最多 5 张卡。
- 如果模块有 `miniLessons`，当前播放器默认走 `step-1/2/3 + example + memory`。
- 如果没有 `miniLessons`，当前播放器默认走 `opening + reason + example + reminder + memory`。

## 导出清单

运行:

```bash
npm run audio:study-manifest
```

输出文件:

- `docs/generated/study-narration-manifest.json`
- `docs/generated/study-narration-manifest.tsv`
- `docs/generated/study-narration-pack-manifest.json`
- `docs/generated/study-narration-coverage.json`
- `docs/generated/study-narration-grade1-batch1.tsv`
- `docs/generated/study-narration-grade1-batch1-missing.tsv`
- `frontend/src/audio/studyNarrationAssetIndex.js`
- `frontend/src/audio/studyNarrationPackIndex.js`

清单会包含:

- `lessonId`
- `cardId`
- 最终旁白文案 `narrationText`
- 期望音频路径 `expectedAssetPath`
- 当前是否已经有素材 `hasAudioAsset`

覆盖率检查:

```bash
npm run audio:study-coverage
```

会额外生成:

- 整体覆盖率报告
- 每个优先批次各自的汇总表
- 每个优先批次各自的缺失切片明细表

## 批量导入素材

运行:

```bash
npm run audio:study-import -- --source <素材目录>
```

支持两种输入命名:

```text
<素材目录>/<lessonId>/<cardId>.mp3
<素材目录>/<lessonId>__<cardId>.mp3
```

常用参数:

- `--dry-run` 先检查不落盘
- `--overwrite` 覆盖已有同卡素材
- `--move` 导入后移动源文件
- `--priority grade1-batch1` 只导入一年级上册首批站点
- `--priority grade1-batch2` 只导入一年级下册第二批站点
- `--priority grade2-batch1` 只导入二年级上册首批站点
- `--priority grade2-batch2` 只导入二年级下册第二批站点
- `--priority grade3-batch1` 只导入三年级上册首批站点
- `--priority grade3-batch2` 只导入三年级下册第二批站点
- `--priority grade3-english-batch1` 只导入三年级上册英语首批站点
- `--priority grade3-english-batch2` 只导入三年级下册英语第二批站点
- `--priority grade4-batch1` 只导入四年级上册首批站点
- `--priority grade4-english-batch1` 只导入四年级上册英语首批站点
- `--priority grade4-lower-english-batch1` 只导入四年级下册英语首批站点
- `--priority grade4-batch2` 只导入四年级下册第二批站点
- `--priority grade5-batch1` 只导入五年级上册首批站点
- `--priority grade5-english-batch1` 只导入五年级上册英语首批站点
- `--priority grade5-batch2` 只导入五年级下册第二批站点
- `--priority grade5-english-batch2` 只导入五年级下册英语第二批站点
- `--priority grade6-batch1` 只导入六年级上册首批站点
- `--priority grade6-english-batch1` 只导入六年级上册英语首批站点
- `--priority grade6-batch2` 只导入六年级下册第二批站点
- `--priority grade6-english-batch2` 只导入六年级下册英语第二批站点

## 本机批量 TTS

Windows 环境可以直接调用系统语音生成首批 WAV 文件:

```bash
npm run audio:study-tts -- -SelectionTsvPath "docs/generated/study-narration-grade1-batch1-missing.tsv" -OnlyMissing
```

常用参数:

- `-VoiceName "Microsoft Huihui Desktop"` 指定系统语音
- `-Rate -1` 调慢讲解速度
- `-Overwrite` 覆盖已生成的 WAV
- `-WhatIf` 只预览，不生成
- `-SelectionTsvPath` 既支持缺失切片明细 TSV，也支持批次汇总 TSV

说明:

- 当前脚本依赖 Windows 自带 `System.Speech`，输出为 `.wav`。
- 播放器已经支持 `.wav`，联调阶段可以直接用；正式上线建议继续转成 `.mp3`。
- 运行 `npm run audio:study-manifest` 时，会把现有讲堂音频同步到 `frontend/public/audio/study`，供前端按静态路径直接播放。
- 同一次导出还会生成 grade/priority pack 清单，供后续做整年级预取或分批下载。

## 转成上线格式

生成并优化完 WAV 后，可以继续批量转成更省体积的 MP3:

```bash
npm run audio:study-transcode -- --delete-source
```

常用参数:

- `--selection-tsv docs/generated/study-narration-grade4-batch1.tsv` 只转指定批次
- `--mp3-bitrate 48k` 调整 MP3 码率
- `--overwrite` 覆盖已有 MP3
- `--delete-source` 转完后删掉原始 WAV
- `--what-if` 只预览，不落盘

说明:

- 当前转码脚本内置 `ffmpeg-static`，不依赖本机预装 `ffmpeg`。
- 转码后播放器会优先命中 `.mp3`，不需要改前端逻辑。

## WAV 瘦身优化

生成完 TTS 之后，可以直接对讲堂 WAV 做二次瘦身:

```bash
npm run audio:study-optimize -- --selection-tsv docs/generated/study-narration-grade1-batch1.tsv
```

当前优化策略:

- 下采样到 `16000 Hz`
- 保持单声道 `16-bit PCM`
- 自动裁掉首尾静音并保留少量呼吸留白

这一步不改文件路径，播放器不需要额外调整。

说明:

- `--selection-tsv` 可以传“批次汇总表”或“缺失明细表”。
- 当前已经内置二十四个优先批次:
  - `grade1-batch1`
  - `grade1-batch2`
  - `grade2-batch1`
  - `grade2-batch2`
  - `grade3-batch1`
  - `grade3-batch2`
  - `grade3-english-batch1`
  - `grade3-english-batch2`
  - `grade4-batch1`
  - `grade4-english-batch1`
  - `grade4-lower-english-batch1`
  - `grade4-batch2`
  - `grade2-4-editorial-batch1`
  - `grade5-batch1`
  - `grade5-english-batch1`
  - `grade5-batch2`
  - `grade5-english-batch2`
  - `grade6-batch1`
  - `grade6-english-batch1`
  - `grade6-batch2`
  - `grade6-english-batch2`
  - `grade4-5-editorial-batch2`
  - `grade5-6-editorial-batch3`
  - `grade6-editorial-batch4`

## 音频挂载规范

素材目录:

```text
frontend/src/assets/audio/study/<lessonId>/<cardId>.<ext>
```

支持格式:

- `.mp3`
- `.wav`
- `.m4a`
- `.ogg`

说明:

- 音频制作和导入仍以 `frontend/src/assets/audio/study` 为素材源目录。
- `npm run audio:study-manifest` 会自动把已有素材镜像到 `frontend/public/audio/study`，播放器实际走的是这份公开静态目录。
- 讲堂播放器会在进入某个 lesson 时，后台预取当前 lesson 的 5 条旁白并在离开时释放。
- 现在额外支持“下载到本机浏览器”:
  - 前端会把选中的年级包或优先批次包写入浏览器 `Cache Storage`，关闭页面后仍会保留。
  - 再次进入讲堂时，播放器会先查本地持久缓存，命中后直接用本地音频生成播放用 `object URL`。
  - `frontend/src/audio/studyNarrationPackIndex.js` 现在会带上 `cacheVersion`，只要音频清单有变化，就会自动切换到新的缓存版本并清理旧缓存。
  - 这次实现的是“讲堂音频持久离线”，不是整站 PWA；如果浏览器完全断网且页面壳层本身没打开，是否能直接重开首页仍取决于浏览器自己的 HTTP 缓存。

示例:

```text
frontend/src/assets/audio/study/g1-upper-chinese-habits/step-1.mp3
frontend/src/assets/audio/study/g1-upper-chinese-habits/example.mp3
frontend/src/assets/audio/study/g1-upper-chinese-habits/memory.mp3
```

## 推荐执行顺序

1. 教研先补重点模块的 `studyNarration`。
2. 运行 `npm run audio:study-manifest` 导出清单。
3. 录音或 TTS 先产出 WAV，按清单中的 `expectedAssetPath` 对应 lesson/card 命名。
4. 运行 `npm run audio:study-optimize` 做裁切和下采样。
5. 运行 `npm run audio:study-transcode -- --delete-source` 转成上线格式。
6. 前端重新构建后，播放器会自动接入语音并改为“播完再解锁”。
