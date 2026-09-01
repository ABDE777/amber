import { useEffect, useState } from "react";
import { config } from "../config.js";
import { useLang } from "../i18n.jsx";
import { COUNTRIES, formatPhoneWithCountry, calculatePrice, getCountryInfo, useLiveRates } from "../../lib/countries.js";

const C = {
  gold: "#D4AF37",
  ruby: "#990000",
  paper: "#F6EFD9",
  body: "#c3bbab",
  mono: "'IBM Plex Mono', monospace",
};

const adminDigits = String(config.whatsapp).replace(/[^0-9]/g, "");

export default function OrderModal({ open, onClose }) {
  const { t, fonts, dir, lang } = useLang();
  const m = t.modal;
  const isAr = dir === "rtl";
  const liveRates = useLiveRates();

  const [form, setForm] = useState({
    name: "",
    qty: "",
    email: "",
    phone: "",
    country_residence: "",
    country_delivery: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | ok | fail
  const [orderId, setOrderId] = useState("");

  const targetCountry = form.country_delivery || form.country_residence;
  const priceEstimate = form.qty && Number(form.qty) > 0 ? calculatePrice(form.qty, targetCountry, isAr, liveRates) : null;

  useEffect(() => {
    if (!open) {
      setForm({ name: "", qty: "", email: "", phone: "", country_residence: "", country_delivery: "" });
      setErrors({});
      setStatus("idle");
      setOrderId("");
    }
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = m.errName;
    const q = Number(form.qty);
    if (!q || q <= 0) err.qty = m.errQty;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = m.errEmail;
    if (!form.country_residence.trim()) err.country_residence = isAr ? "يرجى اختيار بلد الإقامة" : "Please select country of residence";
    if (!form.country_delivery.trim()) err.country_delivery = isAr ? "يرجى اختيار بلد التوصيل" : "Please select country of delivery";

    const formattedPhone = formatPhoneWithCountry(form.phone, form.country_residence);
    if (!formattedPhone || formattedPhone.replace(/[^0-9]/g, "").length < 8) err.phone = m.errPhone;

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const buildMessage = (id = "") => {
    const formattedPhone = formatPhoneWithCountry(form.phone, form.country_residence);
    const orderHeader = id ? `[${id}] ` : "";
    const est = calculatePrice(form.qty, form.country_delivery || form.country_residence, lang !== "en");
    const priceLine = est ? (lang === "en" ? `Estimated Value: ${est.formattedTotal} (${est.formattedUnit})` : `القيمة المقدرة: ${est.formattedTotal} (${est.formattedUnit})`) : "";

    if (lang === "en") {
      return [
        `New ambergris order ${orderHeader}`,
        "————————————————",
        id ? `Order ID: ${id}` : "",
        `Full name: ${form.name}`,
        `Quantity: ${form.qty} g`,
        priceLine,
        `Email: ${form.email}`,
        `Phone: ${formattedPhone}`,
        `Country of Residence: ${form.country_residence}`,
        `Country of Delivery: ${form.country_delivery}`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    return [
      `طلب جديد — عنبر الحوت ${orderHeader}`,
      "————————————————",
      id ? `رقم الطلب: ${id}` : "",
      `الاسم: ${form.name}`,
      `الكمية: ${form.qty} غرام`,
      priceLine,
      `البريد: ${form.email}`,
      `الهاتف: ${formattedPhone}`,
      `بلد الإقامة: ${form.country_residence}`,
      `بلد التوصيل: ${form.country_delivery}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const whatsappFallback = (id = "") => {
    window.open(
      `https://wa.me/${adminDigits}?text=${encodeURIComponent(buildMessage(id))}`,
      "_blank",
      "noopener"
    );
  };

  const submit = async () => {
    if (!validate()) return;
    setStatus("sending");
    const formattedPhone = formatPhoneWithCountry(form.phone, form.country_residence);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone: formattedPhone, qty: Number(form.qty), lang }),
      });
      const data = await res.json().catch(() => ({}));
      const currentId = data.order_id || `MWOA-${Date.now().toString().slice(-6)}`;
      setOrderId(currentId);

      if (res.ok && data.ok) {
        setStatus("ok");
      } else if (data.configured === false) {
        whatsappFallback(currentId);
        setStatus("ok");
      } else {
        setStatus("fail");
      }
    } catch {
      const fallbackId = `MWOA-${Date.now().toString().slice(-6)}`;
      setOrderId(fallbackId);
      whatsappFallback(fallbackId);
      setStatus("ok");
    }
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
          background: "#2f2323",
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

  const selectField = (label, key, placeholder) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: ".08em", color: "#a79f8f" }}>{label}</span>
      <select
        value={form[key]}
        onChange={set(key)}
        style={{
          background: "#2f2323",
          border: `1px solid ${errors[key] ? "#e0562e" : "rgba(212,175,55,.35)"}`,
          color: C.paper,
          fontSize: 15,
          fontFamily: fonts.ui,
          padding: "13px 14px",
          borderRadius: 4,
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="">-- {placeholder} --</option>
        {COUNTRIES.map((c) => {
          const name = lang === "ar" ? c.nameAr : c.nameEn;
          const curr = lang === "ar" ? c.currencyAr : c.currencyEn;
          return (
            <option key={c.code + c.nameEn} value={name}>
              {name} ({c.code} · {curr})
            </option>
          );
        })}
      </select>
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
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "linear-gradient(160deg,#352727,#342726)",
          border: "1px solid rgba(212,175,55,.4)",
          boxShadow: "0 30px 80px rgba(0,0,0,.6)",
          padding: "38px 34px",
          borderRadius: 6,
          animation: "mwoaPop .35s cubic-bezier(.2,.8,.2,1)",
          margin: "auto",
        }}
      >
        <button
          onClick={onClose}
          aria-label={m.close}
          style={{ position: "absolute", top: 14, insetInlineStart: 16, background: "transparent", border: "none", color: "#8d8578", fontSize: 26, cursor: "pointer", lineHeight: 1 }}
        >
          ×
        </button>

        {status === "ok" ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 46, marginBottom: 10, color: C.gold }}>✓</div>
            <h3 style={{ fontFamily: fonts.display, fontSize: 26, margin: "0 0 10px", color: C.paper, fontWeight: 400 }}>{m.okTitle}</h3>
            {orderId && (
              <div style={{ display: "inline-block", background: "rgba(212,175,55,.15)", border: "1px solid rgba(212,175,55,.4)", padding: "6px 14px", borderRadius: 20, fontFamily: "monospace", color: "#FFB800", fontSize: 14, fontWeight: "bold", margin: "4px 0 16px" }}>
                {isAr ? `رقم الطلب: ${orderId}` : `Order ID: ${orderId}`}
              </div>
            )}
            {priceEstimate && (
              <div style={{ background: "rgba(0,0,0,.35)", border: "1px solid rgba(212,175,55,.3)", borderRadius: 6, padding: "10px 14px", margin: "0 auto 16px", maxWidth: 360 }}>
                <div style={{ fontSize: 12, color: C.gold, fontFamily: C.mono }}>{isAr ? "القيمة التقديرية للطلب:" : "Estimated Total:"}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#FFB800", fontFamily: C.mono, marginTop: 2 }}>{priceEstimate.formattedTotal}</div>
              </div>
            )}
            <p style={{ fontSize: 15, color: C.body, lineHeight: 1.8, margin: "0 0 20px", fontFamily: fonts.ui }}>{m.okBody}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a
                href={`https://wa.me/${adminDigits}?text=${encodeURIComponent(buildMessage(orderId))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 18px",
                  background: "#25D366",
                  color: "#fff",
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  fontFamily: fonts.ui,
                  boxShadow: "0 4px 14px rgba(37,211,102,.4)",
                }}
              >
                <span>💬</span> {isAr ? "متابعة الطلب والدفع عبر واتساب" : "Confirm on WhatsApp"}
              </a>
              <button onClick={onClose} className="btn-gold" style={{ padding: "10px 24px", background: "transparent", color: C.gold, fontSize: 13, border: "1px solid rgba(212,175,55,.3)", cursor: "pointer", fontFamily: fonts.ui, borderRadius: 4 }}>
                {m.close}
              </button>
            </div>
          </div>
        ) : status === "fail" ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 46, marginBottom: 10, color: "#e0562e" }}>!</div>
            <h3 style={{ fontFamily: fonts.display, fontSize: 24, margin: "0 0 10px", color: C.paper, fontWeight: 400 }}>{m.failTitle}</h3>
            <p style={{ fontSize: 15, color: C.body, lineHeight: 1.8, margin: "0 0 24px", fontFamily: fonts.ui }}>{m.failBody}</p>
            <button onClick={() => setStatus("idle")} className="btn-ruby" style={{ padding: "13px 30px", background: C.ruby, color: "#FFE9A8", fontSize: 15, fontWeight: 700, border: "1px solid rgba(255,184,0,.4)", cursor: "pointer", fontFamily: fonts.ui, borderRadius: 4 }}>
              {m.retry}
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: ".2em", color: "#ff2d2d", marginBottom: 12 }}>{m.eyebrow}</div>
            <h3 style={{ fontFamily: fonts.display, fontSize: 30, margin: "0 0 6px", color: C.paper, fontWeight: 400 }}>{m.title}</h3>
            <p style={{ fontSize: 14, color: C.body, margin: "0 0 22px", lineHeight: 1.7, fontFamily: fonts.ui }}>{m.sub}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {field(m.name, "name", "text", m.namePh)}
              {field(m.qty, "qty", "number", m.qtyPh, { min: 1, inputMode: "numeric" })}
              {selectField(m.countryResidence, "country_residence", m.countryResidencePh)}
              {selectField(m.countryDelivery, "country_delivery", m.countryDeliveryPh)}

              {/* Dynamic Country Currency & Price Calculation Card */}
              {priceEstimate && priceEstimate.qty > 0 && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(153,0,0,0.2) 100%)",
                    border: "1px solid rgba(212,175,55,0.5)",
                    borderRadius: 6,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11.5, color: C.gold, fontFamily: C.mono, fontWeight: 700 }}>
                      {isAr ? "💰 السعر المقدر بعملة التوصيل:" : "💰 Estimated Price (Delivery Currency):"}
                    </div>
                    <div style={{ fontSize: 12, color: "#d8cebe", marginTop: 2, fontFamily: fonts.ui }}>
                      {priceEstimate.formattedUnit}
                    </div>
                  </div>
                  <div style={{ textAlign: isAr ? "left" : "right" }}>
                    <div style={{ fontSize: 19, fontWeight: 700, color: "#FFB800", fontFamily: C.mono, letterSpacing: ".03em" }}>
                      {priceEstimate.formattedTotal}
                    </div>
                    <div style={{ fontSize: 11, color: "#8d8578" }}>
                      {priceEstimate.qty} {isAr ? "غرام" : "g"}
                    </div>
                  </div>
                </div>
              )}

              {field(m.email, "email", "email", m.emailPh)}
              {field(m.phone, "phone", "tel", m.phonePh, { inputMode: "tel" })}
            </div>

            <button
              onClick={submit}
              disabled={status === "sending"}
              className="btn-ruby"
              style={{
                marginTop: 28,
                width: "100%",
                padding: "16px 20px",
                background: C.ruby,
                color: "#FFE9A8",
                fontSize: 16,
                fontWeight: 700,
                border: "1px solid rgba(255,184,0,.4)",
                cursor: status === "sending" ? "default" : "pointer",
                fontFamily: fonts.ui,
                borderRadius: 4,
                opacity: status === "sending" ? 0.7 : 1,
              }}
            >
              {status === "sending" ? m.sending : m.send}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
