export const COUNTRIES = [
  { nameAr: "المغرب", nameEn: "Morocco", code: "+212", currencyAr: "درهم مغربي", currencyEn: "MAD", symbol: "MAD", pricePerGram: 400 },
  { nameAr: "السعودية", nameEn: "Saudi Arabia", code: "+966", currencyAr: "ريال سعودي", currencyEn: "SAR", symbol: "SAR", pricePerGram: 150 },
  { nameAr: "الإمارات", nameEn: "United Arab Emirates", code: "+971", currencyAr: "درهم إماراتي", currencyEn: "AED", symbol: "AED", pricePerGram: 150 },
  { nameAr: "قطر", nameEn: "Qatar", code: "+974", currencyAr: "ريال قطري", currencyEn: "QAR", symbol: "QAR", pricePerGram: 150 },
  { nameAr: "الكويت", nameEn: "Kuwait", code: "+965", currencyAr: "دينار كويتي", currencyEn: "KWD", symbol: "KWD", pricePerGram: 12.5 },
  { nameAr: "عُمان", nameEn: "Oman", code: "+968", currencyAr: "ريال عماني", currencyEn: "OMR", symbol: "OMR", pricePerGram: 15.5 },
  { nameAr: "البحرين", nameEn: "Bahrain", code: "+973", currencyAr: "دينار بحريني", currencyEn: "BHD", symbol: "BHD", pricePerGram: 15 },
  { nameAr: "الأردن", nameEn: "Jordan", code: "+962", currencyAr: "دينار أردني", currencyEn: "JOD", symbol: "JOD", pricePerGram: 28.5 },
  { nameAr: "لبنان", nameEn: "Lebanon", code: "+961", currencyAr: "دولار أمريكي", currencyEn: "USD", symbol: "$", pricePerGram: 40 },
  { nameAr: "العراق", nameEn: "Iraq", code: "+964", currencyAr: "دولار أمريكي", currencyEn: "USD", symbol: "$", pricePerGram: 40 },
  { nameAr: "اليمن", nameEn: "Yemen", code: "+967", currencyAr: "دولار أمريكي", currencyEn: "USD", symbol: "$", pricePerGram: 40 },
  { nameAr: "فلسطين", nameEn: "Palestine", code: "+970", currencyAr: "دولار أمريكي", currencyEn: "USD", symbol: "$", pricePerGram: 40 },
  { nameAr: "سوريا", nameEn: "Syria", code: "+963", currencyAr: "دولار أمريكي", currencyEn: "USD", symbol: "$", pricePerGram: 40 },
];

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
      currencyAr: "دولار أمريكي",
      currencyEn: "USD",
      symbol: "$",
      pricePerGram: 40,
    }
  );
}

export function calculatePrice(qtyInGrams, countryName, isAr = true) {
  const qty = Number(qtyInGrams) || 0;
  const info = getCountryInfo(countryName) || {
    currencyAr: "دولار أمريكي",
    currencyEn: "USD",
    symbol: "$",
    pricePerGram: 40,
  };
  const total = qty * info.pricePerGram;
  const currency = isAr ? info.currencyAr : info.currencyEn;
  return {
    qty,
    pricePerGram: info.pricePerGram,
    total,
    currency,
    symbol: info.symbol,
    formattedTotal: total.toLocaleString() + " " + currency,
    formattedUnit: info.pricePerGram + " " + currency + (isAr ? " / غرام" : " / g"),
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
