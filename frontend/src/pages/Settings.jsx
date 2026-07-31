import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWallet } from '../context/WalletContext.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';

export default function Settings() {
  const { logout } = useAuth();
  const { disconnect } = useWallet();
  const [network, setNetwork] = useState('TESTNET');
  const [notifyEmail, setNotifyEmail] = useState(true);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Settings</h1>

      <GlassCard className="p-6 space-y-4">
        <h2 className="font-display font-semibold text-white">Network</h2>
        <p className="text-sm text-mist-dim">Which Stellar network this app talks to.</p>
        <div className="flex gap-3">
          {['TESTNET', 'PUBLIC'].map((n) => (
            <button
              key={n}
              onClick={() => setNetwork(n)}
              className={network === n ? 'btn-primary py-2 text-sm' : 'btn-secondary py-2 text-sm'}
            >
              {n === 'TESTNET' ? 'Testnet' : 'Mainnet'}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-4">
        <h2 className="font-display font-semibold text-white">Notifications</h2>
        <label className="flex items-center justify-between text-sm text-mist-dim">
          Email me when a task I posted gets submitted for review
          <input
            type="checkbox"
            checked={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.checked)}
            className="h-5 w-5 accent-indigo"
          />
        </label>
      </GlassCard>

      <GlassCard className="p-6 space-y-4">
        <h2 className="font-display font-semibold text-white">Session</h2>
        <button
          onClick={() => {
            disconnect();
            logout();
          }}
          className="btn-secondary text-red-400"
        >
          <LogOut size={16} /> Sign out
        </button>
      </GlassCard>
    </div>
  );
}
