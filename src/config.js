// Site configuration — edit these to rebrand, re-price, or change contacts.
export const config = {
  // Commerce
  price: 199, // درهم / غرام (سعر ثابت)

  // Contact (admin — يستقبل الطلبات)
  whatsapp: "+212 6 00 00 00 00",
  email: "commande@mwoa.ma",

  // Sections
  showTestimonials: true,
};

// Derived links (WhatsApp + mailto) from the config above.
const digits = String(config.whatsapp).replace(/[^0-9]/g, "");
const waMessage = encodeURIComponent(
  "السلام عليكم، أرغب في طلب عنبر الحوت. الكمية المطلوبة: "
);

export const links = {
  wa: `https://wa.me/${digits}?text=${waMessage}`,
  mail: `mailto:${config.email}?subject=${encodeURIComponent("طلب عنبر الحوت")}`,
};

// FAQ content (Arabic).
export const faqs = [
  {
    q: "كيف أتأكد أنه أصلي؟",
    a: "كل قطعة تُعرض وتُوزن وتُغلّف أمام الكاميرا قبل الإرسال. نشرح لك اختبار الرائحة واختبار الإبرة الساخنة مسبقاً، لتتمكن من فحص القطعة بنفسك عند وصولها.",
  },
  {
    q: "لماذا السعر ثابت لكل غرام؟",
    a: `السعر ثابت: ${config.price} درهم للغرام مهما كان الوزن الذي تطلبه. ما يختلف هو القطعة نفسها — اللون والملمس والرائحة لا تتطابق أبداً.`,
  },
  {
    q: "ما هو أصغر طلب ممكن؟",
    a: "أخبرنا بالوزن الذي تريده ونؤكد لك توفّره. الكميات الصغيرة أمر معتاد في أعمال العطارة.",
  },
  {
    q: "كيف يتم الشحن؟",
    a: "مغلّف ومحكم، يُرسل إلى كل أنحاء المغرب. الوزن والتاريخ والمرجع مكتوبة على البطاقة المرافقة للقطعة.",
  },
  {
    q: "هل يمكن استعماله مباشرة على البشرة؟",
    a: "يُستعمل كمادة للعطارة، عادةً بعد النقع أو التخفيف. أخبرنا بطريقة استعمالك وسنرشدك إلى القطعة المناسبة.",
  },
];
