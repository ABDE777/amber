import { useState, useRef, useEffect } from "react";
import { useLang } from "../i18n.jsx";
import { config } from "../config.js";

const C = {
  gold: "#D4AF37",
  amber: "#FFB800",
  ruby: "#990000",
  paper: "#F6EFD9",
  body: "#c3bbab",
  panel: "#332626",
};

const adminDigits = String(config.whatsapp || "").replace(/[^0-9]/g, "");

export default function Assistant({ onOrder }) {
  const { t, fonts, dir } = useLang();
  const a = t.assistant;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]); // {role:'user'|'assistant', content}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading, open, orderCompleted]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang: dir === "rtl" ? "ar" : "en" }),
      });
      if (res.status === 503) {
        setDisabled(true);
        return;
      }
      if (!res.ok) throw new Error("bad");
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.reply || "…" }]);
      if (data.done) {
        setOrderCompleted(true);
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: a.error }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div dir={dir}>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={a.open}
        style={{
          position: "fixed",
          bottom: 22,
          insetInlineEnd: 22,
          zIndex: 90,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "13px 18px",
          background: "linear-gradient(150deg,#c00000,#7a0000)",
          color: "#FFE9A8",
          border: "1px solid rgba(255,184,0,.5)",
          borderRadius: 999,
          cursor: "pointer",
          fontFamily: fonts.ui,
          fontSize: 14,
          fontWeight: 700,
          boxShadow: "0 12px 30px rgba(120,0,0,.5)",
        }}
      >
        <span aria-hidden style={{ fontSize: 18 }}>{open ? "×" : "💬"}</span>
        {!open && a.open}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 84,
            insetInlineEnd: 22,
            zIndex: 95,
            width: "min(370px, 92vw)",
            height: "min(70vh, 540px)",
            display: "flex",
            flexDirection: "column",
            background: C.panel,
            border: "1px solid rgba(212,175,55,.4)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,.6)",
          }}
        >
          <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(212,175,55,.25)", background: "linear-gradient(160deg,#352727,#140b0c)" }}>
            <div style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 700, color: C.paper }}>{a.title}</div>
            <div style={{ fontFamily: fonts.ui, fontSize: 12, color: C.body, marginTop: 2 }}>{a.sub}</div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <Bubble role="assistant" fonts={fonts}>{a.greeting}</Bubble>
            {msgs.map((m, i) => (
              <Bubble key={i} role={m.role} fonts={fonts}>{m.content}</Bubble>
            ))}
            {loading && (
              <Bubble role="assistant" fonts={fonts}>
                <span style={{ opacity: 0.7 }}>…</span>
              </Bubble>
            )}
            {orderCompleted && (
              <div style={{ marginTop: 8, textAlign: "center" }}>
                <a
                  href={`https://wa.me/${adminDigits}?text=${encodeURIComponent(
                    dir === "rtl"
                      ? "مرحباً، أود تأكيد الطلب وتحديد طريقة الدفع (عنبر الحوت)"
                      : "Hello, I would like to confirm my order and payment method (Ambergris)"
                  )}`}
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
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: "none",
                    fontFamily: fonts.ui,
                    boxShadow: "0 4px 14px rgba(37,211,102,.4)",
                  }}
                >
                  <span>💬</span>
                  {dir === "rtl" ? "تأكيد الطلب والدفع عبر واتساب" : "Confirm Order & Payment on WhatsApp"}
                </a>
              </div>
            )}
            {disabled && (
              <div style={{ fontFamily: fonts.ui, fontSize: 13, color: C.body, background: "#3a2827", border: "1px solid rgba(212,175,55,.25)", borderRadius: 8, padding: 12 }}>
                {a.disabled}
                <button
                  onClick={() => { setOpen(false); onOrder?.(); }}
                  style={{ marginTop: 10, width: "100%", padding: "10px", background: C.ruby, color: "#FFE9A8", border: "1px solid rgba(255,184,0,.4)", borderRadius: 6, cursor: "pointer", fontFamily: fonts.ui, fontWeight: 700 }}
                >
                  {t.nav.order}
                </button>
              </div>
            )}
          </div>

          {!disabled && (
            <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid rgba(212,175,55,.25)" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={a.placeholder}
                style={{ flex: 1, background: "#2f2323", border: "1px solid rgba(212,175,55,.35)", color: C.paper, fontFamily: fonts.ui, fontSize: 15, padding: "11px 12px", borderRadius: 6, outline: "none" }}
              />
              <button
                onClick={send}
                disabled={loading}
                style={{ padding: "0 16px", background: C.ruby, color: "#FFE9A8", border: "1px solid rgba(255,184,0,.4)", borderRadius: 6, cursor: loading ? "default" : "pointer", fontFamily: fonts.ui, fontWeight: 700, opacity: loading ? 0.6 : 1 }}
              >
                {a.send}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Bubble({ role, children, fonts }) {
  const isUser = role === "user";
  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "82%",
        background: isUser ? "#642a2b" : "#3c2c2c",
        border: `1px solid ${isUser ? "rgba(255,184,0,.3)" : "rgba(212,175,55,.2)"}`,
        color: isUser ? "#FFE9A8" : "#e6ddcd",
        fontFamily: fonts.ui,
        fontSize: 14.5,
        lineHeight: 1.7,
        padding: "10px 13px",
        borderRadius: 10,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {children}
    </div>
  );
}
