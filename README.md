# Awesome AI Coding Projects You Better Know

> 收集并持续跟踪别人用 AI coding / vibe coding / agentic coding 做出来的优秀项目。重点不是工具大全，而是值得拆解、复刻、学习的成品项目：游戏、网站、App、浏览器扩展、个性化小工具和一些很特别的实验。

## 项目定位

这个仓库参考了 `11010tianyi/awesome-bioinformatics_youbetterknow` 的「主题资料库」结构，也参考了本地 `awesome-ai-video-editing` 里的相关性资源集格式。

它解决三个问题：

1. 找到已经有人做出来、可体验、可学习的 AI coding 成品。
2. 区分「AI coding 做出来的项目」「AI 功能项目」「AI coding 工具/教程/清单」。
3. 用机器可读数据和定时脚本持续追踪 GitHub 项目的 star、fork、更新时间。

## 快速入口

- [AI Coding 优秀项目清单](./相关性资源集/AI_Coding优秀项目_全网高相关性项目清单.md)
- [项目数据源](./data/projects.json)
- [GitHub 元数据追踪脚本](./scripts/update-github-metadata.mjs)
- [自动发现热门候选脚本](./scripts/discover-hot-projects.mjs)

## 收录标准

优先收录：

- 作者或 README 明确说明使用 Claude Code、Cursor、Lovable、Bolt、Replit Agent、Codex、Copilot Agent 等 AI coding 工作流完成。
- 被 `awesome-vibecoded-apps`、`awesome-ai-built-games`、`AI Built Games`、`All AI Games` 等同类清单收录，且项目可体验。
- 项目形态完整，有明确用户场景，而不只是 demo、提示词或工具介绍。
- 有学习价值：产品切口小但完整、交互细节好、技术实现值得复刻、个人需求很鲜明。

暂不优先收录：

- 纯 AI coding 工具、课程、提示词库，除非它是同类资源入口。
- 只有一句宣传但无法访问的项目。
- 无法判断是否和 AI coding 相关的普通 AI 应用。

## 持续追踪

本仓库使用 `data/projects.json` 作为精选主数据源，同时使用 `data/hot-candidates.json` 保存自动发现的新项目候选。

```bash
npm run update
npm run discover
npm run daily
```

`npm run update` 会：

- 读取 `data/projects.json`
- 对 GitHub 项目拉取 star、fork、license、pushed_at 等信息
- 输出 `data/github-metadata.json`
- 生成 `相关性资源集/GitHub项目追踪快照.md`

`npm run discover` 会：

- 用 GitHub Search 自动检索 `vibe coded`、`built with Claude Code`、`built with Cursor`、`built with Lovable`、`bolt.new`、`Replit Agent`、`Copilot agent`、`topic:vibe-coding` 等线索
- 去重已收录项目
- 生成 `data/hot-candidates.json`
- 生成 `相关性资源集/AI_Coding新发现热门项目候选.md`

如果仓库发布到 GitHub，`.github/workflows/update-tracking.yml` 会每天自动运行。建议配置 `GH_TOKEN` 或使用默认 `GITHUB_TOKEN`，避免匿名 API 限流。

注意：自动发现的项目先进入候选池，不直接进入正式精选主榜。这样可以每天收纳新线索，同时避免搜索误判把普通工具、教程或 awesome list 混进主清单。

## 维护方式

新增项目时，先更新 `data/projects.json`，再视情况同步更新清单 Markdown。

推荐字段：

- `name`: 项目名
- `category`: 游戏 / Web App / Mobile App / Desktop App / Browser Extension / Special / Directory
- `url`: 主要体验入口
- `github`: GitHub 仓库，可为空
- `aiCodingEvidence`: AI coding 证据来源
- `learnFrom`: 最值得学习的点
- `confidence`: A / B / C

## 证据等级

| 等级 | 含义 |
|:---:|:---|
| A | 作者、README、应用商店或项目页明确说明 AI coding / vibe coding / Claude Code / Cursor 等参与开发 |
| B | 被可信同类清单收录，项目可体验，但原始作者证据仍建议复核 |
| C | 有较强线索或社区传播，但需要后续人工确认 |

## 参考入口

- https://github.com/11010tianyi/awesome-bioinformatics_youbetterknow
- https://github.com/levz0r/awesome-vibecoded-apps
- https://github.com/lappemic/awesome-ai-built-games
- https://github.com/filipecalegario/awesome-vibe-coding
- https://aibuiltgames.com/
- https://allaigames.com/

## 最后更新

2026-06-01
