type PremiumBadgeProps = {
  className?: string;
};

export default function PremiumBadge({ className = "" }: PremiumBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800 ${className}`}
    >
      Premium
    </span>
  );
}
