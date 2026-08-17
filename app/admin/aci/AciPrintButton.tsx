"use client";

export default function AciPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border px-3 py-1 print:hidden"
    >
      Print / export
    </button>
  );
}
