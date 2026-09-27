// lib/pricing.js — server-only.
// countries.js's calculatePrice() defaults to the hardcoded BASE_PRICE_MAD
// (400 MAD/g) and zero fees unless told otherwise. Every server-side call
// site that computed a price for storage or an invoice was calling it with
// no overrides at all, so as soon as the admin changed the live price/fees
// in Settings, every stored/emailed price silently reverted to the
// original defaults — e.g. a customer charged 507 MAD (33g at the
// admin's configured 10 MAD/g + fees) got an invoice claiming 13,737 MAD
// (33g at the default 400 MAD/g). api/payment/create.js's actual charge
// amount was correct because lib/payment.js already fetched live settings
// itself; this gives every other call site that same live data.
//
// Kept separate from countries.js (which is also imported by React
// components) because getSettings() touches fs/GitHub and must never end
// up in the client bundle.

import { calculatePrice } from "./countries.js";
import { getSettings } from "./settings_storage.js";

export async function computeOrderPrice(qty, countryName, isAr = true) {
  const settings = await getSettings();
  const basePriceMad = Number(settings?.base_price_mad) > 0 ? Number(settings.base_price_mad) : null;
  const feesOverride = {
    taxMad: settings?.tax_mad,
    shippingMad: settings?.shipping_mad,
    packagingMad: settings?.packaging_mad,
    passGatewayFee: settings?.pass_gateway_fee,
  };
  return calculatePrice(qty, countryName, isAr, null, basePriceMad, feesOverride);
}
