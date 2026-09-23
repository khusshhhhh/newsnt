import { describe, expect, it } from "vitest";
import { escapeHtml, escapeHtmlMultiline } from "@/lib/email";

describe("email escaping", () => {
  it("neutralizes HTML a visitor types into a form", () => {
    expect(escapeHtml('<a href="https://evil.test">Click</a> & \'x\'')).toBe(
      "&lt;a href=&quot;https://evil.test&quot;&gt;Click&lt;/a&gt; &amp; &#39;x&#39;"
    );
  });

  it("treats null/undefined as empty", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("keeps line breaks after escaping", () => {
    expect(escapeHtmlMultiline("a<b>\r\nc")).toBe("a&lt;b&gt;<br/>c");
  });
});
