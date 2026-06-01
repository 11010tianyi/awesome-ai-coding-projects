# 贡献指南

欢迎补充新的 AI coding 成品项目。

## 收录前检查

请尽量确认：

- 项目可访问，或者源码仓库可访问。
- 项目不是单纯的 AI coding 工具/教程/提示词库。
- 有 AI coding 证据：作者自述、README、应用商店描述、可信同类清单收录、公开访谈等。
- 项目具备学习价值：完整体验、清晰场景、特殊交互、技术实现、上架/商业化闭环等至少满足一项。

## 推荐提交格式

先更新 `data/projects.json`：

```json
{
  "name": "Project Name",
  "category": "Web App",
  "url": "https://example.com",
  "github": "https://github.com/owner/repo",
  "score": 8,
  "confidence": "A",
  "aiCodingEvidence": "README 标注 built with Claude Code",
  "learnFrom": "最值得学习的一句话"
}
```

然后同步更新 `相关性资源集/AI_Coding优秀项目_全网高相关性项目清单.md`。

## 证据等级

- `A`: 原始作者或项目页明确说明。
- `B`: 被可信同类清单收录，项目可体验，但原始证据待补。
- `C`: 有社区传播或强线索，需要后续人工确认。
