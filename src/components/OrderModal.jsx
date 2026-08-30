import { useEffect, useState } from "react";
import { config } from "../config.js";

const C = {
  amber: "#FFB800",
  gold: "#D4AF37",
  ruby: "#990000",
  paper: "#F6EFD9",
  body: "#c3bbab",
  mono: "'IBM Plex Mono', monospace",
  serif: "Marcellus, serif",
};

const adminDigits = String(config.whatsapp).replace(/[^0-9]/g, "");

function buildMessage({ name, qty, email, phone }) {
  // Arabic order summary sent to the admin
  return [
    "طلب جديد — عنبر الحوت",
    "────────────────",
    `الاسم الكامل: ${name}`,
    `الكمية المطلوبة: ${qty} غرام`,
    `البريد الإلكتروني: ${email}`,
    `رقم الهاتف: ${phone}`,
  ].join("\n");
}

/**
 * Order form modal. Collects quantity, full name, email and phone, then sends
 * the request to the admin via WhatsApp or email (client-side deep links —
 * the static site has no backend). RTL / Arabic.
 */
export default function OrderModal({ open, onClose }) {
  const [form, setForm] = useState({ name: "", qty: "", email: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open) {
      setSent(false);
      setErrors({});
    }
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = "الاسم مطلوب";
    if (!form.qty || Number(form.qty) <= 0) er.qty = "أدخل كمية صحيحة";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = "بريد إلكتروني غير صالح";
    if (form.phone.replace(/[^0-9]/g, "").length < 8) er.phone = "رقم هاتف غير صالح";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = (method) => {
    if (!validate()) return;
    const msg = buildMessage(form);
    if (method === "whatsapp") {
      window.open(
        `https://wa.me/${adminDigits}?text=${encodeURIComponent(msg)}`,
        "_blank",
        "noopener"
      );
    } else {
      window.location.href = `mailto:${config.email}?subject=${encodeURIComponent(
        "طلب عنبر الحوت"
      )}&body=${encodeURIComponent(msg)}`;
    }
    setSent(true);
  };

  const field = (label, key, type = "text", placeholder = "", extra = {}) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        style={{
          fontFamily: C.mono,
          fontSize: 11,
          letterSpacing: ".14em",
          color: "#a79f8f",
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        {...extra}
        style={{
          background: "#0f0809",
          border: `1px solid ${errors[key] ? "#e0562e" : "rgba(212,175,55,.35)"}`,
          color: C.paper,
          fontSize: 16,
          fontFamily: "Tajawal, Karla, sans-serif",
          padding: "13px 14px",
          borderRadius: 4,
          outline: "none",
        }}
      />
      {errors[key] && (
        <span style={{ color: "#ff7a52", fontSize: 12 }}>{errors[key]}</span>
      )}
    </label>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(6,3,4,.82)",
        backdropFilter: "blur(6px)",
        animation: "mwoaFade .3s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "linear-gradient(160deg,#1c0f10,#120b0c)",
          border: "1px solid rgba(212,175,55,.4)",
          boxShadow: "0 30px 80px rgba(0,0,0,.6)",
          padding: "38px 34px",
          borderRadius: 6,
          animation: "mwoaPop .35s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="إغلاق"
          style={{
            position: "absolute",
            top: 14,
            left: 16,
            background: "transparent",
            border: "none",
            color: "#8d8578",
            fontSize: 26,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {!sent ? (
          <>
            <div
              style={{
                fontFamily: C.mono,
                fontSize: 10.5,
                letterSpacing: ".28em",
                color: "#ff2d2d",
                marginBottom: 12,
              }}
            >
              طلب — عنبر الحوت
            </div>
            <h3
              style={{
                fontFamily: C.serif,
                fontSize: 30,
                margin: "0 0 6px",
                color: C.paper,
                fontWeight: 400,
              }}
            >
              أكمل طلبك
            </h3>
            <p style={{ fontSize: 14, color: C.body, margin: "0 0 26px", lineHeight: 1.7 }}>
              املأ التفاصيل وسنستلم طلبك مباشرة. السعر {config.price} درهم للغرام.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {field("الاسم الكامل", "name", "text", "مثال: محمد العلوي")}
              {field("الكمية المطلوبة (بالغرام)", "qty", "number", "5", {
                min: 1,
                inputMode: "numeric",
              })}
              {field("البريد الإلكتروني", "email", "email", "you@email.com")}
              {field("رقم الهاتف", "phone", "tel", "+212 6 00 00 00 00", {
                inputMode: "tel",
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
              <button
                onClick={() => submit("whatsapp")}
                className="btn-ruby"
                style={{
                  padding: "15px 20px",
                  background: C.ruby,
                  color: "#FFE9A8",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                  border: "1px solid rgba(255,184,0,.4)",
                  cursor: "pointer",
                  fontFamily: "Tajawal, sans-serif",
                  borderRadius: 4,
                }}
              >
                إرسال الطلب عبر واتساب
              </button>
              <button
                onClick={() => submit("email")}
                className="btn-gold"
                style={{
                  padding: "15px 20px",
                  background: "transparent",
                  color: C.gold,
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                  border: "1px solid rgba(212,175,55,.5)",
                  cursor: "pointer",
                  fontFamily: "Tajawal, sans-serif",
                  borderRadius: 4,
                }}
              >
                إرسال الطلب عبر البريد
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 46, marginBottom: 10 }}>✓</div>
            <h3
              style={{
                fontFamily: C.serif,
                fontSize: 26,
                margin: "0 0 10px",
                color: C.paper,
                fontWeight: 400,
              }}
            >
              تم تجهيز طلبك
            </h3>
            <p style={{ fontSize: 15, color: C.body, lineHeight: 1.8, margin: "0 0 24px" }}>
              فُتحت نافذة الإرسال. إذا لم تُفتح، تأكد من السماح بالنوافذ المنبثقة ثم
              أعد المحاولة.
            </p>
            <button
              onClick={onClose}
              className="btn-gold"
              style={{
                padding: "12px 30px",
                background: "transparent",
                color: C.gold,
                fontSize: 14,
                border: "1px solid rgba(212,175,55,.5)",
                cursor: "pointer",
                fontFamily: "Tajawal, sans-serif",
                borderRadius: 4,
              }}
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
