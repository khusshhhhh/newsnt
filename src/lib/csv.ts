export type CsvRow = Record<string, string>;

/** Minimal RFC4180 CSV parser: quoted fields, doubled-quote escaping, CRLF/LF line endings. First row is the header. */
export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => r.length > 1 || r[0] !== "");
  const [header, ...body] = nonEmptyRows;
  if (!header) return [];
  return body.map((cells) => {
    const record: CsvRow = {};
    header.forEach((key, idx) => {
      record[key.trim()] = (cells[idx] ?? "").trim();
    });
    return record;
  });
}

function escapeCsvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(
  rows: Record<string, string | number | boolean | null>[],
  headers: string[]
): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(String(row[h] ?? ""))).join(","));
  }
  return lines.join("\r\n");
}
