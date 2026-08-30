import { createContext, useContext, useState, useEffect } from "react";

// All copy for both languages. Arabic is the default; English is the toggle.
// Price is intentionally never included — it is not shown anywhere.
export const STR = {
  ar: {
    dir: "rtl",
    fonts: { display: "Amiri, serif", ui: "Tajawal, Karla, system-ui, sans-serif" },
    other: "EN", // label on the toggle (switches to the other language)
    nav: {
      brandSub: "عنبر الحوت · المغرب",
      links: [
        ["#what", "المنتج"],
        ["#origin", "الأصل"],
        ["#proof", "الأصالة"],
        ["#faq", "الأسئلة"],
      ],
      order: "اطلب الآن",
    },
    hero: {
      eyebrow: "منتج واحد · مادة واحدة",
      title: "عنبر الحوت",
      accent: "",
      desc: "مادة نادرة تتكوّن طبيعياً، مرتبطة تقليدياً بحوت العنبر — تُستعمل في صناعة العطور الفاخرة لرائحتها المميّزة وقدرتها على إطالة ثبات العطر.",
      cta: "اطلب الآن",
      drag: "↺ اسحب للتدوير",
    },
    marquee: ["طبيعي", "وزن يدوي", "قطعة فريدة", "تغليف محكم"],
    what: {
      label: "٠١ — ما هو",
      h2: "ما هو عنبر الحوت حقًّا",
      body: "عنبر الحوت مادة نادرة تتكوّن طبيعياً، مرتبطة تقليدياً بحوت العنبر. وهي مادة عطرية ثمينة تُستعمل أساساً في صناعة العطور الفاخرة لرائحتها المميّزة وقدرتها على إطالة ثبات العطر. كل قطعة فريدة في لونها وملمسها وشكلها ورائحتها.",
      cards: [
        ["طبيعي", "يتكوّن في البحر، لا يُصنّع. لا يُضاف إليه شيء."],
        ["للعطور", "مثبّت عطري: يُبقي الرائحة على البشرة مدة أطول بكثير."],
        ["فريد", "اللون والملمس والشكل والرائحة تختلف من قطعة لأخرى."],
      ],
    },
    origin: {
      label: "٠٢ — الأصل",
      h2: "يُجمع من الشاطئ، لا يُؤخذ من البحر",
      p1: "يُجمع العنبر حيث يتركه المحيط — على طول الساحل، بعد سنوات من التنقّل في الماء. الوقت في ماء البحر وتحت الشمس هو ما يمنح كل قطعة لونها ورائحتها؛ فالقطعة الطازجة والقطعة المُعتّقة ليستا المادة نفسها.",
      p2: "كل قطعة تُباع هنا تُفحص يدوياً، وتُوزن أمام طلب المشتري، وتُرسل مختومة. وإذا لم تبلغ القطعة المعيار المطلوب، فلا تُعرض للبيع.",
      boxes: [
        ["الجمع", "الساحل الأطلسي"],
        ["المراقبة", "قطعة بقطعة"],
      ],
    },
    gallery: {
      label: "٠٣ — المعرض",
      h2: "القطع",
      note: "ضع صورك الحقيقية في هذه الخانات الأربع — صور المخزون الحقيقي تبيع أكثر من أي وصف.",
      slots: [
        "الصورة الرئيسية · القطعة في اليد",
        "تكبير · الملمس",
        "الميزان · الوزن",
        "التغليف المحكم · قبل الإرسال",
      ],
    },
    proof: {
      label: "٠٤ — الأصالة",
      h2: "موزون، مختوم، موثّق",
      points: [
        "كل طلب يُوزن على ميزان مُعاير ويُصوّر أثناء التغليف.",
        "بطاقة موقّعة ترافق القطعة: الوزن والتاريخ والأصل.",
        "اختبار الحرق واختبار الرائحة يُشرحان قبل الشراء، لا بعده.",
      ],
      certLabel: "شهادة أصالة",
      certTitle: "عنبر الحوت",
      cert: ["الوزن ____ غ", "التاريخ ____", "المرجع ____"],
    },
    order: {
      label: "٠٥ — اطلب",
      h2: "اطلب بالغرام",
      body: "يحصل المشتري على عنبر حوت أصلي، موزون بعناية ومغلّف بإحكام. كل قطعة فريدة في حجمها ولونها وملمسها ورائحتها. الكمية المُستلمة تطابق الكمية المطلوبة تماماً.",
      cta: "اطلب الآن",
      note: "أخبرنا بالوزن المطلوب · رد خلال ٢٤ ساعة",
    },
    testi: {
      label: "٠٦ — العملاء",
      h2: "ماذا يقول المشترون",
      note: "فارغة عن قصد — ضع هنا ثلاث رسائل حقيقية من مشتريك.",
      quote: "« اقتباس العميل — استبدله برسالة حقيقية. »",
      who: "الاسم · المدينة",
    },
    faqHead: { label: "٠٧ — الأسئلة", h2: "قبل أن تطلب" },
    faqs: [
      ["كيف أتأكد أنه أصلي؟", "كل قطعة تُعرض وتُوزن وتُغلّف أمام الكاميرا قبل الإرسال. نشرح لك اختبار الرائحة واختبار الإبرة الساخنة مسبقاً، لتتمكن من فحص القطعة بنفسك عند وصولها."],
      ["ما هو أصغر طلب ممكن؟", "أخبرنا بالوزن الذي تريده ونؤكد لك توفّره. الكميات الصغيرة أمر معتاد في أعمال العطارة."],
      ["كيف يتم الشحن؟", "مغلّف ومحكم، يُرسل إلى كل أنحاء المغرب. الوزن والتاريخ والمرجع مكتوبة على البطاقة المرافقة للقطعة."],
      ["هل يمكن استعماله مباشرة على البشرة؟", "يُستعمل كمادة للعطارة، عادةً بعد النقع أو التخفيف. أخبرنا بطريقة استعمالك وسنرشدك إلى القطعة المناسبة."],
    ],
    footer: {
      tagline: "عنبر الحوت. منتج واحد، يُباع بالغرام، ويُوزن يدوياً.",
      contact: "اتصل بنا",
      wa: "واتساب",
      hours: "أوقات العمل",
      hoursVal: "الإثنين — السبت · ٩ص—٨م",
      ship: "توصيل إلى كل أنحاء المغرب",
      country: "المغرب",
    },
    modal: {
      eyebrow: "طلب — عنبر الحوت",
      title: "أكمل طلبك",
      sub: "املأ التفاصيل وسنستلم طلبك مباشرة.",
      name: "الاسم الكامل",
      namePh: "مثال: محمد العلوي",
      qty: "الكمية المطلوبة (بالغرام)",
      qtyPh: "5",
      email: "البريد الإلكتروني",
      emailPh: "you@email.com",
      phone: "رقم الهاتف",
      phonePh: "+212 6 00 00 00 00",
      sendWa: "إرسال الطلب عبر واتساب",
      sendMail: "إرسال الطلب عبر البريد",
      close: "إغلاق",
      okTitle: "تم تجهيز طلبك",
      okBody: "فُتحت نافذة الإرسال. إذا لم تُفتح، تأكد من السماح بالنوافذ المنبثقة ثم أعد المحاولة.",
      err: { name: "الاسم مطلوب", qty: "أدخل كمية صحيحة", email: "بريد إلكتروني غير صالح", phone: "رقم هاتف غير صالح" },
    },
    msg: {
      head: "طلب جديد — عنبر الحوت",
      name: "الاسم الكامل",
      qty: "الكمية المطلوبة",
      unit: "غرام",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف",
      subject: "طلب عنبر الحوت",
    },
  },

  en: {
    dir: "ltr",
    fonts: { display: "Marcellus, serif", ui: "Karla, system-ui, sans-serif" },
    other: "ع",
    nav: {
      brandSub: "AMBERGRIS · MOROCCO",
      links: [
        ["#what", "The product"],
        ["#origin", "Origin"],
        ["#proof", "Authenticity"],
        ["#faq", "FAQ"],
      ],
      order: "Order now",
    },
    hero: {
      eyebrow: "ONE PRODUCT · ONE MATERIAL",
      title: "Ambergris",
      accent: "عنبر الحوت",
      desc: "A rare, naturally occurring substance traditionally associated with the sperm whale — used in fine perfumery for its distinctive scent and its ability to make a fragrance last.",
      cta: "Order now",
      drag: "↺ Drag to rotate",
    },
    marquee: ["NATURAL", "HAND-WEIGHED", "UNIQUE PIECE", "SEALED PACKAGING"],
    what: {
      label: "01 — WHAT IT IS",
      h2: "What ambergris actually is",
      body: "Ambergris is a rare, naturally occurring substance traditionally associated with the sperm whale. It is a valuable aromatic material used primarily in fine perfumery for its distinctive scent and its ability to help fragrances last longer. Each piece is naturally unique in colour, texture, shape and aroma.",
      cards: [
        ["Natural", "Formed at sea, not manufactured. Nothing is added."],
        ["Perfumery", "A fixative: it holds a fragrance on the skin far longer."],
        ["Unique", "Colour, texture, shape and aroma differ piece to piece."],
      ],
    },
    origin: {
      label: "02 — ORIGIN",
      h2: "Found on the shore, not taken from the sea",
      p1: "Ambergris is collected where the ocean leaves it — along the coast, after years adrift. Time in salt water and sun is what gives each piece its colour and scent; a fresh piece and an aged piece are not the same material.",
      p2: "Every piece sold here is inspected by hand, weighed in front of the buyer's order, and sent sealed. If a piece does not meet the standard, it is not offered.",
      boxes: [
        ["COLLECTION", "Atlantic coast"],
        ["INSPECTION", "Piece by piece"],
      ],
    },
    gallery: {
      label: "03 — GALLERY",
      h2: "The pieces",
      note: "Drop your own photos into these four slots — shots of real stock sell this better than any copy.",
      slots: [
        "MAIN PHOTO · piece in hand",
        "MACRO · texture",
        "SCALE · weight",
        "SEALED PACKAGING · before shipping",
      ],
    },
    proof: {
      label: "04 — AUTHENTICITY",
      h2: "Weighed, sealed, documented",
      points: [
        "Each order is weighed on a calibrated scale and filmed while packed.",
        "A signed note travels with the piece: weight, date and origin.",
        "Burn test and scent test explained before you buy, not after.",
      ],
      certLabel: "CERTIFICATE OF AUTHENTICITY",
      certTitle: "Ambergris",
      cert: ["WEIGHT ____ g", "DATE ____", "REF ____"],
    },
    order: {
      label: "05 — ORDER",
      h2: "Order by the gram",
      body: "The buyer receives genuine ambergris, carefully weighed and securely packaged. Each piece is naturally unique in size, colour, texture and aroma. The exact quantity received corresponds to the amount ordered.",
      cta: "Order now",
      note: "Tell us the weight you want · reply within 24h",
    },
    testi: {
      label: "06 — CLIENTS",
      h2: "What buyers say",
      note: "Empty on purpose — paste three real messages from your buyers here.",
      quote: "“ Customer quote — replace with a real message. ”",
      who: "NAME · CITY",
    },
    faqHead: { label: "07 — QUESTIONS", h2: "Before you order" },
    faqs: [
      ["How do I know it is real?", "Every piece is shown, weighed and packed on video before it leaves. The scent test and the hot-needle test are explained to you first, so you can check the piece yourself when it arrives."],
      ["What is the smallest order?", "Tell us the weight you want and we confirm availability. Small quantities are normal for perfumery work."],
      ["How is it shipped?", "Sealed and padded, sent anywhere in Morocco. Weight, date and reference are written on the note that travels with it."],
      ["Can I use it directly on skin?", "It is used as a perfumery material, usually macerated or diluted. Tell us how you plan to use it and we will point you to the right piece."],
    ],
    footer: {
      tagline: "Ambergris. One product, sold by the gram, weighed by hand.",
      contact: "CONTACT",
      wa: "WhatsApp",
      hours: "HOURS",
      hoursVal: "Mon — Sat · 9am—8pm",
      ship: "Delivery across Morocco",
      country: "MOROCCO",
    },
    modal: {
      eyebrow: "ORDER — AMBERGRIS",
      title: "Complete your order",
      sub: "Fill in the details and we'll receive your order directly.",
      name: "Full name",
      namePh: "e.g. John Carter",
      qty: "Quantity (in grams)",
      qtyPh: "5",
      email: "Email",
      emailPh: "you@email.com",
      phone: "Phone number",
      phonePh: "+212 6 00 00 00 00",
      sendWa: "Send order via WhatsApp",
      sendMail: "Send order via email",
      close: "Close",
      okTitle: "Your order is ready",
      okBody: "A send window has opened. If it didn't, allow pop-ups and try again.",
      err: { name: "Name is required", qty: "Enter a valid quantity", email: "Invalid email", phone: "Invalid phone number" },
    },
    msg: {
      head: "New order — Ambergris",
      name: "Full name",
      qty: "Quantity",
      unit: "g",
      email: "Email",
      phone: "Phone",
      subject: "Ambergris order",
    },
  },
};

const LangCtx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState("ar");
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = STR[lang].dir;
  }, [lang]);
  const value = { lang, setLang, t: STR[lang], dir: STR[lang].dir, fonts: STR[lang].fonts };
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
