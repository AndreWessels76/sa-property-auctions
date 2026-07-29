"use client";

type LoadingGuardProps = {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function LoadingGuard({
  loading,
  children,
  fallback,
}: LoadingGuardProps) {
  if (loading) {
    return (
      fallback ?? (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          Checking session...
        </div>
      )
    );
  }

  return <>{children}</>;
}
