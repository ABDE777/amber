import { useEffect, useRef, useState } from "react";
import { config } from "../config.js";
import { useLang } from "../i18n.jsx";
import { COUNTRIES, formatPhoneWithCountry, calculatePrice, useLiveRates, useLivePrice } from "../../lib/countries.js";

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
  const liveBasePriceMad = useLivePrice(); // fetches admin-configured price from /api/settings

  const [form, setForm] = useState({
    name: "",
    qty: "",
    email: "",
    phone: "",
    country_residence: "",
    country_delivery: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("card"); // "card" | "direct"
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | card_form | redirecting | ok | paid_success | fail
  const [orderId, setOrderId] = useState("");
  const [failMessage, setFailMessage] = useState("");
  const [ypToken, setYpToken] = useState("");       // YouCan Pay token from server
  const [ypPublicKey, setYpPublicKey] = useState(""); // YouCan Pay public key
  const [ypIsSandbox, setYpIsSandbox] = useState(false); // sandbox flag
  const ypRef = useRef(null);         // reference to mounted payment element
  const ypContainerRef = useRef(null); // DOM node for yp.js to render into

  const targetCountry = form.country_delivery || form.country_residence;
  const priceEstimate = form.qty && Number(form.qty) > 0
    ? calculatePrice(form.qty, targetCountry, isAr, liveRates, liveBasePriceMad)
    : null;

  // Detect payment return status from URL query parameters
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paymentState = params.get("payment");
      const paramOrderId = params.get("order_id");

      if (paymentState === "success") {
        setOrderId(paramOrderId || `MWOA-${Date.now().toString().slice(-6)}`);
        setStatus("paid_success");
      } else if (paymentState === "error") {
        setOrderId(paramOrderId || "");
        setStatus("fail");
        setFailMessage(
          isAr
            ? "تعذر إتمام عملية الدفع بواسطة البطاقة البنكية. يرجى التحقق من بيانات البطاقة أو المحاولة مجدداً."
            : "The card transaction could not be completed. Please check your card details or try again."
        );
      }
    } catch {
      // ignore in environments without window.location
    }
  }, []);

  useEffect(() => {
    if (!open && status !== "paid_success") {
      setForm({ name: "", qty: "", email: "", phone: "", country_residence: "", country_delivery: "" });
      setPaymentMethod("card");
      setErrors({});
      setStatus("idle");
      setOrderId("");
      setFailMessage("");
      setYpToken("");
      setYpPublicKey("");
      setYpIsSandbox(false);
      if (ypRef.current) { try { ypRef.current.destroy(); } catch {} ypRef.current = null; }
    }
  }, [open, status]);

  // Mount the yp.js inline payment form when we have a token
  useEffect(() => {
    if (status !== "card_form" || !ypToken || !ypPublicKey || !ypContainerRef.current) return;

    let cancelled = false;

    async function mountYp() {
      // Load yp.js from CDN if not already loaded
      if (!window.yp) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://youcanpay.com/yp.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      if (cancelled) return;

      try {
        const locale = lang === "ar" ? "ar" : lang === "fr" ? "fr" : "en";
        const isSandbox = Boolean(ypIsSandbox || ypPublicKey.startsWith("pub_sandbox"));
        const payment = window.yp(ypPublicKey, {
          locale,
          sandbox: isSandbox,
        })
          .elements({
            token: ypToken,
            container: ypContainerRef.current,
            gateways: ["credit-card"],
            appearance: {
              variables: {
                primary: "#D4AF37",
                radius: "6px",
                font: "'Karla', system-ui, sans-serif",
                background: "#2f2323",
                card: "#3a2828",
                foreground: "#ede7da",
                border: "rgba(212,175,55,0.4)",
              },
            },
          });

        payment.on("error", (err) => {
          if (!cancelled) {
            setFailMessage(err.message || (isAr ? "خطأ في نموذج الدفع" : "Payment form error"));
            setStatus("fail");
          }
        });

        await payment.mount();
        if (!cancelled) ypRef.current = payment;
      } catch (err) {
        if (!cancelled) {
          setFailMessage(err.message || (isAr ? "تعذر تحميل نموذج الدفع" : "Could not load payment form"));
          setStatus("fail");
        }
      }
    }

    mountYp();
    return () => { cancelled = true; };
  }, [status, ypToken, ypPublicKey, ypIsSandbox, lang, isAr]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = m.errName || (m.err && m.err.name) || "Name required";
    const q = Number(form.qty);
    if (!q || q <= 0) err.qty = m.errQty || (m.err && m.err.qty) || "Valid quantity required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      err.email = m.errEmail || (m.err && m.err.email) || "Valid email required";
    }
    if (!form.country_residence.trim()) {
      err.country_residence = isAr ? "يرجى اختيار بلد الإقامة" : "Please select country of residence";
    }
    if (!form.country_delivery.trim()) {
      err.country_delivery = isAr ? "يرجى اختيار بلد التوصيل" : "Please select country of delivery";
    }

    const formattedPhone = formatPhoneWithCountry(form.phone, form.country_residence);
    if (!formattedPhone || formattedPhone.replace(/[^0-9]/g, "").length < 8) {
      err.phone = m.errPhone || (m.err && m.err.phone) || "Valid phone required";
    }

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
        `Payment Method: ${paymentMethod === "card" ? "Credit/Debit Card (Online)" : "Direct / WhatsApp"}`,
        `Email: ${form.email}`,
        `Phone: ${formattedPhone}`,
        `Country of Residence: ${form.country_residence}`,
        `Country of Delivery: ${form.country_delivery}`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    return [
      `طلب جديد — العنبر ${orderHeader}`,
      "————————————————",
      id ? `رقم الطلب: ${id}` : "",
      `الاسم: ${form.name}`,
      `الكمية: ${form.qty} غرام`,
      priceLine,
      `طريقة الدفع: ${paymentMethod === "card" ? "بطاقة بنكية (إلكتروني)" : "طلب مباشر / واتساب"}`,
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

    // Flow 1: Online Card Payment via YouCan Pay (Morocco + Asia + Europe + America)
    if (paymentMethod === "card") {
      try {
        const res = await fetch("/api/payment/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            phone: formattedPhone,
            qty: Number(form.qty),
            lang,
          }),
        });

        const data = await res.json().catch(() => ({}));
        const currentId = data.order_id || `MWOA-${Date.now().toString().slice(-6)}`;
        setOrderId(currentId);

        if (res.ok && data.ok && data.token && data.public_key) {
          // Switch to inline yp.js form mode
          setYpToken(data.token);
          setYpPublicKey(data.public_key);
          setYpIsSandbox(Boolean(data.sandbox || data.public_key.startsWith("pub_sandbox")));
          setStatus("card_form");
          return;
        } else if (res.ok && data.ok && !data.configured) {
          // Mock mode (no keys configured) — fall back to WhatsApp
          whatsappFallback(currentId);
          setStatus("ok");
          return;
        } else {
          setFailMessage(data.error || (isAr ? "تعذر إنشاء جلسة الدفع" : "Failed to initialize payment session"));
          setStatus("fail");
        }
      } catch (err) {
        console.error("[Card Payment Error]:", err);
        setFailMessage(err.message || (isAr ? "خطأ في الاتصال بالبوابة" : "Connection error"));
        setStatus("fail");
      }
      return;
    }

    // Flow 2: Direct / WhatsApp Order
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

  const handleCleanClose = () => {
    // Clean URL query params if returning from payment
    if (window.location.search.includes("payment=")) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    onClose();
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
      onClick={handleCleanClose}
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
          maxWidth: 520,
          background: "linear-gradient(160deg,#352727,#281c1c)",
          border: "1px solid rgba(212,175,55,.45)",
          boxShadow: "0 30px 90px rgba(0,0,0,.75)",
          padding: "36px 32px",
          borderRadius: 8,
          animation: "mwoaPop .35s cubic-bezier(.2,.8,.2,1)",
          margin: "auto",
        }}
      >
        <button
          onClick={handleCleanClose}
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

        {/* STATE: INLINE YP.JS CARD PAYMENT FORM */}
        {status === "card_form" && (
          <div style={{ padding: "8px 0" }}>
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>💳</div>
              <div>
                <div style={{ fontFamily: fonts.display, fontSize: 18, color: C.paper, fontWeight: 400 }}>
                  {m.enterCardDetails || (isAr ? "أدخل بيانات بطاقتك البنكية" : "Enter Your Card Details")}
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 11, color: "#8d8578", marginTop: 2 }}>
                  {isAr ? `الطلب: ${orderId}` : `Order: ${orderId}`}
                </div>
              </div>
            </div>

            {/* Test Card Banner for Sandbox */}
            {ypIsSandbox && (
              <div style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 6,
                background: "rgba(212,175,55,0.12)",
                border: "1px dashed rgba(212,175,55,0.45)",
                fontSize: 12,
                fontFamily: C.mono,
                color: "#FFE9A8",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: C.gold }}>
                  <span>🧪</span>
                  <span>{lang === "ar" ? "وضع التجربة (Sandbox Mode)" : lang === "fr" ? "Mode Test (Sandbox)" : lang === "zh" ? "测试模式 (Sandbox)" : "Sandbox Test Mode"}</span>
                </div>
                <div style={{ color: "#d8cebe", fontSize: 11.5 }}>
                  {lang === "ar" ? "استخدم البطاقة التجريبية المعتمدة:" : lang === "fr" ? "Utilisez la carte de test officielle :" : lang === "zh" ? "使用官方测试银行卡：" : "Use official test card:"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 2, color: "#ffffff" }}>
                  <span>💳 <strong>4242 4242 4242 4242</strong></span>
                  <span>📅 <strong>12/28</strong></span>
                  <span>🔒 <strong>123</strong></span>
                </div>
              </div>
            )}

            {/* yp.js renders here */}
            <div ref={ypContainerRef} id="yp-payment-container" style={{ minHeight: 200 }} />

            <button
              id="yp-confirm-btn"
              type="button"
              onClick={async () => {
                if (!ypRef.current) return;
                const btn = document.getElementById("yp-confirm-btn");
                if (btn) { btn.disabled = true; btn.textContent = m.processing || (isAr ? "جارٍ المعالجة..." : "Processing..."); }
                try {
                  const result = await ypRef.current.confirm();
                  if (result.status === "succeeded") {
                    try {
                      await fetch("/api/payment/webhook", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ order_id: orderId, status: "paid", type: "transaction.paid" }),
                      });
                    } catch {}
                    setStatus("paid_success");
                  } else {
                    setFailMessage(result.error?.message || (isAr ? "فشل الدفع. تحقق من بيانات البطاقة." : "Payment failed. Please check your card details."));
                    setStatus("fail");
                  }
                } catch (err) {
                  setFailMessage(err.message || (isAr ? "خطأ غير متوقع" : "Unexpected error"));
                  setStatus("fail");
                }
              }}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "14px 20px",
                background: "linear-gradient(135deg, #D4AF37, #b8922e)",
                color: "#1a0e0e",
                border: "none",
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 700,
                fontFamily: fonts.ui,
                cursor: "pointer",
                letterSpacing: ".03em",
              }}
            >
              {m.confirmPayment || (isAr ? "تأكيد الدفع" : "Confirm Payment")}
            </button>

            <button
              type="button"
              onClick={() => { setStatus("idle"); setYpToken(""); setYpPublicKey(""); }}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "10px",
                background: "transparent",
                color: "#8d8578",
                border: "1px solid rgba(212,175,55,.2)",
                borderRadius: 6,
                fontSize: 13,
                fontFamily: fonts.ui,
                cursor: "pointer",
              }}
            >
              {m.backBtn || (isAr ? "← رجوع" : "← Back")}
            </button>
          </div>
        )}

        {/* STATE: PAYMENT SUCCESS CONFIRMATION */}
        {status === "paid_success" ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(212,175,55,0.25) 0%, rgba(37,211,102,0.15) 100%)",
                border: "2px solid #25D366",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 32,
                color: "#25D366",
              }}
            >
              ✓
            </div>
            <h3 style={{ fontFamily: fonts.display, fontSize: 26, margin: "0 0 10px", color: C.paper, fontWeight: 400 }}>
              {m.paymentSuccessTitle || "Payment Successful!"}
            </h3>
            {orderId && (
              <div
                style={{
                  display: "inline-block",
                  background: "rgba(212,175,55,.15)",
                  border: "1px solid rgba(212,175,55,.5)",
                  padding: "6px 16px",
                  borderRadius: 20,
                  fontFamily: "monospace",
                  color: "#FFB800",
                  fontSize: 14,
                  fontWeight: "bold",
                  margin: "6px 0 16px",
                }}
              >
                {isAr ? `رقم الطلب المؤكد: ${orderId}` : `Confirmed Order ID: ${orderId}`}
              </div>
            )}
            <p style={{ fontSize: 14.5, color: C.body, lineHeight: 1.8, margin: "0 0 24px", fontFamily: fonts.ui }}>
              {m.paymentSuccessBody || "Your payment was received. Hand-weighing and packaging have started."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a
                href={`https://wa.me/${adminDigits}?text=${encodeURIComponent(
                  isAr
                    ? `مرحباً، أتممت الدفع للطلب رقم [${orderId}]. أود متابعة حالة الشحن.`
                    : `Hello, I completed payment for order [${orderId}]. I would like to track shipment.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "13px 20px",
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
                <span>💬</span> {isAr ? "تواصل مع خدمة العملاء عبر واتساب" : "Contact Concierge on WhatsApp"}
              </a>
              <button
                onClick={handleCleanClose}
                className="btn-gold"
                style={{
                  padding: "10px 24px",
                  background: "transparent",
                  color: C.gold,
                  fontSize: 13,
                  border: "1px solid rgba(212,175,55,.3)",
                  cursor: "pointer",
                  fontFamily: fonts.ui,
                  borderRadius: 4,
                }}
              >
                {m.close}
              </button>
            </div>
          </div>
        ) : status === "redirecting" ? (
          /* STATE: REDIRECTING TO 3D-SECURE GATEWAY */
          <div style={{ textAlign: "center", padding: "40px 10px" }}>
            <div
              style={{
                width: 48,
                height: 48,
                border: "3px solid rgba(212,175,55,0.2)",
                borderTop: "3px solid #D4AF37",
                borderRadius: "50%",
                margin: "0 auto 20px",
                animation: "spin 1s linear infinite",
              }}
            />
            <h3 style={{ fontFamily: fonts.display, fontSize: 22, margin: "0 0 10px", color: C.paper, fontWeight: 400 }}>
              {m.redirecting || "Redirecting to 3D-Secure Payment Gateway…"}
            </h3>
            <p style={{ fontSize: 13, color: "#a79f8f", fontFamily: fonts.ui }}>
              {isAr
                ? "يتم الآن تحويلك إلى نافذة الدفع المشفرة لإتمام عملية الشراء بأمان…"
                : "Transferring you to encrypted 3D-Secure portal to complete checkout safely…"}
            </p>
          </div>
        ) : status === "ok" ? (
          /* STATE: DIRECT INQUIRY CONFIRMATION */
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 46, marginBottom: 10, color: C.gold }}>✓</div>
            <h3 style={{ fontFamily: fonts.display, fontSize: 26, margin: "0 0 10px", color: C.paper, fontWeight: 400 }}>
              {m.okTitle}
            </h3>
            {orderId && (
              <div
                style={{
                  display: "inline-block",
                  background: "rgba(212,175,55,.15)",
                  border: "1px solid rgba(212,175,55,.4)",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontFamily: "monospace",
                  color: "#FFB800",
                  fontSize: 14,
                  fontWeight: "bold",
                  margin: "4px 0 16px",
                }}
              >
                {isAr ? `رقم الطلب: ${orderId}` : `Order ID: ${orderId}`}
              </div>
            )}
            {priceEstimate && (
              <div
                style={{
                  background: "rgba(0,0,0,.35)",
                  border: "1px solid rgba(212,175,55,.3)",
                  borderRadius: 6,
                  padding: "10px 14px",
                  margin: "0 auto 16px",
                  maxWidth: 360,
                }}
              >
                <div style={{ fontSize: 12, color: C.gold, fontFamily: C.mono }}>
                  {isAr ? "القيمة التقديرية للطلب:" : "Estimated Total:"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#FFB800", fontFamily: C.mono, marginTop: 2 }}>
                  {priceEstimate.formattedTotal}
                </div>
              </div>
            )}
            <p style={{ fontSize: 15, color: C.body, lineHeight: 1.8, margin: "0 0 20px", fontFamily: fonts.ui }}>
              {m.okBody}
            </p>

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
              <button
                onClick={handleCleanClose}
                className="btn-gold"
                style={{
                  padding: "10px 24px",
                  background: "transparent",
                  color: C.gold,
                  fontSize: 13,
                  border: "1px solid rgba(212,175,55,.3)",
                  cursor: "pointer",
                  fontFamily: fonts.ui,
                  borderRadius: 4,
                }}
              >
                {m.close}
              </button>
            </div>
          </div>
        ) : status === "fail" ? (
          /* STATE: FAILURE */
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 46, marginBottom: 10, color: "#e0562e" }}>!</div>
            <h3 style={{ fontFamily: fonts.display, fontSize: 24, margin: "0 0 10px", color: C.paper, fontWeight: 400 }}>
              {m.failTitle}
            </h3>
            <p style={{ fontSize: 15, color: C.body, lineHeight: 1.8, margin: "0 0 24px", fontFamily: fonts.ui }}>
              {failMessage || m.failBody}
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setFailMessage("");
              }}
              className="btn-ruby"
              style={{
                padding: "13px 30px",
                background: C.ruby,
                color: "#FFE9A8",
                fontSize: 15,
                fontWeight: 700,
                border: "1px solid rgba(255,184,0,.4)",
                cursor: "pointer",
                fontFamily: fonts.ui,
                borderRadius: 4,
              }}
            >
              {m.retry}
            </button>
          </div>
        ) : (
          /* STATE: ORDER & PAYMENT FORM */
          <>
            <div style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: ".2em", color: "#ff2d2d", marginBottom: 10 }}>
              {m.eyebrow}
            </div>
            <h3 style={{ fontFamily: fonts.display, fontSize: 28, margin: "0 0 4px", color: C.paper, fontWeight: 400 }}>
              {m.title}
            </h3>
            <p style={{ fontSize: 13.5, color: C.body, margin: "0 0 18px", lineHeight: 1.6, fontFamily: fonts.ui }}>
              {m.sub}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {field(m.name, "name", "text", m.namePh)}
              {field(m.qty, "qty", "number", m.qtyPh, { min: 1, inputMode: "numeric" })}
              {selectField(m.countryResidence, "country_residence", m.countryResidencePh)}
              {selectField(m.countryDelivery, "country_delivery", m.countryDeliveryPh)}

              {/* Dynamic Price Calculation */}
              {priceEstimate && priceEstimate.qty > 0 && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(153,0,0,0.2) 100%)",
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
                      {isAr ? "💰 السعر المقدر بالعملة المحددة:" : "💰 Estimated Total:"}
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

              {/* PAYMENT METHOD SELECTION CARD */}
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: ".08em", color: "#a79f8f" }}>
                  {m.payMethod || (isAr ? "طريقة الدفع والتأكيد" : "Payment Method")}
                </span>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 9 }}>
                  {/* Option 1: Card Payment (Visa, Mastercard, CMI) */}
                  <div
                    onClick={() => setPaymentMethod("card")}
                    style={{
                      border: `1.5px solid ${paymentMethod === "card" ? C.gold : "rgba(212,175,55,.2)"}`,
                      background: paymentMethod === "card" ? "rgba(212,175,55,.1)" : "rgba(0,0,0,.25)",
                      borderRadius: 6,
                      padding: "12px 14px",
                      cursor: "pointer",
                      transition: "all .2s ease",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                      style={{ marginTop: 3, accentColor: C.gold, cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                        <span style={{ fontWeight: 700, color: C.paper, fontSize: 14, fontFamily: fonts.ui }}>
                          💳 {m.payCard || (isAr ? "بطاقة بنكية (فيزا / ماستركارد / CMI)" : "Credit / Debit Card (Visa, Mastercard, CMI)")}
                        </span>
                        {/* Accepted Card Badges */}
                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: "#1a1f71", color: "#fff", letterSpacing: ".05em" }}>
                            VISA
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: "#eb001b", color: "#fff", letterSpacing: ".05em" }}>
                            MC
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: "#006837", color: "#fff", letterSpacing: ".05em" }}>
                            CMI
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#b3a998", marginTop: 4, lineHeight: 1.5, fontFamily: fonts.ui }}>
                        {m.payCardDesc || (isAr ? "دفع إلكتروني فوري ومشفّر 3D-Secure لجميع البطاقات المغربية والدولية" : "Instant 3D-Secure card payment for Morocco, Asia, Europe & the Americas.")}
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Direct Inquiry / WhatsApp (NO COD) */}
                  <div
                    onClick={() => setPaymentMethod("direct")}
                    style={{
                      border: `1.5px solid ${paymentMethod === "direct" ? C.gold : "rgba(212,175,55,.2)"}`,
                      background: paymentMethod === "direct" ? "rgba(212,175,55,.1)" : "rgba(0,0,0,.25)",
                      borderRadius: 6,
                      padding: "12px 14px",
                      cursor: "pointer",
                      transition: "all .2s ease",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "direct"}
                      onChange={() => setPaymentMethod("direct")}
                      style={{ marginTop: 3, accentColor: C.gold, cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, color: C.paper, fontSize: 14, fontFamily: fonts.ui }}>
                        💬 {m.payDirect || (isAr ? "استفسار مباشر عبر واتساب" : "Direct Inquiry / WhatsApp")}
                      </span>
                      <div style={{ fontSize: 12, color: "#b3a998", marginTop: 4, lineHeight: 1.5, fontFamily: fonts.ui }}>
                        {m.payDirectDesc || (isAr ? "تنسيق مخصص واستفسار مباشر مع خدمة العملاء عبر الواتساب" : "Personal assistance and concierge order coordination via WhatsApp.")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {field(m.email, "email", "email", m.emailPh)}
              {field(m.phone, "phone", "tel", m.phonePh, { inputMode: "tel" })}
            </div>

            <button
              onClick={submit}
              disabled={status === "sending"}
              className="btn-ruby"
              style={{
                marginTop: 22,
                width: "100%",
                padding: "15px 20px",
                background: C.ruby,
                color: "#FFE9A8",
                fontSize: 16,
                fontWeight: 700,
                border: "1px solid rgba(255,184,0,.4)",
                cursor: status === "sending" ? "default" : "pointer",
                fontFamily: fonts.ui,
                borderRadius: 4,
                opacity: status === "sending" ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {status === "sending" ? (
                m.sending
              ) : paymentMethod === "card" ? (
                <>
                  <span>🔒</span> {m.payCardCta || (isAr ? "متابعة للدفع الآمن بالبطاقة" : "Proceed to Secure Card Payment")}
                </>
              ) : (
                <>
                  <span>💬</span> {m.payDirectCta || (isAr ? "تأكيد واستفسار عبر واتساب" : "Inquire via WhatsApp")}
                </>
              )}
            </button>

            {paymentMethod === "card" && (
              <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "#8d8578", fontFamily: C.mono }}>
                🛡️ {m.securityBadge || (isAr ? "معاملة مشفرة 256-bit بمعيار الأمان البنكي 3D Secure" : "256-bit SSL encrypted & 3D Secure verified")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
