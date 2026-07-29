"use client";

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

export default function Switch({
  checked,
  onChange,
}: Props) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`
        relative
        h-7
        w-12
        rounded-full
        transition
        ${
          checked
            ? "bg-green-600"
            : "bg-slate-300"
        }
      `}
    >
      <span
        className={`
          absolute
          top-1
          h-5
          w-5
          rounded-full
          bg-white
          transition
          ${
            checked
              ? "left-6"
              : "left-1"
          }
        `}
      />
    </button>
  );
}
