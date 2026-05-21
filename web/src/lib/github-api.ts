const GITHUB_API = "https://api.github.com";

function ghHeaders() {
  const token = process.env.GITHUB_PAT;
  if (!token) throw new Error("GITHUB_PAT not set");
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function repoPath() {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  if (!owner || !repo) throw new Error("GITHUB_REPO_OWNER / GITHUB_REPO_NAME not set");
  return `${owner}/${repo}`;
}

function workflowId() {
  return process.env.GITHUB_WORKFLOW_ID || "admin-pipeline.yml";
}

export async function dispatchWorkflow(inputs: {
  flow: string;
  date: string;
  venue: string;
  races: string;
}): Promise<void> {
  const ref = process.env.GITHUB_REF || "master";
  const url = `${GITHUB_API}/repos/${repoPath()}/actions/workflows/${workflowId()}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ ref, inputs }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`workflow_dispatch ${res.status}: ${text}`);
  }
}

export async function findRecentRun(flow: string, sinceMs = 30_000): Promise<{
  id: number;
  html_url: string;
  status: string;
  conclusion: string | null;
  created_at: string;
} | null> {
  const url = `${GITHUB_API}/repos/${repoPath()}/actions/workflows/${workflowId()}/runs?event=workflow_dispatch&per_page=10`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) return null;
  const json = (await res.json()) as { workflow_runs?: Array<{
    id: number; html_url: string; status: string; conclusion: string | null;
    created_at: string; display_title?: string; name?: string;
  }> };
  const cutoff = Date.now() - sinceMs;
  const found = (json.workflow_runs || []).find((r) => {
    const created = new Date(r.created_at).getTime();
    if (created < cutoff) return false;
    return (r.display_title?.includes(flow) || r.name?.includes(flow)) ?? true;
  });
  return found ? {
    id: found.id,
    html_url: found.html_url,
    status: found.status,
    conclusion: found.conclusion,
    created_at: found.created_at,
  } : null;
}

export async function getRunStatus(runId: number): Promise<{
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
} | null> {
  const url = `${GITHUB_API}/repos/${repoPath()}/actions/runs/${runId}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) return null;
  const r = await res.json();
  return {
    id: r.id,
    status: r.status,
    conclusion: r.conclusion,
    html_url: r.html_url,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function listRecentRuns(limit = 5): Promise<Array<{
  id: number;
  html_url: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  display_title: string;
}>> {
  const url = `${GITHUB_API}/repos/${repoPath()}/actions/workflows/${workflowId()}/runs?event=workflow_dispatch&per_page=${limit}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) return [];
  const json = (await res.json()) as { workflow_runs?: Array<{
    id: number; html_url: string; status: string; conclusion: string | null;
    created_at: string; display_title?: string;
  }> };
  return (json.workflow_runs || []).map((r) => ({
    id: r.id,
    html_url: r.html_url,
    status: r.status,
    conclusion: r.conclusion,
    created_at: r.created_at,
    display_title: r.display_title || "",
  }));
}
