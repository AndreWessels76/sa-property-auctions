interface Props {
  password: string;
  confirmPassword: string;
  onChange: (value: string) => void;
}

export default function ConfirmPasswordInput({
  password,
  confirmPassword,
  onChange,
}: Props) {
  const match = password === confirmPassword;

  return (
    <div>
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border p-3"
      />

      {!match && confirmPassword.length > 0 && (
        <p className="text-red-500 text-sm">Passwords do not match</p>
      )}
    </div>
  );
}
