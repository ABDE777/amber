// Server-side order delivery helpers. Both channels are optional and only
// fire when their environment variables are set, so the endpoint degrades
// gracefully before the admin configures anything.
//
// Required env vars (set them in the Vercel project settings):
//   WhatsApp (CallMeBot):  CALLMEBOT_PHONE   (admin number incl. country code, e.g. 2126xxxxxxxx)
//                          CALLMEBOT_APIKEY  (from the CallMeBot activation message)
//   Email (Resend):        RESEND_API_KEY
//                          ORDER_EMAIL_TO    (admin inbox)
//                          ORDER_EMAIL_FROM  (optional, defaults to onboarding@resend.dev)

function orderText(order, lang = "ar") {
  const L =
    lang === "en"
      ? { head: "New order — Ambergris", name: "Full name", qty: "Quantity", unit: "g", email: "Email", phone: "Phone" }
      : { head: "طلب جديد — عنبر الحوت", name: "الاسم الكامل", qty: "الكمية المطلوبة", unit: "غرام", email: "البريد الإلكتروني", phone: "رقم الهاتف" };
  return [
    L.head,
    "————————————————",
    `${L.name}: ${order.name}`,
    `${L.qty}: ${order.qty} ${L.unit}`,
    `${L.email}: ${order.email}`,
    `${L.phone}: ${order.phone}`,
  ].join("\n");
}

async function sendWhatsApp(text) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return { configured: false, ok: false };
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
  try {
    const res = await fetch(url);
    return { configured: true, ok: res.ok };
  } catch {
    return { configured: true, ok: false };
  }
}

async function sendEmail(subject, text) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_EMAIL_TO;
  const from = process.env.ORDER_EMAIL_FROM || "MWOA <onboarding@resend.dev>";
  if (!key || !to) return { configured: false, ok: false };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    return { configured: true, ok: res.ok };
  } catch {
    return { configured: true, ok: false };
  }
}

// Sends the order to the admin over every configured channel.
// Returns which channels are configured and which actually delivered.
export async function notifyAdmin(order, lang = "ar") {
  const text = orderText(order, lang);
  const subject = lang === "en" ? "New ambergris order" : "طلب عنبر الحوت جديد";
  const [wa, mail] = await Promise.all([sendWhatsApp(text), sendEmail(subject, text)]);
  const configured = wa.configured || mail.configured;
  const delivered = (wa.configured && wa.ok) || (mail.configured && mail.ok);
  return {
    configured,
    delivered,
    channels: {
      whatsapp: wa.configured ? wa.ok : null,
      email: mail.configured ? mail.ok : null,
    },
  };
}

export function validateOrder(body) {
  const name = String(body?.name || "").trim();
  const qty = Number(body?.qty);
  const email = String(body?.email || "").trim();
  const phone = String(body?.phone || "").trim();
  const errors = {};
  if (!name) errors.name = true;
  if (!qty || qty <= 0) errors.qty = true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = true;
  if (phone.replace(/[^0-9]/g, "").length < 8) errors.phone = true;
  return { ok: Object.keys(errors).length === 0, errors, order: { name, qty, email, phone } };
}
