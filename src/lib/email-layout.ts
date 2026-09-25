import { escapeHtml } from "@/lib/email";
import {
  DEPARTMENTS,
  aboutHref,
  departmentCopy,
  departmentHref,
  projectsHref,
  seriesIndexHref,
  type Department,
} from "@/lib/department";
import { SITE_URL } from "@/lib/site";

/**
 * Branded HTML shell + building blocks for every email the app sends.
 *
 * Email clients are not browsers: layout is nested tables, every style is
 * inline (Gmail strips most <style>), and there's no SVG or web fonts — so
 * the wordmark is heavy system type, not the site's outlined logo.
 *
 * Convention: every helper takes HTML, not text. Anything a visitor or admin
 * typed must go through escapeHtml()/escapeHtmlMultiline() first, exactly as
 * before this layout existed.
 */

const INK = "#111111";
const TEXT = "#1a1a1a";
const MUTED = "#6b6b6b";
const FAINT = "#9a9a9a";
const RULE = "#e6e6e3";
const CANVAS = "#f3f3f1";
const PANEL = "#fafaf8";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const WORDMARK_FONT = "'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";

const TAGLINE = "Tapware, sanitaryware & door hardware, across six design series.";
const MANIFESTO = "A tap gets touched with wet hands, in bad light, for twenty years. We design for that morning, not the photograph.";

export const siteLink = (path = "") => `${SITE_URL}${path}`;

/**
 * Contact details for the footer. All optional and read per call, so a
 * deployment shows only what it has configured — nothing is invented.
 */
export function brandContact() {
  const env = process.env;
  const socials = (
    [
      ["Instagram", env.BRAND_INSTAGRAM_URL],
      ["LinkedIn", env.BRAND_LINKEDIN_URL],
      ["Facebook", env.BRAND_FACEBOOK_URL],
      ["Pinterest", env.BRAND_PINTEREST_URL],
    ] as const
  ).filter((entry): entry is [(typeof entry)[0], string] => Boolean(entry[1]?.startsWith("https://")));

  return {
    email: env.NEXT_PUBLIC_ENQUIRY_EMAIL || null,
    phone: env.BRAND_PHONE || null,
    address: env.BRAND_ADDRESS || null,
    socials,
  };
}

// ——— Building blocks ———————————————————————————————————————————————

export function emailParagraph(html: string) {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${TEXT};">${html}</p>`;
}

export function emailNote(html: string) {
  return `<p style="margin:0 0 12px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${html}</p>`;
}

export function emailHeading(html: string) {
  return `<h2 style="margin:32px 0 12px;font-family:${FONT};font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">${html}</h2>`;
}

/** A "bulletproof" button — a table cell carries the fill, so it survives clients that ignore padding on links. */
export function emailButton(href: string, label: string, variant: "primary" | "secondary" = "primary") {
  const primary = variant === "primary";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
      <tr>
        <td bgcolor="${primary ? INK : "#ffffff"}" style="border:1px solid ${INK};">
          <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:14px;font-weight:600;line-height:16px;letter-spacing:0.3px;color:${primary ? "#ffffff" : INK};text-decoration:none;">${label}&nbsp;&rarr;</a>
        </td>
      </tr>
    </table>`;
}

/** Label/value pairs — quote numbers, references, dates, contact details. */
export function emailDetails(rows: Array<[label: string, valueHtml: string]>) {
  const cells = rows
    .map(
      ([label, value], i) => `
      <tr>
        <td style="padding:12px 0;${i > 0 ? `border-top:1px solid ${RULE};` : ""}font-family:${FONT};font-size:12px;line-height:18px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};" valign="top">${label}</td>
        <td style="padding:12px 0 12px 16px;${i > 0 ? `border-top:1px solid ${RULE};` : ""}font-family:${FONT};font-size:14px;line-height:20px;font-weight:600;color:${TEXT};text-align:right;" valign="top">${value}</td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-top:2px solid ${INK};border-bottom:1px solid ${RULE};">${cells}</table>`;
}

/** Product lines with a quantity column. `nameHtml` and `metaHtml` must already be escaped. */
export function emailItems(items: Array<{ nameHtml: string; metaHtml?: string; quantity: number }>) {
  if (items.length === 0) return "";
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-top:1px solid ${RULE};font-family:${FONT};font-size:14px;line-height:20px;color:${TEXT};">
          ${item.nameHtml}
          ${item.metaHtml ? `<div style="font-size:12px;line-height:18px;color:${MUTED};">${item.metaHtml}</div>` : ""}
        </td>
        <td style="padding:12px 0 12px 16px;border-top:1px solid ${RULE};font-family:${FONT};font-size:14px;line-height:20px;font-weight:600;color:${TEXT};text-align:right;white-space:nowrap;" valign="top">&times;&nbsp;${item.quantity}</td>
      </tr>`
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-bottom:1px solid ${RULE};">
      <tr>
        <td style="padding:0 0 8px;font-family:${FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${INK};">Product</td>
        <td style="padding:0 0 8px 16px;font-family:${FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${INK};text-align:right;">Qty</td>
      </tr>
      ${rows}
    </table>`;
}

/** A quoted block — the customer's own message, or a note from the team. */
export function emailQuote(html: string, label?: string) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
      <tr>
        <td bgcolor="${PANEL}" style="padding:16px 20px;border-left:3px solid ${INK};font-family:${FONT};font-size:14px;line-height:22px;color:${TEXT};">
          ${label ? `<div style="margin-bottom:6px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">${label}</div>` : ""}
          ${html}
        </td>
      </tr>
    </table>`;
}

/** A one-time code, set large and spaced so it's easy to read and copy. */
export function emailCode(code: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
      <tr>
        <td bgcolor="${PANEL}" style="padding:18px 28px;border:1px solid ${RULE};font-family:'SFMono-Regular', Menlo, Consolas, monospace;font-size:32px;line-height:36px;font-weight:700;letter-spacing:10px;color:${INK};">${escapeHtml(code)}</td>
      </tr>
    </table>`;
}

/** Numbered steps in the site's "01 / 02 / 03" manifesto style. */
export function emailSteps(steps: Array<[title: string, bodyHtml: string]>) {
  const rows = steps
    .map(
      ([title, body], i) => `
      <tr>
        <td width="40" valign="top" style="padding:14px 0;border-top:1px solid ${RULE};font-family:${FONT};font-size:12px;line-height:20px;font-weight:700;color:${FAINT};">${String(i + 1).padStart(2, "0")}</td>
        <td valign="top" style="padding:14px 0;border-top:1px solid ${RULE};font-family:${FONT};">
          <div style="font-size:14px;line-height:20px;font-weight:700;color:${TEXT};">${title}</div>
          <div style="font-size:13px;line-height:20px;color:${MUTED};">${body}</div>
        </td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-bottom:1px solid ${RULE};">${rows}</table>`;
}

/** A bulleted list; each entry must already be HTML-safe. */
export function emailList(itemsHtml: string[]) {
  const rows = itemsHtml
    .map(
      (html) => `
      <tr>
        <td width="18" valign="top" style="padding:6px 0;font-family:${FONT};font-size:14px;line-height:20px;color:${FAINT};">&bull;</td>
        <td valign="top" style="padding:6px 0;font-family:${FONT};font-size:14px;line-height:20px;color:${TEXT};">${html}</td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">${rows}</table>`;
}

// ——— Shell ———————————————————————————————————————————————————————

const link = (href: string, label: string, color = INK) =>
  `<a href="${escapeHtml(href)}" target="_blank" style="color:${color};text-decoration:underline;">${label}</a>`;

function rangeBand(department: Department | undefined) {
  // The customer's own department first — it's what they came for.
  const ordered = department ? [department, ...DEPARTMENTS.filter((d) => d !== department)] : [...DEPARTMENTS];
  // Cards are sibling cells of one row (with a spacer cell between) so they
  // always share a height, whichever tagline wraps further.
  const cards = ordered
    .map((d) => {
      const copy = departmentCopy(d);
      return `
        <td class="stack card" width="48%" valign="top" bgcolor="#ffffff" style="padding:20px;border:1px solid ${RULE};font-family:${FONT};">
          <div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">Flow ${escapeHtml(copy.shortLabel)}</div>
          <div style="margin-top:6px;font-size:16px;line-height:22px;font-weight:800;color:${INK};">${escapeHtml(copy.label)}</div>
          <div style="margin-top:6px;font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(copy.tagline)}.</div>
          <div style="margin-top:14px;font-size:13px;line-height:20px;font-weight:600;">
            ${link(siteLink(seriesIndexHref(d)), `Browse ${copy.seriesLabel.toLowerCase()}`)}
            <span style="color:${FAINT};">&nbsp;&middot;&nbsp;</span>
            ${link(siteLink(projectsHref(d)), "Projects")}
          </div>
        </td>`;
    })
    .join(`<td class="stack gap" width="16" style="font-size:0;line-height:0;">&nbsp;</td>`);

  return `
    <tr>
      <td class="px" bgcolor="${PANEL}" style="padding:36px 40px 20px;border-top:1px solid ${RULE};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:0 0 20px;font-family:${FONT};">
              <div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">The Flow range</div>
              <div style="margin-top:8px;font-size:20px;line-height:26px;font-weight:800;letter-spacing:-0.3px;color:${INK};">One design language, two departments.</div>
              <div style="margin-top:8px;font-size:14px;line-height:22px;color:${MUTED};">Every series shares the same radii and the same weight in the hand — so pieces from different collections still look like they were drawn by the same person.</div>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;"><tr>${cards}</tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:4px 0 16px;font-family:Georgia, 'Times New Roman', serif;font-size:15px;line-height:24px;font-style:italic;color:${MUTED};">
              &ldquo;${MANIFESTO}&rdquo;
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function footer(audience: "customer" | "staff", department: Department | undefined, reason: string) {
  const contact = brandContact();
  const muted = (html: string) =>
    `<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">${html}</p>`;
  const sep = `<span style="color:${FAINT};">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>`;

  const nav =
    audience === "staff"
      ? [
          link(siteLink("/admin"), "Dashboard", MUTED),
          link(siteLink("/admin/inquiries"), "Inquiries", MUTED),
          link(siteLink("/admin/quotes"), "Quotes", MUTED),
          link(siteLink("/admin/orders"), "Orders", MUTED),
        ]
      : [
          ...DEPARTMENTS.map((d) => link(siteLink(departmentHref(d)), escapeHtml(departmentCopy(d).label), MUTED)),
          link(siteLink(aboutHref(department ?? DEPARTMENTS[0])), "About Flow", MUTED),
        ];

  const contactLines = [
    contact.email ? link(`mailto:${contact.email}`, escapeHtml(contact.email), MUTED) : null,
    contact.phone ? link(`tel:${contact.phone.replace(/[^\d+]/g, "")}`, escapeHtml(contact.phone), MUTED) : null,
  ].filter(Boolean);

  return `
    <tr>
      <td class="px" style="padding:32px 40px 8px;" align="center">
        <div style="font-family:${WORDMARK_FONT};font-size:18px;line-height:22px;font-weight:900;letter-spacing:4px;color:${INK};">FLOW</div>
        <p style="margin:8px 0 20px;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">${escapeHtml(TAGLINE)}</p>
        <p style="margin:0 0 16px;font-family:${FONT};font-size:12px;line-height:22px;font-weight:600;">${nav.join(sep)}</p>
        ${audience === "customer" && contactLines.length > 0 ? muted(contactLines.join(sep)) : ""}
        ${audience === "customer" && contact.address ? muted(escapeHtml(contact.address)) : ""}
        ${
          audience === "customer" && contact.socials.length > 0
            ? `<p style="margin:12px 0 8px;font-family:${FONT};font-size:12px;line-height:18px;font-weight:600;">${contact.socials
                .map(([name, url]) => link(url, name, INK))
                .join(sep)}</p>`
            : ""
        }
        <div style="margin:20px auto 0;width:48px;border-top:1px solid ${RULE};font-size:0;line-height:0;">&nbsp;</div>
        <p style="margin:16px 0 6px;font-family:${FONT};font-size:11px;line-height:17px;color:${FAINT};">${reason}</p>
        <p style="margin:0 0 24px;font-family:${FONT};font-size:11px;line-height:17px;color:${FAINT};">&copy; ${new Date().getFullYear()} Flow. All rights reserved. ${link(SITE_URL, SITE_URL.replace(/^https?:\/\//, ""), FAINT)}</p>
      </td>
    </tr>`;
}

export type EmailLayoutOptions = {
  /** The <title>, shown by some clients. Usually the subject line. */
  title: string;
  /** Inbox preview text — the line shown after the subject. Plain text. */
  preheader: string;
  /** Small uppercase label above the heading, e.g. "Quote Q-20260925-AB12C". Plain text. */
  eyebrow?: string;
  /** The big heading. Plain text. */
  heading: string;
  /** The body, built from the helpers above. Must already be HTML-safe. */
  body: string;
  /** Customers get the brand band and contact details; staff get admin shortcuts. */
  audience: "customer" | "staff";
  department?: Department;
  /** Why they're getting this — shown small in the footer. Must already be HTML-safe. */
  reason?: string;
};

export function emailLayout(opts: EmailLayoutOptions) {
  const headerLabel =
    opts.audience === "staff"
      ? "Admin"
      : opts.department
        ? departmentCopy(opts.department).label
        : "Tapware &middot; Sanitaryware &middot; Hardware";
  const reason =
    opts.reason ??
    (opts.audience === "staff"
      ? "Sent to the Flow team by the website."
      : "You're receiving this because you contacted Flow or requested a quote.");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(opts.title)}</title>
<style>
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
  a { color: ${INK}; }
  @media (max-width: 620px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .stack { display: block !important; width: 100% !important; box-sizing: border-box; }
    .gap { height: 12px !important; }
    .h1 { font-size: 24px !important; line-height: 30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${CANVAS};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(opts.preheader)}${"&zwnj;&nbsp;".repeat(60)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CANVAS}" style="background-color:${CANVAS};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
        <tr>
          <td class="px" bgcolor="${INK}" style="padding:26px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle">
                  <a href="${escapeHtml(SITE_URL)}" target="_blank" style="font-family:${WORDMARK_FONT};font-size:26px;line-height:28px;font-weight:900;letter-spacing:5px;color:#ffffff;text-decoration:none;">FLOW</a>
                </td>
                <td valign="middle" align="right" style="font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#a3a3a3;">${headerLabel}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="px" bgcolor="#ffffff" style="padding:40px 40px 24px;">
            ${opts.eyebrow ? `<div style="margin:0 0 10px;font-family:${FONT};font-size:11px;line-height:16px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">${escapeHtml(opts.eyebrow)}</div>` : ""}
            <h1 class="h1" style="margin:0 0 24px;font-family:${FONT};font-size:28px;line-height:34px;font-weight:800;letter-spacing:-0.5px;color:${INK};">${escapeHtml(opts.heading)}</h1>
            ${opts.body}
          </td>
        </tr>
        ${opts.audience === "customer" ? rangeBand(opts.department) : ""}
        ${footer(opts.audience, opts.department, reason)}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** The sign-off every customer email ends with, pointing replies at a real person. */
export function customerSignOff() {
  const contact = brandContact();
  return (
    emailParagraph(
      `Questions? Just reply to this email${contact.phone ? ` or call us on ${link(`tel:${contact.phone.replace(/[^\d+]/g, "")}`, escapeHtml(contact.phone))}` : ""} — it goes straight to our team.`
    ) + emailParagraph(`Warm regards,<br/><strong>The Flow team</strong>`)
  );
}
