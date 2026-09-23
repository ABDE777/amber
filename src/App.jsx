import { useState, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { config } from "./config.js";
import { LangProvider, useLang } from "./i18n.jsx";
import OrderModal from "./components/OrderModal.jsx";
import AmberMotionBackground from "./components/AmberMotionBackground.jsx";
import AdminOrdersModal from "./components/AdminOrdersModal.jsx";

gsap.registerPlugin(ScrollTrigger);

const C = {
  amber: "#FFB800",
  gold: "#D4AF37",
  ruby: "#990000",
  paper: "#F6EFD9",
  body: "#c3bbab",
  ink: "#2a1e1f",
  mono: "'IBM Plex Mono', monospace",
  brand: "Marcellus, serif",
};

const LANGS = [
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "zh", label: "中文" },
];

function LangToggle() {
  const { setLang, lang } = useLang();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  return (
    <div style={{ position: "relative", zIndex: 60 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch language"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          background: open ? "rgba(212,175,55,.12)" : "transparent",
          border: "1px solid rgba(212,175,55,.4)",
          color: C.gold,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: ".04em",
          cursor: "pointer",
          borderRadius: 3,
          fontFamily: C.mono,
          whiteSpace: "nowrap",
        }}
      >
        <span aria-hidden>🌐</span>
        {current.label}
        <span aria-hidden style={{ fontSize: 9, opacity: 0.8, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: -1 }} />
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              insetInlineEnd: 0,
              minWidth: 150,
              background: "rgba(30,20,21,.98)",
              border: "1px solid rgba(212,175,55,.4)",
              borderRadius: 6,
              boxShadow: "0 18px 40px rgba(0,0,0,.55)",
              overflow: "hidden",
              backdropFilter: "blur(10px)",
            }}
          >
            {LANGS.map((l) => {
              const active = l.code === lang;
              return (
                <button
                  key={l.code}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    width: "100%",
                    padding: "11px 16px",
                    background: active ? "rgba(212,175,55,.14)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(212,175,55,.1)",
                    color: active ? C.gold : "#d8cebe",
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    textAlign: "start",
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(153,0,0,.35)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = active ? "rgba(212,175,55,.14)" : "transparent")}
                >
                  {l.label}
                  {active && <span aria-hidden style={{ color: C.gold }}>✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Nav({ onOrder }) {
  const { t, fonts } = useLang();
  return (
    <div
      className="mwoa-nav"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        padding: "14px 40px",
        background: "rgba(42,30,31,.9)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(153,0,0,.55)",
        boxShadow: "0 1px 22px rgba(153,0,0,.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img src="/assets/whale.png" alt="MWOA" style={{ height: 26, width: "auto", display: "block" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontFamily: C.brand, fontSize: 19, letterSpacing: ".28em", color: C.gold, lineHeight: 1 }}>
            MWOA
          </span>
          <span style={{ fontFamily: C.mono, fontSize: 8.5, letterSpacing: ".2em", color: "#988e80" }}>
            {t.nav.brandSub}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <div className="mwoa-nav-links" style={{ display: "flex", alignItems: "center", gap: 26 }}>
          {t.nav.links.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="nav-link"
              style={{ fontSize: 14, color: "#b8b0a2", fontFamily: fonts.ui }}
              onClick={(e) => {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {label}
            </a>
          ))}
        </div>
        <LangToggle />
        <button
          onClick={onOrder}
          className="btn-ruby mwoa-nav-order"
          style={{
            padding: "10px 22px",
            background: "#c00000",
            color: "#FFE9A8",
            fontSize: 14,
            fontWeight: 700,
            border: "1px solid rgba(255,184,0,.35)",
            cursor: "pointer",
            fontFamily: fonts.ui,
            whiteSpace: "nowrap",
          }}
        >
          {t.nav.order}
        </button>
      </div>
    </div>
  );
}

function Hero({ onOrder }) {
  const { t, fonts, lang } = useLang();
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
        overflow: "hidden",
        background:
          "radial-gradient(1200px 780px at 26% 42%, #8a2222 0%, #5a2b2c 38%, #342726 68%, #2a1e1f 100%)",
      }}
    >
      {/* Animated Ambergris Floating Motion Background */}
      <AmberMotionBackground />

      {/* Dark Luxury Gradient Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(135deg, rgba(42,30,31,0.85) 0%, rgba(90,43,44,0.55) 50%, rgba(42,30,31,0.9) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: "repeating-linear-gradient(90deg,rgba(153,0,0,.12) 0 1px,transparent 1px 88px)",
          pointerEvents: "none",
        }}
      />

      <div className="hero-copy" style={{ position: "relative", zIndex: 2, maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 30 }}>
          <span style={{ width: 44, height: 1, background: C.gold, display: "block" }} />
          <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: ".24em", color: C.gold }}>
            {t.hero.eyebrow}
          </span>
        </div>
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: lang === "ar" ? "clamp(3.4rem, 11vw, 6rem)" : "clamp(2.6rem, 8.5vw, 5.25rem)",
            lineHeight: 1.05,
            margin: 0,
            color: C.paper,
            fontWeight: lang === "ar" ? 700 : 400,
            textShadow: "0 0 42px rgba(190,0,0,.85)",
          }}
        >
          {t.hero.title}
        </h1>
        {t.hero.accent && (
          <p style={{ fontFamily: "Amiri, serif", fontSize: "clamp(1.5rem, 5vw, 2.5rem)", margin: "8px 0 0", color: C.amber, direction: "rtl" }}>
            {t.hero.accent}
          </p>
        )}
        <p style={{ fontFamily: fonts.ui, fontSize: "clamp(1rem, 2.6vw, 1.25rem)", lineHeight: 1.9, color: C.body, margin: "22px 0 0", maxWidth: 540 }}>
          {t.hero.desc}
        </p>
        <div style={{ marginTop: 40, paddingTop: 30, borderTop: "1px solid rgba(212,175,55,.25)" }}>
          <button
            onClick={onOrder}
            className="btn-ruby"
            style={{
              padding: "16px 40px",
              background: C.ruby,
              color: "#FFE9A8",
              fontSize: 16,
              fontWeight: 700,
              border: "1px solid rgba(255,184,0,.4)",
              cursor: "pointer",
              fontFamily: fonts.ui,
            }}
          >
            {t.hero.cta}
          </button>
        </div>
      </div>

      {/* Right: product media gallery (e-commerce product-detail style) */}
      <ProductGallery />
    </section>
  );
}

function Marquee() {
  const { t, fonts } = useLang();
  return (
    <div
      className="mwoa-marquee"
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
      {t.marquee.map((label, i) => (
        <span key={label} style={{ display: "contents" }}>
          <span style={{ fontFamily: fonts.ui, fontSize: 14, fontWeight: 500, letterSpacing: ".04em", color: "#FFE9A8" }}>
            {label}
          </span>
          {i < t.marquee.length - 1 && (
            <span style={{ width: 5, height: 5, background: C.ink, display: "block", transform: "rotate(45deg)" }} />
          )}
        </span>
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: ".2em", color: "#ff2d2d", marginBottom: 20 }}>
      {children}
    </div>
  );
}

function useH2() {
  const { fonts, lang } = useLang();
  return {
    fontFamily: fonts.display,
    fontSize: "clamp(1.9rem, 5.2vw, 2.9rem)",
    lineHeight: 1.3,
    margin: 0,
    color: C.paper,
    fontWeight: lang === "ar" ? 700 : 400,
  };
}

function WhatIs() {
  const { t, fonts } = useLang();
  const h2 = useH2();
  return (
    <section id="what" className="mwoa-section" style={{ padding: "120px 60px", background: "#342726" }}>
      <div
        className="mwoa-cols reveal"
        style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: ".85fr 1.15fr", gap: 80 }}
      >
        <div>
          <SectionLabel>{t.what.label}</SectionLabel>
          <h2 style={h2}>{t.what.h2}</h2>
          <img src="/assets/flourish.png" alt="" style={{ width: 190, marginTop: 34, display: "block", opacity: 0.9 }} />
        </div>
        <div>
          <p style={{ fontSize: 21, lineHeight: 2, color: "#d5cdbd", margin: 0, fontFamily: fonts.ui }}>{t.what.body}</p>
          <div className="mwoa-cards" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, marginTop: 52, background: "rgba(153,0,0,.55)" }}>
            {t.what.cards.map(([title, text]) => (
              <div key={title} style={{ background: "linear-gradient(160deg,#4b3231,#3b2c2c)", padding: "28px 24px", borderTop: "2px solid #990000" }}>
                <div style={{ fontFamily: fonts.display, fontSize: 28, fontWeight: 700, color: C.amber }}>{title}</div>
                <div style={{ fontSize: 15, lineHeight: 1.9, color: "#a9a193", marginTop: 10, fontFamily: fonts.ui }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Origin() {
  const { t, fonts } = useLang();
  const h2 = useH2();
  return (
    <section id="origin" className="mwoa-section" style={{ padding: "120px 60px", background: "linear-gradient(180deg,#2a1e1f,#3d2727)" }}>
      <div className="reveal" style={{ maxWidth: 1180, margin: "0 auto" }}>
        <SectionLabel>{t.origin.label}</SectionLabel>
        <div className="mwoa-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
          <h2 style={h2}>{t.origin.h2}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <p style={{ fontSize: 17, lineHeight: 2, color: C.body, margin: 0, fontFamily: fonts.ui }}>{t.origin.p1}</p>
            <p style={{ fontSize: 17, lineHeight: 2, color: C.body, margin: 0, fontFamily: fonts.ui }}>{t.origin.p2}</p>
            <div style={{ display: "flex", gap: 2, marginTop: 14, background: "rgba(153,0,0,.55)" }}>
              {t.origin.boxes.map(([k, v]) => (
                <div key={k} style={{ background: "#3b2c2c", padding: "20px 26px", flex: 1 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: ".16em", color: "#988e80" }}>{k}</div>
                  <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 700, color: C.paper, marginTop: 6 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Product media. Photos come only from /public/IMG; videos from /public/VIDEOS.
// Paths are URL-encoded because the source filenames contain spaces. To add or
// swap media, drop the file in the matching folder and edit the lists below.
const PRODUCT_IMAGES = [
  "/IMG/21%20copy.jpg",
  "/IMG/20%20copy.jpg",
  "/IMG/22%20copy.jpg",
  "/IMG/19%20copy.jpg",
  "/IMG/23%20copy.jpeg",
];
const PRODUCT_VIDEOS = [
  "/VIDEOS/WhatsApp%20Video%202026-09-09%20at%2013.52.32.mp4",
  "/VIDEOS/WhatsApp%20Video%202026-09-13%20at%2022.30.17.mp4",
  "/VIDEOS/WhatsApp%20Video%202026-09-13%20at%2022.32.47.mp4",
];
// One combined list for the product gallery: images first, then videos. Each
// video borrows a product photo as its thumbnail/poster.
const PRODUCT_MEDIA = [
  ...PRODUCT_IMAGES.map((src) => ({ type: "image", src })),
  ...PRODUCT_VIDEOS.map((src, i) => ({ type: "video", src, poster: PRODUCT_IMAGES[i % PRODUCT_IMAGES.length] })),
];

function Lightbox({ index, onClose, onPrev, onNext, images, captions, dir }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") (dir === "rtl" ? onNext : onPrev)();
      else if (e.key === "ArrowRight") (dir === "rtl" ? onPrev : onNext)();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext, dir]);

  return (
    <div
      className="mwoa-lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(10,6,7,.94)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <button onClick={onClose} aria-label="Close" className="lb-btn" style={{ position: "absolute", top: 18, insetInlineEnd: 18, fontSize: 30 }}>×</button>
      <button onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous" className="lb-btn lb-nav" style={{ insetInlineStart: 14 }}>‹</button>
      <figure onClick={(e) => e.stopPropagation()} style={{ margin: 0, maxWidth: "min(1000px, 92vw)", maxHeight: "88vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <img src={images[index]} alt={captions[index]} style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", borderRadius: 8, border: "1px solid rgba(212,175,55,.3)", boxShadow: "0 30px 80px rgba(0,0,0,.7)" }} />
        <figcaption style={{ fontFamily: C.mono, fontSize: 13, letterSpacing: ".08em", color: "#d8cebe", textAlign: "center" }}>
          <span style={{ color: C.gold }}>{index + 1} / {images.length}</span>  ·  {captions[index]}
        </figcaption>
      </figure>
      <button onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next" className="lb-btn lb-nav" style={{ insetInlineEnd: 14 }}>›</button>
    </div>
  );
}

// E-commerce product-detail gallery: a large main stage (image or video shown
// uncropped) plus a thumbnail rail to switch media. Images open a zoom lightbox.
function ProductGallery() {
  const { t, dir } = useLang();
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const media = PRODUCT_MEDIA;
  const current = media[active];
  const captions = PRODUCT_IMAGES.map((_, i) => `${t.hero.title} — ${i + 1}`);

  return (
    <div className="hero-media" style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 600, margin: "0 auto" }}>
      <div className="pg-stage">
        {current.type === "video" ? (
          <video key={current.src} src={current.src} poster={current.poster} controls playsInline preload="metadata" className="pg-media" />
        ) : (
          <button type="button" className="pg-imgbtn" onClick={() => setLightbox(PRODUCT_IMAGES.indexOf(current.src))} aria-label={t.gallery.zoomHint} title={t.gallery.zoomHint}>
            <img src={current.src} alt={`${t.hero.title} — ${active + 1}`} className="pg-media" />
            <span className="pg-zoom" aria-hidden>⤢</span>
          </button>
        )}
        <span className="pg-counter" style={{ fontFamily: C.mono }}>{active + 1} / {media.length}</span>
      </div>

      <div className="pg-thumbs" role="tablist" aria-label={t.gallery.h2}>
        {media.map((m, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={"pg-thumb" + (i === active ? " is-active" : "")}
            onClick={() => setActive(i)}
            aria-label={`${m.type === "video" ? "▶ " : ""}${t.hero.title} ${i + 1}`}
          >
            <img src={m.poster || m.src} alt="" loading="lazy" />
            {m.type === "video" && <span className="pg-thumb-play" aria-hidden>▶</span>}
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <Lightbox
          index={lightbox}
          images={PRODUCT_IMAGES}
          captions={captions}
          dir={dir}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox((n) => (n - 1 + PRODUCT_IMAGES.length) % PRODUCT_IMAGES.length)}
          onNext={() => setLightbox((n) => (n + 1) % PRODUCT_IMAGES.length)}
        />
      )}
    </div>
  );
}

function Authenticity() {
  const { t, fonts } = useLang();
  const h2 = useH2();
  return (
    <section id="proof" className="mwoa-section" style={{ padding: "120px 60px", background: "#342726", borderTop: "1px solid rgba(153,0,0,.5)" }}>
      <div className="mwoa-cols reveal" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 70, alignItems: "center" }}>
        <div>
          <SectionLabel>{t.proof.label}</SectionLabel>
          <h2 style={h2}>{t.proof.h2}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 34 }}>
            {t.proof.points.map((p) => (
              <div key={p} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ width: 7, height: 7, background: C.ruby, display: "block", marginTop: 10, transform: "rotate(45deg)", flex: "none" }} />
                <span style={{ fontSize: 17, lineHeight: 1.9, color: C.body, fontFamily: fonts.ui }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", padding: 44, border: "1px solid rgba(212,175,55,.45)", background: "linear-gradient(150deg,#642a2b,#342726)" }}>
          <div style={{ position: "absolute", inset: 10, border: "1px solid rgba(212,175,55,.18)", pointerEvents: "none" }} />
          <div style={{ position: "relative", textAlign: "center" }}>
            <img src="/assets/whale.png" alt="" style={{ width: 120, display: "block", margin: "0 auto 22px" }} />
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: ".22em", color: C.gold }}>{t.proof.certLabel}</div>
            <div style={{ fontFamily: fonts.display, fontSize: 36, fontWeight: 700, color: C.paper, margin: "14px 0 6px" }}>{t.proof.certTitle}</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 20, marginTop: 34, paddingTop: 22, borderTop: "1px solid rgba(212,175,55,.25)", fontFamily: C.mono, fontSize: 11, letterSpacing: ".1em", color: "#8d8578" }}>
              {t.proof.cert.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t, fonts } = useLang();
  return (
    <footer id="contact" style={{ padding: "90px 60px 50px", background: "#2a1e1f", borderTop: "2px solid #990000" }}>
      <div className="mwoa-footer-grid" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 60, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/assets/whale.png" alt="MWOA" style={{ height: 34, width: "auto", display: "block" }} />
            <span style={{ fontFamily: C.brand, fontSize: 26, letterSpacing: ".28em", color: C.gold }}>MWOA</span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.9, color: "#8d8578", margin: "20px 0 0", maxWidth: 340, fontFamily: fonts.ui }}>{t.footer.tagline}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: ".2em", color: "#988e80", marginBottom: 4 }}>{t.footer.contact}</div>
          <a href={`https://wa.me/${String(config.whatsapp).replace(/[^0-9]/g, "")}`} style={{ fontSize: 16, fontFamily: fonts.ui }}>
            {t.footer.wa} · {config.whatsapp}
          </a>
          <a href={`mailto:${config.email}`} style={{ fontSize: 16, fontFamily: fonts.ui }}>{config.email}</a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: ".2em", color: "#988e80", marginBottom: 4 }}>{t.footer.hours}</div>
          <span style={{ fontSize: 16, color: "#b8b0a2", fontFamily: fonts.ui }}>{t.footer.hoursVal}</span>
          <span style={{ fontSize: 16, color: "#b8b0a2", fontFamily: fonts.ui }}>{t.footer.ship}</span>
        </div>
      </div>
      <div style={{ maxWidth: 1180, margin: "60px auto 0", paddingTop: 24, borderTop: "1px solid rgba(212,175,55,.15)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20, fontFamily: C.mono, fontSize: 11, letterSpacing: ".14em", color: "#8f8474" }}>
        <span style={{ color: "#c00000", fontSize: 13, letterSpacing: ".3em" }}>© MWOA · 2026</span>
        <span>{t.footer.country}</span>
      </div>
    </footer>
  );
}

function AppInner() {
  const { dir } = useLang();
  const [modalOpen, setModalOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const openModal = () => setModalOpen(true);

  // Automatically open modal if customer returns with ?payment=success or ?payment=error
  useEffect(() => {
    try {
      if (window.location.search.includes("payment=")) {
        setModalOpen(true);
      }
    } catch {}
  }, []);

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
    const timer = setTimeout(refresh, 400);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("load", refresh);
      triggers.forEach((tw) => tw.scrollTrigger?.kill());
      ScrollTrigger.getAll().forEach((s) => s.kill());
    };
  }, []);

  return (
    <div dir={dir} style={{ background: "#342726", overflowX: "hidden" }}>
      <Nav onOrder={openModal} />
      <Hero onOrder={openModal} />
      <Marquee />
      <WhatIs />
      <Origin />
      <Authenticity />
      <Footer />
      <OrderModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <AdminOrdersModal open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}
