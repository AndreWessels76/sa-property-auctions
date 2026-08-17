const links = [
  { href: "/admin/aci", label: "Command" },
  { href: "/admin/aci/workspace", label: "Workspace" },
  { href: "/admin/aci/discover", label: "Discover" },
  { href: "/admin/aci/compare", label: "Compare" },
  { href: "/admin/aci/market", label: "Market" },
  { href: "/admin/aci/opportunities", label: "Opportunities" },
  { href: "/admin/aci/watchlist", label: "Watchlist" },
];

export default function AciNav({ current }: { current: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="ACI Command Centre">
      {links.map((link) => {
        const active =
          current === link.href ||
          (link.href !== "/admin/aci" && current.startsWith(`${link.href}/`));
        return (
          <a
            key={link.href}
            href={link.href}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            {link.label}
          </a>
        );
      })}
      <a
        href="/admin/operations"
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
      >
        Operations
      </a>
    </nav>
  );
}
