import { useState } from 'react';
import { User, Link2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../services/api.js';
import GlassCard from '../components/ui/GlassCard.jsx';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { address, connect } = useWallet();
  const toast = useToast();
  const [linking, setLinking] = useState(false);

  async function linkWallet() {
    if (!address) {
      await connect();
      return;
    }
    setLinking(true);
    try {
      const res = await api.patch('/auth/wallet', { walletAddress: address }, { auth: true });
      updateUser(res.data.user);
      toast.success('Wallet linked to your profile');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-cyan text-void">
          <User size={28} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{user?.displayName}</h1>
          <p className="text-sm text-mist-dim">{user?.email}</p>
        </div>
      </div>

      <GlassCard className="p-6 space-y-4">
        <h2 className="font-display font-semibold text-white">Linked wallet</h2>
        {user?.walletAddress ? (
          <p className="font-mono text-sm text-cyan">{user.walletAddress}</p>
        ) : (
          <p className="text-sm text-mist-dim">No wallet linked yet. Link one to receive payouts directly.</p>
        )}
        <button onClick={linkWallet} disabled={linking} className="btn-secondary">
          {linking ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
          {address ? 'Link connected wallet' : 'Connect a wallet to link'}
        </button>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <h2 className="font-display font-semibold text-white">Role</h2>
        <p className="pill capitalize text-mist">{user?.role}</p>
      </GlassCard>
    </div>
  );
}
