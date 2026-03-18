"use client";

interface PageLoaderProps {
  label: string;
}

export default function PageLoader({ label }: PageLoaderProps) {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-6">
      <div className="surface-card w-full max-w-md p-10 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#007cc3]/30 border-t-[#007cc3]" />
        <p className="mt-5 text-base font-semibold text-[#0b2a5b]">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Preparing the workspace.</p>
      </div>
    </div>
  );
}
