type Props = {
  message?: string;
};

export default function FormError({
  message,
}: Props) {
  if (!message) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}
