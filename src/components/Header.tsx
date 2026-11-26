import { Download } from 'lucide-react';

interface HeaderProps {
  itemCount: number;
  onExportVault: () => void;
}

export function Header({ itemCount, onExportVault }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0E1014]/90 backdrop-blur-md">
      <div className="max-w-[1320px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#forge"
          className="font-display text-lg font-bold tracking-wide text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4A853]"
        >
          Relic Forge
        </a>

        {/* Zone 2: Concise single-line text links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          <a
            href="#forge"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Forge
          </a>
          <a
            href="#output-inspector"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            JSON Output
          </a>
          <a
            href="#vault"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Item Vault
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportVault}
            disabled={itemCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#D4A853] hover:bg-[#DFB766] disabled:opacity-40 disabled:pointer-events-none text-[#0E1014] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
          >
            <Download className="w-3.5 h-3.5" />
            Export All JSON
          </button>
        </div>
      </div>
    </header>
  );
}
