import {
  hasFormattedDescription,
  parseDescriptionBlocks,
} from "@/lib/property/descriptionFormat";

type Props = {
  description: string | null | undefined;
};

export default function PropertyDescriptionSection({ description }: Props) {
  const blocks = parseDescriptionBlocks(description);
  const hasContent = hasFormattedDescription(description);

  return (
    <section
      aria-labelledby="property-description-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="property-description-heading"
        className="text-xl font-bold text-navy-900"
      >
        Property description
      </h2>

      {!hasContent ? (
        <p className="mt-4 leading-relaxed text-slate-600">
          A detailed narrative description has not been provided for this
          listing yet. Review the auction brochure, agency pack, and source
          listing before making any investment decision.
        </p>
      ) : (
        <div className="prose prose-slate mt-4 max-w-none">
          {blocks.map((block, index) => {
            if (block.type === "heading") {
              const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
              return (
                <Tag
                  key={`heading-${index}`}
                  className="mt-6 font-bold text-navy-900 first:mt-0"
                >
                  {block.text}
                </Tag>
              );
            }
            if (block.type === "list") {
              return (
                <ul
                  key={`list-${index}`}
                  className="my-4 list-disc space-y-2 pl-5 text-slate-700"
                >
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p
                key={`paragraph-${index}`}
                className="my-4 leading-relaxed text-slate-700"
              >
                {block.text}
              </p>
            );
          })}
        </div>
      )}
    </section>
  );
}
