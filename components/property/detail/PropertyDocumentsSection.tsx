import { FileText } from "lucide-react";
import { buildDocumentLinks } from "@/lib/property/detailExperience";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

type Props = {
  property: PropertyDTO;
};

export default function PropertyDocumentsSection({ property }: Props) {
  const documents = buildDocumentLinks(property);

  return (
    <section
      aria-labelledby="property-documents-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="property-documents-heading"
        className="text-xl font-bold text-navy-900"
      >
        Auction documents
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Official brochures, conditions of sale, and registration materials.
      </p>

      {documents.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
          No downloadable auction documents have been linked yet. Request the
          brochure, conditions of sale, and municipal documents directly from
          the auction agency.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-gold-300 hover:bg-gold-50"
              >
                <FileText className="h-5 w-5 shrink-0 text-gold-600" aria-hidden />
                <span className="font-semibold text-navy-900">{doc.label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
