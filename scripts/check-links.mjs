import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const projectsPath = path.join(root, "data", "projects.json");
const metadataPath = path.join(root, "data", "github-metadata.json");
const outPath = path.join(root, "data", "link-check.json");

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

function githubRepoKey(url) {
  const match = url?.match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+)\/?$/i);
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null;
}

function classify(result) {
  if (result.source === "github-api") return "ok";
  if (result.status === 404 || result.status === 410) return "broken";
  if (result.status === 500 || result.status === 502 || result.status === 503) return "maintenance";
  if (result.ok) return "ok";
  return "unknown";
}

async function checkUrl(url, githubMetaByKey) {
  const githubKey = githubRepoKey(url);
  if (githubKey && githubMetaByKey.has(githubKey)) {
    const meta = githubMetaByKey.get(githubKey);
    const result = {
      url,
      ok: meta.ok,
      status: meta.ok ? 200 : meta.status,
      source: "github-api",
      title: meta.fullName ?? githubKey,
      checkedAt: new Date().toISOString()
    };
    result.state = classify(result);
    return result;
  }

  const { signal, clear } = timeoutSignal(12000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal,
      headers: {
        "user-agent": "Mozilla/5.0 awesome-ai-coding-projects link checker"
      }
    });
    const body = await response.text().catch(() => "");
    clear();
    const title = body.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
    const result = {
      url,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      bytes: body.length,
      title,
      checkedAt: new Date().toISOString()
    };
    result.state = classify(result);
    return result;
  } catch (error) {
    clear();
    const result = {
      url,
      ok: false,
      error: error.name === "AbortError" ? "timeout" : error.message,
      checkedAt: new Date().toISOString()
    };
    result.state = classify(result);
    return result;
  }
}

async function main() {
  const projects = JSON.parse(await fs.readFile(projectsPath, "utf8"));
  const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8").catch(() => "{\"metadata\":[]}"));
  const githubMetaByKey = new Map(
    (metadata.metadata ?? [])
      .map((item) => [`${item.owner}/${item.repo}`.toLowerCase(), item])
  );
  const urls = [...new Set(projects.flatMap((item) => [item.url, item.github]).filter(Boolean))];
  const results = [];
  for (const url of urls) {
    results.push(await checkUrl(url, githubMetaByKey));
  }
  const summary = results.reduce((acc, item) => {
    acc[item.state] = (acc[item.state] ?? 0) + 1;
    return acc;
  }, {});
  await fs.writeFile(outPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)}\n`);
  console.log(`Checked ${results.length} links: ${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
