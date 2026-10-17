export async function api(path, opt = {}) {
  const t = localStorage.getItem("t");
  const r = await fetch("/api" + path, {
    method: opt.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: "Bearer " + t } : {}),
    },
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  });
  if (opt.blob && r.ok) return r.blob();
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && path.indexOf("/auth") !== 0) {
    localStorage.clear();
    location.reload();
  }
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}
