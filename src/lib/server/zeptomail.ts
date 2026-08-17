import "server-only";
// ============================================================
//  ZEPTOMAIL — trimitere email tranzacțional (server only)
//  Docs: https://www.zoho.com/zeptomail/help/api/email-sending.html
// ============================================================

const API_URL = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email";

function authHeader(token: string) {
  // Acceptăm fie token brut, fie deja prefixat cu „Zoho-enczapikey”.
  return token.startsWith("Zoho-enczapikey") ? token : "Zoho-enczapikey " + token;
}

export async function sendMagicLinkEmail(to: string, link: string) {
  const token = process.env.ZEPTOMAIL_TOKEN;
  const fromAddress = process.env.ZEPTOMAIL_FROM;
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || "Emthrive CRM";

  if (!token || !fromAddress) {
    throw new Error("ZeptoMail nu e configurat. Setează ZEPTOMAIL_TOKEN şi ZEPTOMAIL_FROM în .env.local.");
  }

  const htmlbody = `
  <div style="font-family:Raleway,Arial,sans-serif;background:#050a30;color:#fff;padding:32px;border-radius:16px;max-width:480px;margin:auto">
    <div style="font-size:20px;font-weight:800;color:#19c8db;margin-bottom:8px">Emthrive · CRM intern</div>
    <p style="color:#8a94c4;font-size:14px;line-height:1.6">
      Ai cerut un link de autentificare. Apasă butonul de mai jos ca să intri în CRM.
      Link-ul e valabil o oră şi poate fi folosit o singură dată.
    </p>
    <a href="${link}" style="display:inline-block;margin:18px 0;background:#19c8db;color:#04121a;
      font-weight:800;text-decoration:none;padding:13px 22px;border-radius:10px;font-size:14px">
      Intră în CRM
    </a>
    <p style="color:#8a94c4;font-size:12px;line-height:1.6;margin-top:18px">
      Dacă nu ai cerut tu acest email, îl poţi ignora. Dacă butonul nu merge, copiază link-ul:
      <br><span style="color:#19c8db;word-break:break-all">${link}</span>
    </p>
  </div>`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader(token),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: { address: fromAddress, name: fromName },
      to: [{ email_address: { address: to } }],
      subject: "Link de acces · Emthrive CRM",
      htmlbody,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error("ZeptoMail a răspuns cu " + res.status + ": " + detail.slice(0, 300));
  }
}
