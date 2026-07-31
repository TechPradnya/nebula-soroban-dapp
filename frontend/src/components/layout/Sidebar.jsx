import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingBag,
  Wallet,
  User,
  Settings,
  Activity,
  Bell,
  X,
} from 'lucide-react';

const ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function LinkList({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-gradient-to-r from-indigo/20 to-cyan/10 text-white border border-white/10'
                : 'text-mist-dim hover:bg-white/[0.05] hover:text-mist'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      <aside className="hidden md:block w-60 shrink-0 border-r border-white/[0.06] p-4">
        <LinkList />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-surface p-4 md:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display font-semibold text-white">Menu</span>
                <button onClick={onClose} aria-label="Close menu" className="text-mist-dim">
                  <X size={20} />
                </button>
              </div>
              <LinkList onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
