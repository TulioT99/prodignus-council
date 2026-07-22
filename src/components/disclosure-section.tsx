import type { ReactNode } from "react";

interface DisclosureSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function DisclosureSection({
  title,
  children,
  defaultOpen = false,
}: DisclosureSectionProps) {
  return (
    <details
      open={defaultOpen}
      className="rounded-md border border-neutral-200 bg-neutral-50"
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-neutral-900 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="text-neutral-500">
            ▸
          </span>
          {title}
        </span>
      </summary>
      <div className="border-t border-neutral-200 px-4 py-4">{children}</div>
    </details>
  );
}
