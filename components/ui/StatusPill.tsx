import Badge from "./Badge";

type Status =
  | "active"
  | "inactive"
  | "paused"
  | "pending"
  | "success"
  | "warning"
  | "error";

const map = {
  active: "success",
  success: "success",
  inactive: "secondary",
  paused: "warning",
  pending: "primary",
  warning: "warning",
  error: "danger",
} as const;

export default function StatusPill({
  status,
}: {
  status: Status;
}) {
  return (
    <Badge variant={map[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
