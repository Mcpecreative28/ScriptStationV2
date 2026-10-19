
import type { ReactNode } from 'react';
import { ArrowUpRight, Command } from 'lucide-react';
import Navbar from './Navbar';

export default function Shell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="noise relative flex min-h-screen flex-col overflow-clip bg-[#09090b] text-zinc-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="grid-bg absolute inset-0 opacity-[0.16]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
      </div>

      <Navbar />

      <div className="relative flex-1">
        {children}
      </div>

      <footer className="mt-16 border-t border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <a
                href="/"
                className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors group-hover:border-white/20 group-hover:bg-white/[0.07]">
                  <Command className="h-4 w-4" />
                </span>

                <span className="text-sm font-semibold tracking-tight text-zinc-200">
                  ScriptStation
                  <span className="ml-1 text-zinc-500">V2</span>
                </span>
              </a>

              <p className="mt-3 max-w-sm text-xs leading-5 text-zinc-500">
                A community space for scripts, snippets,
                and developer resources.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-zinc-500">
              <a
                href="/scripts"
                className="transition-colors hover:text-zinc-200"
              >
                Scripts
              </a>

              <a
                href="/snippets"
                className="transition-colors hover:text-zinc-200"
              >
                Snippets
              </a>

              <a
                href="/baileys"
                className="transition-colors hover:text-zinc-200"
              >
                Baileys
              </a>

              <a
                href="/marketplace"
                className="inline-flex items-center gap-1 transition-colors hover:text-zinc-200"
              >
                Marketplace
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-2 border-t border-white/[0.06] pt-5 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} ScriptStationV2
            </span>

            <span>
              Made for developers, by the community.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}