// Builds a professional, printable invoice for one order and opens it in a
// new tab. Deliberately a real HTML document (not a PDF library) so the
// browser's own renderer handles Arabic/Chinese/Latin script correctly with
// zero embedded fonts — the admin uses the browser's own Print dialog
// ("Save as PDF") to download it.

const LABELS = {
  ar: {
    dir: "rtl",
    invoice: "فاتورة",
    invoiceNo: "رقم الفاتورة",
    date: "التاريخ",
    billTo: "الفاتورة موجهة إلى",
    name: "الاسم",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    residence: "بلد الإقامة",
    delivery: "بلد التوصيل",
    item: "الوصف",
    qty: "الكمية",
    total: "المجموع",
    product: "عنبر مغربي أصيل (Ambergris)",
    grandTotal: "الإجمالي الكلي",
    status: "حالة الطلب",
    method: "طريقة الدفع",
    note: "يشمل المبلغ الإجمالي أعلاه، عند الاقتضاء، رسوم الشحن والتغليف والضريبة ورسوم بوابة الدفع.",
    thanks: "شكراً لثقتكم في Moroccan World of Amber.",
    printBtn: "🖨️ طباعة / حفظ كـ PDF",
    closeBtn: "إغلاق",
    computerGenerated: "هذه فاتورة صادرة آلياً ولا تتطلب توقيعاً.",
  },
  en: {
    dir: "ltr",
    invoice: "INVOICE",
    invoiceNo: "Invoice No.",
    date: "Date",
    billTo: "Bill To",
    name: "Name",
    email: "Email",
    phone: "Phone",
    residence: "Country of Residence",
    delivery: "Country of Delivery",
    item: "Description",
    qty: "Quantity",
    total: "Total",
    product: "Genuine Moroccan Ambergris",
    grandTotal: "Grand Total",
    status: "Order Status",
    method: "Payment Method",
    note: "The total above includes applicable shipping, packaging, tax and payment gateway fees, where applicable.",
    thanks: "Thank you for trusting Moroccan World of Amber.",
    printBtn: "🖨️ Print / Save as PDF",
    closeBtn: "Close",
    computerGenerated: "This is a computer-generated invoice and requires no signature.",
  },
  fr: {
    dir: "ltr",
    invoice: "FACTURE",
    invoiceNo: "N° de facture",
    date: "Date",
    billTo: "Facturé à",
    name: "Nom",
    email: "E-mail",
    phone: "Téléphone",
    residence: "Pays de résidence",
    delivery: "Pays de livraison",
    item: "Description",
    qty: "Quantité",
    total: "Total",
    product: "Ambre gris marocain authentique",
    grandTotal: "Total général",
    status: "Statut de la commande",
    method: "Mode de paiement",
    note: "Le total ci-dessus inclut, le cas échéant, les frais de livraison, d'emballage, la taxe et les frais de la passerelle de paiement.",
    thanks: "Merci de votre confiance envers Moroccan World of Amber.",
    printBtn: "🖨️ Imprimer / Enregistrer en PDF",
    closeBtn: "Fermer",
    computerGenerated: "Ceci est une facture générée automatiquement et ne nécessite pas de signature.",
  },
  zh: {
    dir: "ltr",
    invoice: "发票",
    invoiceNo: "发票编号",
    date: "日期",
    billTo: "客户信息",
    name: "姓名",
    email: "电子邮箱",
    phone: "电话",
    residence: "居住国家",
    delivery: "配送国家",
    item: "描述",
    qty: "数量",
    total: "总计",
    product: "正宗摩洛哥龙涎香",
    grandTotal: "总金额",
    status: "订单状态",
    method: "支付方式",
    note: "上述总金额已包含（如适用）运费、包装费、税费及支付网关手续费。",
    thanks: "感谢您对 Moroccan World of Amber 的信任。",
    printBtn: "🖨️ 打印 / 另存为 PDF",
    closeBtn: "关闭",
    computerGenerated: "此发票为系统自动生成，无需签名。",
  },
};

const STATUS_LABELS = {
  Paid: { ar: "تم الدفع", en: "Paid", fr: "Payée", zh: "已支付" },
  Shipped: { ar: "تم الشحن", en: "Shipped", fr: "Expédiée", zh: "已发货" },
  Cancelled: { ar: "ملغى", en: "Cancelled", fr: "Annulée", zh: "已取消" },
  Pending: { ar: "قيد الانتظار", en: "Pending", fr: "En attente", zh: "待处理" },
};

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function openInvoice(order, lang = "en") {
  const L = LABELS[lang] || LABELS.en;
  const status = order.Status || "Pending";
  const statusLabel = (STATUS_LABELS[status] && STATUS_LABELS[status][lang]) || status;
  const source = order.Source || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const html = `<!doctype html>
<html lang="${lang}" dir="${L.dir}">
<head>
<meta charset="utf-8" />
<title>${esc(L.invoice)} — ${esc(order.ID || "")}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: ${L.dir === "rtl" ? "'Tahoma', 'Segoe UI', sans-serif" : "'Georgia', 'Times New Roman', serif"};
    color: #1a1210;
    background: #f4f1ea;
    margin: 0;
    padding: 32px;
  }
  .sheet {
    max-width: 760px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #ddd4bf;
    border-radius: 10px;
    padding: 40px 44px;
    box-shadow: 0 10px 40px rgba(0,0,0,.12);
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid #D4AF37;
    padding-bottom: 20px;
    margin-bottom: 24px;
    gap: 16px;
  }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand img { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; }
  .brand-name { font-size: 19px; font-weight: 700; color: #7a1f1f; }
  .brand-tag { font-size: 11.5px; color: #8a8070; letter-spacing: .04em; }
  .invoice-title { text-align: ${L.dir === "rtl" ? "left" : "right"}; }
  .invoice-title .big { font-size: 26px; font-weight: 800; color: #D4AF37; letter-spacing: .08em; }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-bottom: 26px;
  }
  .box {
    background: #faf7ef;
    border: 1px solid #ece4cf;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .box .label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .07em; color: #a08a3f; font-weight: 700; margin-bottom: 6px; }
  .box .value { font-size: 14px; color: #2a1f1a; font-weight: 600; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
  th { text-align: ${L.dir === "rtl" ? "right" : "left"}; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; color: #7a1f1f; padding: 10px 12px; border-bottom: 2px solid #D4AF37; }
  td { padding: 14px 12px; border-bottom: 1px solid #eee2c9; font-size: 14.5px; }
  .num { text-align: ${L.dir === "rtl" ? "left" : "right"}; font-variant-numeric: tabular-nums; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 22px; }
  .totals-box { min-width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; }
  .totals-row.grand { border-top: 2px solid #D4AF37; margin-top: 4px; padding-top: 14px; font-size: 19px; font-weight: 800; color: #7a1f1f; }
  .note { font-size: 12px; color: #8a8070; line-height: 1.6; margin-bottom: 22px; }
  .footer { text-align: center; border-top: 1px solid #ece4cf; padding-top: 18px; }
  .footer .thanks { font-size: 14px; font-weight: 700; color: #7a1f1f; margin-bottom: 4px; }
  .footer .fine { font-size: 11px; color: #a89f8f; }
  .actions { max-width: 760px; margin: 18px auto 0; text-align: center; }
  .actions button {
    padding: 12px 26px; font-size: 14px; font-weight: 700; border-radius: 8px; cursor: pointer;
    border: 1px solid #D4AF37; margin: 0 6px;
  }
  .btn-print { background: linear-gradient(135deg,#D4AF37,#b8922e); color: #1a0e0e; }
  .btn-close { background: transparent; color: #7a1f1f; }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border: none; border-radius: 0; max-width: 100%; }
    .actions { display: none; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <img src="${origin}/assets/logo-mwoa.png" alt="MWOA" />
        <div>
          <div class="brand-name">Moroccan World of Amber</div>
          <div class="brand-tag">3anber 7out — Genuine Moroccan Ambergris</div>
        </div>
      </div>
      <div class="invoice-title">
        <div class="big">${esc(L.invoice)}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="box">
        <div class="label">${esc(L.invoiceNo)}</div>
        <div class="value">${esc(order.ID || "")}</div>
      </div>
      <div class="box">
        <div class="label">${esc(L.date)}</div>
        <div class="value">${esc(order.Date || "")} ${esc(order.Time || "")}</div>
      </div>
    </div>

    <div class="box" style="margin-bottom:26px;">
      <div class="label">${esc(L.billTo)}</div>
      <div class="value">
        ${esc(L.name)}: ${esc(order.Name || "—")}<br/>
        ${esc(L.email)}: ${esc(order.Email || "—")}<br/>
        ${esc(L.phone)}: ${esc(order.Phone || "—")}<br/>
        ${esc(L.residence)}: ${esc(order.Country_Residence || "—")}<br/>
        ${esc(L.delivery)}: ${esc(order.Country_Delivery || "—")}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${esc(L.item)}</th>
          <th class="num">${esc(L.qty)}</th>
          <th class="num">${esc(L.total)}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${esc(L.product)}</td>
          <td class="num">${esc(order.Grams || "0")} g</td>
          <td class="num">${esc(order.Price || "—")}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="totals-row grand">
          <span>${esc(L.grandTotal)}</span>
          <span>${esc(order.Price || "—")}</span>
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="box">
        <div class="label">${esc(L.status)}</div>
        <div class="value">${esc(statusLabel)}</div>
      </div>
      <div class="box">
        <div class="label">${esc(L.method)}</div>
        <div class="value">${esc(source || "—")}</div>
      </div>
    </div>

    <div class="note">${esc(L.note)}</div>

    <div class="footer">
      <div class="thanks">${esc(L.thanks)}</div>
      <div class="fine">${esc(L.computerGenerated)}</div>
    </div>
  </div>

  <div class="actions">
    <button class="btn-print" onclick="window.print()">${esc(L.printBtn)}</button>
    <button class="btn-close" onclick="window.close()">${esc(L.closeBtn)}</button>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
