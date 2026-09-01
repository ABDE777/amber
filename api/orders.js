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

  // 3. Simplified Clean Luxury Dashboard with Revenue Breakdown Cards
  const totalOrders = orders.length;
  const totalGrams = orders.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);

  const paidOrders = orders.filter((o) => (o.Status || "").toLowerCase() === "paid");
  const paidCount = paidOrders.length;
  const paidGrams = paidOrders.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);

  const pendingOrders = orders.filter((o) => (o.Status || "").toLowerCase() === "pending");
  const pendingCount = pendingOrders.length;
  const pendingGrams = pendingOrders.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);

  const shippedOrders = orders.filter((o) => (o.Status || "").toLowerCase() === "shipped");
  const shippedCount = shippedOrders.length;
  const shippedGrams = shippedOrders.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);

  const rowsHtml =
    orders.length === 0
      ? `<tr><td colspan="4" style="text-align:center; padding: 40px; color: #8d8578;" data-i18n="noOrders">لا توجد طلبات مسجلة حتى الآن</td></tr>`
      : orders
          .map((o, idx) => {
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
        <tr id="row-${o.ID}" style="border-bottom: 1px solid rgba(212,175,55,.15); cursor: pointer; transition: background .2s;" onclick="openDetails('${o.ID}')" onmouseover="this.style.background='rgba(153,0,0,.15)'" onmouseout="this.style.background='transparent'">
          <td style="padding: 16px 24px; font-family: monospace; color: #FFB800; font-weight: bold; font-size: 15px;">${o.ID || `ORD-${idx + 1}`}</td>
          <td style="padding: 16px 24px; color: #fff; font-weight: 600; font-size: 15px;">${o.Name}</td>
          <td style="padding: 16px 24px;">
            <span id="badge-${o.ID}" style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; color: ${statusColor}; border: 1px solid ${statusColor}; background: rgba(0,0,0,.4);">
              ${currentStatus}
            </span>
          </td>
          <td style="padding: 16px 24px; text-align: center;">
            <button type="button" onclick="event.stopPropagation(); openDetails('${o.ID}')" style="padding: 6px 16px; background: #3d2224; color: #FFE9A8; border: 1px solid rgba(212,175,55,.4); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
              👁️ <span class="txt-view">عرض التفاصيل</span>
            </button>
          </td>
        </tr>`;
          })
          .join("");

  const ordersJson = JSON.stringify(orders);

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
    .container { max-width: 1000px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(212,175,55,.25);
      margin-bottom: 24px;
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
    .btn-lang:hover { background: rgba(212,175,55,.15); }
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
    .btn-download:hover { background: #bd0000; transform: translateY(-1px); }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #2a1c1d;
      border: 1px solid rgba(212,175,55,.25);
      border-radius: 10px;
      padding: 16px 20px;
      box-shadow: 0 10px 25px rgba(0,0,0,.3);
    }
    .stat-label { font-size: 12px; color: #8d8578; margin-bottom: 4px; font-weight: 600; }
    .stat-val { font-size: 24px; font-weight: 700; color: #FFE9A8; font-family: 'IBM Plex Mono', monospace; }
    .stat-sub { font-size: 11px; color: #c3bbab; margin-top: 4px; }

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
      padding: 14px 24px;
      font-size: 13.5px;
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
    
    /* Modal Backdrop */
    #modalBackdrop {
      position: fixed;
      inset: 0;
      background: rgba(10,5,6,.88);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-box {
      width: min(560px, 94vw);
      background: linear-gradient(160deg,#352727,#221617);
      border: 1px solid rgba(212,175,55,.5);
      border-radius: 14px;
      box-shadow: 0 25px 70px rgba(0,0,0,.8);
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .info-card {
      background: #251819;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid rgba(212,175,55,.2);
    }
    .info-card .lbl { font-size: 11px; color: #D4AF37; margin-bottom: 4px; }
    .info-card .val { font-size: 15px; font-weight: 700; color: #fff; }
    .st-btn {
      padding: 10px 4px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid rgba(212,175,55,.25);
      background: #2a1b1c;
      color: #d8cebe;
      transition: all .15s ease;
    }
  </style>
</head>
<body>
  <!-- Modal Dialog -->
  <div id="modalBackdrop" onclick="closeModal()">
    <div class="modal-box" onclick="event.stopPropagation()">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(212,175,55,.25); padding-bottom: 14px;">
        <div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span id="mId" style="font-family:monospace; font-size:19px; color:#FFB800; font-weight:bold;"></span>
            <!-- Prominent Active Status Badge -->
            <span id="mBadgeStatus" style="padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700;"></span>
          </div>
          <div id="mDateTime" style="font-size:12px; color:#8d8578; margin-top:4px;"></div>
        </div>
        <button onclick="closeModal()" style="background:transparent; border:none; color:#ede7da; font-size:26px; cursor:pointer;">×</button>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="info-card">
          <div class="lbl" id="mLblName">👤 اسم العميل</div>
          <div class="val" id="mName"></div>
        </div>
        <div class="info-card">
          <div class="lbl" id="mLblQty">⚖️ الكمية المطلوبة</div>
          <div class="val" id="mQty" style="color:#FFB800; font-family:monospace;"></div>
        </div>
        <div class="info-card">
          <div class="lbl" id="mLblPhone">📞 الهاتف</div>
          <div class="val" id="mPhone"></div>
        </div>
        <div class="info-card">
          <div class="lbl" id="mLblEmail">📧 البريد الإلكتروني</div>
          <div class="val" id="mEmail" style="word-break:break-all; font-size:13.5px;"></div>
        </div>
        <div class="info-card">
          <div class="lbl" id="mLblResidence">🏠 بلد الإقامة</div>
          <div class="val" id="mResidence"></div>
        </div>
        <div class="info-card">
          <div class="lbl" id="mLblDelivery">📍 بلد التوصيل</div>
          <div class="val" id="mDelivery"></div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; background:#1f1415; padding:8px 14px; border-radius:8px;">
        <span style="font-size:12px; color:#8d8578;" id="mLblSource">مصدر الطلب:</span>
        <span id="mSource" style="padding:3px 10px; border-radius:10px; font-size:12px; font-weight:bold; background:#7a0000; color:#FFE9A8;"></span>
      </div>

      <!-- Live Status Switcher in Modal -->
      <div style="background:#1c1112; padding:14px; border-radius:8px; border:1px solid rgba(212,175,55,.3);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div style="font-size:12px; color:#D4AF37; font-weight:700;" id="mLblChangeStatus">🔄 تغيير الحالة:</div>
          <div style="font-size:11px; color:#8d8578;" id="mSubStatus">الحالة الحالية محددة بعلامة ✓</div>
        </div>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
          <button type="button" id="btn-Pending" class="st-btn" onclick="setStatusFromModal('Pending')"><span class="st-pending">🟡 انتظار</span></button>
          <button type="button" id="btn-Paid" class="st-btn" onclick="setStatusFromModal('Paid')"><span class="st-paid">🟢 مدفوع</span></button>
          <button type="button" id="btn-Shipped" class="st-btn" onclick="setStatusFromModal('Shipped')"><span class="st-shipped">🚚 مشحون</span></button>
          <button type="button" id="btn-Cancelled" class="st-btn" onclick="setStatusFromModal('Cancelled')"><span class="st-cancelled">❌ ملغى</span></button>
        </div>
      </div>

      <button onclick="closeModal()" style="padding:10px; background:transparent; color:#D4AF37; border:1px solid rgba(212,175,55,.4); border-radius:6px; cursor:pointer; font-weight:700; font-size:13px;" id="mBtnClose">
        إغلاق التفاصيل
      </button>
    </div>
  </div>

  <div class="container">
    <div class="header">
      <div>
        <div class="brand-title" id="txtTitle">عالم العنبر المغربي · جدول ومعاينة الطلبات</div>
        <div class="brand-sub">MOROCCAN WORLD OF AMBER (MWOA) · ORDERS & REVENUE</div>
      </div>
      <div style="display:flex; align-items:center; gap: 10px; flex-wrap: wrap;">
        <button onclick="toggleLang()" class="btn-lang" id="btnLang">🌐 English</button>
        <a href="/api/orders?format=csv" class="btn-download" id="btnDownload">
          <span>📥</span> تحميل ملف Excel / CSV
        </a>
        <a href="/" style="display: inline-flex; align-items: center; padding: 12px 18px; background: #382526; color: #ede7da; border-radius: 6px; text-decoration: none; border: 1px solid rgba(212,175,55,.3); font-size: 13px;" id="btnStore">
          المتجر ↗
        </a>
      </div>
    </div>

    <!-- Revenue & Status Stats Cards Grid -->
    <div class="stats-grid">
      <!-- Total Volume -->
      <div class="stat-card">
        <div class="stat-label" id="lblTotalVol">إجمالي حجم الطلبات</div>
        <div class="stat-val" id="valTotalVol">${totalGrams} g</div>
        <div class="stat-sub" id="subTotalOrders">${totalOrders} طلبات مسجلة</div>
      </div>

      <!-- Paid Revenue -->
      <div class="stat-card" style="border-color: rgba(37,211,102,.35);">
        <div class="stat-label" style="color: #25D366;" id="lblPaidRevenue">🟢 الطلبات المدفوعة (Paid)</div>
        <div class="stat-val" style="color: #25D366;" id="valPaidGrams">${paidGrams} g</div>
        <div class="stat-sub" id="subPaidCount">${paidCount} طلب تم دفعه</div>
      </div>

      <!-- Pending Revenue -->
      <div class="stat-card" style="border-color: rgba(255,184,0,.35);">
        <div class="stat-label" style="color: #FFB800;" id="lblPendingRevenue">🟡 قيد الانتظار (Pending)</div>
        <div class="stat-val" style="color: #FFB800;" id="valPendingGrams">${pendingGrams} g</div>
        <div class="stat-sub" id="subPendingCount">${pendingCount} طلب في الانتظار</div>
      </div>

      <!-- Shipped Volume -->
      <div class="stat-card" style="border-color: rgba(59,130,246,.35);">
        <div class="stat-label" style="color: #3b82f6;" id="lblShipped">🚚 تم الشحن (Shipped)</div>
        <div class="stat-val" style="color: #3b82f6;" id="valShippedGrams">${shippedGrams} g</div>
        <div class="stat-sub" id="subShippedCount">${shippedCount} طلب مشحون</div>
      </div>
    </div>

    <!-- Live Search -->
    <input type="text" id="orderSearch" class="search-bar" placeholder="🔍 ابحث برقم الطلب، اسم العميل، أو الحالة..." onkeyup="filterOrders()">

    <!-- Simplified Clean Orders Table: ONLY ID, Name, Status, Action -->
    <div class="table-container">
      <table id="ordersTable">
        <thead>
          <tr>
            <th id="thId">رقم الطلب (ID)</th>
            <th id="thName">اسم العميل</th>
            <th id="thStatus">الحالة</th>
            <th id="thAction" style="text-align: center;">التفاصيل</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    let ordersData = ${ordersJson};
    let currentActiveId = null;

    const STATUS_COLORS = {
      Paid: '#25D366',
      Shipped: '#3b82f6',
      Cancelled: '#ef4444',
      Pending: '#FFB800'
    };

    const I18N = {
      ar: {
        pageTitle: "سجل ومعاينة الطلبات والإيرادات · Moroccan World of Amber (MWOA)",
        title: "عالم العنبر المغربي · جدول ومعاينة الطلبات",
        btnLang: "🌐 English",
        btnDownload: "📥 تحميل ملف Excel / CSV",
        btnStore: "المتجر ↗",
        totalVol: "إجمالي حجم الطلبات",
        paidRev: "🟢 الطلبات المدفوعة (Paid)",
        pendingRev: "🟡 قيد الانتظار (Pending)",
        shippedLbl: "🚚 تم الشحن (Shipped)",
        ordersWord: "طلبات مسجلة",
        paidWord: "طلب تم دفعه",
        pendingWord: "طلب في الانتظار",
        shippedWord: "طلب مشحون",
        searchPh: "🔍 ابحث برقم الطلب، اسم العميل، أو الحالة...",
        thId: "رقم الطلب (ID)",
        thName: "اسم العميل",
        thStatus: "الحالة",
        thAction: "التفاصيل",
        viewBtn: "عرض التفاصيل",
        noOrders: "لا توجد طلبات مسجلة حتى الآن",
        lblName: "👤 اسم العميل",
        lblQty: "⚖️ الكمية المطلوبة",
        lblPhone: "📞 الهاتف",
        lblEmail: "📧 البريد الإلكتروني",
        lblResidence: "🏠 بلد الإقامة",
        lblDelivery: "📍 بلد التوصيل",
        lblSource: "مصدر الطلب:",
        lblChangeStatus: "🔄 تغيير الحالة:",
        mSubStatus: "الحالة الحالية محددة بعلامة ✓",
        btnClose: "إغلاق التفاصيل",
        pending: "🟡 انتظار",
        paid: "🟢 مدفوع",
        shipped: "🚚 مشحون",
        cancelled: "❌ ملغى"
      },
      en: {
        pageTitle: "Orders & Revenue Dashboard · Moroccan World of Amber (MWOA)",
        title: "Moroccan World of Amber · Orders & Revenue",
        btnLang: "🌐 العربية",
        btnDownload: "📥 Download Excel / CSV",
        btnStore: "Storefront ↗",
        totalVol: "Total Order Volume",
        paidRev: "🟢 Paid Revenue",
        pendingRev: "🟡 Pending Revenue",
        shippedLbl: "🚚 Shipped Orders",
        ordersWord: "orders recorded",
        paidWord: "paid orders",
        pendingWord: "pending orders",
        shippedWord: "shipped orders",
        searchPh: "🔍 Search by Order ID, name, or status...",
        thId: "Order ID",
        thName: "Customer Name",
        thStatus: "Status",
        thAction: "Action",
        viewBtn: "View Details",
        noOrders: "No orders recorded yet",
        lblName: "👤 Customer Name",
        lblQty: "⚖️ Quantity",
        lblPhone: "📞 Phone",
        lblEmail: "📧 Email",
        lblResidence: "🏠 Residence",
        lblDelivery: "📍 Delivery Destination",
        lblSource: "Order Source:",
        lblChangeStatus: "🔄 Change Status:",
        mSubStatus: "Current status marked with ✓",
        btnClose: "Close Details",
        pending: "🟡 Pending",
        paid: "🟢 Paid",
        shipped: "🚚 Shipped",
        cancelled: "❌ Cancel"
      }
    };

    let currentLang = localStorage.getItem("mwoa_admin_lang") || "ar";

    function recalculateStats() {
      const d = I18N[currentLang];
      const totalG = ordersData.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);
      const paidO = ordersData.filter(o => (o.Status || '').toLowerCase() === 'paid');
      const paidG = paidO.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);
      const pendO = ordersData.filter(o => (o.Status || '').toLowerCase() === 'pending');
      const pendG = pendO.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);
      const shipO = ordersData.filter(o => (o.Status || '').toLowerCase() === 'shipped');
      const shipG = shipO.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);

      document.getElementById('valTotalVol').innerText = totalG + ' g';
      document.getElementById('subTotalOrders').innerText = ordersData.length + ' ' + d.ordersWord;
      document.getElementById('valPaidGrams').innerText = paidG + ' g';
      document.getElementById('subPaidCount').innerText = paidO.length + ' ' + d.paidWord;
      document.getElementById('valPendingGrams').innerText = pendG + ' g';
      document.getElementById('subPendingCount').innerText = pendO.length + ' ' + d.pendingWord;
      document.getElementById('valShippedGrams').innerText = shipG + ' g';
      document.getElementById('subShippedCount').innerText = shipO.length + ' ' + d.shippedWord;
    }

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
      
      document.getElementById("lblTotalVol").innerText = d.totalVol;
      document.getElementById("lblPaidRevenue").innerText = d.paidRev;
      document.getElementById("lblPendingRevenue").innerText = d.pendingRev;
      document.getElementById("lblShipped").innerText = d.shippedLbl;

      document.getElementById("orderSearch").placeholder = d.searchPh;
      document.getElementById("thId").innerText = d.thId;
      document.getElementById("thName").innerText = d.thName;
      document.getElementById("thStatus").innerText = d.thStatus;
      document.getElementById("thAction").innerText = d.thAction;

      document.querySelectorAll(".txt-view").forEach(el => el.innerText = d.viewBtn);
      document.getElementById("mLblName").innerText = d.lblName;
      document.getElementById("mLblQty").innerText = d.lblQty;
      document.getElementById("mLblPhone").innerText = d.lblPhone;
      document.getElementById("mLblEmail").innerText = d.lblEmail;
      document.getElementById("mLblResidence").innerText = d.lblResidence;
      document.getElementById("mLblDelivery").innerText = d.lblDelivery;
      document.getElementById("mLblSource").innerText = d.lblSource;
      document.getElementById("mLblChangeStatus").innerText = d.lblChangeStatus;
      document.getElementById("mSubStatus").innerText = d.mSubStatus;
      document.getElementById("mBtnClose").innerText = d.btnClose;

      document.querySelectorAll(".st-pending").forEach(el => el.innerText = d.pending);
      document.querySelectorAll(".st-paid").forEach(el => el.innerText = d.paid);
      document.querySelectorAll(".st-shipped").forEach(el => el.innerText = d.shipped);
      document.querySelectorAll(".st-cancelled").forEach(el => el.innerText = d.cancelled);

      recalculateStats();

      if (currentActiveId) {
        const order = ordersData.find(o => o.ID === currentActiveId);
        if (order) updateModalStatusUI(order.Status || 'Pending');
      }
    }

    function toggleLang() {
      applyLang(currentLang === "ar" ? "en" : "ar");
    }

    applyLang(currentLang);

    function filterOrders() {
      const input = document.getElementById("orderSearch").value.toLowerCase();
      const rows = document.querySelectorAll("#ordersTable tbody tr");
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(input) ? "" : "none";
      });
    }

    function updateModalStatusUI(st) {
      const col = STATUS_COLORS[st] || '#FFB800';
      const mBadge = document.getElementById('mBadgeStatus');
      mBadge.style.color = col;
      mBadge.style.border = '1.5px solid ' + col;
      mBadge.style.background = 'rgba(0,0,0,.45)';
      mBadge.style.boxShadow = '0 0 10px ' + col + '30';
      mBadge.innerText = (st === 'Paid' ? '🟢 Paid' : st === 'Shipped' ? '🚚 Shipped' : st === 'Cancelled' ? '❌ Cancelled' : '🟡 Pending');

      ['Pending', 'Paid', 'Shipped', 'Cancelled'].forEach(btnKey => {
        const b = document.getElementById('btn-' + btnKey);
        if (!b) return;
        if (btnKey === st) {
          b.style.background = col;
          b.style.color = (btnKey === 'Pending' ? '#000' : '#fff');
          b.style.border = '2px solid #fff';
          b.style.boxShadow = '0 0 14px ' + col + '80';
          b.style.transform = 'scale(1.02)';
          b.innerHTML = '✓ ' + b.innerHTML.replace(/^✓\s*/, '');
        } else {
          b.style.background = '#2a1b1c';
          b.style.color = '#d8cebe';
          b.style.border = '1px solid rgba(212,175,55,.25)';
          b.style.boxShadow = 'none';
          b.style.transform = 'scale(1)';
          b.innerHTML = b.innerHTML.replace(/^✓\s*/, '');
        }
      });
    }

    function openDetails(orderId) {
      const order = ordersData.find(o => o.ID === orderId);
      if (!order) return;
      currentActiveId = orderId;

      document.getElementById("mId").innerText = order.ID;
      document.getElementById("mDateTime").innerText = order.Date + ' — ' + (order.Time || '');
      document.getElementById("mName").innerText = order.Name || '—';
      document.getElementById("mQty").innerText = (order.Grams || '0') + ' g';
      document.getElementById("mEmail").innerText = order.Email || '—';
      document.getElementById("mResidence").innerText = order.Country_Residence || '—';
      document.getElementById("mDelivery").innerText = order.Country_Delivery || '—';
      document.getElementById("mSource").innerText = order.Source || 'AI Assistant';

      const cleanPhone = (order.Phone || '').replace(/[^0-9]/g, '');
      document.getElementById("mPhone").innerHTML = (order.Phone || '—') + (cleanPhone ? ' <a href="https://wa.me/' + cleanPhone + '" target="_blank" style="margin-right:8px; margin-left:8px; background:#25D366; color:#fff; padding:2px 8px; border-radius:4px; font-size:11px; text-decoration:none; font-weight:bold;">💬 WhatsApp</a>' : '');

      updateModalStatusUI(order.Status || 'Pending');
      document.getElementById("modalBackdrop").style.display = "flex";
    }

    function closeModal() {
      document.getElementById("modalBackdrop").style.display = "none";
      currentActiveId = null;
    }

    async function setStatusFromModal(newStatus) {
      if (!currentActiveId) return;
      const orderId = currentActiveId;

      const colors = { Paid: '#25D366', Shipped: '#3b82f6', Cancelled: '#ef4444', Pending: '#FFB800' };
      const badge = document.getElementById('badge-' + orderId);
      if (badge) {
        badge.style.color = colors[newStatus] || '#FFB800';
        badge.style.borderColor = colors[newStatus] || '#FFB800';
        badge.innerText = newStatus;
      }

      // Update local array
      const item = ordersData.find(o => o.ID === orderId);
      if (item) item.Status = newStatus;

      updateModalStatusUI(newStatus);
      recalculateStats();

      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: newStatus })
        });
      } catch (err) {
        console.error(err);
      }
    }
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200);
  return res.end(html);
}
