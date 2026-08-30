// Site configuration — the admin contact that receives orders.
// These drive the footer links and the client-side WhatsApp deep-link fallback
// in the order form. The backend notification channels (WhatsApp / email) are
// configured separately via environment variables — see .env.example.
export const config = {
  whatsapp: "+212 631883412",
  email: "mazgouraabdalmounim@gmail.com",
};
