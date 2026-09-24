import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PaymentStatus, QuoteLineItem } from "@/lib/supabase/types";
import { applyDiscount, discountLabel, itemsSubtotal, type Discount } from "@/lib/discount";

export type OrderDocumentKind = "invoice" | "packing-slip";

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 64, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  metaBlock: { alignItems: "flex-end" },
  label: { fontSize: 8, color: "#777", textTransform: "uppercase", letterSpacing: 1 },
  value: { fontSize: 10, marginTop: 2 },
  section: { marginBottom: 20 },
  headRow: { flexDirection: "row", borderBottom: "1px solid #1a1a1a", paddingBottom: 6, marginTop: 8 },
  row: { flexDirection: "row", borderBottom: "1px solid #e5e5e5", paddingVertical: 8 },
  th: { fontSize: 8, color: "#777", textTransform: "uppercase", letterSpacing: 0.5 },
  colProduct: { flex: 3 },
  colSku: { flex: 1.5 },
  colQty: { flex: 0.6, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  colCheck: { flex: 0.6, textAlign: "right" },
  variantLabel: { fontSize: 8.5, color: "#666", marginTop: 1 },
  totalsBlock: { marginTop: 14, alignItems: "flex-end", gap: 3 },
  totalRow: { flexDirection: "row", gap: 16 },
  grandTotal: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  notesBody: { marginTop: 4, fontSize: 9.5, color: "#333", lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: "#999", textAlign: "center" },
});

function money(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(value);
}

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  deposit_paid: "Deposit paid",
  paid: "Paid in full",
  refunded: "Refunded",
};

/** Invoice (with prices and balance) or packing slip (items and quantities only) for an order. */
export function OrderPdfDocument({
  kind,
  orderNumber,
  createdAt,
  customerName,
  customerEmail,
  customerPhone,
  items,
  discount = null,
  notes,
  paymentStatus,
  amountPaid,
  fulfilmentDate,
}: {
  kind: OrderDocumentKind;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  items: QuoteLineItem[];
  discount?: Discount | null;
  notes: string | null;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  fulfilmentDate: string | null;
}) {
  const isInvoice = kind === "invoice";
  const applied = applyDiscount(itemsSubtotal(items), discount);
  const total = applied.total;
  const title = isInvoice ? "Invoice" : "Packing slip";
  const date = new Date(createdAt).toLocaleDateString("en-AU", { dateStyle: "long" });

  return (
    <Document title={`${title} ${orderNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Flow</Text>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>{title}</Text>
            <Text style={styles.value}>{orderNumber}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Order date</Text>
            <Text style={styles.value}>{date}</Text>
            {fulfilmentDate && (
              <>
                <Text style={[styles.label, { marginTop: 8 }]}>{isInvoice ? "Delivery" : "Dispatch"} date</Text>
                <Text style={styles.value}>{new Date(fulfilmentDate).toLocaleDateString("en-AU", { dateStyle: "long" })}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{isInvoice ? "Bill to" : "Deliver to"}</Text>
          <Text style={[styles.value, { fontSize: 12, fontFamily: "Helvetica-Bold" }]}>{customerName}</Text>
          <Text style={styles.value}>{customerEmail}</Text>
          {customerPhone && <Text style={styles.value}>{customerPhone}</Text>}
        </View>

        <View style={styles.headRow}>
          <Text style={[styles.th, styles.colProduct]}>Product</Text>
          <Text style={[styles.th, styles.colSku]}>SKU</Text>
          <Text style={[styles.th, styles.colQty]}>Qty</Text>
          {isInvoice ? (
            <>
              <Text style={[styles.th, styles.colPrice]}>Unit price</Text>
              <Text style={[styles.th, styles.colTotal]}>Total</Text>
            </>
          ) : (
            <Text style={[styles.th, styles.colCheck]}>Packed</Text>
          )}
        </View>
        {items.map((item, i) => (
          <View style={styles.row} key={i} wrap={false}>
            <View style={styles.colProduct}>
              <Text>{item.name}</Text>
              {item.variantLabel && <Text style={styles.variantLabel}>{item.variantLabel}</Text>}
              {item.seriesName && <Text style={styles.variantLabel}>{item.seriesName}</Text>}
            </View>
            <Text style={styles.colSku}>{item.sku ?? "—"}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            {isInvoice ? (
              <>
                <Text style={styles.colPrice}>{money(item.unitPrice)}</Text>
                <Text style={styles.colTotal}>{item.unitPrice != null ? money(item.unitPrice * item.quantity) : "—"}</Text>
              </>
            ) : (
              <Text style={styles.colCheck}>☐</Text>
            )}
          </View>
        ))}

        {isInvoice && (
          <View style={styles.totalsBlock}>
            {applied.amount > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text>Subtotal</Text>
                  <Text>{money(applied.subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text>{discountLabel(applied)}</Text>
                  <Text>-{money(applied.amount)}</Text>
                </View>
              </>
            )}
            <View style={styles.totalRow}>
              <Text>Total (AUD)</Text>
              <Text style={styles.grandTotal}>{money(total)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Paid</Text>
              <Text>{money(amountPaid)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Balance due</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{money(Math.max(0, total - amountPaid))}</Text>
            </View>
            <Text style={[styles.label, { marginTop: 6 }]}>{PAYMENT_LABEL[paymentStatus]}</Text>
          </View>
        )}

        {notes?.trim() && (
          <View style={{ marginTop: 26 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.notesBody}>{notes.trim()}</Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          {isInvoice ? "Prices are in AUD. Thank you for your order." : "Please check all items on delivery and report any damage within 48 hours."}
        </Text>
      </Page>
    </Document>
  );
}
