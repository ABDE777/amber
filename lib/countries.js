export const COUNTRIES = [
  { nameAr: "المغرب", nameEn: "Morocco", code: "+212" },
  { nameAr: "السعودية", nameEn: "Saudi Arabia", code: "+966" },
  { nameAr: "الإمارات", nameEn: "United Arab Emirates", code: "+971" },
  { nameAr: "قطر", nameEn: "Qatar", code: "+974" },
  { nameAr: "الكويت", nameEn: "Kuwait", code: "+965" },
  { nameAr: "عُمان", nameEn: "Oman", code: "+968" },
  { nameAr: "البحرين", nameEn: "Bahrain", code: "+973" },
  { nameAr: "الأردن", nameEn: "Jordan", code: "+962" },
  { nameAr: "لبنان", nameEn: "Lebanon", code: "+961" },
  { nameAr: "العراق", nameEn: "Iraq", code: "+964" },
  { nameAr: "اليمن", nameEn: "Yemen", code: "+967" },
  { nameAr: "فلسطين", nameEn: "Palestine", code: "+970" },
  { nameAr: "سوريا", nameEn: "Syria", code: "+963" },
];

export function formatPhoneWithCountry(phone, countryName) {
  let cleaned = String(phone || "").trim();
  if (!cleaned) return cleaned;
  if (cleaned.startsWith("+") || cleaned.startsWith("00")) {
    if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
    return cleaned;
  }
  const matched = COUNTRIES.find(
    (c) =>
      c.nameAr.toLowerCase() === String(countryName).toLowerCase() ||
      c.nameEn.toLowerCase() === String(countryName).toLowerCase()
  );
  const code = matched ? matched.code : "+212";
  const localNum = cleaned.replace(/^0+/, "");
  return `${code} ${localNum}`;
}
