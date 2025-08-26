export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { password } = req.body || {};
  const TEAM_PASSWORD = process.env.TEAM_PASSWORD || "";

  if (!TEAM_PASSWORD) {
    return res.status(500).json({ ok: false, error: "TEAM_PASSWORD not set" });
  }
  if (password !== TEAM_PASSWORD) {
    return res.status(401).json({ ok: false, error: "Wrong password" });
  }

  // IMPORTANT:
  // Remove HttpOnly so the front-end gate (document.cookie) can see it.
  // Keep Secure + SameSite=Lax for safety.
  res.setHeader(
    "Set-Cookie",
    "sc_auth=ok; Path=/; Max-Age=2592000; SameSite=Lax; Secure"
  );
  res.status(200).json({ ok: true });
}
