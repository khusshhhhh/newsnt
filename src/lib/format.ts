export function formatPrice(price: number | null, currency: string) {
  if (price == null) return "Price on enquiry";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString("en-IN")}`;
  }
}
