import { useState } from "react";
import { config, links, faqs } from "./config.js";

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
};

function Nav() {
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
              letterSpacing: ".3em",
              color: "#7d7466",
            }}
          >
            AMBERGRIS · MAROC
          </span>
        </div>
      </div>
      <div
        className="mwoa-nav-links"
        style={{ display: "flex", alignItems: "center", gap: 30 }}
      >
        {[
          ["#what", "Le produit"],
          ["#origin", "Origine"],
          ["#proof", "Authenticité"],
          ["#faq", "FAQ"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="nav-link"
            style={{ fontSize: 13, letterSpacing: ".06em", color: "#b8b0a2" }}
          >
            {label}
          </a>
        ))}
        <a
          href={links.wa}
          className="btn-ruby"
          style={{
            padding: "10px 22px",
            background: "#c00000",
            color: "#FFE9A8",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: ".1em",
            border: "1px solid rgba(255,184,0,.35)",
          }}
        >
          COMMANDER
        </a>
      </div>
    </div>
  );
}

function Hero() {
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
          "radial-gradient(1200px 780px at 78% 42%, #6b0000 0%, #2a0708 38%, #12080a 68%, #0b0708 100%)",
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
      <div style={{ position: "relative", maxWidth: 620 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 30,
          }}
        >
          <span
            style={{ width: 44, height: 1, background: C.gold, display: "block" }}
          />
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 10.5,
              letterSpacing: ".34em",
              color: C.gold,
            }}
          >
            UN SEUL PRODUIT · UNE SEULE MATIÈRE
          </span>
        </div>
        <h1
          style={{
            fontFamily: C.serif,
            fontSize: 82,
            lineHeight: 0.98,
            margin: 0,
            color: C.paper,
            fontWeight: 400,
            textWrap: "balance",
            textShadow: "0 0 42px rgba(190,0,0,.85)",
          }}
        >
          3anber 7out
        </h1>
        <p
          style={{
            fontFamily: C.arabic,
            fontSize: 44,
            margin: "10px 0 0",
            color: C.amber,
            lineHeight: 1.2,
            direction: "rtl",
          }}
        >
          عنبر الحوت
        </p>
        <p
          style={{
            fontSize: 19,
            lineHeight: 1.65,
            color: C.body,
            margin: "28px 0 0",
            maxWidth: 520,
            textWrap: "pretty",
          }}
        >
          A rare, naturally occurring substance traditionally associated with the
          sperm whale — used in fine perfumery for its distinctive scent and its
          ability to make a fragrance last.
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 34,
            margin: "40px 0 0",
            paddingTop: 30,
            borderTop: "1px solid rgba(212,175,55,.25)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: C.mono,
                fontSize: 10,
                letterSpacing: ".3em",
                color: "#7d7466",
                marginBottom: 8,
              }}
            >
              PRIX
            </div>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: 8 }}
            >
              <span
                style={{
                  fontFamily: C.serif,
                  fontSize: 50,
                  color: C.amber,
                  lineHeight: 1,
                }}
              >
                {config.price}
              </span>
              <span style={{ fontFamily: C.serif, fontSize: 20, color: C.gold }}>
                MAD
              </span>
              <span style={{ fontSize: 14, color: "#8d8578" }}>/ gram</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, paddingBottom: 4 }}>
            <a
              href={links.wa}
              className="btn-ruby"
              style={{
                padding: "15px 30px",
                background: C.ruby,
                color: "#FFE9A8",
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: ".12em",
                border: "1px solid rgba(255,184,0,.4)",
              }}
            >
              WHATSAPP
            </a>
            <a
              href={links.mail}
              className="btn-gold"
              style={{
                padding: "15px 30px",
                border: "1px solid rgba(212,175,55,.5)",
                color: C.gold,
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: ".12em",
              }}
            >
              E-MAIL
            </a>
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
            width: "78%",
            aspectRatio: "1",
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(190,0,0,.75),rgba(255,60,0,.18) 42%,transparent 68%)",
            animation: "mwoaGlow 6s ease-in-out infinite",
          }}
        />
        <img
          src="/assets/logo.png"
          alt="MWOA emblem"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 660,
            display: "block",
            animation: "mwoaFloat 9s ease-in-out infinite",
          }}
        />
      </div>
    </section>
  );
}

function Marquee() {
  const items = ["NATUREL", "PESÉ À LA MAIN", "PIÈCE UNIQUE", "EMBALLAGE SCELLÉ"];
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
              fontFamily: C.mono,
              fontSize: 10.5,
              letterSpacing: ".28em",
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
        fontSize: 10.5,
        letterSpacing: ".32em",
        color: "#ff2d2d",
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}

function WhatIs() {
  const cards = [
    ["Natural", "Formed at sea, not manufactured. Nothing is added."],
    ["Perfumery", "A fixative: it holds a fragrance on the skin far longer."],
    ["Unique", "Colour, texture, shape and aroma differ piece to piece."],
  ];
  return (
    <section
      id="what"
      className="mwoa-section"
      style={{ padding: "120px 60px", background: "#120b0c" }}
    >
      <div
        className="mwoa-cols"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: ".85fr 1.15fr",
          gap: 80,
        }}
      >
        <div>
          <SectionLabel>01 — CE QUE C'EST</SectionLabel>
          <h2
            style={{
              fontFamily: C.serif,
              fontSize: 44,
              lineHeight: 1.1,
              margin: 0,
              color: C.paper,
              fontWeight: 400,
            }}
          >
            What ambergris
            <br />
            actually is
          </h2>
          <img
            src="/assets/flourish.png"
            alt=""
            style={{ width: 190, marginTop: 34, display: "block", opacity: 0.9 }}
          />
        </div>
        <div>
          <p
            style={{
              fontSize: 21,
              lineHeight: 1.75,
              color: "#d5cdbd",
              margin: 0,
              textWrap: "pretty",
            }}
          >
            3anber 7out (عنبر الحوت) — a rare, naturally occurring substance known
            as ambergris, traditionally associated with the sperm whale. It is a
            valuable aromatic material used primarily in fine perfumery for its
            distinctive scent and its ability to help fragrances last longer. Each
            piece is naturally unique in color, texture, shape, and aroma.
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
                <div
                  style={{ fontFamily: C.serif, fontSize: 30, color: C.amber }}
                >
                  {title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "#a9a193",
                    marginTop: 10,
                  }}
                >
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
      style={{
        padding: "120px 60px",
        background: "linear-gradient(180deg,#0b0708,#1c0a0b)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <SectionLabel>02 — ORIGINE</SectionLabel>
        <div
          className="mwoa-cols"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "start",
          }}
        >
          <h2
            style={{
              fontFamily: C.serif,
              fontSize: 44,
              lineHeight: 1.15,
              margin: 0,
              color: C.paper,
              fontWeight: 400,
            }}
          >
            Found on the shore,
            <br />
            not taken from the sea
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.8,
                color: C.body,
                margin: 0,
                textWrap: "pretty",
              }}
            >
              Ambergris is collected where the ocean leaves it — along the coast,
              after years adrift. Time in salt water and sun is what gives each
              piece its colour and its scent; a fresh piece and an aged piece are
              not the same material.
            </p>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.8,
                color: C.body,
                margin: 0,
                textWrap: "pretty",
              }}
            >
              Every piece sold here is inspected by hand, weighed in front of the
              buyer's order, and sent sealed. If a piece does not meet the
              standard, it is not offered.
            </p>
            <div
              style={{
                display: "flex",
                gap: 2,
                marginTop: 14,
                background: "rgba(153,0,0,.55)",
              }}
            >
              {[
                ["COLLECTE", "Côte atlantique"],
                ["CONTRÔLE", "Pièce par pièce"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{ background: "#1a0c0d", padding: "20px 26px", flex: 1 }}
                >
                  <div
                    style={{
                      fontFamily: C.mono,
                      fontSize: 9.5,
                      letterSpacing: ".26em",
                      color: "#7d7466",
                    }}
                  >
                    {k}
                  </div>
                  <div
                    style={{
                      fontFamily: C.serif,
                      fontSize: 22,
                      color: C.paper,
                      marginTop: 6,
                    }}
                  >
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
    { label: "PHOTO PRINCIPALE · pièce en main", style: { gridRow: "span 2" } },
    { label: "MACRO · texture", style: {} },
    { label: "BALANCE · poids", style: {} },
    { label: "EMBALLAGE SCELLÉ · avant envoi", style: { gridColumn: "span 2" } },
  ];
  return (
    <section
      className="mwoa-section"
      style={{ padding: "100px 60px 120px", background: "#0f0809" }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
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
            <SectionLabel>03 — GALERIE</SectionLabel>
            <h2
              style={{
                fontFamily: C.serif,
                fontSize: 44,
                margin: 0,
                color: C.paper,
                fontWeight: 400,
              }}
            >
              The pieces
            </h2>
          </div>
          <p
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              lineHeight: 1.7,
              color: "#7d7466",
              maxWidth: 300,
              margin: 0,
            }}
          >
            Drop your own photos into these four slots — shots of real stock sell
            this better than any copy.
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
                background:
                  "repeating-linear-gradient(45deg,#170a0b 0 12px,#200d0e 12px 24px)",
                border: "1px solid rgba(153,0,0,.45)",
              }}
            >
              <span
                style={{
                  fontFamily: C.mono,
                  fontSize: 10.5,
                  letterSpacing: ".18em",
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
    "Each order is weighed on a calibrated scale and filmed while packed.",
    "A signed note travels with the piece: weight, date, and origin.",
    "Burn test and scent test explained before you buy, not after.",
  ];
  return (
    <section
      id="proof"
      className="mwoa-section"
      style={{
        padding: "120px 60px",
        background: "#120b0c",
        borderTop: "1px solid rgba(153,0,0,.5)",
      }}
    >
      <div
        className="mwoa-cols"
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
          <SectionLabel>04 — AUTHENTICITÉ</SectionLabel>
          <h2
            style={{
              fontFamily: C.serif,
              fontSize: 44,
              lineHeight: 1.15,
              margin: 0,
              color: C.paper,
              fontWeight: 400,
            }}
          >
            Weighed, sealed,
            <br />
            documented
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              marginTop: 34,
            }}
          >
            {points.map((p) => (
              <div
                key={p}
                style={{ display: "flex", gap: 16, alignItems: "flex-start" }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    background: C.ruby,
                    display: "block",
                    marginTop: 8,
                    transform: "rotate(45deg)",
                    flex: "none",
                  }}
                />
                <span style={{ fontSize: 17, lineHeight: 1.7, color: C.body }}>
                  {p}
                </span>
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
          <div
            style={{
              position: "absolute",
              inset: 10,
              border: "1px solid rgba(212,175,55,.18)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", textAlign: "center" }}>
            <img
              src="/assets/whale.png"
              alt=""
              style={{ width: 120, display: "block", margin: "0 auto 22px" }}
            />
            <div
              style={{
                fontFamily: C.mono,
                fontSize: 10,
                letterSpacing: ".32em",
                color: C.gold,
              }}
            >
              CERTIFICAT D'AUTHENTICITÉ
            </div>
            <div
              style={{
                fontFamily: C.serif,
                fontSize: 34,
                color: C.paper,
                margin: "14px 0 6px",
              }}
            >
              3anber 7out
            </div>
            <div
              style={{
                fontFamily: C.arabic,
                fontSize: 24,
                color: C.amber,
                direction: "rtl",
              }}
            >
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
                fontSize: 10,
                letterSpacing: ".16em",
                color: "#8d8578",
              }}
            >
              <span>POIDS ____ g</span>
              <span>DATE ____</span>
              <span>RÉF ____</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Order() {
  return (
    <section
      id="buy"
      className="mwoa-section"
      style={{
        padding: "120px 60px",
        background:
          "radial-gradient(1000px 620px at 50% 0%, #8a0000 0%, #3a0507 34%, #120b0c 72%)",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <SectionLabel>05 — COMMANDER</SectionLabel>
        <h2
          style={{
            fontFamily: C.serif,
            fontSize: 52,
            lineHeight: 1.1,
            margin: 0,
            color: C.paper,
            fontWeight: 400,
          }}
        >
          Order by the gram
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 10,
            margin: "36px 0 0",
          }}
        >
          <span
            style={{
              fontFamily: C.serif,
              fontSize: 96,
              color: C.amber,
              lineHeight: 1,
            }}
          >
            {config.price}
          </span>
          <span style={{ fontFamily: C.serif, fontSize: 30, color: C.gold }}>
            MAD
          </span>
          <span style={{ fontSize: 17, color: "#8d8578" }}>/ gram</span>
        </div>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.75,
            color: C.body,
            maxWidth: 640,
            margin: "28px auto 0",
            textWrap: "pretty",
          }}
        >
          The buyer receives genuine 3anber 7out (عنبر الحوت / ambergris),
          carefully weighed and securely packaged. Each piece is naturally unique
          in size, colour, texture, and aroma. The exact quantity received
          corresponds to the amount purchased.
        </p>
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            marginTop: 44,
            flexWrap: "wrap",
          }}
        >
          <a
            href={links.wa}
            className="btn-ruby"
            style={{
              padding: "18px 42px",
              background: C.ruby,
              color: "#FFE9A8",
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: ".14em",
              border: "1px solid rgba(255,184,0,.4)",
            }}
          >
            COMMANDER SUR WHATSAPP
          </a>
          <a
            href={links.mail}
            className="btn-gold"
            style={{
              padding: "18px 42px",
              border: "1px solid rgba(212,175,55,.5)",
              color: C.gold,
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: ".14em",
            }}
          >
            COMMANDER PAR E-MAIL
          </a>
        </div>
        <div
          style={{
            fontFamily: C.mono,
            fontSize: 11,
            letterSpacing: ".18em",
            color: "#7d7466",
            marginTop: 22,
          }}
        >
          DITES-NOUS LE POIDS SOUHAITÉ · RÉPONSE SOUS 24 H
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
      style={{
        padding: "110px 60px",
        background: "#0f0809",
        borderTop: "1px solid rgba(153,0,0,.5)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
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
            <SectionLabel>06 — CLIENTS</SectionLabel>
            <h2
              style={{
                fontFamily: C.serif,
                fontSize: 44,
                margin: 0,
                color: C.paper,
                fontWeight: 400,
              }}
            >
              What buyers say
            </h2>
          </div>
          <p
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              lineHeight: 1.7,
              color: "#7d7466",
              maxWidth: 320,
              margin: 0,
            }}
          >
            Empty on purpose — paste three real messages from your client's buyers
            here.
          </p>
        </div>
        <div
          className="mwoa-testimonials"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 2,
            background: "rgba(153,0,0,.55)",
          }}
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
              <span
                style={{
                  fontFamily: C.serif,
                  fontSize: 19,
                  lineHeight: 1.6,
                  color: "#6a6459",
                }}
              >
                “ Citation client — remplacez par un vrai message. ”
              </span>
              <span
                style={{
                  fontFamily: C.mono,
                  fontSize: 10,
                  letterSpacing: ".2em",
                  color: "#4f4a42",
                }}
              >
                NOM · VILLE
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
    <section
      id="faq"
      className="mwoa-section"
      style={{ padding: "110px 60px", background: "#120b0c" }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <SectionLabel>07 — QUESTIONS</SectionLabel>
        <h2
          style={{
            fontFamily: C.serif,
            fontSize: 44,
            margin: "0 0 44px",
            color: C.paper,
            fontWeight: 400,
          }}
        >
          Before you order
        </h2>
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              style={{ borderTop: "1px solid rgba(153,0,0,.45)" }}
            >
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
                <span
                  style={{ fontFamily: C.serif, fontSize: 23, color: C.paper }}
                >
                  {item.q}
                </span>
                <span
                  style={{
                    fontFamily: C.mono,
                    fontSize: 18,
                    color: C.gold,
                    flex: "none",
                  }}
                >
                  {isOpen ? "−" : "+"}
                </span>
              </div>
              {isOpen && (
                <p
                  style={{
                    fontSize: 17,
                    lineHeight: 1.8,
                    color: "#b8b0a2",
                    margin: 0,
                    padding: "0 60px 30px 4px",
                    textWrap: "pretty",
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
      style={{
        padding: "90px 60px 50px",
        background: "#0b0708",
        borderTop: "2px solid #990000",
      }}
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
            <img
              src="/assets/whale.png"
              alt="MWOA"
              style={{ height: 34, width: "auto", display: "block" }}
            />
            <span
              style={{
                fontFamily: C.serif,
                fontSize: 26,
                letterSpacing: ".28em",
                color: C.gold,
              }}
            >
              MWOA
            </span>
          </div>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: "#8d8578",
              margin: "20px 0 0",
              maxWidth: 340,
            }}
          >
            3anber 7out — عنبر الحوت. One product, sold by the gram, weighed by
            hand.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontFamily: C.mono,
              fontSize: 10,
              letterSpacing: ".28em",
              color: "#7d7466",
              marginBottom: 4,
            }}
          >
            CONTACT
          </div>
          <a href={links.wa} style={{ fontSize: 16 }}>
            WhatsApp · {config.whatsapp}
          </a>
          <a href={links.mail} style={{ fontSize: 16 }}>
            {config.email}
          </a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontFamily: C.mono,
              fontSize: 10,
              letterSpacing: ".28em",
              color: "#7d7466",
              marginBottom: 4,
            }}
          >
            HORAIRES
          </div>
          <span style={{ fontSize: 16, color: "#b8b0a2" }}>
            Lun — Sam · 9h—20h
          </span>
          <span style={{ fontSize: 16, color: "#b8b0a2" }}>
            Envoi partout au Maroc
          </span>
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
          fontSize: 10,
          letterSpacing: ".2em",
          color: "#5c564d",
        }}
      >
        <span style={{ color: "#c00000", fontSize: 13, letterSpacing: ".4em" }}>
          © MWOA · 666
        </span>
        <span>MAROC</span>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div style={{ background: "#120b0c", overflowX: "hidden" }}>
      <Nav />
      <Hero />
      <Marquee />
      <WhatIs />
      <Origin />
      <Gallery />
      <Authenticity />
      <Order />
      <Testimonials />
      <Faq />
      <Footer />
    </div>
  );
}
