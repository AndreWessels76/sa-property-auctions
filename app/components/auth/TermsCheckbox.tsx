import Link from "next/link";

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export default function TermsCheckbox({ checked, onChange }: Props) {
  return (
    <label className="flex gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
        required
      />
      <span>
        I accept the{" "}
        <Link href="/terms" className="font-medium text-navy-900 underline" target="_blank">
          Terms &amp; Conditions
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="font-medium text-navy-900 underline"
          target="_blank"
        >
          Privacy Policy
        </Link>
      </span>
    </label>
  );
}
