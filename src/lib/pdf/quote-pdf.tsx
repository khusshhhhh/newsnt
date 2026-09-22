import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 64, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  metaBlock: { alignItems: "flex-end" },
  label: { fontSize: 8, color: "#777", textTransform: "uppercase", letterSpacing: 1 },
  value: { fontSize: 10, marginTop: 2 },
  section: { marginBottom: 20 },
  table: { marginTop: 8 },
  headRow: {
    flexDirection: "row",
    borderBottom: "1px solid #1a1a1a",
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e5e5",
    paddingVertical: 8,
  },
  th: { fontSize: 8, color: "#777", textTransform: "uppercase", letterSpacing: 0.5 },
  colProduct: { flex: 3 },
  colSeries: { flex: 1.5 },
  colSku: { flex: 1.5 },
  colQty: { flex: 0.6, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  variantLabel: { fontSize: 8.5, color: "#666", marginTop: 1 },
  totalsBlock: { marginTop: 14, alignItems: "flex-end" },
  totalLine: { fontSize: 11 },
  grandTotal: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 4 },
  unpricedNote: { fontSize: 8, color: "#999", marginTop: 4 },
  notesBlock: { marginTop: 26 },
  notesBody: { marginTop: 4, fontSize: 9.5, color: "#333", lineHeight: 1.5 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
});

function formatMoney(value: number | null) {
  if (value == null) return "On enquiry";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export type QuotePdfLineItem = {
  name: string;
  variantLabel: string | null;
  sku: string | null;
  seriesName: string | null;
  quantity: number;
  unitPrice: number | null;
};

export function QuotePdfDocument({
  quoteNumber,
  customerName,
  customerEmail,
  customerPhone,
  items,
  notes,
}: {
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  items: QuotePdfLineItem[];
  notes: string;
}) {
  const total = items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);
  const hasUnpriced = items.some((item) => item.unitPrice == null);
  const today = new Date().toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document title={`Quote ${quoteNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Flow</Text>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Quote</Text>
            <Text style={styles.value}>{quoteNumber}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Date</Text>
            <Text style={styles.value}>{today}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Prepared for</Text>
          <Text style={[styles.value, { fontSize: 12, fontFamily: "Helvetica-Bold" }]}>
            {customerName}
          </Text>
          <Text style={styles.value}>{customerEmail}</Text>
          {customerPhone && <Text style={styles.value}>{customerPhone}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.headRow}>
            <Text style={[styles.th, styles.colProduct]}>Product</Text>
            <Text style={[styles.th, styles.colSeries]}>Series</Text>
            <Text style={[styles.th, styles.colSku]}>SKU</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Unit price</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View style={styles.row} key={i} wrap={false}>
              <View style={styles.colProduct}>
                <Text>{item.name}</Text>
                {item.variantLabel && <Text style={styles.variantLabel}>{item.variantLabel}</Text>}
              </View>
              <Text style={styles.colSeries}>{item.seriesName ?? "—"}</Text>
              <Text style={styles.colSku}>{item.sku ?? "—"}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatMoney(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>
                {item.unitPrice != null ? formatMoney(item.unitPrice * item.quantity) : "—"}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <Text style={styles.totalLine}>Total (AUD)</Text>
          <Text style={styles.grandTotal}>{formatMoney(total)}</Text>
          {hasUnpriced && (
            <Text style={styles.unpricedNote}>
              Items priced on enquiry are excluded from the total above.
            </Text>
          )}
        </View>

        {notes.trim() && (
          <View style={styles.notesBlock}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.notesBody}>{notes.trim()}</Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          This quotation is valid for 30 days from the date above. Prices are in AUD and exclude
          delivery unless stated.
        </Text>
      </Page>
    </Document>
  );
}
