export default function handler(req, res) {
  // Clear the cookie (same attributes)
  res.setHeader(
    "Set-Cookie",
    "sc_auth=; Path=/; Max-Age=0; SameSite=Lax; Secure"
  );
  res.status(200).json({ ok: true });
}
