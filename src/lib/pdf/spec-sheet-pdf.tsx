import { Document, Image, Link, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 72, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "1px solid #1a1a1a",
    paddingBottom: 10,
    marginBottom: 24,
  },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  label: { fontSize: 8, color: "#777", textTransform: "uppercase", letterSpacing: 1 },
  eyebrow: { fontSize: 8, color: "#777", textTransform: "uppercase", letterSpacing: 1.5 },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", marginTop: 6 },
  colour: { fontSize: 13, color: "#555", marginTop: 4 },
  top: { flexDirection: "row", gap: 24, marginTop: 20 },
  imageBox: {
    width: 240,
    height: 240,
    border: "1px solid #e5e5e5",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  image: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  noImage: { fontSize: 9, color: "#999" },
  facts: { flex: 1 },
  fact: { borderBottom: "1px solid #e5e5e5", paddingVertical: 7 },
  factValue: { fontSize: 11, marginTop: 2 },
  priceValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  section: { marginTop: 26 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  specRow: { flexDirection: "row", borderBottom: "1px solid #e5e5e5", paddingVertical: 6 },
  specKey: { width: "38%", color: "#666" },
  specValue: { flex: 1 },
  finishes: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  finish: { flexDirection: "row", alignItems: "center", gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 5, border: "0.5px solid #bbb" },
  resource: { color: "#1a1a1a", textDecoration: "underline", marginBottom: 4 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1px solid #e5e5e5",
    paddingTop: 8,
  },
});

export type SpecSheetData = {
  name: string;
  seriesName: string | null;
  categoryName: string;
  colourName: string | null;
  sku: string | null;
  priceLabel: string;
  availability: string;
  specs: [string, string][];
  finishes: { name: string; hex: string | null }[];
  resources: { name: string; url: string }[];
  /** JPEG bytes of the main photo, or null to leave a placeholder. */
  image: Buffer | null;
  productUrl: string;
  generatedOn: string;
};

function SpecSheetDocument({ data }: { data: SpecSheetData }) {
  const title = data.colourName ? `${data.name} — ${data.colourName}` : data.name;
  const facts: [string, string][] = [
    ["SKU", data.sku ?? "—"],
    ...(data.colourName ? ([["Colour", data.colourName]] as [string, string][]) : []),
    ["Availability", data.availability],
    ...(data.seriesName ? ([["Series", data.seriesName]] as [string, string][]) : []),
    ["Category", data.categoryName],
  ];

  return (
    <Document title={`${title} — specification`} author="Flow" subject="Product specification">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>FLOW</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.label}>Product specification</Text>
            <Text style={{ fontSize: 9, marginTop: 2, color: "#555" }}>{data.generatedOn}</Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>
          {[data.seriesName, data.categoryName].filter(Boolean).join("  ·  ")}
        </Text>
        <Text style={styles.title}>{data.name}</Text>
        {data.colourName && <Text style={styles.colour}>{data.colourName}</Text>}

        <View style={styles.top}>
          <View style={styles.imageBox}>
            {data.image ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt; the title carries the name.
              <Image src={{ data: data.image, format: "jpg" }} style={styles.image} />
            ) : (
              <Text style={styles.noImage}>No image</Text>
            )}
          </View>
          <View style={styles.facts}>
            <View style={styles.fact}>
              <Text style={styles.label}>Price</Text>
              <Text style={styles.priceValue}>{data.priceLabel}</Text>
            </View>
            {facts.map(([label, value]) => (
              <View key={label} style={styles.fact}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.factValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {data.specs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            {data.specs.map(([key, value]) => (
              <View key={key} style={styles.specRow} wrap={false}>
                <Text style={styles.specKey}>{key}</Text>
                <Text style={styles.specValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {data.finishes.length > 1 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Available finishes</Text>
            <View style={styles.finishes}>
              {data.finishes.map((finish) => (
                <View key={finish.name} style={styles.finish}>
                  <View style={[styles.swatch, { backgroundColor: finish.hex ?? "#ffffff" }]} />
                  <Text>{finish.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {data.resources.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Downloads</Text>
            {data.resources.map((resource) => (
              <Link key={resource.url} src={resource.url} style={styles.resource}>
                {resource.name}
              </Link>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Link src={data.productUrl} style={{ color: "#999", textDecoration: "none" }}>
            {data.productUrl}
          </Link>
          <Text>Prices in AUD and subject to change.</Text>
        </View>
      </Page>
    </Document>
  );
}

export function renderSpecSheetPdf(data: SpecSheetData) {
  return renderToBuffer(<SpecSheetDocument data={data} />);
}
