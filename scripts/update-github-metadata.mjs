import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dataPath = path.join(root, "data", "projects.json");
const outJsonPath = path.join(root, "data", "github-metadata.json");
const outMdPath = path.join(root, "相关性资源集", "GitHub项目追踪快照.md");

function parseGithubRepo(url) {
  if (!url) return null;
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+)\/?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

async function fetchRepoMeta(owner, repo) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "awesome-ai-coding-projects-tracker"
  };
  if (process.env.GH_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  } else if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  const body = await response.text();
  if (!response.ok) {
    return {
      owner,
      repo,
      ok: false,
      status: response.status,
      error: body.slice(0, 500)
    };
  }

  const json = JSON.parse(body);
  return {
    owner,
    repo,
    ok: true,
    fullName: json.full_name,
    htmlUrl: json.html_url,
    description: json.description,
    stars: json.stargazers_count,
    forks: json.forks_count,
    openIssues: json.open_issues_count,
    language: json.language,
    license: json.license?.spdx_id ?? null,
    pushedAt: json.pushed_at,
    updatedAt: json.updated_at,
    archived: json.archived,
    homepage: json.homepage || null
  };
}

function renderMarkdown(metadata, generatedAt) {
  const rows = metadata
    .map((item) => {
      if (!item.ok) {
        return `| ${item.owner}/${item.repo} | - | - | - | - | 请求失败 ${item.status} |`;
      }
      return `| [${item.fullName}](${item.htmlUrl}) | ${item.stars ?? "-"} | ${item.forks ?? "-"} | ${item.language ?? "-"} | ${item.license ?? "-"} | ${item.pushedAt ? item.pushedAt.slice(0, 10) : "-"} |`;
    })
    .join("\n");

  return `# GitHub 项目追踪快照

> 由 \`scripts/update-github-metadata.mjs\` 自动生成。  
> 生成时间：${generatedAt}

| 项目 | Stars | Forks | 语言 | License | 最近 Push |
|:---|---:|---:|:---|:---|:---|
${rows || "| - | - | - | - | - | - |"}

## 说明

- 仅追踪 \`data/projects.json\` 中填写了 GitHub 仓库地址的条目。
- 如果请求失败，通常是 GitHub API 限流或仓库地址变更；配置 \`GH_TOKEN\` 可提高额度。
`;
}

async function main() {
  const raw = await fs.readFile(dataPath, "utf8");
  const projects = JSON.parse(raw);
  const repos = projects
    .map((project) => parseGithubRepo(project.github))
    .filter(Boolean);

  const metadata = [];
  for (const repo of repos) {
    metadata.push(await fetchRepoMeta(repo.owner, repo.repo));
  }

  const generatedAt = new Date().toISOString();
  await fs.writeFile(outJsonPath, `${JSON.stringify({ generatedAt, metadata }, null, 2)}\n`);
  await fs.writeFile(outMdPath, renderMarkdown(metadata, generatedAt));

  const failures = metadata.filter((item) => !item.ok).length;
  console.log(`Tracked ${metadata.length} GitHub repos; failures: ${failures}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
