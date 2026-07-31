import { useEffect, useState } from 'react';
import { Wallet as WalletIcon, Coins, TrendingUp, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useContractTx } from '../hooks/useContractTx.js';
import { useRealtime } from '../hooks/useRealtime.js';
import GlassCard from '../components/ui/GlassCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { StatCardSkeleton } from '../components/ui/Skeleton.jsx';
import { formatXlm, toStroops } from '../utils/format.js';

function xlm(stroops) {
  return formatXlm(stroops, { maximumFractionDigits: 4 });
}

export default function WalletPage() {
  const { address, connect, connecting } = useWallet();
  const { execute, pending } = useContractTx();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');

  async function load() {
    if (!address) return;
    setLoading(true);
    try {
      const res = await api.get(`/wallets/${address}/staking`);
      setSummary(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useRealtime(['staking:fee_deposited'], () => load());

  async function handleStake() {
    const stroops = toStroops(amount);
    await execute({ contract: 'staking', method: 'stake', args: [address, stroops], argTypes: ['address', 'i128'] });
    setAmount('');
    load();
  }

  async function handleUnstake() {
    const stroops = toStroops(amount);
    await execute({
      contract: 'staking',
      method: 'unstake',
      args: [address, stroops],
      argTypes: ['address', 'i128'],
    });
    setAmount('');
    load();
  }

  async function handleClaim() {
    await execute({ contract: 'staking', method: 'claim', args: [address], argTypes: ['address'] });
    load();
  }

  if (!address) {
    return (
      <EmptyState
        icon={WalletIcon}
        title="No wallet connected"
        description="Connect Freighter, Albedo, or xBull to view your staking position and manage funds."
        action={
          <button onClick={connect} disabled={connecting} className="btn-primary">
            {connecting && <Loader2 size={16} className="animate-spin" />}
            Connect wallet
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Wallet</h1>
        <p className="font-mono text-sm text-mist-dim">{address}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading || !summary ? (
          Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <GlassCard className="p-5">
              <p className="mb-2 text-sm text-mist-dim">Your staked balance</p>
              <p className="flex items-center gap-2 font-display text-2xl font-bold text-white">
                <Coins size={18} className="text-indigo-soft" /> {xlm(summary.staked)} XLM
              </p>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="mb-2 text-sm text-mist-dim">Unclaimed rewards</p>
              <p className="flex items-center gap-2 font-display text-2xl font-bold text-amber">
                <TrendingUp size={18} /> {xlm(summary.earned)} XLM
              </p>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="mb-2 text-sm text-mist-dim">Total staked (pool)</p>
              <p className="font-display text-2xl font-bold text-cyan">{xlm(summary.totalStaked)} XLM</p>
            </GlassCard>
          </>
        )}
      </div>

      <GlassCard className="p-6 space-y-4">
        <h2 className="font-display font-semibold text-white">Manage stake</h2>
        <p className="text-sm text-mist-dim">
          Staked XLM earns a proportional share of every platform fee the moment a task is approved and paid
          out — no lockup period, unstake anytime.
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in XLM"
            className="input-field max-w-xs font-mono"
          />
          <button onClick={handleStake} disabled={pending || !amount} className="btn-primary">
            {pending && <Loader2 size={16} className="animate-spin" />}
            Stake
          </button>
          <button onClick={handleUnstake} disabled={pending || !amount} className="btn-secondary">
            Unstake
          </button>
          <button onClick={handleClaim} disabled={pending} className="btn-secondary">
            Claim rewards
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
