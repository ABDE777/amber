import { useEffect, useRef, useState } from "react";
import { config } from "../config.js";
import { useLang } from "../i18n.jsx";
import { COUNTRIES, formatPhoneWithCountry, calculatePrice, useLiveRates, useLiveSettings } from "../../lib/countries.js";

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
  const liveSettings = useLiveSettings(); // { basePriceMad, taxPercent, shippingMad, packagingMad }

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
    ? calculatePrice(
        form.qty,
        targetCountry,
        isAr,
        liveRates,
        liveSettings.basePriceMad,
        {
          taxMad: liveSettings.taxMad,
          shippingMad: liveSettings.shippingMad,
          packagingMad: liveSettings.packagingMad,
          passGatewayFee: liveSettings.passGatewayFee,
        }
      )
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
    const est = calculatePrice(
      form.qty,
      form.country_delivery || form.country_residence,
      isAr,
      liveRates,
      liveSettings.basePriceMad,
      {
        taxMad: liveSettings.taxMad,
        shippingMad: liveSettings.shippingMad,
        packagingMad: liveSettings.packagingMad,
        passGatewayFee: liveSettings.passGatewayFee,
      }
    );
    const priceLine = est
      ? (lang === "en"
        ? `Estimated Value: ${est.formattedTotal} (${est.formattedUnit})`
        : lang === "fr"
        ? `Valeur estimée : ${est.formattedTotal} (${est.formattedUnit})`
        : lang === "zh"
        ? `预估金额：${est.formattedTotal} (${est.formattedUnit})`
        : `القيمة المقدرة: ${est.formattedTotal} (${est.formattedUnit})`)
      : "";

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
    if (lang === "fr") {
      return [
        `Nouvelle commande — Ambre gris ${orderHeader}`,
        "————————————————",
        id ? `N° de commande : ${id}` : "",
        `Nom complet : ${form.name}`,
        `Quantité : ${form.qty} g`,
        priceLine,
        `Mode de paiement : ${paymentMethod === "card" ? "Carte bancaire (en ligne)" : "Direct / WhatsApp"}`,
        `E-mail : ${form.email}`,
        `Téléphone : ${formattedPhone}`,
        `Pays de résidence : ${form.country_residence}`,
        `Pays de livraison : ${form.country_delivery}`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (lang === "zh") {
      return [
        `新订单 — 龙涎香 ${orderHeader}`,
        "————————————————",
        id ? `订单编号：${id}` : "",
        `全名：${form.name}`,
        `数量：${form.qty} 克`,
        priceLine,
        `支付方式：${paymentMethod === "card" ? "银行卡（在线）" : "直接 / WhatsApp"}`,
        `电子邮箱：${form.email}`,
        `电话：${formattedPhone}`,
        `居住国家：${form.country_residence}`,
        `配送国家：${form.country_delivery}`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    // Arabic (default)
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

        {/* STATE 1: EXCLUSIVE DEDICATED CARD PAYMENT MODAL */}
        {status === "card_form" ? (
          <div style={{ padding: "4px 0" }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: ".18em", color: "#D4AF37", marginBottom: 6 }}>
                {lang === "ar"
                  ? "عالم العنبر المغربي — بوابة الدفع الآمنة 3D-SECURE"
                  : lang === "fr"
                  ? "MWOA — PAIEMENT SÉCURISÉ 3D-SECURE"
                  : lang === "zh"
                  ? "MWOA — 3D-SECURE 安全支付网关"
                  : "MWOA — 3D-SECURE SECURE CHECKOUT"}
              </div>
              <h3 style={{ fontFamily: fonts.display, fontSize: 24, margin: "0 0 6px", color: C.paper, fontWeight: 400 }}>
                {lang === "ar"
                  ? "إتمام الدفع بالبطاقة البنكية"
                  : lang === "fr"
                  ? "Finaliser le paiement par carte"
                  : lang === "zh"
                  ? "完成银行卡安全支付"
                  : "Complete Card Payment"}
              </h3>
              <p style={{ fontSize: 13, color: "#a79f8f", margin: 0, fontFamily: fonts.ui }}>
                {lang === "ar"
                  ? "أدخل بيانات بطاقتك البنكية أدناه لإتمام طلبك بأمان وفورية."
                  : lang === "fr"
                  ? "Saisissez les informations de votre carte ci-dessous pour valider votre commande en toute sécurité."
                  : lang === "zh"
                  ? "请在下方输入您的银行卡信息以安全快速完成订单。"
                  : "Enter your card details below to complete your order securely."}
              </p>
            </div>

            {/* Order Summary Pill */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(153,0,0,0.15) 100%)",
                border: "1px solid rgba(212,175,55,0.45)",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#a79f8f", fontFamily: C.mono }}>
                  {isAr ? "رقم الطلب:" : "N° de Commande / Order ID:"} <strong style={{ color: "#FFE9A8" }}>{orderId}</strong>
                </div>
                <div style={{ fontSize: 13, color: C.paper, fontWeight: 700, marginTop: 2, fontFamily: fonts.ui }}>
                  {form.name} • {form.qty} g
                </div>
              </div>

              <div style={{ textAlign: isAr ? "left" : "right" }}>
                <div style={{ fontSize: 10.5, color: "#D4AF37", fontFamily: C.mono, fontWeight: 700 }}>
                  {lang === "ar" ? "المبلغ الإجمالي للدفع:" : lang === "fr" ? "Total à payer :" : "Total to Pay:"}
                </div>
                <div style={{ fontSize: 18, color: "#FFB800", fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {priceEstimate ? priceEstimate.formattedTotal : ""}
                </div>
              </div>
            </div>

            {/* yp.js card container */}
            <div ref={ypContainerRef} id="yp-payment-container" style={{ minHeight: 180, marginBottom: 16 }} />

            {/* Confirm Payment button */}
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
                boxShadow: "0 6px 20px rgba(212,175,55,.3)",
              }}
            >
              {lang === "ar"
                ? `🔒 تأكيد ودفع ${priceEstimate ? priceEstimate.formattedTotal : ""}`
                : lang === "fr"
                ? `🔒 Payer ${priceEstimate ? priceEstimate.formattedTotal : ""}`
                : lang === "zh"
                ? `🔒 确认并支付 ${priceEstimate ? priceEstimate.formattedTotal : ""}`
                : `🔒 Pay ${priceEstimate ? priceEstimate.formattedTotal : ""}`}
            </button>

            {/* Back to Order Form button */}
            <button
              type="button"
              onClick={() => { setStatus("idle"); setYpToken(""); setYpPublicKey(""); }}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "10px",
                background: "transparent",
                color: "#a79f8f",
                border: "1px solid rgba(212,175,55,.25)",
                borderRadius: 6,
                fontSize: 13,
                fontFamily: fonts.ui,
                cursor: "pointer",
              }}
            >
              {lang === "ar"
                ? "← العودة لتعديل بيانات الطلب"
                : lang === "fr"
                ? "← Modifier les informations de commande"
                : lang === "zh"
                ? "← 返回修改订单"
                : "← Back to Edit Order"}
            </button>

            {/* Trust badge */}
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#8d8578", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span>🛡️</span>
              <span>
                {lang === "ar"
                  ? "دفع إلكتروني مشفّر 256-bit SSL ومعتمد من Visa و Mastercard و CMI"
                  : lang === "fr"
                  ? "Paiement sécurisé et crypté SSL 256 bits · Vérifié par Visa, Mastercard & CMI"
                  : "256-bit SSL Encrypted & 3D-Secure Verified by Visa, Mastercard & CMI"}
              </span>
            </div>
          </div>
        ) : status === "paid_success" ? (
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
                    gap: 8,
                  }}
                >
                  {/* Price per gram (left) */}
                  <div>
                    <div style={{ fontSize: 11.5, color: "#a79f8f", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 2 }}>
                      {lang === "ar" ? "💰 سعر الغرام:" : lang === "fr" ? "💰 Prix / gramme :" : lang === "zh" ? "💰 每克价格：" : "💰 Price / gram:"}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#D4AF37", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {priceEstimate.formattedUnit}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, alignSelf: "stretch", background: "rgba(212,175,55,0.25)" }} />

                  {/* Grand total (right) */}
                  <div style={{ textAlign: isAr ? "left" : "right" }}>
                    <div style={{ fontSize: 11.5, color: priceEstimate.hasFees ? "#D4AF37" : "#a79f8f", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 2 }}>
                      {priceEstimate.hasFees
                        ? (lang === "ar" ? "✅ الإجمالي (شامل الرسوم):" : lang === "fr" ? "✅ Total (frais inclus) :" : lang === "zh" ? "✅ 总计（含费用）：" : "✅ Total (incl. fees):")
                        : (lang === "ar" ? "💰 الإجمالي المقدر:" : lang === "fr" ? "💰 Total estimé :" : lang === "zh" ? "💰 预估总额：" : "💰 Estimated Total:")}
                    </div>
                    <div style={{ fontSize: 19, fontWeight: 700, color: "#FFB800", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: ".03em" }}>
                      {priceEstimate.formattedTotal}
                    </div>
                    <div style={{ fontSize: 11, color: "#8d8578", marginTop: 1 }}>
                      {priceEstimate.qty} {lang === "ar" ? "غرام" : lang === "zh" ? "克" : "g"}
                      {priceEstimate.hasFees && (
                        <span style={{ marginInlineStart: 6, fontSize: 10, color: "#a79f8f" }}>
                          ({lang === "ar" ? "شامل الشحن والتغليف والضريبة ورسوم الدفع الآمن" : lang === "fr" ? "livraison, emballage, taxe & frais de paiement inclus" : lang === "zh" ? "含运费、包装、税费及安全支付手续费" : "shipping, packaging, tax & secure payment fee included"})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* EXCLUSIVE SECURE CARD PAYMENT METHOD */}
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: ".08em", color: "#a79f8f" }}>
                  {m.payMethod || (isAr ? "طريقة الدفع والتأكيد" : "Payment Method")}
                </span>

                <div
                  style={{
                    border: `1.5px solid ${C.gold}`,
                    background: "rgba(212,175,55,.1)",
                    borderRadius: 6,
                    padding: "13px 15px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontWeight: 700, color: C.paper, fontSize: 14, fontFamily: fonts.ui, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>💳</span> {m.payCard || (isAr ? "بطاقة بنكية (فيزا / ماستركارد / CMI)" : "Credit / Debit Card (Visa, Mastercard, CMI)")}
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
                  <div style={{ fontSize: 12, color: "#b3a998", lineHeight: 1.5, fontFamily: fonts.ui }}>
                    {m.payCardDesc || (isAr ? "دفع إلكتروني فوري ومشفّر 3D-Secure لجميع البطاقات المغربية والدولية" : "Instant 3D-Secure card payment for Morocco, Asia, Europe & the Americas.")}
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
              ) : (
                <>
                  <span>🔒</span> {m.payCardCta || (isAr ? "متابعة للدفع الآمن بالبطاقة" : "Proceed to Secure Card Payment")}
                </>
              )}
            </button>

            <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "#8d8578", fontFamily: C.mono }}>
              🛡️ {m.securityBadge || (isAr ? "معاملة مشفرة 256-bit بمعيار الأمان البنكي 3D Secure" : "256-bit SSL encrypted & 3D Secure verified")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
