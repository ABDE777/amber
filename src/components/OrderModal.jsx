import { useEffect, useState } from "react";
import { config } from "../config.js";
import { useLang } from "../i18n.jsx";

const C = {
  gold: "#D4AF37",
  ruby: "#990000",
  paper: "#F6EFD9",
  body: "#c3bbab",
  mono: "'IBM Plex Mono', monospace",
};

const adminDigits = String(config.whatsapp).replace(/[^0-9]/g, "");

/**
 * Order form modal. Collects quantity, full name, email and phone, then sends
 * the request to the admin via WhatsApp or email (client-side deep links —
 * the static site has no backend). Bilingual via the i18n context.
 */
export default function OrderModal({ open, onClose }) {
  const { t, fonts, dir } = useLang();
  const m = t.modal;
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
    if (!form.name.trim()) er.name = m.err.name;
    if (!form.qty || Number(form.qty) <= 0) er.qty = m.err.qty;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = m.err.email;
    if (form.phone.replace(/[^0-9]/g, "").length < 8) er.phone = m.err.phone;
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const buildMessage = () =>
    [
      t.msg.head,
      "────────────────",
      `${t.msg.name}: ${form.name}`,
      `${t.msg.qty}: ${form.qty} ${t.msg.unit}`,
      `${t.msg.email}: ${form.email}`,
      `${t.msg.phone}: ${form.phone}`,
    ].join("\n");

  const submit = (method) => {
    if (!validate()) return;
    const msg = buildMessage();
    if (method === "whatsapp") {
      window.open(`https://wa.me/${adminDigits}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    } else {
      window.location.href = `mailto:${config.email}?subject=${encodeURIComponent(t.msg.subject)}&body=${encodeURIComponent(msg)}`;
    }
    setSent(true);
  };

  const field = (label, key, type = "text", placeholder = "", extra = {}) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: ".08em", color: "#a79f8f" }}>{label}</span>
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
          fontFamily: fonts.ui,
          padding: "13px 14px",
          borderRadius: 4,
          outline: "none",
        }}
      />
      {errors[key] && <span style={{ color: "#ff7a52", fontSize: 12, fontFamily: fonts.ui }}>{errors[key]}</span>}
    </label>
  );

  return (
    <div
      dir={dir}
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
          aria-label={m.close}
          style={{
            position: "absolute",
            top: 14,
            insetInlineStart: 16,
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
            <div style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: ".2em", color: "#ff2d2d", marginBottom: 12 }}>{m.eyebrow}</div>
            <h3 style={{ fontFamily: fonts.display, fontSize: 30, margin: "0 0 6px", color: C.paper, fontWeight: 400 }}>{m.title}</h3>
            <p style={{ fontSize: 14, color: C.body, margin: "0 0 26px", lineHeight: 1.7, fontFamily: fonts.ui }}>{m.sub}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {field(m.name, "name", "text", m.namePh)}
              {field(m.qty, "qty", "number", m.qtyPh, { min: 1, inputMode: "numeric" })}
              {field(m.email, "email", "email", m.emailPh)}
              {field(m.phone, "phone", "tel", m.phonePh, { inputMode: "tel" })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
              <button
                onClick={() => submit("whatsapp")}
                className="btn-ruby"
                style={{ padding: "15px 20px", background: C.ruby, color: "#FFE9A8", fontSize: 15, fontWeight: 700, border: "1px solid rgba(255,184,0,.4)", cursor: "pointer", fontFamily: fonts.ui, borderRadius: 4 }}
              >
                {m.sendWa}
              </button>
              <button
                onClick={() => submit("email")}
                className="btn-gold"
                style={{ padding: "15px 20px", background: "transparent", color: C.gold, fontSize: 15, fontWeight: 700, border: "1px solid rgba(212,175,55,.5)", cursor: "pointer", fontFamily: fonts.ui, borderRadius: 4 }}
              >
                {m.sendMail}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 46, marginBottom: 10, color: C.gold }}>✓</div>
            <h3 style={{ fontFamily: fonts.display, fontSize: 26, margin: "0 0 10px", color: C.paper, fontWeight: 400 }}>{m.okTitle}</h3>
            <p style={{ fontSize: 15, color: C.body, lineHeight: 1.8, margin: "0 0 24px", fontFamily: fonts.ui }}>{m.okBody}</p>
            <button
              onClick={onClose}
              className="btn-gold"
              style={{ padding: "12px 30px", background: "transparent", color: C.gold, fontSize: 14, border: "1px solid rgba(212,175,55,.5)", cursor: "pointer", fontFamily: fonts.ui, borderRadius: 4 }}
            >
              {m.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
