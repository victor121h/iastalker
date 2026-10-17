'use client';

// Loading placeholder that mirrors the account page layout.
import { SkeletonBlock } from './Section';

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-3xl border border-studio-line bg-studio-surface/90">
      <div className="flex items-center gap-4 border-b border-studio-line/80 px-5 py-4 sm:px-6 sm:py-5">
        <SkeletonBlock className="h-10 w-10 flex-none" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-40 rounded-md" />
          <SkeletonBlock className="h-3 w-64 max-w-full rounded-md" />
        </div>
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBlock className="h-10 w-10 flex-none" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3.5 w-1/2 rounded-md" />
              <SkeletonBlock className="h-3 w-1/3 rounded-md" />
            </div>
            <SkeletonBlock className="h-4 w-14 flex-none rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AccountSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-5">
        <div className="rounded-3xl border border-studio-line bg-studio-surface p-5 sm:p-7 xl:col-span-3">
          <SkeletonBlock className="h-3 w-28 rounded-md" />
          <div className="mt-4 flex items-end gap-3">
            <SkeletonBlock className="h-14 w-14 rounded-2xl" />
            <SkeletonBlock className="h-14 w-40" />
          </div>
          <SkeletonBlock className="mt-5 h-4 w-56 max-w-full rounded-md" />
          <SkeletonBlock className="mt-2 h-3 w-64 max-w-full rounded-md" />
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <SkeletonBlock className="h-14 flex-1 rounded-2xl" />
            <SkeletonBlock className="h-14 flex-1 rounded-2xl" />
          </div>
        </div>
        <div className="rounded-3xl border border-studio-line bg-studio-surface p-5 sm:p-7 xl:col-span-2">
          <SkeletonBlock className="h-3 w-20 rounded-md" />
          <SkeletonBlock className="mt-4 h-9 w-28" />
          <SkeletonBlock className="mt-3 h-3 w-full rounded-md" />
          <div className="mt-6 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonBlock key={i} className="h-1.5 rounded-full" />
            ))}
          </div>
          <SkeletonBlock className="mt-6 h-24 rounded-2xl" />
        </div>
      </div>
      <SectionSkeleton rows={2} />
      <SectionSkeleton rows={4} />
    </div>
  );
}
