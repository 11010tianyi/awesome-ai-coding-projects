import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const projectsPath = path.join(root, "data", "projects.json");
const candidatesPath = path.join(root, "data", "hot-candidates.json");
const candidatesMdPath = path.join(root, "相关性资源集", "AI_Coding新发现热门项目候选.md");

const queries = [
  '"vibe coded" in:readme,description',
  '"vibecoded" in:readme,description',
  '"vibe-coded" in:readme,description',
  '"vibe coded app" in:readme,description',
  '"vibe coded game" in:readme,description',
  '"built with Claude Code" in:readme,description',
  '"built with Cursor" in:readme,description',
  '"built with Lovable" in:readme,description',
  '"built with Lovable" app in:readme,description',
  '"bolt.new" in:readme,description',
  '"Replit Agent" app in:readme,description',
  '"Copilot agent" app in:readme,description'
];
const activeQuerySet = new Set(queries);

const rejectWords = [
  "awesome",
  "course",
  "tutorial",
  "prompt",
  "prompts",
  "template",
  "boilerplate",
  "guide",
  "guides",
  "list",
  "lists",
  "roadmap",
  "docs",
  "documentation",
  "resources",
  "skill",
  "skills",
  "mcp",
  "sdk",
  "framework",
  "agent harness",
  "system prompts",
  "starter"
];

const projectWords = [
  "app",
  "game",
  "website",
  "web app",
  "saas",
  "extension",
  "desktop",
  "mobile",
  "ios",
  "android",
  "macos",
  "windows",
  "simulator",
  "tracker",
  "planner",
  "calendar",
  "dashboard",
  "editor",
  "generator",
  "studio",
  "toolkit",
  "platform",
  "browser-based",
  "chrome extension",
  "react native"
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "awesome-ai-coding-projects-discovery"
  };
  if (process.env.GH_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  } else if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function searchRepos(query) {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "20");

  const response = await fetch(url, { headers: authHeaders() });
  const body = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      query,
      status: response.status,
      error: body.slice(0, 500),
      items: []
    };
  }
  const json = JSON.parse(body);
  return {
    ok: true,
    query,
    items: json.items ?? []
  };
}

async function searchReposWithRetry(query) {
  const first = await searchRepos(query);
  if (first.ok || ![403, 429].includes(first.status)) return first;
  await sleep(5000);
  return searchRepos(query);
}

function normalizeRepoUrl(url) {
  return url?.replace(/\/$/, "").toLowerCase();
}

function looksLikeProject(repo) {
  const haystack = [
    repo.name,
    repo.full_name,
    repo.description,
    ...(repo.topics ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const rejected = rejectWords.some((word) => haystack.includes(word));
  if (rejected) return false;
  if (repo.archived || repo.disabled || repo.fork) return false;
  return projectWords.some((word) => haystack.includes(word));
}

function categoryFor(repo) {
  const text = `${repo.name} ${repo.description ?? ""} ${(repo.topics ?? []).join(" ")}`.toLowerCase();
  if (text.includes("game")) return "Game";
  if (text.includes("extension")) return "Browser Extension";
  if (text.includes("desktop") || text.includes("macos") || text.includes("windows")) return "Desktop App";
  if (text.includes("mobile") || text.includes("ios") || text.includes("android") || text.includes("react native")) return "Mobile App";
  if (text.includes("cli")) return "CLI Tool";
  return "Candidate";
}

function discoveryScore(repo, queryHits) {
  const starScore = Math.min(50, Math.round(Math.log10(Math.max(repo.stargazers_count, 1)) * 16));
  const recencyScore = repo.pushed_at && Date.parse(repo.pushed_at) > Date.now() - 1000 * 60 * 60 * 24 * 120 ? 20 : 0;
  const evidenceScore = Math.min(30, queryHits.length * 8);
  return starScore + recencyScore + evidenceScore;
}

function toCandidate(repo, queryHits, seenAt) {
  return {
    name: repo.name,
    fullName: repo.full_name,
    category: categoryFor(repo),
    url: repo.homepage || repo.html_url,
    github: repo.html_url,
    description: repo.description ?? "",
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language,
    license: repo.license?.spdx_id ?? null,
    topics: repo.topics ?? [],
    pushedAt: repo.pushed_at,
    discoveredAt: seenAt,
    lastSeenAt: seenAt,
    queryHits,
    confidence: "C",
    status: "candidate",
    discoveryScore: discoveryScore(repo, queryHits),
    aiCodingEvidence: `GitHub 搜索命中：${queryHits.join("；")}`,
    learnFrom: "待人工复核：确认是否为 AI coding 成品项目，以及是否值得晋升主榜"
  };
}

function renderMarkdown(candidates, generatedAt, failures) {
  const sorted = [...candidates]
    .sort((a, b) => {
      if ((b.discoveryScore ?? 0) !== (a.discoveryScore ?? 0)) return (b.discoveryScore ?? 0) - (a.discoveryScore ?? 0);
      return (b.stars ?? 0) - (a.stars ?? 0);
    })
    .slice(0, 80);

  const rows = sorted.map((item, index) => {
    return `| ${index + 1} | ${item.discoveryScore ?? "-"} | [${item.fullName}](${item.github}) | ${item.stars ?? "-"} | ${item.category ?? "-"} | ${item.language ?? "-"} | ${item.pushedAt ? item.pushedAt.slice(0, 10) : "-"} | ${item.queryHits?.join("<br>") ?? "-"} | ${item.description || "-"} |`;
  }).join("\n");

  const failureBlock = failures.length
    ? `\n## 本次检索失败\n\n${failures.map((item) => `- \`${item.query}\`: HTTP ${item.status}，${item.error}`).join("\n")}\n`
    : "";

  return `# AI Coding 新发现热门项目候选

> 由 \`scripts/discover-hot-projects.mjs\` 自动生成。  
> 生成时间：${generatedAt}

这些条目是自动发现的候选项目，尚未进入正式精选榜。建议人工复核项目页、README 或作者说明后，再晋升到 \`data/projects.json\` 和正式清单。

| 排序 | 发现分 | 项目 | Stars | 类型猜测 | 语言 | 最近 Push | 命中线索 | 描述 |
|:---:|---:|:---|---:|:---|:---|:---|:---|:---|
${rows || "| - | - | - | - | - | - | - | - | - |"}
${failureBlock}
## 晋升建议

- 优先看发现分高、最近 120 天有更新、且 README 明确写了 Claude Code / Cursor / Lovable / Bolt / Replit Agent / Copilot Agent 的项目。
- 纯工具、教程、提示词库、awesome list 不直接进主榜，除非它是重要发现源。
- 真正进入主榜前，把 \`confidence\` 从 \`C\` 调整为 \`A\` 或 \`B\`，并补充可复核的 \`aiCodingEvidence\`。
`;
}

async function main() {
  const projects = await readJson(projectsPath, []);
  const existingCandidates = await readJson(candidatesPath, []);
  const knownRepos = new Set(
    [...projects, ...existingCandidates]
      .map((item) => normalizeRepoUrl(item.github))
      .filter(Boolean)
  );
  const byRepo = new Map(
    existingCandidates
      .filter((item) => item.github)
      .filter((item) => !item.queryHits?.length || item.queryHits.some((query) => activeQuerySet.has(query)))
      .filter((item) => {
        const pseudoRepo = {
          name: item.name,
          full_name: item.fullName,
          description: item.description,
          topics: item.topics,
          archived: false,
          disabled: false,
          fork: false
        };
        return looksLikeProject(pseudoRepo);
      })
      .map((item) => [normalizeRepoUrl(item.github), item])
  );

  const failures = [];
  const hitsByRepo = new Map();
  for (const query of queries) {
    await sleep(1500);
    const result = await searchReposWithRetry(query);
    if (!result.ok) {
      failures.push(result);
      continue;
    }
    for (const repo of result.items) {
      if (!looksLikeProject(repo)) continue;
      const key = normalizeRepoUrl(repo.html_url);
      if (!key) continue;
      if (!hitsByRepo.has(key)) hitsByRepo.set(key, { repo, queryHits: [] });
      hitsByRepo.get(key).queryHits.push(query);
    }
  }

  const generatedAt = new Date().toISOString();
  for (const [key, hit] of hitsByRepo) {
    if (knownRepos.has(key) && !byRepo.has(key)) continue;
    const candidate = toCandidate(hit.repo, [...new Set(hit.queryHits)], generatedAt);
    const previous = byRepo.get(key);
    byRepo.set(key, previous ? {
      ...previous,
      ...candidate,
      discoveredAt: previous.discoveredAt ?? generatedAt,
      status: previous.status ?? "candidate",
      confidence: previous.confidence ?? "C",
      learnFrom: previous.learnFrom ?? candidate.learnFrom
    } : candidate);
  }

  const candidates = [...byRepo.values()]
    .sort((a, b) => (b.discoveryScore ?? 0) - (a.discoveryScore ?? 0));

  await fs.writeFile(candidatesPath, `${JSON.stringify(candidates, null, 2)}\n`);
  await fs.writeFile(candidatesMdPath, renderMarkdown(candidates, generatedAt, failures));

  console.log(`Candidates: ${candidates.length}; new/seen this run: ${hitsByRepo.size}; search failures: ${failures.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
