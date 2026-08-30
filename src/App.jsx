import { useState, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { config, faqs } from "./config.js";
import ProductModel3D from "./components/ProductModel3D.jsx";
import OrderModal from "./components/OrderModal.jsx";

gsap.registerPlugin(ScrollTrigger);

const C = {
  amber: "#FFB800",
  gold: "#D4AF37",
  ruby: "#990000",
  paper: "#F6EFD9",
  body: "#c3bbab",
  ink: "#0b0708",
  mono: "'IBM Plex Mono', monospace",
  serif: "Marcellus, serif",
  arabic: "Amiri, serif",
  ui: "Tajawal, Karla, system-ui, sans-serif",
};

function Nav({ onOrder }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        padding: "14px 40px",
        background: "rgba(14,7,8,.86)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(153,0,0,.55)",
        boxShadow: "0 1px 22px rgba(153,0,0,.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img
          src="/assets/whale.png"
          alt="MWOA"
          style={{ height: 26, width: "auto", display: "block" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span
            style={{
              fontFamily: C.serif,
              fontSize: 19,
              letterSpacing: ".28em",
              color: C.gold,
              lineHeight: 1,
            }}
          >
            MWOA
          </span>
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 8.5,
              letterSpacing: ".2em",
              color: "#7d7466",
            }}
          >
            عنبر الحوت · المغرب
          </span>
        </div>
      </div>
      <div
        className="mwoa-nav-links"
        style={{ display: "flex", alignItems: "center", gap: 30 }}
      >
        {[
          ["#what", "المنتج"],
          ["#origin", "الأصل"],
          ["#proof", "الأصالة"],
          ["#faq", "الأسئلة"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="nav-link"
            style={{ fontSize: 14, color: "#b8b0a2", fontFamily: C.ui }}
          >
            {label}
          </a>
        ))}
        <button
          onClick={onOrder}
          className="btn-ruby"
          style={{
            padding: "10px 22px",
            background: "#c00000",
            color: "#FFE9A8",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: ".02em",
            border: "1px solid rgba(255,184,0,.35)",
            cursor: "pointer",
            fontFamily: C.ui,
          }}
        >
          اطلب الآن
        </button>
      </div>
    </div>
  );
}

function Hero({ onOrder }) {
  return (
    <section
      className="mwoa-hero"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.05fr .95fr",
        alignItems: "center",
        gap: 40,
        padding: "150px 60px 90px",
        background:
          "radial-gradient(1200px 780px at 26% 42%, #6b0000 0%, #2a0708 38%, #12080a 68%, #0b0708 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(90deg,rgba(153,0,0,.16) 0 1px,transparent 1px 88px)",
          pointerEvents: "none",
        }}
      />
      <div className="hero-copy" style={{ position: "relative", maxWidth: 640 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 30,
          }}
        >
          <span style={{ width: 44, height: 1, background: C.gold, display: "block" }} />
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              letterSpacing: ".24em",
              color: C.gold,
            }}
          >
            منتج واحد · مادة واحدة
          </span>
        </div>
        <h1
          style={{
            fontFamily: C.arabic,
            fontSize: 96,
            lineHeight: 1.05,
            margin: 0,
            color: C.paper,
            fontWeight: 700,
            textShadow: "0 0 42px rgba(190,0,0,.85)",
          }}
        >
          عنبر الحوت
        </h1>
        <p
          style={{
            fontFamily: C.ui,
            fontSize: 20,
            lineHeight: 1.9,
            color: C.body,
            margin: "22px 0 0",
            maxWidth: 540,
          }}
        >
          مادة نادرة تتكوّن طبيعياً، مرتبطة تقليدياً بحوت العنبر — تُستعمل في صناعة
          العطور الفاخرة لرائحتها المميّزة وقدرتها على إطالة ثبات العطر.
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 34,
            margin: "40px 0 0",
            paddingTop: 30,
            borderTop: "1px solid rgba(212,175,55,.25)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: C.mono,
                fontSize: 10,
                letterSpacing: ".2em",
                color: "#7d7466",
                marginBottom: 8,
              }}
            >
              السعر
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{ fontFamily: C.serif, fontSize: 50, color: C.amber, lineHeight: 1 }}
              >
                {config.price}
              </span>
              <span style={{ fontFamily: C.serif, fontSize: 20, color: C.gold }}>درهم</span>
              <span style={{ fontSize: 14, color: "#8d8578", fontFamily: C.ui }}>/ غرام</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, paddingBottom: 4 }}>
            <button
              onClick={onOrder}
              className="btn-ruby"
              style={{
                padding: "15px 34px",
                background: C.ruby,
                color: "#FFE9A8",
                fontSize: 15,
                fontWeight: 700,
                border: "1px solid rgba(255,184,0,.4)",
                cursor: "pointer",
                fontFamily: C.ui,
              }}
            >
              اطلب الآن
            </button>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "82%",
            aspectRatio: "1",
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(190,0,0,.7),rgba(255,120,20,.22) 40%,transparent 68%)",
            animation: "mwoaGlow 6s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <ProductModel3D />
        <span
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: C.mono,
            fontSize: 10,
            letterSpacing: ".2em",
            color: "rgba(212,175,55,.6)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          ↺ اسحب للتدوير
        </span>
      </div>
    </section>
  );
}

function Marquee() {
  const items = ["طبيعي", "وزن يدوي", "قطعة فريدة", "تغليف محكم"];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        padding: "26px 40px",
        background: C.ruby,
        borderTop: "1px solid rgba(255,184,0,.35)",
        borderBottom: "1px solid rgba(255,184,0,.35)",
        flexWrap: "wrap",
      }}
    >
      {items.map((label, i) => (
        <span key={label} style={{ display: "contents" }}>
          <span
            style={{
              fontFamily: C.ui,
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: ".04em",
              color: "#FFE9A8",
            }}
          >
            {label}
          </span>
          {i < items.length - 1 && (
            <span
              style={{
                width: 5,
                height: 5,
                background: C.ink,
                display: "block",
                transform: "rotate(45deg)",
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: C.mono,
        fontSize: 11,
        letterSpacing: ".2em",
        color: "#ff2d2d",
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}

const h2Style = {
  fontFamily: C.arabic,
  fontSize: 46,
  lineHeight: 1.3,
  margin: 0,
  color: C.paper,
  fontWeight: 700,
};

function WhatIs() {
  const cards = [
    ["طبيعي", "يتكوّن في البحر، لا يُصنّع. لا يُضاف إليه شيء."],
    ["للعطور", "مثبّت عطري: يُبقي الرائحة على البشرة مدة أطول بكثير."],
    ["فريد", "اللون والملمس والشكل والرائحة تختلف من قطعة لأخرى."],
  ];
  return (
    <section id="what" className="mwoa-section" style={{ padding: "120px 60px", background: "#120b0c" }}>
      <div
        className="mwoa-cols reveal"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: ".85fr 1.15fr",
          gap: 80,
        }}
      >
        <div>
          <SectionLabel>٠١ — ما هو</SectionLabel>
          <h2 style={h2Style}>ما هو عنبر الحوت حقًّا</h2>
          <img
            src="/assets/flourish.png"
            alt=""
            style={{ width: 190, marginTop: 34, display: "block", opacity: 0.9 }}
          />
        </div>
        <div>
          <p style={{ fontSize: 21, lineHeight: 2, color: "#d5cdbd", margin: 0, fontFamily: C.ui }}>
            عنبر الحوت مادة نادرة تتكوّن طبيعياً، مرتبطة تقليدياً بحوت العنبر. وهي
            مادة عطرية ثمينة تُستعمل أساساً في صناعة العطور الفاخرة لرائحتها المميّزة
            وقدرتها على إطالة ثبات العطر. كل قطعة فريدة في لونها وملمسها وشكلها ورائحتها.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 2,
              marginTop: 52,
              background: "rgba(153,0,0,.55)",
            }}
          >
            {cards.map(([title, text]) => (
              <div
                key={title}
                style={{
                  background: "linear-gradient(160deg,#2a0e10,#1a0c0d)",
                  padding: "28px 24px",
                  borderTop: "2px solid #990000",
                }}
              >
                <div style={{ fontFamily: C.arabic, fontSize: 28, fontWeight: 700, color: C.amber }}>
                  {title}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.9, color: "#a9a193", marginTop: 10, fontFamily: C.ui }}>
                  {text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Origin() {
  return (
    <section
      id="origin"
      className="mwoa-section"
      style={{ padding: "120px 60px", background: "linear-gradient(180deg,#0b0708,#1c0a0b)" }}
    >
      <div className="reveal" style={{ maxWidth: 1180, margin: "0 auto" }}>
        <SectionLabel>٠٢ — الأصل</SectionLabel>
        <div
          className="mwoa-cols"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}
        >
          <h2 style={h2Style}>يُجمع من الشاطئ، لا يُؤخذ من البحر</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <p style={{ fontSize: 17, lineHeight: 2, color: C.body, margin: 0, fontFamily: C.ui }}>
              يُجمع العنبر حيث يتركه المحيط — على طول الساحل، بعد سنوات من التنقّل في
              الماء. الوقت في ماء البحر وتحت الشمس هو ما يمنح كل قطعة لونها ورائحتها؛
              فالقطعة الطازجة والقطعة المُعتّقة ليستا المادة نفسها.
            </p>
            <p style={{ fontSize: 17, lineHeight: 2, color: C.body, margin: 0, fontFamily: C.ui }}>
              كل قطعة تُباع هنا تُفحص يدوياً، وتُوزن أمام طلب المشتري، وتُرسل مختومة.
              وإذا لم تبلغ القطعة المعيار المطلوب، فلا تُعرض للبيع.
            </p>
            <div style={{ display: "flex", gap: 2, marginTop: 14, background: "rgba(153,0,0,.55)" }}>
              {[
                ["الجمع", "الساحل الأطلسي"],
                ["المراقبة", "قطعة بقطعة"],
              ].map(([k, v]) => (
                <div key={k} style={{ background: "#1a0c0d", padding: "20px 26px", flex: 1 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: ".16em", color: "#7d7466" }}>
                    {k}
                  </div>
                  <div style={{ fontFamily: C.arabic, fontSize: 22, fontWeight: 700, color: C.paper, marginTop: 6 }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const slots = [
    { label: "الصورة الرئيسية · القطعة في اليد", style: { gridRow: "span 2" } },
    { label: "تكبير · الملمس", style: {} },
    { label: "الميزان · الوزن", style: {} },
    { label: "التغليف المحكم · قبل الإرسال", style: { gridColumn: "span 2" } },
  ];
  return (
    <section className="mwoa-section" style={{ padding: "100px 60px 120px", background: "#0f0809" }}>
      <div className="reveal" style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 40,
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          <div>
            <SectionLabel>٠٣ — المعرض</SectionLabel>
            <h2 style={h2Style}>القطع</h2>
          </div>
          <p style={{ fontFamily: C.ui, fontSize: 14, lineHeight: 1.8, color: "#7d7466", maxWidth: 320, margin: 0 }}>
            ضع صورك الحقيقية في هذه الخانات الأربع — صور المخزون الحقيقي تبيع أكثر من أي وصف.
          </p>
        </div>
        <div
          className="mwoa-gallery"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gridTemplateRows: "200px 200px",
            gap: 2,
            background: "rgba(153,0,0,.55)",
          }}
        >
          {slots.map((s) => (
            <div
              key={s.label}
              style={{
                ...s.style,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "repeating-linear-gradient(45deg,#170a0b 0 12px,#200d0e 12px 24px)",
                border: "1px solid rgba(153,0,0,.45)",
              }}
            >
              <span
                style={{
                  fontFamily: C.ui,
                  fontSize: 14,
                  color: "#8d8578",
                  padding: "0 12px",
                  textAlign: "center",
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Authenticity() {
  const points = [
    "كل طلب يُوزن على ميزان مُعاير ويُصوّر أثناء التغليف.",
    "بطاقة موقّعة ترافق القطعة: الوزن والتاريخ والأصل.",
    "اختبار الحرق واختبار الرائحة يُشرحان قبل الشراء، لا بعده.",
  ];
  return (
    <section
      id="proof"
      className="mwoa-section"
      style={{ padding: "120px 60px", background: "#120b0c", borderTop: "1px solid rgba(153,0,0,.5)" }}
    >
      <div
        className="mwoa-cols reveal"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 70,
          alignItems: "center",
        }}
      >
        <div>
          <SectionLabel>٠٤ — الأصالة</SectionLabel>
          <h2 style={h2Style}>موزون، مختوم، موثّق</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 34 }}>
            {points.map((p) => (
              <div key={p} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    background: C.ruby,
                    display: "block",
                    marginTop: 10,
                    transform: "rotate(45deg)",
                    flex: "none",
                  }}
                />
                <span style={{ fontSize: 17, lineHeight: 1.9, color: C.body, fontFamily: C.ui }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            position: "relative",
            padding: 44,
            border: "1px solid rgba(212,175,55,.45)",
            background: "linear-gradient(150deg,#3a0507,#120b0c)",
          }}
        >
          <div style={{ position: "absolute", inset: 10, border: "1px solid rgba(212,175,55,.18)", pointerEvents: "none" }} />
          <div style={{ position: "relative", textAlign: "center" }}>
            <img src="/assets/whale.png" alt="" style={{ width: 120, display: "block", margin: "0 auto 22px" }} />
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: ".22em", color: C.gold }}>
              شهادة أصالة
            </div>
            <div style={{ fontFamily: C.arabic, fontSize: 36, fontWeight: 700, color: C.paper, margin: "14px 0 6px" }}>
              عنبر الحوت
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                marginTop: 34,
                paddingTop: 22,
                borderTop: "1px solid rgba(212,175,55,.25)",
                fontFamily: C.mono,
                fontSize: 11,
                letterSpacing: ".1em",
                color: "#8d8578",
              }}
            >
              <span>الوزن ____ غ</span>
              <span>التاريخ ____</span>
              <span>المرجع ____</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Order({ onOrder }) {
  return (
    <section
      id="buy"
      className="mwoa-section"
      style={{
        padding: "120px 60px",
        background: "radial-gradient(1000px 620px at 50% 0%, #8a0000 0%, #3a0507 34%, #120b0c 72%)",
      }}
    >
      <div className="reveal" style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <SectionLabel>٠٥ — اطلب</SectionLabel>
        <h2 style={{ ...h2Style, fontSize: 54 }}>اطلب بالغرام</h2>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, margin: "36px 0 0" }}>
          <span style={{ fontFamily: C.serif, fontSize: 96, color: C.amber, lineHeight: 1 }}>{config.price}</span>
          <span style={{ fontFamily: C.serif, fontSize: 30, color: C.gold }}>درهم</span>
          <span style={{ fontSize: 17, color: "#8d8578", fontFamily: C.ui }}>/ غرام</span>
        </div>
        <p
          style={{
            fontSize: 18,
            lineHeight: 2,
            color: C.body,
            maxWidth: 640,
            margin: "28px auto 0",
            fontFamily: C.ui,
          }}
        >
          يحصل المشتري على عنبر حوت أصلي، موزون بعناية ومغلّف بإحكام. كل قطعة فريدة في
          حجمها ولونها وملمسها ورائحتها. الكمية المُستلمة تطابق الكمية المطلوبة تماماً.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 44, flexWrap: "wrap" }}>
          <button
            onClick={onOrder}
            className="btn-ruby"
            style={{
              padding: "18px 48px",
              background: C.ruby,
              color: "#FFE9A8",
              fontSize: 16,
              fontWeight: 700,
              border: "1px solid rgba(255,184,0,.4)",
              cursor: "pointer",
              fontFamily: C.ui,
            }}
          >
            اطلب الآن
          </button>
        </div>
        <div style={{ fontFamily: C.ui, fontSize: 13, letterSpacing: ".04em", color: "#7d7466", marginTop: 22 }}>
          أخبرنا بالوزن المطلوب · رد خلال ٢٤ ساعة
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  if (!config.showTestimonials) return null;
  return (
    <section
      className="mwoa-section"
      style={{ padding: "110px 60px", background: "#0f0809", borderTop: "1px solid rgba(153,0,0,.5)" }}
    >
      <div className="reveal" style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 40,
            marginBottom: 44,
            flexWrap: "wrap",
          }}
        >
          <div>
            <SectionLabel>٠٦ — العملاء</SectionLabel>
            <h2 style={h2Style}>ماذا يقول المشترون</h2>
          </div>
          <p style={{ fontFamily: C.ui, fontSize: 14, lineHeight: 1.8, color: "#7d7466", maxWidth: 320, margin: 0 }}>
            فارغة عن قصد — ضع هنا ثلاث رسائل حقيقية من مشتريك.
          </p>
        </div>
        <div
          className="mwoa-testimonials"
          style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, background: "rgba(153,0,0,.55)" }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                background: "#180a0b",
                padding: "34px 30px",
                minHeight: 200,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontFamily: C.arabic, fontSize: 20, lineHeight: 1.9, color: "#6a6459" }}>
                « اقتباس العميل — استبدله برسالة حقيقية. »
              </span>
              <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: ".14em", color: "#4f4a42" }}>
                الاسم · المدينة
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="mwoa-section" style={{ padding: "110px 60px", background: "#120b0c" }}>
      <div className="reveal" style={{ maxWidth: 900, margin: "0 auto" }}>
        <SectionLabel>٠٧ — الأسئلة</SectionLabel>
        <h2 style={{ ...h2Style, marginBottom: 44 }}>قبل أن تطلب</h2>
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} style={{ borderTop: "1px solid rgba(153,0,0,.45)" }}>
              <div
                className="faq-row"
                onClick={() => setOpen(isOpen ? -1 : i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 24,
                  padding: "26px 4px",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontFamily: C.arabic, fontSize: 24, fontWeight: 700, color: C.paper }}>
                  {item.q}
                </span>
                <span style={{ fontFamily: C.mono, fontSize: 20, color: C.gold, flex: "none" }}>
                  {isOpen ? "−" : "+"}
                </span>
              </div>
              {isOpen && (
                <p
                  style={{
                    fontSize: 17,
                    lineHeight: 2,
                    color: "#b8b0a2",
                    margin: 0,
                    padding: "0 4px 30px 60px",
                    fontFamily: C.ui,
                  }}
                >
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
        <div style={{ borderTop: "1px solid rgba(153,0,0,.45)" }} />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      id="contact"
      style={{ padding: "90px 60px 50px", background: "#0b0708", borderTop: "2px solid #990000" }}
    >
      <div
        className="mwoa-footer-grid"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr",
          gap: 60,
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/assets/whale.png" alt="MWOA" style={{ height: 34, width: "auto", display: "block" }} />
            <span style={{ fontFamily: C.serif, fontSize: 26, letterSpacing: ".28em", color: C.gold }}>MWOA</span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.9, color: "#8d8578", margin: "20px 0 0", maxWidth: 340, fontFamily: C.ui }}>
            عنبر الحوت. منتج واحد، يُباع بالغرام، ويُوزن يدوياً.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: ".2em", color: "#7d7466", marginBottom: 4 }}>
            اتصل بنا
          </div>
          <a href={`https://wa.me/${String(config.whatsapp).replace(/[^0-9]/g, "")}`} style={{ fontSize: 16, fontFamily: C.ui }}>
            واتساب · {config.whatsapp}
          </a>
          <a href={`mailto:${config.email}`} style={{ fontSize: 16, fontFamily: C.ui }}>
            {config.email}
          </a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: ".2em", color: "#7d7466", marginBottom: 4 }}>
            أوقات العمل
          </div>
          <span style={{ fontSize: 16, color: "#b8b0a2", fontFamily: C.ui }}>الإثنين — السبت · ٩ص—٨م</span>
          <span style={{ fontSize: 16, color: "#b8b0a2", fontFamily: C.ui }}>توصيل إلى كل أنحاء المغرب</span>
        </div>
      </div>
      <div
        style={{
          maxWidth: 1180,
          margin: "60px auto 0",
          paddingTop: 24,
          borderTop: "1px solid rgba(212,175,55,.15)",
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          fontFamily: C.mono,
          fontSize: 11,
          letterSpacing: ".14em",
          color: "#5c564d",
        }}
      >
        <span style={{ color: "#c00000", fontSize: 13, letterSpacing: ".3em" }}>© MWOA · 666</span>
        <span>المغرب</span>
      </div>
    </footer>
  );
}

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);

  // Scroll-reveal animations (GSAP ScrollTrigger).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = gsap.utils.toArray(".reveal");
    if (reduce || !els.length) return;

    gsap.set(els, { opacity: 0, y: 46 });
    const triggers = els.map((el) =>
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
      })
    );
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const t = setTimeout(refresh, 400);

    return () => {
      clearTimeout(t);
      window.removeEventListener("load", refresh);
      triggers.forEach((tw) => tw.scrollTrigger?.kill());
      ScrollTrigger.getAll().forEach((s) => s.kill());
    };
  }, []);

  return (
    <div dir="rtl" lang="ar" style={{ background: "#120b0c", overflowX: "hidden" }}>
      <Nav onOrder={openModal} />
      <Hero onOrder={openModal} />
      <Marquee />
      <WhatIs />
      <Origin />
      <Gallery />
      <Authenticity />
      <Order onOrder={openModal} />
      <Testimonials />
      <Faq />
      <Footer />
      <OrderModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
