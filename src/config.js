// Site configuration — these are the values that were editable props in the
// original Design Canvas file (Commerce / Contact / Sections panels).
// Change them here to rebrand or re-price the page.
export const config = {
  // Commerce
  price: 199, // MAD per gram (flat rate)

  // Contact
  whatsapp: "+212 6 00 00 00 00",
  email: "commande@mwoa.ma",

  // Sections
  showTestimonials: true,
};

// Derived links (WhatsApp deep-link + mailto), computed from the config above.
const digits = String(config.whatsapp).replace(/[^0-9]/g, "");
const waMessage = encodeURIComponent(
  "Bonjour MWOA, je souhaite commander du 3anber 7out. Poids souhaité : "
);

export const links = {
  wa: `https://wa.me/${digits}?text=${waMessage}`,
  mail: `mailto:${config.email}?subject=Commande%203anber%207out`,
};

// FAQ content. `a` is answered dynamically for the price question.
export const faqs = [
  {
    q: "How do I know it is real?",
    a: "Every piece is shown, weighed and packed on video before it leaves. The scent test and the hot-needle test are explained to you first, so you can check the piece yourself when it arrives.",
  },
  {
    q: "Why does the price change nothing per gram?",
    a: `The rate is flat: ${config.price} MAD per gram, whatever weight you order. What varies is the piece itself — colour, texture and aroma are never identical.`,
  },
  {
    q: "What is the smallest order?",
    a: "Tell us the weight you want and we confirm availability. Small quantities are normal for perfumery work.",
  },
  {
    q: "How is it shipped?",
    a: "Sealed and padded, sent anywhere in Morocco. Weight, date and reference are written on the note that travels with it.",
  },
  {
    q: "Can I use it directly on skin?",
    a: "It is used as a perfumery material, usually macerated or diluted. Ask us how you plan to use it and we will point you to the right piece.",
  },
];
