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

export function calculatePrice(qtyInGrams, countryName, isAr = true, ratesOverride = null) {
  const qty = Number(qtyInGrams) || 0;
  const info = getCountryInfo(countryName) || {
    currencyCode: "USD",
    currencyAr: "دولار أمريكي",
    currencyEn: "USD",
    symbol: "$",
  };

  const rates = ratesOverride || liveRatesCache;
  const rate = rates[info.currencyCode] !== undefined ? rates[info.currencyCode] : rates.USD || 0.1076;

  let unitPrice;
  if (info.currencyCode === "MAD") {
    unitPrice = BASE_PRICE_MAD;
  } else if (info.currencyCode === "KWD" || info.currencyCode === "BHD" || info.currencyCode === "OMR") {
    unitPrice = Number((BASE_PRICE_MAD * rate).toFixed(2));
  } else {
    unitPrice = Number((BASE_PRICE_MAD * rate).toFixed(1));
  }

  const total = Number((qty * unitPrice).toFixed(2));
  const currency = isAr ? info.currencyAr : info.currencyEn;

  return {
    qty,
    pricePerGram: unitPrice,
    total,
    currency,
    currencyCode: info.currencyCode,
    symbol: info.symbol,
    rate,
    formattedTotal: total.toLocaleString() + " " + currency,
    formattedUnit: unitPrice.toLocaleString() + " " + currency + (isAr ? " / غرام" : " / g"),
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
