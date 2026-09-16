/** Currency is locked to AUD everywhere (see products_currency_aud_check). */
export function formatPrice(price: number | null) {
  if (price == null) return "Price on enquiry";
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `A$${price.toLocaleString("en-AU")}`;
  }
}
