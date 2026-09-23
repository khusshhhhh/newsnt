import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Flow",
  url: SITE_URL,
  logo: `${SITE_URL}/icon`,
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={organizationJsonLd} />
      {children}
    </div>
  );
}
