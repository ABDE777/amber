import nodemailer from "nodemailer";
import { COUNTRIES, formatPhoneWithCountry } from "./countries.js";
import { saveOrderToCsv } from "./orders_storage.js";
export { COUNTRIES, formatPhoneWithCountry, saveOrderToCsv };

function orderText(order, lang = "ar") {
  const orderId = order.id || order.orderId || `MWOA-${Date.now().toString().slice(-6)}`;
  const L =
    lang === "en"
      ? {
          head: `New order — Ambergris [${orderId}]`,
          id: "Order ID",
          name: "Full name",
          qty: "Quantity",
          unit: "g",
          email: "Email",
          phone: "Phone",
          residence: "Country of Residence",
          delivery: "Country of Delivery",
        }
      : {
          head: `طلب جديد — عنبر الحوت [${orderId}]`,
          id: "رقم الطلب",
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
    `${L.id}: ${orderId}`,
    `${L.name}: ${order.name}`,
    `${L.qty}: ${order.qty} ${L.unit}`,
    `${L.email}: ${order.email}`,
    `${L.phone}: ${phoneFormatted}`,
    `${L.residence}: ${order.country_residence || "-"}`,
    `${L.delivery}: ${order.country_delivery || "-"}`,
  ].join("\n");
}

function orderHtml(order, lang = "ar") {
  const orderId = order.id || order.orderId || `MWOA-${Date.now().toString().slice(-6)}`;
  const isAr = lang !== "en";
  const phoneFormatted = formatPhoneWithCountry(order.phone, order.country_residence);
  const cleanPhone = (order.phone || "").replace(/[^0-9]/g, "");

  return `
  <div dir="${isAr ? "rtl" : "ltr"}" style="font-family: Arial, sans-serif; background-color: #1b1213; color: #ede7da; padding: 25px; border-radius: 10px; max-width: 600px; border: 1px solid #D4AF37;">
    <div style="text-align: center; border-bottom: 1px solid rgba(212,175,55,0.3); padding-bottom: 15px; margin-bottom: 20px;">
      <h2 style="color: #D4AF37; margin: 0; font-size: 22px;">${isAr ? "طلب جديد — عنبر الحوت الطبيعي" : "New Order — Natural Ambergris"}</h2>
      <p style="color: #FFB800; font-family: monospace; font-size: 16px; margin: 6px 0 0 0; font-weight: bold;">[${orderId}]</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 10px; color: #D4AF37; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1);">${isAr ? "اسم العميل:" : "Customer Name:"}</td>
        <td style="padding: 10px; color: #fff; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1);">${order.name}</td>
      </tr>
      <tr>
        <td style="padding: 10px; color: #D4AF37; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1);">${isAr ? "الكمية المطلوبة:" : "Quantity:"}</td>
        <td style="padding: 10px; color: #FFB800; font-weight: bold; font-family: monospace; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">${order.qty} g</td>
      </tr>
      <tr>
        <td style="padding: 10px; color: #D4AF37; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1);">${isAr ? "رقم الهاتف:" : "Phone:"}</td>
        <td style="padding: 10px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1);">
          ${phoneFormatted}
          ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}" style="display:inline-block; margin-right:8px; margin-left:8px; background:#25D366; color:#fff; padding:3px 8px; border-radius:4px; text-decoration:none; font-size:12px; font-weight:bold;">💬 WhatsApp</a>` : ""}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px; color: #D4AF37; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1);">${isAr ? "البريد الإلكتروني:" : "Email:"}</td>
        <td style="padding: 10px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1);">${order.email}</td>
      </tr>
      <tr>
        <td style="padding: 10px; color: #D4AF37; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1);">${isAr ? "بلد الإقامة:" : "Residence:"}</td>
        <td style="padding: 10px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1);">${order.country_residence || "-"}</td>
      </tr>
      <tr>
        <td style="padding: 10px; color: #D4AF37; font-weight: bold;">${isAr ? "بلد التوصيل:" : "Delivery Destination:"}</td>
        <td style="padding: 10px; color: #fff;">${order.country_delivery || "-"}</td>
      </tr>
    </table>

    <div style="margin-top: 25px; text-align: center; border-top: 1px solid rgba(212,175,55,0.3); padding-top: 15px;">
      <span style="font-size: 12px; color: #8d8578;">Moroccan World of Amber (MWOA) · Automated Order Notification</span>
    </div>
  </div>
  `;
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

async function sendEmail(subject, text, html) {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com";
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const to = process.env.ORDER_EMAIL_TO;
  if (!host || !user || !pass || !to) {
    console.warn("[Email Notification] Skipped: missing EMAIL_HOST, EMAIL_USER, EMAIL_PASS, or ORDER_EMAIL_TO");
    return { configured: false, ok: false };
  }
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;
  const secureEnv = process.env.EMAIL_SECURE || process.env.SMTP_SECURE;
  const secure = secureEnv === "true" || port === 465;
  const from = process.env.ORDER_EMAIL_FROM || `"MWOA Orders" <${user}>`;
  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    const info = await transport.sendMail({ from, to, subject, text, html });
    console.log(`[Email Notification] Sent successfully to ${to} (MessageId: ${info?.messageId})`);
    return { configured: true, ok: true };
  } catch (err) {
    console.error("[Email Notification Error]:", err.message);
    return { configured: true, ok: false, error: err.message };
  }
}

export async function notifyAdmin(order, lang = "ar", source = "AI Assistant") {
  const orderId = order.id || order.orderId || `MWOA-${Date.now().toString().slice(-6)}`;
  const fullOrder = { ...order, id: orderId };

  // Always save to CSV first for local storage & analytics
  try {
    await saveOrderToCsv(fullOrder, source);
  } catch (err) {
    console.error("[Storage Error]:", err);
  }

  const text = orderText(fullOrder, lang);
  const html = orderHtml(fullOrder, lang);
  const subject = lang === "en" ? `New ambergris order [${orderId}]` : `طلب عنبر الحوت جديد [${orderId}]`;
  const [wa, mail] = await Promise.all([sendWhatsApp(text), sendEmail(subject, text, html)]);
  const configured = wa.configured || mail.configured;
  const delivered = (wa.configured && wa.ok) || (mail.configured && mail.ok);
  return {
    orderId,
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
