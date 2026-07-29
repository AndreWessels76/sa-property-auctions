import { Gavel, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  Platform: [
    { label: "Browse Auctions", href: "#featured" },
    { label: "Sheriff Sales", href: "#" },
    { label: "Bank Repossessions", href: "#" },
    { label: "Public Auctions", href: "#" },
  ],
  Resources: [
    { label: "How It Works", href: "#" },
    { label: "Auction Guide", href: "#" },
    { label: "Legal Information", href: "#" },
    { label: "FAQ", href: "#" },
  ],
  Company: [
    { label: "About Us", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800">
                <Gavel className="h-5 w-5 text-gold-400" strokeWidth={2.25} />
              </div>
              <div className="leading-tight">
                <span className="block text-sm font-bold text-white">
                  SA Property Auctions
                </span>
                <span className="block text-xs text-gold-400">
                  South Africa&apos;s auction intelligence platform
                </span>
              </div>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Discover sheriff, bank and public property auctions across all
              nine provinces. Set alerts and never miss an opportunity.
            </p>
            <div className="mt-6 space-y-2.5 text-sm">
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-gold-400" />
                info@sapropertyauctions.co.za
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-gold-400" />
                0800 000 000
              </p>
              <p className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-gold-400" />
                Johannesburg, South Africa
              </p>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                {title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-gold-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-navy-800 pt-8 sm:flex-row">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} SA Property Auctions. All rights
            reserved.
          </p>
          <p className="text-xs text-slate-600">
            POPIA compliant &middot; Trusted by property investors nationwide
          </p>
        </div>
      </div>
    </footer>
  );
}
