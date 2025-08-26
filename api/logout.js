export default function handler(req, res) {
  res.setHeader("Set-Cookie", "sc_auth=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax");
  res.status(200).json({ ok: true });
}
