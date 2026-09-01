import { useEffect, useState } from "react";
import { useLang } from "../i18n.jsx";

const C = {
  gold: "#D4AF37",
  amber: "#FFB800",
  ruby: "#990000",
  paper: "#F6EFD9",
  body: "#c3bbab",
  panel: "#251819",
};

const STATUS_COLORS = {
  Paid: "#25D366",
  Shipped: "#3b82f6",
  Cancelled: "#ef4444",
  Pending: "#FFB800",
};

export default function AdminOrdersModal({ open, onClose }) {
  const { fonts, dir, lang, setLang } = useLang();
  const isAr = lang === "ar";
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Price per gram & currency settings
  const [pricePerGram, setPricePerGram] = useState(() => {
    return Number(localStorage.getItem("mwoa_price_per_gram")) || 40;
  });
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem("mwoa_currency") || "USD";
  });

  const handlePriceChange = (val) => {
    const num = Math.max(0, Number(val) || 0);
    setPricePerGram(num);
    localStorage.setItem("mwoa_price_per_gram", String(num));
  };

  const handleCurrencyChange = (c) => {
    setCurrency(c);
    localStorage.setItem("mwoa_currency", c);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders?format=json");
      const data = await res.json();
      if (data.ok && Array.isArray(data.orders)) {
        setOrders(data.orders);
        if (selectedOrder) {
          const updated = data.orders.find((o) => o.ID === selectedOrder.ID);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOrders();
    } else {
      setSelectedOrder(null);
    }
  }, [open]);

  const handleStatusChange = async (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.ID === orderId ? { ...o, Status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.ID === orderId) {
      setSelectedOrder((prev) => ({ ...prev, Status: newStatus }));
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        setToastMsg(isAr ? `✓ تم تحديث حالة الطلب ${orderId} إلى: ${newStatus}` : `✓ Updated ${orderId} to: ${newStatus}`);
        setTimeout(() => setToastMsg(""), 3000);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  if (!open) return null;

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.Name || "").toLowerCase().includes(q) ||
      (o.Phone || "").toLowerCase().includes(q) ||
      (o.Email || "").toLowerCase().includes(q) ||
      (o.Country_Residence || "").toLowerCase().includes(q) ||
      (o.Country_Delivery || "").toLowerCase().includes(q) ||
      (o.Status || "").toLowerCase().includes(q) ||
      (o.ID || "").toLowerCase().includes(q)
    );
  });

  const totalGrams = orders.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);
  const totalRevenue = totalGrams * pricePerGram;
  
  const paidOrders = orders.filter((o) => (o.Status || "").toLowerCase() === "paid");
  const paidCount = paidOrders.length;
  const paidGrams = paidOrders.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);
  const paidRevenue = paidGrams * pricePerGram;

  const pendingOrders = orders.filter((o) => (o.Status || "").toLowerCase() === "pending");
  const pendingCount = pendingOrders.length;
  const pendingGrams = pendingOrders.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);
  const pendingRevenue = pendingGrams * pricePerGram;

  const shippedOrders = orders.filter((o) => (o.Status || "").toLowerCase() === "shipped");
  const shippedCount = shippedOrders.length;
  const shippedGrams = shippedOrders.reduce((sum, o) => sum + (Number(o.Grams) || 0), 0);
  const shippedRevenue = shippedGrams * pricePerGram;

  const currSymbol = currency === "USD" ? "$" : currency === "MAD" ? "DH" : "SAR";

  const curModalStatus = selectedOrder?.Status || "Pending";
  const curModalColor = STATUS_COLORS[curModalStatus] || "#FFB800";

  return (
    <div
      dir={dir}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(18,10,11,.88)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(960px, 96vw)",
          maxHeight: "90vh",
          background: C.panel,
          border: "1px solid rgba(212,175,55,.45)",
          borderRadius: 14,
          boxShadow: "0 30px 80px rgba(0,0,0,.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Toast Alert */}
        {toastMsg && (
          <div
            style={{
              position: "absolute",
              top: 14,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#25D366",
              color: "#fff",
              padding: "8px 18px",
              borderRadius: 20,
              fontWeight: 700,
              fontSize: 13,
              boxShadow: "0 4px 15px rgba(0,0,0,.4)",
              zIndex: 10,
              animation: "fadeIn .2s ease",
            }}
          >
            {toastMsg}
          </div>
        )}

        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "linear-gradient(180deg, #3d2224 0%, #251819 100%)",
            borderBottom: "1px solid rgba(212,175,55,.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 700, color: C.paper }}>
              {isAr ? "📊 إحصائيات الإيرادات والأموال والطلبات" : "📊 Revenue & Money Analytics"}
            </div>
            <div style={{ fontFamily: fonts.ui, fontSize: 13, color: C.body, marginTop: 4 }}>
              {isAr
                ? `إجمالي الطلبات المسجلة: ${orders.length} طلب`
                : `Total Orders Recorded: ${orders.length}`}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Price Controller */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#1c1011", padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(212,175,55,.3)" }}>
              <span style={{ fontSize: 11, color: C.gold }}>{isAr ? "سعر الغرام:" : "Price/g:"}</span>
              <input
                type="number"
                value={pricePerGram}
                onChange={(e) => handlePriceChange(e.target.value)}
                style={{
                  width: 50,
                  padding: "3px 6px",
                  background: "#2a1b1c",
                  border: "1px solid rgba(212,175,55,.4)",
                  borderRadius: 4,
                  color: "#FFE9A8",
                  fontSize: 13,
                  fontWeight: "bold",
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                style={{
                  padding: "3px 4px",
                  background: "#2a1b1c",
                  border: "1px solid rgba(212,175,55,.4)",
                  borderRadius: 4,
                  color: C.gold,
                  fontSize: 12,
                  fontWeight: "bold",
                  outline: "none",
                }}
              >
                <option value="USD">$ USD</option>
                <option value="MAD">MAD (درهم)</option>
                <option value="SAR">SAR (ريال)</option>
              </select>
            </div>

            <button
              onClick={() => setLang(isAr ? "en" : "ar")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid rgba(212,175,55,.4)",
                color: C.gold,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                borderRadius: 6,
                fontFamily: "monospace",
              }}
            >
              🌐 {isAr ? "English" : "العربية"}
            </button>
            <a
              href="/api/orders?format=csv"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: C.ruby,
                color: "#FFE9A8",
                fontWeight: 700,
                fontSize: 12.5,
                borderRadius: 6,
                textDecoration: "none",
                border: "1px solid rgba(255,184,0,.4)",
              }}
            >
              <span>📥</span> {isAr ? "تحميل Excel" : "Download Excel"}
            </a>
            <button
              onClick={fetchOrders}
              disabled={loading}
              style={{
                padding: "8px 12px",
                background: "#382526",
                color: C.paper,
                border: "1px solid rgba(212,175,55,.3)",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              🔄
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: C.paper,
                fontSize: 24,
                cursor: "pointer",
                padding: "0 8px",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* FINANCIAL REVENUE STATS CARDS */}
        <div style={{ padding: "16px 24px 8px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {/* Total Money Revenue */}
          <div style={{ background: "#2a1c1d", border: "1px solid rgba(212,175,55,.35)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#D4AF37", marginBottom: 4, fontWeight: 700 }}>
              💰 {isAr ? "إجمالي الإيرادات المتوقعة" : "Total App Revenue"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#FFE9A8", fontFamily: "monospace" }}>
              {totalRevenue.toLocaleString()} {currSymbol}
            </div>
            <div style={{ fontSize: 11, color: C.body, marginTop: 4 }}>
              {totalGrams} g • {orders.length} {isAr ? "طلبات" : "orders"}
            </div>
          </div>

          {/* Paid Money Revenue */}
          <div style={{ background: "#2a1c1d", border: "1px solid rgba(37,211,102,.4)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#25D366", marginBottom: 4, fontWeight: 700 }}>
              🟢 {isAr ? "الإيرادات المحصلة (تم الدفع)" : "Paid Revenue (Collected)"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#25D366", fontFamily: "monospace" }}>
              {paidRevenue.toLocaleString()} {currSymbol}
            </div>
            <div style={{ fontSize: 11, color: C.body, marginTop: 4 }}>
              {paidGrams} g • {paidCount} {isAr ? "طلب مدفوع" : "paid"}
            </div>
          </div>

          {/* Pending Money Revenue */}
          <div style={{ background: "#2a1c1d", border: "1px solid rgba(255,184,0,.4)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#FFB800", marginBottom: 4, fontWeight: 700 }}>
              🟡 {isAr ? "الإيرادات المعلقة (في الانتظار)" : "Pending Revenue"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#FFB800", fontFamily: "monospace" }}>
              {pendingRevenue.toLocaleString()} {currSymbol}
            </div>
            <div style={{ fontSize: 11, color: C.body, marginTop: 4 }}>
              {pendingGrams} g • {pendingCount} {isAr ? "في الانتظار" : "pending"}
            </div>
          </div>

          {/* Shipped Value */}
          <div style={{ background: "#2a1c1d", border: "1px solid rgba(59,130,246,.4)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#3b82f6", marginBottom: 4, fontWeight: 700 }}>
              🚚 {isAr ? "قيمة الشحنات (تم الشحن)" : "Shipped Value"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#3b82f6", fontFamily: "monospace" }}>
              {shippedRevenue.toLocaleString()} {currSymbol}
            </div>
            <div style={{ fontSize: 11, color: C.body, marginTop: 4 }}>
              {shippedGrams} g • {shippedCount} {isAr ? "مشحون" : "shipped"}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: "10px 24px 12px", background: "transparent" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "🔍 ابحث برقم الطلب، الاسم، أو الحالة..." : "🔍 Search by Order ID, name, or status..."}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "#150b0c",
              border: "1px solid rgba(212,175,55,.3)",
              borderRadius: 6,
              color: C.paper,
              fontSize: 14,
              fontFamily: fonts.ui,
              outline: "none",
            }}
          />
        </div>

        {/* Simplified Table: ONLY ID, Name, Status, Action */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "0" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.gold, fontSize: 16 }}>
              {isAr ? "جاري تحميل بيانات الطلبات..." : "Loading orders..."}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center", color: "#8d8578", fontSize: 15 }}>
              {isAr ? "لا توجد طلبات مسجلة" : "No orders found"}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: isAr ? "right" : "left", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#2e1c1d", borderBottom: "1px solid rgba(212,175,55,.25)" }}>
                  <th style={{ padding: "14px 24px", color: C.gold, fontWeight: 700 }}>{isAr ? "رقم الطلب" : "Order ID"}</th>
                  <th style={{ padding: "14px 24px", color: C.gold, fontWeight: 700 }}>{isAr ? "اسم العميل" : "Customer Name"}</th>
                  <th style={{ padding: "14px 24px", color: C.gold, fontWeight: 700 }}>{isAr ? "الحالة" : "Status"}</th>
                  <th style={{ padding: "14px 24px", color: C.gold, fontWeight: 700, textAlign: "center" }}>{isAr ? "التفاصيل" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, idx) => {
                  const curStatus = o.Status || "Pending";
                  const statusColor = STATUS_COLORS[curStatus] || "#FFB800";

                  return (
                    <tr
                      key={o.ID || idx}
                      onClick={() => setSelectedOrder(o)}
                      style={{
                        borderBottom: "1px solid rgba(212,175,55,.12)",
                        transition: "background .15s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(153,0,0,.15)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "14px 24px", fontFamily: "monospace", color: C.amber, fontWeight: "bold", fontSize: 15 }}>
                        {o.ID || `ORD-${idx + 1}`}
                      </td>
                      <td style={{ padding: "14px 24px", color: "#fff", fontWeight: 600, fontSize: 15 }}>
                        {o.Name}
                      </td>
                      <td style={{ padding: "14px 24px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: "bold",
                            background: "rgba(0,0,0,.4)",
                            color: statusColor,
                            border: `1px solid ${statusColor}`,
                          }}
                        >
                          {curStatus === "Paid"
                            ? isAr ? "🟢 تم الدفع" : "🟢 Paid"
                            : curStatus === "Shipped"
                            ? isAr ? "🚚 تم الشحن" : "🚚 Shipped"
                            : curStatus === "Cancelled"
                            ? isAr ? "❌ ملغى" : "❌ Cancelled"
                            : isAr ? "🟡 في الانتظار" : "🟡 Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 24px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(o);
                          }}
                          style={{
                            padding: "6px 16px",
                            background: "#3d2224",
                            color: "#FFE9A8",
                            border: "1px solid rgba(212,175,55,.4)",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          👁️ {isAr ? "عرض التفاصيل" : "View Details"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ORDER DETAILS POPUP MODAL */}
        {selectedOrder && (
          <div
            onClick={() => setSelectedOrder(null)}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              background: "rgba(10,5,6,.88)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              animation: "fadeIn .2s ease",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(560px, 94vw)",
                background: "linear-gradient(160deg,#352727,#221617)",
                border: "1px solid rgba(212,175,55,.5)",
                borderRadius: 12,
                boxShadow: "0 20px 60px rgba(0,0,0,.8)",
                padding: "26px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(212,175,55,.25)", paddingBottom: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 19, color: C.amber, fontWeight: "bold" }}>
                      {selectedOrder.ID}
                    </span>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                        color: curModalColor,
                        border: `1.5px solid ${curModalColor}`,
                        background: "rgba(0,0,0,.45)",
                        boxShadow: `0 0 10px ${curModalColor}30`,
                      }}
                    >
                      {curModalStatus === "Paid"
                        ? isAr ? "🟢 تم الدفع (Paid)" : "🟢 Paid"
                        : curModalStatus === "Shipped"
                        ? isAr ? "🚚 تم الشحن (Shipped)" : "🚚 Shipped"
                        : curModalStatus === "Cancelled"
                        ? isAr ? "❌ ملغى (Cancelled)" : "❌ Cancelled"
                        : isAr ? "🟡 قيد الانتظار (Pending)" : "🟡 Pending"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#8d8578", marginTop: 4 }}>
                    {selectedOrder.Date} — {selectedOrder.Time}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: "transparent", border: "none", color: C.paper, fontSize: 24, cursor: "pointer" }}
                >
                  ×
                </button>
              </div>

              {/* Information Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
                <div style={{ background: "#251819", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,.2)" }}>
                  <div style={{ fontSize: 11, color: C.gold, marginBottom: 4 }}>{isAr ? "👤 اسم العميل" : "👤 Customer Name"}</div>
                  <div style={{ fontWeight: 700, color: "#fff" }}>{selectedOrder.Name}</div>
                </div>

                <div style={{ background: "#251819", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,.2)" }}>
                  <div style={{ fontSize: 11, color: C.gold, marginBottom: 4 }}>{isAr ? "⚖️ الكمية والقيمة" : "⚖️ Weight & Value"}</div>
                  <div style={{ fontWeight: 700, color: C.amber, fontFamily: "monospace", fontSize: 16 }}>
                    {selectedOrder.Grams} g <span style={{ fontSize: 13, color: "#fff" }}>({(Number(selectedOrder.Grams || 0) * pricePerGram).toLocaleString()} {currSymbol})</span>
                  </div>
                </div>

                <div style={{ background: "#251819", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,.2)" }}>
                  <div style={{ fontSize: 11, color: C.gold, marginBottom: 4 }}>{isAr ? "📞 الهاتف" : "📞 Phone"}</div>
                  <div style={{ fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{selectedOrder.Phone || "—"}</span>
                    {selectedOrder.Phone && (
                      <a
                        href={`https://wa.me/${selectedOrder.Phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "#25D366",
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          textDecoration: "none",
                          fontWeight: "bold",
                        }}
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ background: "#251819", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,.2)" }}>
                  <div style={{ fontSize: 11, color: C.gold, marginBottom: 4 }}>{isAr ? "📧 البريد الإلكتروني" : "📧 Email"}</div>
                  <div style={{ fontWeight: 600, color: C.body, wordBreak: "break-all" }}>{selectedOrder.Email || "—"}</div>
                </div>

                <div style={{ background: "#251819", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,.2)" }}>
                  <div style={{ fontSize: 11, color: C.gold, marginBottom: 4 }}>{isAr ? "🏠 بلد الإقامة" : "🏠 Residence"}</div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>{selectedOrder.Country_Residence || "—"}</div>
                </div>

                <div style={{ background: "#251819", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,.2)" }}>
                  <div style={{ fontSize: 11, color: C.gold, marginBottom: 4 }}>{isAr ? "📍 بلد التوصيل" : "📍 Delivery"}</div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>{selectedOrder.Country_Delivery || "—"}</div>
                </div>
              </div>

              {/* Source Badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1f1415", padding: "8px 14px", borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: "#8d8578" }}>{isAr ? "مصدر الطلب:" : "Order Source:"}</span>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: "bold",
                    background: selectedOrder.Source === "Order Form" ? "#7a0000" : "#2d4428",
                    color: "#FFE9A8",
                  }}
                >
                  {selectedOrder.Source || "AI Assistant"}
                </span>
              </div>

              {/* Status Selector with Highlighted Active State */}
              <div style={{ background: "#1c1112", padding: "14px", borderRadius: 8, border: "1px solid rgba(212,175,55,.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>
                    {isAr ? "🔄 تغيير الحالة:" : "🔄 Change Status:"}
                  </div>
                  <div style={{ fontSize: 11, color: "#8d8578" }}>
                    {isAr ? "الحالة الحالية محددة بعلامة ✓" : "Current status marked with ✓"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {["Pending", "Paid", "Shipped", "Cancelled"].map((st) => {
                    const active = curModalStatus === st;
                    const stColor = STATUS_COLORS[st];
                    return (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(selectedOrder.ID, st)}
                        style={{
                          padding: "10px 4px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          background: active ? stColor : "#2a1b1c",
                          color: active ? (st === "Pending" ? "#000" : "#fff") : "#d8cebe",
                          border: active ? `2px solid #fff` : `1px solid rgba(212,175,55,.25)`,
                          boxShadow: active ? `0 0 14px ${stColor}80` : "none",
                          transform: active ? "scale(1.02)" : "scale(1)",
                          transition: "all .15s ease",
                        }}
                      >
                        {active && "✓ "}
                        {st === "Paid"
                          ? isAr ? "🟢 مدفوع" : "🟢 Paid"
                          : st === "Shipped"
                          ? isAr ? "🚚 مشحون" : "🚚 Shipped"
                          : st === "Cancelled"
                          ? isAr ? "❌ ملغى" : "❌ Cancel"
                          : isAr ? "🟡 انتظار" : "🟡 Pending"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  padding: "10px",
                  background: "transparent",
                  color: C.gold,
                  border: "1px solid rgba(212,175,55,.4)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {isAr ? "إغلاق التفاصيل" : "Close Details"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
