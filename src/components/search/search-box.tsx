import { Search } from "lucide-react";

/** Plain GET form: works without JavaScript and produces shareable /search?q= URLs. */
export function SearchBox({
  defaultValue,
  autoFocus,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <form action="/search" role="search" className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        maxLength={100}
        placeholder="Search Threadly"
        aria-label="Search Threadly"
        className="h-11 w-full rounded-full border border-transparent bg-slate-100 pr-4 pl-11 text-sm text-slate-900 placeholder:text-slate-500 focus:border-brand-500 focus:bg-white focus:outline-none"
      />
    </form>
  );
}
