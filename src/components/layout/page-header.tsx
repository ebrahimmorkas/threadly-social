import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-slate-200 bg-white/85 px-4 py-2 backdrop-blur">
      {backHref && (
        <Link href={backHref} className="rounded-full p-2 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft className="size-5" />
        </Link>
      )}
      <div className="py-1">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}
