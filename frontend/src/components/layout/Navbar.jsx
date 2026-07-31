import { Link, NavLink } from 'react-router-dom';
import { Bell, Menu, Orbit, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { truncateAddress } from '../../utils/format.js';

const LINKS = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/activity', label: 'Activity' },
];

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();
  const { address, connect, connecting } = useWallet();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-void/70 backdrop-blur-glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <button
            className="md:hidden text-mist-dim"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Orbit size={22} className="text-cyan" />
            Nebula
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-white bg-white/[0.06]' : 'text-mist-dim hover:text-mist'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <Link
              to="/notifications"
              className="rounded-lg p-2 text-mist-dim hover:bg-white/[0.06] hover:text-mist"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </Link>
          )}

          {address ? (
            <Link to="/wallet" className="btn-secondary py-2 text-xs font-mono">
              <Wallet size={14} />
              {truncateAddress(address)}
            </Link>
          ) : (
            <button onClick={connect} disabled={connecting} className="btn-primary py-2 text-sm">
              <Wallet size={16} />
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}

          {!user && (
            <Link to="/login" className="hidden sm:inline-flex btn-secondary py-2 text-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
