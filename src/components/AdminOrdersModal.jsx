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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders?format=json");
      const data = await res.json();
      if (data.ok && Array.isArray(data.orders)) {
        setOrders(data.orders);
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
    }
  }, [open]);

  const handleStatusChange = async (orderId, newStatus) => {
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.ID === orderId ? { ...o, Status: newStatus } : o))
    );

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
  const paidCount = orders.filter((o) => (o.Status || "").toLowerCase() === "paid").length;

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
          width: "min(1200px, 96vw)",
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
            padding: "20px 24px",
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
              {isAr ? "📊 جدول ومعاينة طلبات الإكسل وتحديث الحالة" : "📊 Admin Orders & Status Manager"}
            </div>
            <div style={{ fontFamily: fonts.ui, fontSize: 13, color: C.body, marginTop: 4 }}>
              {isAr
                ? `إجمالي الطلبات: ${orders.length} | المدفوعة: ${paidCount} | إجمالي الكمية: ${totalGrams} غرام`
                : `Total: ${orders.length} | Paid: ${paidCount} | Total Weight: ${totalGrams}g`}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setLang(isAr ? "en" : "ar")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "transparent",
                border: "1px solid rgba(212,175,55,.4)",
                color: C.gold,
                fontSize: 13,
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
                padding: "8px 16px",
                background: C.ruby,
                color: "#FFE9A8",
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 6,
                textDecoration: "none",
                border: "1px solid rgba(255,184,0,.4)",
              }}
            >
              <span>📥</span> {isAr ? "تحميل Excel / CSV" : "Download CSV"}
            </a>
            <button
              onClick={fetchOrders}
              disabled={loading}
              style={{
                padding: "8px 14px",
                background: "#382526",
                color: C.paper,
                border: "1px solid rgba(212,175,55,.3)",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              🔄 {isAr ? "تحديث" : "Refresh"}
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

        {/* Search Bar */}
        <div style={{ padding: "14px 24px", background: "#1f1213", borderBottom: "1px solid rgba(212,175,55,.15)" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "🔍 ابحث باسم العميل، الهاتف، البريد، الدولة، أو الحالة..." : "🔍 Search by name, phone, email, country, or status..."}
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

        {/* Table Content */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "0" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.gold, fontSize: 16 }}>
              {isAr ? "جاري تحميل بيانات الطلبات..." : "Loading orders data..."}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center", color: "#8d8578", fontSize: 15 }}>
              {isAr ? "لا توجد طلبات مسجلة تطابق بحثك" : "No orders found"}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: isAr ? "right" : "left", fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: "#2e1c1d", borderBottom: "1px solid rgba(212,175,55,.25)" }}>
                  <th style={{ padding: "12px 16px", color: C.gold, fontWeight: 700 }}>ID</th>
                  <th style={{ padding: "12px 16px", color: C.gold, fontWeight: 700 }}>{isAr ? "التاريخ" : "Date"}</th>
                  <th style={{ padding: "12px 16px", color: C.gold, fontWeight: 700 }}>{isAr ? "الاسم" : "Name"}</th>
                  <th style={{ padding: "12px 16px", color: C.gold, fontWeight: 700 }}>{isAr ? "الكمية" : "Qty"}</th>
                  <th style={{ padding: "12px 16px", color: C.gold, fontWeight: 700 }}>{isAr ? "الهاتف" : "Phone"}</th>
                  <th style={{ padding: "12px 16px", color: C.gold, fontWeight: 700 }}>{isAr ? "البريد" : "Email"}</th>
                  <th style={{ padding: "12px 16px", color: C.gold, fontWeight: 700 }}>{isAr ? "الإقامة" : "Residence"}</th>
                  <th style={{ padding: "12px 16px", color: C.gold, fontWeight: 700 }}>{isAr ? "التسليم" : "Delivery"}</th>
                  <th style={{ padding: "12px 16px", color: C.gold, fontWeight: 700 }}>{isAr ? "المصدر" : "Source"}</th>
                  <th style={{ padding: "12px 16px", color: C.gold, fontWeight: 700 }}>{isAr ? "الحالة (تغيير فوري)" : "Status (Live Change)"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, idx) => {
                  const cleanPhone = (o.Phone || "").replace(/[^0-9]/g, "");
                  const curStatus = o.Status || "Pending";
                  const statusColor = STATUS_COLORS[curStatus] || "#FFB800";

                  return (
                    <tr
                      key={o.ID || idx}
                      style={{ borderBottom: "1px solid rgba(212,175,55,.12)", transition: "background .15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(153,0,0,.15)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: C.amber, fontWeight: "bold" }}>
                        {o.ID || `ORD-${idx + 1}`}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#d8cebe", whiteSpace: "nowrap" }}>
                        {o.Date} <span style={{ color: "#8d8578", fontSize: 11 }}>{o.Time || ""}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 600 }}>{o.Name}</td>
                      <td style={{ padding: "12px 16px", color: C.amber, fontWeight: "bold", fontFamily: "monospace" }}>
                        {o.Grams} g
                      </td>
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", fontFamily: "monospace", color: "#d8cebe" }}>
                        {o.Phone || "—"}
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              marginLeft: 6,
                              color: "#25D366",
                              textDecoration: "none",
                              fontSize: 12,
                              fontWeight: "bold",
                            }}
                            title="Open WhatsApp Chat"
                          >
                            💬
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: C.body }}>{o.Email || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#d8cebe" }}>{o.Country_Residence || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 500 }}>{o.Country_Delivery || "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: "bold",
                            background: o.Source === "Order Form" ? "#7a0000" : "#2d4428",
                            color: "#FFE9A8",
                            border: "1px solid rgba(255,184,0,.3)",
                          }}
                        >
                          {o.Source || "AI Assistant"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <select
                          value={curStatus}
                          onChange={(e) => handleStatusChange(o.ID, e.target.value)}
                          style={{
                            padding: "4px 8px",
                            background: "#180e0f",
                            color: statusColor,
                            border: `1px solid ${statusColor}`,
                            borderRadius: 6,
                            fontWeight: "bold",
                            fontSize: 12,
                            cursor: "pointer",
                            outline: "none",
                          }}
                        >
                          <option value="Pending" style={{ color: "#FFB800", background: "#2a1c1d" }}>
                            🟡 {isAr ? "Pending (في الانتظار)" : "Pending"}
                          </option>
                          <option value="Paid" style={{ color: "#25D366", background: "#2a1c1d" }}>
                            🟢 {isAr ? "Paid (تم الدفع)" : "Paid"}
                          </option>
                          <option value="Shipped" style={{ color: "#3b82f6", background: "#2a1c1d" }}>
                            🚚 {isAr ? "Shipped (تم الشحن)" : "Shipped"}
                          </option>
                          <option value="Cancelled" style={{ color: "#ef4444", background: "#2a1c1d" }}>
                            ❌ {isAr ? "Cancelled (ملغى)" : "Cancelled"}
                          </option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
