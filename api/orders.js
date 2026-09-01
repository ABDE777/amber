import { readOrdersCsv, parseOrdersFromCsv, updateOrderStatus } from "../lib/orders_storage.js";

export default async function handler(req, res) {
  // Handle POST/PATCH to update order status
  if (req.method === "POST" || req.method === "PATCH") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const orderId = String(body?.orderId || body?.id || "").trim();
    const status = String(body?.status || "").trim();

    if (!orderId || !status) {
      return res.status(400).json({ ok: false, error: "missing_orderId_or_status" });
    }

    const result = updateOrderStatus(orderId, status);
    return res.status(result.ok ? 200 : 400).json(result);
  }

  // GET Requests:
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const format = url.searchParams.get("format");
  const download = url.searchParams.get("download");

  // 1. Raw CSV Download
  if (format === "csv" || download === "1") {
    const csvContent = readOrdersCsv();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="mwoa_orders.csv"');
    res.status(200);
    return res.end(csvContent);
  }

  // 2. JSON API
  const orders = parseOrdersFromCsv();
  if (format === "json" || (req.headers.accept || "").includes("application/json")) {
    return res.status(200).json({
      ok: true,
      total_orders: orders.length,
      orders,
    });
  }

  // 3. Luxury HTML Visual Preview Dashboard with Language Switching (Arabic & English)
  const totalOrders = orders.length;
  const totalGrams = orders.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);
  const paidOrders = orders.filter((o) => (o.Status || "").toLowerCase() === "paid").length;

  // Country counts
  const countryCounts = {};
  orders.forEach((o) => {
    const c = o.Country_Delivery || o.Country_Residence || "Unknown";
    countryCounts[c] = (countryCounts[c] || 0) + 1;
  });
  const topCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const rowsHtml =
    orders.length === 0
      ? `<tr><td colspan="10" style="text-align:center; padding: 40px; color: #8d8578;" data-i18n="noOrders">لا توجد طلبات مسجلة حتى الآن</td></tr>`
      : orders
          .map((o, idx) => {
            const cleanDigits = (o.Phone || "").replace(/[^0-9]/g, "");
            const waLink = cleanDigits
              ? `<a href="https://wa.me/${cleanDigits}" target="_blank" style="color: #25D366; text-decoration: none; margin-left: 6px; font-weight: bold;" title="Open WhatsApp">💬</a>`
              : "";
            const currentStatus = o.Status || "Pending";
            const statusColor =
              currentStatus === "Paid"
                ? "#25D366"
                : currentStatus === "Shipped"
                ? "#3b82f6"
                : currentStatus === "Cancelled"
                ? "#ef4444"
                : "#FFB800";

            return `
        <tr id="row-${o.ID}" style="border-bottom: 1px solid rgba(212,175,55,.15); transition: background .2s;" onmouseover="this.style.background='rgba(153,0,0,.15)'" onmouseout="this.style.background='transparent'">
          <td style="padding: 14px 16px; font-family: monospace; color: #FFB800; font-weight: bold;">${o.ID || `ORD-${idx + 1}`}</td>
          <td style="padding: 14px 16px; color: #ede7da; white-space: nowrap;">${o.Date} <span style="color:#8d8578; font-size: 11px;">${o.Time || ""}</span></td>
          <td style="padding: 14px 16px; color: #fff; font-weight: 600;">${o.Name}</td>
          <td style="padding: 14px 16px; color: #FFB800; font-weight: 700; font-family: monospace;">${o.Grams} g</td>
          <td style="padding: 14px 16px; color: #c3bbab;">${o.Email || "—"}</td>
          <td style="padding: 14px 16px; color: #ede7da; white-space: nowrap; font-family: monospace;">${o.Phone || "—"} ${waLink}</td>
          <td style="padding: 14px 16px; color: #ede7da;">${o.Country_Residence || "—"}</td>
          <td style="padding: 14px 16px; color: #ede7da; font-weight: 500;">${o.Country_Delivery || "—"}</td>
          <td style="padding: 14px 16px;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; background: ${o.Source === "Order Form" ? "#7a0000" : "#2d4428"}; color: #FFE9A8; border: 1px solid rgba(255,184,0,.3);">
              ${o.Source || "AI Assistant"}
            </span>
          </td>
          <td style="padding: 14px 16px;">
            <select
              onchange="changeStatus('${o.ID}', this.value, this)"
              style="padding: 5px 10px; background: #180e0f; color: ${statusColor}; border: 1px solid ${statusColor}; border-radius: 6px; font-weight: bold; font-size: 12px; cursor: pointer; outline: none;"
            >
              <option value="Pending" ${currentStatus === "Pending" ? "selected" : ""} style="color:#FFB800; background:#2a1c1d;">🟡 Pending</option>
              <option value="Paid" ${currentStatus === "Paid" ? "selected" : ""} style="color:#25D366; background:#2a1c1d;">🟢 Paid</option>
              <option value="Shipped" ${currentStatus === "Shipped" ? "selected" : ""} style="color:#3b82f6; background:#2a1c1d;">🚚 Shipped</option>
              <option value="Cancelled" ${currentStatus === "Cancelled" ? "selected" : ""} style="color:#ef4444; background:#2a1c1d;">❌ Cancelled</option>
            </select>
          </td>
        </tr>`;
          })
          .join("");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl" id="rootHtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title id="pageTitle">سجل ومعاينة الطلبات · Moroccan World of Amber (MWOA)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Mono:wght@400;600&family=Karla:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #1b1213;
      color: #ede7da;
      font-family: 'Karla', system-ui, sans-serif;
      padding: 30px 20px 60px;
      min-height: 100vh;
    }
    .container { max-width: 1340px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(212,175,55,.25);
      margin-bottom: 30px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand-title {
      font-family: 'Amiri', serif;
      font-size: 28px;
      color: #D4AF37;
      font-weight: 700;
    }
    .brand-sub {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      color: #8d8578;
      letter-spacing: .15em;
    }
    .btn-lang {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: transparent;
      color: #D4AF37;
      font-weight: 700;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid rgba(212,175,55,.45);
      font-family: 'IBM Plex Mono', monospace;
      transition: all .2s;
    }
    .btn-lang:hover {
      background: rgba(212,175,55,.15);
    }
    .btn-download {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 22px;
      background: #990000;
      color: #FFE9A8;
      font-weight: 700;
      font-size: 14px;
      border-radius: 6px;
      text-decoration: none;
      border: 1px solid rgba(255,184,0,.4);
      box-shadow: 0 4px 15px rgba(153,0,0,.4);
      transition: transform .15s, background .15s;
    }
    .btn-download:hover {
      background: #bd0000;
      transform: translateY(-1px);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #2a1c1d;
      border: 1px solid rgba(212,175,55,.25);
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 10px 25px rgba(0,0,0,.3);
    }
    .stat-label { font-size: 12px; color: #8d8578; margin-bottom: 6px; }
    .stat-val { font-size: 26px; font-weight: 700; color: #FFE9A8; font-family: 'IBM Plex Mono', monospace; }
    .table-container {
      background: #251819;
      border: 1px solid rgba(212,175,55,.3);
      border-radius: 10px;
      overflow-x: auto;
      box-shadow: 0 15px 35px rgba(0,0,0,.4);
    }
    table { width: 100%; border-collapse: collapse; }
    html[dir="rtl"] table { text-align: right; }
    html[dir="ltr"] table { text-align: left; }
    th {
      background: #352122;
      padding: 14px 16px;
      font-size: 12.5px;
      color: #D4AF37;
      font-weight: 700;
      border-bottom: 1px solid rgba(212,175,55,.3);
      white-space: nowrap;
    }
    .search-bar {
      width: 100%;
      padding: 12px 16px;
      background: #1e1314;
      border: 1px solid rgba(212,175,55,.3);
      border-radius: 8px;
      color: #ede7da;
      font-size: 14px;
      margin-bottom: 16px;
      outline: none;
    }
    .search-bar:focus { border-color: #D4AF37; }
    #toast {
      position: fixed;
      bottom: 24px;
      left: 24px;
      background: #25D366;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 14px;
      display: none;
      box-shadow: 0 8px 25px rgba(0,0,0,.5);
      z-index: 1000;
    }
  </style>
</head>
<body>
  <div id="toast">✓ تم تحديث حالة الطلب بنجاح في ملف الإكسل</div>

  <div class="container">
    <div class="header">
      <div>
        <div class="brand-title" id="txtTitle">عالم العنبر المغربي · سجل وتحديث الطلبات</div>
        <div class="brand-sub">MOROCCAN WORLD OF AMBER (MWOA) · ORDERS STATUS & EXCEL MANAGER</div>
      </div>
      <div style="display:flex; align-items:center; gap: 10px; flex-wrap: wrap;">
        <button onclick="toggleLang()" class="btn-lang" id="btnLang">
          🌐 English
        </button>
        <a href="/api/orders?format=csv" class="btn-download" id="btnDownload">
          <span>📥</span> تحميل ملف Excel / CSV
        </a>
        <a href="/" style="display: inline-flex; align-items: center; padding: 12px 18px; background: #382526; color: #ede7da; border-radius: 6px; text-decoration: none; border: 1px solid rgba(212,175,55,.3); font-size: 13px;" id="btnStore">
          المتجر ↗
        </a>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label" id="lblTotalOrders">إجمالي الطلبات</div>
        <div class="stat-val">${totalOrders}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label" id="lblPaidOrders">الطلبات المدفوعة</div>
        <div class="stat-val" style="color: #25D366;">${paidOrders}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label" id="lblTotalGrams">إجمالي الغرامات المطلوبة</div>
        <div class="stat-val">${totalGrams} g</div>
      </div>
      <div class="stat-card">
        <div class="stat-label" id="lblTopCountry">أعلى وجهة توصيل</div>
        <div class="stat-val" style="font-size: 20px;">${topCountry}</div>
      </div>
    </div>

    <!-- Live Search -->
    <input type="text" id="orderSearch" class="search-bar" placeholder="🔍 ابحث بالاسم، الهاتف، البريد، أو الدولة..." onkeyup="filterOrders()">

    <!-- Orders Table -->
    <div class="table-container">
      <table id="ordersTable">
        <thead>
          <tr>
            <th id="thId">رقم الطلب (ID)</th>
            <th id="thDate">التاريخ والوقت</th>
            <th id="thName">اسم العميل</th>
            <th id="thQty">الوزن</th>
            <th id="thEmail">البريد الإلكتروني</th>
            <th id="thPhone">الهاتف</th>
            <th id="thResidence">بلد الإقامة</th>
            <th id="thDelivery">بلد التوصيل</th>
            <th id="thSource">المصدر</th>
            <th id="thStatus">الحالة (Status)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    const I18N = {
      ar: {
        pageTitle: "سجل ومعاينة الطلبات · Moroccan World of Amber (MWOA)",
        title: "عالم العنبر المغربي · سجل وتحديث الطلبات",
        btnLang: "🌐 English",
        btnDownload: "📥 تحميل ملف Excel / CSV",
        btnStore: "المتجر ↗",
        totalOrders: "إجمالي الطلبات",
        paidOrders: "الطلبات المدفوعة",
        totalGrams: "إجمالي الغرامات المطلوبة",
        topCountry: "أعلى وجهة توصيل",
        searchPh: "🔍 ابحث بالاسم، الهاتف، البريد، أو الدولة...",
        thId: "رقم الطلب (ID)",
        thDate: "التاريخ والوقت",
        thName: "اسم العميل",
        thQty: "الوزن",
        thEmail: "البريد الإلكتروني",
        thPhone: "الهاتف",
        thResidence: "بلد الإقامة",
        thDelivery: "بلد التوصيل",
        thSource: "المصدر",
        thStatus: "الحالة (تغيير فوري)",
        noOrders: "لا توجد طلبات مسجلة حتى الآن",
        toastSuccess: "✓ تم تحديث حالة الطلب بنجاح إلى: "
      },
      en: {
        pageTitle: "Orders Preview & Analytics · Moroccan World of Amber (MWOA)",
        title: "Moroccan World of Amber · Orders Management",
        btnLang: "🌐 العربية",
        btnDownload: "📥 Download Excel / CSV",
        btnStore: "Storefront ↗",
        totalOrders: "Total Orders",
        paidOrders: "Paid Orders",
        totalGrams: "Total Weight Sold",
        topCountry: "Top Delivery Destination",
        searchPh: "🔍 Search by name, phone, email, country, or status...",
        thId: "Order ID",
        thDate: "Date & Time",
        thName: "Customer Name",
        thQty: "Quantity",
        thEmail: "Email",
        thPhone: "Phone",
        thResidence: "Residence",
        thDelivery: "Delivery Destination",
        thSource: "Source",
        thStatus: "Status (Live Update)",
        noOrders: "No orders recorded yet",
        toastSuccess: "✓ Successfully updated order status to: "
      }
    };

    let currentLang = localStorage.getItem("mwoa_admin_lang") || "ar";

    function applyLang(lang) {
      currentLang = lang;
      localStorage.setItem("mwoa_admin_lang", lang);
      const d = I18N[lang];
      document.getElementById("rootHtml").dir = lang === "ar" ? "rtl" : "ltr";
      document.getElementById("rootHtml").lang = lang;
      document.getElementById("pageTitle").innerText = d.pageTitle;
      document.getElementById("txtTitle").innerText = d.title;
      document.getElementById("btnLang").innerText = d.btnLang;
      document.getElementById("btnDownload").innerHTML = "<span>📥</span> " + d.btnDownload.replace("📥 ", "");
      document.getElementById("btnStore").innerText = d.btnStore;
      document.getElementById("lblTotalOrders").innerText = d.totalOrders;
      document.getElementById("lblPaidOrders").innerText = d.paidOrders;
      document.getElementById("lblTotalGrams").innerText = d.totalGrams;
      document.getElementById("lblTopCountry").innerText = d.topCountry;
      document.getElementById("orderSearch").placeholder = d.searchPh;
      document.getElementById("thId").innerText = d.thId;
      document.getElementById("thDate").innerText = d.thDate;
      document.getElementById("thName").innerText = d.thName;
      document.getElementById("thQty").innerText = d.thQty;
      document.getElementById("thEmail").innerText = d.thEmail;
      document.getElementById("thPhone").innerText = d.thPhone;
      document.getElementById("thResidence").innerText = d.thResidence;
      document.getElementById("thDelivery").innerText = d.thDelivery;
      document.getElementById("thSource").innerText = d.thSource;
      document.getElementById("thStatus").innerText = d.thStatus;
    }

    function toggleLang() {
      applyLang(currentLang === "ar" ? "en" : "ar");
    }

    // Initialize on load
    applyLang(currentLang);

    function filterOrders() {
      const input = document.getElementById("orderSearch").value.toLowerCase();
      const rows = document.querySelectorAll("#ordersTable tbody tr");
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(input) ? "" : "none";
      });
    }

    async function changeStatus(orderId, newStatus, selectElem) {
      const colors = {
        Paid: '#25D366',
        Shipped: '#3b82f6',
        Cancelled: '#ef4444',
        Pending: '#FFB800'
      };
      const color = colors[newStatus] || '#FFB800';
      selectElem.style.color = color;
      selectElem.style.borderColor = color;

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: newStatus })
        });
        const data = await res.json();
        if (data.ok) {
          const toast = document.getElementById('toast');
          const d = I18N[currentLang];
          toast.innerText = d.toastSuccess + newStatus + ' (' + orderId + ')';
          toast.style.display = 'block';
          setTimeout(() => { toast.style.display = 'none'; }, 2800);
        } else {
          alert('Failed to update status');
        }
      } catch (err) {
        alert('Network error');
      }
    }
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200);
  return res.end(html);
}
