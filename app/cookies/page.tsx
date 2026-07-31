import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How SA Property Auctions uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      subtitle="This policy explains cookies and similar technologies on our site."
    >
      <section>
        <h2>1. What are cookies?</h2>
        <p>
          Cookies are small text files stored on your device. We also use
          similar technologies such as local storage for preferences (for
          example favourites on your device).
        </p>
      </section>

      <section>
        <h2>2. How we use them</h2>
        <ul>
          <li>
            <strong>Essential:</strong> authentication sessions, security, load
            balancing, and core site functionality.
          </li>
          <li>
            <strong>Preferences:</strong> remembering UI choices where
            applicable.
          </li>
          <li>
            <strong>Analytics (optional):</strong> if enabled in future (e.g.
            Google Analytics or privacy-friendly analytics), to understand
            aggregate usage. See{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Managing cookies</h2>
        <p>
          You can control cookies through your browser settings. Blocking
          essential cookies may prevent login or other features from working.
          Clearing site data will remove local favourites stored on your device.
        </p>
      </section>

      <section>
        <h2>4. Third parties</h2>
        <p>
          Payment flows may set cookies from Stripe. Hosting and CDN providers
          may set technical cookies required to deliver the site securely.
        </p>
      </section>

      <section>
        <h2>5. Contact</h2>
        <p>
          Questions:{" "}
          <a href="mailto:privacy@sapropertyauctions.co.za">
            privacy@sapropertyauctions.co.za
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
