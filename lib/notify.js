import nodemailer from "nodemailer";
import { COUNTRIES, formatPhoneWithCountry } from "./countries.js";
export { COUNTRIES, formatPhoneWithCountry };

function orderText(order, lang = "ar") {
  const L =
    lang === "en"
      ? {
          head: "New order — Ambergris",
          name: "Full name",
          qty: "Quantity",
          unit: "g",
          email: "Email",
          phone: "Phone",
          residence: "Country of Residence",
          delivery: "Country of Delivery",
        }
      : {
          head: "طلب جديد — عنبر الحوت",
          name: "الاسم الكامل",
          qty: "الكمية المطلوبة",
          unit: "غرام",
          email: "البريد الإلكتروني",
          phone: "رقم الهاتف",
          residence: "بلد الإقامة",
          delivery: "بلد التوصيل",
        };
  const phoneFormatted = formatPhoneWithCountry(order.phone, order.country_residence);
  return [
    L.head,
    "————————————————",
    `${L.name}: ${order.name}`,
    `${L.qty}: ${order.qty} ${L.unit}`,
    `${L.email}: ${order.email}`,
    `${L.phone}: ${phoneFormatted}`,
    `${L.residence}: ${order.country_residence || "-"}`,
    `${L.delivery}: ${order.country_delivery || "-"}`,
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
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const to = process.env.ORDER_EMAIL_TO;
  if (!host || !user || !pass || !to) return { configured: false, ok: false };
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;
  const secureEnv = process.env.EMAIL_SECURE || process.env.SMTP_SECURE;
  const secure = secureEnv === "true" || port === 465;
  const from = process.env.ORDER_EMAIL_FROM || user;
  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    await transport.sendMail({ from, to, subject, text });
    return { configured: true, ok: true };
  } catch {
    return { configured: true, ok: false };
  }
}

// Forward the order to an n8n (or any) automation webhook as clean JSON so the
// workflow can save it, contact the customer on WhatsApp, and track it.
// Env: N8N_WEBHOOK_URL (required to enable), N8N_WEBHOOK_SECRET (optional header).
async function postToN8n(order, lang) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return { configured: false, ok: false };
  const phone = formatPhoneWithCountry(order.phone, order.country_residence);
  const payload = {
    event: "order.created",
    createdAt: new Date().toISOString(),
    lang,
    name: order.name,
    qty: order.qty,
    unit: "g",
    email: order.email,
    phone, // display form, e.g. "+212 6..."
    phoneDigits: phone.replace(/[^0-9]/g, ""), // WhatsApp API wants digits only
    country_residence: order.country_residence || "",
    country_delivery: order.country_delivery || "",
    status: "new",
  };
  const headers = { "Content-Type": "application/json" };
  if (process.env.N8N_WEBHOOK_SECRET) headers["x-webhook-secret"] = process.env.N8N_WEBHOOK_SECRET;
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    return { configured: true, ok: res.ok };
  } catch {
    return { configured: true, ok: false };
  }
}

export async function notifyAdmin(order, lang = "ar") {
  const text = orderText(order, lang);
  const subject = lang === "en" ? "New ambergris order" : "طلب عنبر الحوت جديد";
  const [wa, mail, hook] = await Promise.all([
    sendWhatsApp(text),
    sendEmail(subject, text),
    postToN8n(order, lang),
  ]);
  const configured = wa.configured || mail.configured || hook.configured;
  const delivered =
    (wa.configured && wa.ok) || (mail.configured && mail.ok) || (hook.configured && hook.ok);
  return {
    configured,
    delivered,
    channels: {
      whatsapp: wa.configured ? wa.ok : null,
      email: mail.configured ? mail.ok : null,
      n8n: hook.configured ? hook.ok : null,
    },
  };
}

export function validateOrder(body) {
  const name = String(body?.name || "").trim();
  const qty = Number(body?.qty);
  const email = String(body?.email || "").trim();
  const rawPhone = String(body?.phone || "").trim();
  const country_residence = String(body?.country_residence || body?.countryResidence || "").trim();
  const country_delivery = String(body?.country_delivery || body?.countryDelivery || "").trim();

  const phone = formatPhoneWithCountry(rawPhone, country_residence);

  const errors = {};
  if (!name) errors.name = true;
  if (!qty || qty <= 0) errors.qty = true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = true;
  if (phone.replace(/[^0-9]/g, "").length < 8) errors.phone = true;
  if (!country_residence) errors.country_residence = true;
  if (!country_delivery) errors.country_delivery = true;

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    order: { name, qty, email, phone, country_residence, country_delivery },
  };
}
