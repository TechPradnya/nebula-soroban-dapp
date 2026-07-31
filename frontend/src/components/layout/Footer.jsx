import { Orbit } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 text-sm text-mist-dim">
          <Orbit size={16} className="text-cyan" />
          <span>Nebula — built on Stellar Soroban</span>
        </div>
        <p className="text-xs text-mist-dim">© {new Date().getFullYear()} Nebula Labs. Testnet build.</p>
      </div>
    </footer>
  );
}
