import { afterEach, describe, expect, it, vi } from "vitest";
import { emailButton, emailDetails, emailLayout, brandContact } from "@/lib/email-layout";

const base = { title: "Subject", preheader: "Preview", heading: "Hello", body: "<p>Body</p>" };

describe("email layout", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("escapes the plain-text slots but leaves the body HTML alone", () => {
    const html = emailLayout({ ...base, heading: "<b>Kim & co</b>", preheader: '"hi"', audience: "staff" });
    expect(html).toContain("&lt;b&gt;Kim &amp; co&lt;/b&gt;");
    expect(html).toContain("&quot;hi&quot;");
    expect(html).toContain("<p>Body</p>");
  });

  it("shows the range and department links to customers only", () => {
    const customer = emailLayout({ ...base, audience: "customer", department: "door-hardware" });
    const staff = emailLayout({ ...base, audience: "staff" });
    expect(customer).toContain("The Flow range");
    expect(customer).toContain("/door-hardware/series");
    expect(customer).toContain("/sanitary-tapware/series");
    expect(staff).not.toContain("The Flow range");
    expect(staff).toContain("/admin/inquiries");
  });

  it("only renders contact details that are configured, and only https social links", () => {
    vi.stubEnv("BRAND_PHONE", "+61 3 9000 0000");
    vi.stubEnv("BRAND_INSTAGRAM_URL", "https://instagram.com/flow");
    vi.stubEnv("BRAND_LINKEDIN_URL", "javascript:alert(1)");
    vi.stubEnv("BRAND_ADDRESS", "");
    const contact = brandContact();
    expect(contact.phone).toBe("+61 3 9000 0000");
    expect(contact.address).toBeNull();
    expect(contact.socials).toEqual([["Instagram", "https://instagram.com/flow"]]);

    const html = emailLayout({ ...base, audience: "customer" });
    expect(html).toContain('href="tel:+61390000000"');
    expect(html).not.toContain("javascript:");
  });

  it("escapes hrefs in buttons and keeps detail values as given", () => {
    expect(emailButton('https://x.test/?a=1&b="2"', "Go")).toContain('href="https://x.test/?a=1&amp;b=&quot;2&quot;"');
    expect(emailDetails([["Quote", "<strong>Q-1</strong>"]])).toContain("<strong>Q-1</strong>");
  });
});
