import UpgradePrompt from "./UpgradePrompt";

type PermissionGuardProps = {
  allowed: boolean;
  children: React.ReactNode;
};

export default function PermissionGuard({
  allowed,
  children,
}: PermissionGuardProps) {
  if (!allowed) {
    return <UpgradePrompt />;
  }

  return <>{children}</>;
}
