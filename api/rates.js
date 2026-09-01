// GET /api/rates - Fetches live real-time forex exchange rates directly from central bank feeds
export default async function handler(req, res) {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/MAD", {
      headers: { "User-Agent": "MWOA-App" },
    });
    if (!response.ok) {
      throw new Error(`Forex API error: ${response.status}`);
    }
    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.status(200).json({
      ok: true,
      base: "MAD",
      rates: data.rates,
      time_last_update_utc: data.time_last_update_utc,
    });
  } catch (err) {
    console.error("[Forex API Error]:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
