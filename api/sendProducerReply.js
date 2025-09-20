import nodemailer from "nodemailer";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function coerceString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function buildProducerReplyTemplate({ jobTitle, jobSource, jobLink, jobCountry }) {
  const title = coerceString(jobTitle);
  const source = coerceString(jobSource);
  const link = coerceString(jobLink);
  const country = coerceString(jobCountry);

  const subject = title ? `Selfcast x ${title}` : "Selfcast – Casting support";

  const lines = ["Hi,", ""];
  let spottedLine = "We spotted your casting";
  if (title) spottedLine += ` "${title}"`;
  if (source) spottedLine += ` on ${source}`;
  spottedLine += ".";
  lines.push(spottedLine);
  lines.push(
    "Selfcast is a global roster of actors ready to deliver self-tapes within 24 hours."
  );
  lines.push("If you're still casting, we'd love to help connect you with suitable talent fast.");
  if (country) {
    lines.push(`We can prioritise talent based in ${country}.`);
  }
  if (link) {
    lines.push("", `Listing: ${link}`);
  }
  lines.push("", "Best,", "The Selfcast Team");

  return { subject, body: lines.join("\n") };
}

async function readRequestBody(req) {
  if (!req) return {};

  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      // fall through
    }
  }
  if (typeof req.json === "function") {
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // fall through
    }
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method && req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed", code: "method_not_allowed" });
  }

  const body = await readRequestBody(req);
  const email = coerceString(body.email);

  if (!email || !EMAIL_REGEX.test(email)) {
    return res
      .status(400)
      .json({ ok: false, error: "Valid target email required", code: "invalid_email" });
  }

  const smtpHost = coerceString(process.env.SMTP_HOST);
  const smtpUser = coerceString(process.env.SMTP_USER);
  const smtpPass = coerceString(process.env.SMTP_PASS);

  if (!smtpHost || !smtpUser || !smtpPass) {
    const template = buildProducerReplyTemplate(body || {});
    return res.status(501).json({
      ok: false,
      error: "SMTP configuration missing",
      code: "smtp_not_configured",
      template,
    });
  }

  const smtpPort = Number.parseInt(process.env.SMTP_PORT, 10);
  const port = Number.isFinite(smtpPort) ? smtpPort : 587;
  const secureEnv = coerceString(process.env.SMTP_SECURE).toLowerCase();
  const secure = secureEnv === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const template = buildProducerReplyTemplate(body || {});
  const from = coerceString(process.env.SMTP_FROM) || smtpUser;

  try {
    const result = await transporter.sendMail({
      from,
      to: email,
      subject: template.subject,
      text: template.body,
      html: template.body.replace(/\n/g, "<br>").replace(/  /g, " &nbsp;"),
    });

    return res.status(200).json({ ok: true, id: result?.messageId || null });
  } catch (error) {
    console.error("sendProducerReply failed", error);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to send email", code: "send_failed" });
  }
}
