"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchInput({
  value,
  onChange,
  placeholder,
}: Props) {
  return (
    <input
      className="
      w-full
      rounded-xl
      border
      px-4
      py-3
      outline-none
      focus:ring-2
      focus:ring-blue-500
      "
      value={value}
      placeholder={placeholder}
      onChange={(e) =>
        onChange(e.target.value)
      }
    />
  );
}
