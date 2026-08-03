import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

type Props = {
  property: PropertyDTO;
};

export default function PropertyBreadcrumbs({ property }: Props) {
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Auctions", href: "/auctions" },
  ];

  if (property.province) {
    crumbs.push({
      label: property.province,
      href: `/auctions?province=${encodeURIComponent(property.province)}`,
    });
  }

  if (property.town) {
    crumbs.push({
      label: property.town,
      href: `/auctions?town=${encodeURIComponent(property.town)}`,
    });
  }

  crumbs.push({
    label: property.title?.trim() || "Property",
    href: `/properties/${property.id}`,
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.href}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              ) : null}
              {isLast ? (
                <span className="font-medium text-navy-900" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="transition hover:text-navy-900"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
