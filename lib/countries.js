import { useState, useEffect } from "react";

export const BASE_PRICE_MAD = 400; // 400 MAD per gram base

export const COUNTRIES = [
  { nameAr: "المغرب", nameEn: "Morocco", code: "+212", currencyCode: "MAD", currencyAr: "درهم مغربي", currencyEn: "MAD", symbol: "MAD" },
  { nameAr: "السعودية", nameEn: "Saudi Arabia", code: "+966", currencyCode: "SAR", currencyAr: "ريال سعودي", currencyEn: "SAR", symbol: "SAR" },
  { nameAr: "الإمارات", nameEn: "United Arab Emirates", code: "+971", currencyCode: "AED", currencyAr: "درهم إماراتي", currencyEn: "AED", symbol: "AED" },
  { nameAr: "قطر", nameEn: "Qatar", code: "+974", currencyCode: "QAR", currencyAr: "ريال قطري", currencyEn: "QAR", symbol: "QAR" },
  { nameAr: "الكويت", nameEn: "Kuwait", code: "+965", currencyCode: "KWD", currencyAr: "دينار كويتي", currencyEn: "KWD", symbol: "KWD" },
  { nameAr: "عُمان", nameEn: "Oman", code: "+968", currencyCode: "OMR", currencyAr: "ريال عماني", currencyEn: "OMR", symbol: "OMR" },
  { nameAr: "البحرين", nameEn: "Bahrain", code: "+973", currencyCode: "BHD", currencyAr: "دينار بحريني", currencyEn: "BHD", symbol: "BHD" },
  { nameAr: "الأردن", nameEn: "Jordan", code: "+962", currencyCode: "JOD", currencyAr: "دينار أردني", currencyEn: "JOD", symbol: "JOD" },
  { nameAr: "لبنان", nameEn: "Lebanon", code: "+961", currencyCode: "USD", currencyAr: "دولار أمريكي", currencyEn: "USD", symbol: "$" },
  { nameAr: "العراق", nameEn: "Iraq", code: "+964", currencyCode: "USD", currencyAr: "دولار أمريكي", currencyEn: "USD", symbol: "$" },
  { nameAr: "اليمن", nameEn: "Yemen", code: "+967", currencyCode: "USD", currencyAr: "دولار أمريكي", currencyEn: "USD", symbol: "$" },
  { nameAr: "فلسطين", nameEn: "Palestine", code: "+970", currencyCode: "USD", currencyAr: "دولار أمريكي", currencyEn: "USD", symbol: "$" },
  { nameAr: "سوريا", nameEn: "Syria", code: "+963", currencyCode: "USD", currencyAr: "دولار أمريكي", currencyEn: "USD", symbol: "$" },
];

let liveRatesCache = {
  MAD: 1,
  SAR: 0.4035,
  AED: 0.3952,
  QAR: 0.3917,
  KWD: 0.0332,
  OMR: 0.0414,
  BHD: 0.0405,
  JOD: 0.0763,
  USD: 0.1076,
  EUR: 0.0927,
};

export async function fetchLiveRates() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/MAD");
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        liveRatesCache = { ...liveRatesCache, ...data.rates };
        return liveRatesCache;
      }
    }
  } catch (err) {
    console.warn("[Live Forex API]: Fallback to cache:", err.message);
  }
  return liveRatesCache;
}

export function useLiveRates() {
  const [rates, setRates] = useState(liveRatesCache);

  useEffect(() => {
    fetchLiveRates().then((latest) => {
      if (latest) setRates({ ...latest });
    });
  }, []);

  return rates;
}

/**
 * Hook: fetches all live pricing settings from /api/settings.
 * Returns { basePriceMad, taxPercent, shippingMad, packagingMad }.
 */
export function useLiveSettings() {
  const [settings, setSettings] = useState({
    basePriceMad: BASE_PRICE_MAD,
    taxMad: 0,
    taxPercent: 0,
    shippingMad: 0,
    packagingMad: 0,
    passGatewayFee: true,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data?.settings || {};
        const p = Number(s.base_price_mad);
        const t = s.tax_mad !== undefined ? Number(s.tax_mad) : Number(s.tax_percent);
        setSettings({
          basePriceMad: p > 0 ? p : BASE_PRICE_MAD,
          taxMad: Math.max(0, t || 0),
          taxPercent: Math.max(0, t || 0),
          shippingMad: Math.max(0, Number(s.shipping_mad) || 0),
          packagingMad: Math.max(0, Number(s.packaging_mad) || 0),
          passGatewayFee: s.pass_gateway_fee !== undefined ? Boolean(s.pass_gateway_fee) : true,
        });
      })
      .catch(() => {}); // silently fall back
  }, []);

  return settings;
}

/**
 * Hook: fetches the live base price per gram (MAD) from /api/settings.
 * Falls back to BASE_PRICE_MAD (400) when the API is unavailable.
 * @deprecated Use useLiveSettings() for full fee support.
 */
export function useLivePrice() {
  const [basePriceMad, setBasePriceMad] = useState(BASE_PRICE_MAD);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const p = Number(data?.settings?.base_price_mad);
        if (p > 0) setBasePriceMad(p);
      })
      .catch(() => {}); // silently fall back to the static default
  }, []);

  return basePriceMad;
}

export function getCountryInfo(countryName) {
  if (!countryName) return null;
  const c = String(countryName).toLowerCase().trim();
  return (
    COUNTRIES.find(
      (item) => item.nameAr.toLowerCase() === c || item.nameEn.toLowerCase() === c
    ) || {
      nameAr: countryName,
      nameEn: countryName,
      code: "+212",
      currencyCode: "USD",
      currencyAr: "دولار أمريكي",
      currencyEn: "USD",
      symbol: "$",
    }
  );
}

/**
 * Calculate price for a given quantity, country, and optional fees.
 *
 * @param {number} qtyInGrams
 * @param {string} countryName
 * @param {boolean} isAr
 * @param {object|null} ratesOverride - live FX rates override
 * @param {number|null} basePriceOverride - base price per gram in MAD
 * @param {{ taxPercent?: number, shippingMad?: number, packagingMad?: number }|null} feesOverride
 */
export function calculatePrice(
  qtyInGrams,
  countryName,
  isAr = true,
  ratesOverride = null,
  basePriceOverride = null,
  feesOverride = null
) {
  const qty = Number(qtyInGrams) || 0;
  const info = getCountryInfo(countryName) || {
    currencyCode: "USD",
    currencyAr: "دولار أمريكي",
    currencyEn: "USD",
    symbol: "$",
  };

  const rates = ratesOverride || liveRatesCache;
  const rate = rates[info.currencyCode] !== undefined ? rates[info.currencyCode] : rates.USD || 0.1076;
  const baseMad = basePriceOverride && basePriceOverride > 0 ? basePriceOverride : BASE_PRICE_MAD;

  let unitPrice;
  if (info.currencyCode === "MAD") {
    unitPrice = baseMad;
  } else if (info.currencyCode === "KWD" || info.currencyCode === "BHD" || info.currencyCode === "OMR") {
    unitPrice = Number((baseMad * rate).toFixed(2));
  } else {
    unitPrice = Number((baseMad * rate).toFixed(1));
  }

  const subtotal = Number((qty * unitPrice).toFixed(2));
  const currency = isAr ? info.currencyAr : info.currencyEn;

  // --- Fees (Fixed MAD amounts) ---
  // Formula: Grand Total = (price/g * quantity) + tax (MAD) + shipping (MAD) + emballage (MAD)
  const fees = feesOverride || {};
  const rawTax = fees.taxMad !== undefined ? fees.taxMad : fees.taxPercent !== undefined ? fees.taxPercent : 0;
  const taxMad = Math.max(0, Number(rawTax) || 0);
  const shippingMad = Math.max(0, Number(fees.shippingMad ?? fees.shipping_mad) || 0);
  const packagingMad = Math.max(0, Number(fees.packagingMad ?? fees.packaging_mad) || 0);

  // Convert MAD fees to local currency
  const shippingLocal = info.currencyCode === "MAD"
    ? shippingMad
    : Number((shippingMad * rate).toFixed(2));
  const packagingLocal = info.currencyCode === "MAD"
    ? packagingMad
    : Number((packagingMad * rate).toFixed(2));
  const taxLocal = info.currencyCode === "MAD"
    ? taxMad
    : Number((taxMad * rate).toFixed(2));

  const passGatewayFee = fees.passGatewayFee ?? fees.pass_gateway_fee ?? true;

  const netTotalLocal = Number((subtotal + taxLocal + shippingLocal + packagingLocal).toFixed(2));

  // Auto-gross up for YouCan Pay gateway commission (3.9% + 2 MAD):
  // Formula: Gross = (Net + 2 MAD) / (1 - 0.039)
  // When YouCan Pay deducts 3.9% + 2 MAD from Gross, the merchant receives 100% of their net money.
  let grandTotal = netTotalLocal;
  let gatewayFeeLocal = 0;

  if (passGatewayFee) {
    const fixedFeeLocal = info.currencyCode === "MAD" ? 2 : Number((2 * rate).toFixed(2));
    grandTotal = Number(((netTotalLocal + fixedFeeLocal) / (1 - 0.039)).toFixed(2));
    gatewayFeeLocal = Number((grandTotal - netTotalLocal).toFixed(2));
  }

  const hasFees = taxMad > 0 || shippingMad > 0 || packagingMad > 0 || gatewayFeeLocal > 0;

  return {
    qty,
    pricePerGram: unitPrice,
    subtotal,
    taxAmount: taxLocal,
    shippingAmount: shippingLocal,
    packagingAmount: packagingLocal,
    gatewayFeeAmount: gatewayFeeLocal,
    grandTotal,
    hasFees,
    currency,
    currencyCode: info.currencyCode,
    symbol: info.symbol,
    rate,
    // Formatted strings
    formattedUnit: unitPrice.toLocaleString() + " " + currency + (isAr ? " / غرام" : " / g"),
    formattedTotal: grandTotal.toLocaleString() + " " + currency,
    // Legacy alias (used in order form price box)
    total: grandTotal,
  };
}

export function formatPhoneWithCountry(phone, countryName) {
  let cleaned = String(phone || "").trim();
  if (!cleaned) return cleaned;
  if (cleaned.startsWith("+") || cleaned.startsWith("00")) {
    if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
    return cleaned;
  }
  const matched = getCountryInfo(countryName);
  const code = matched ? matched.code : "+212";
  const localNum = cleaned.replace(/^0+/, "");
  return `${code} ${localNum}`;
}
