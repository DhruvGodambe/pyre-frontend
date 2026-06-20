/* ============================================================================
   PYRE, State views (loading / error / empty)
   ----------------------------------------------------------------------------
   The spec requires every screen to design its loading, error and empty states
   ("make waiting feel ritual, not broken"). StateView is the single wrapper that
   renders those consistently. Panels wrap their data render in it.
   ========================================================================== */

import type { ReactNode } from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-3/60 ${className}`} />;
}

export function EmptyState({
  icon = "○",
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-10 px-4">
      <div className="text-4xl text-text-3" aria-hidden>
        {icon}
      </div>
      <h3 className="font-display text-xl text-text">{title}</h3>
      {message && <p className="text-text-2 text-sm max-w-xs">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * StateView, wraps any data render with consistent loading/error handling.
 * Usage:
 *   <StateView query={statsQuery} loading={<Skeleton .../>}>
 *     {(data) => <RealUI data={data} />}
 *   </StateView>
 */
export function StateView<T>({
  query,
  loading,
  children,
}: {
  query: { data: T | undefined; isLoading: boolean; isError: boolean; error: unknown };
  loading?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isError) {
    const msg = query.error instanceof Error ? query.error.message : "Something went wrong";
    return (
      <EmptyState icon="⚠" title="The fire flickered" message={msg} />
    );
  }
  if (query.isLoading || query.data === undefined) {
    return <>{loading ?? <DefaultLoading />}</>;
  }
  return <>{children(query.data)}</>;
}

function DefaultLoading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
