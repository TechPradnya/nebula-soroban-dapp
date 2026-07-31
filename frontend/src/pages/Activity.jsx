import { useEffect, useState } from 'react';
import { Activity as ActivityIcon, ExternalLink } from 'lucide-react';
import { api } from '../services/api.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import GlassCard from '../components/ui/GlassCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { truncateHash, formatDateTime } from '../utils/format.js';

const EVENT_LABELS = {
  task_created: 'Task posted',
  task_accepted: 'Task accepted',
  work_submitted: 'Work submitted',
  task_completed: 'Payment released',
  task_cancelled: 'Task cancelled',
  task_disputed: 'Dispute raised',
  dispute_resolved: 'Dispute resolved',
  stake: 'Staked',
  unstake: 'Unstaked',
  claim: 'Rewards claimed',
  fee_deposited: 'Fee distributed to stakers',
};

export default function Activity() {
  const { address } = useWallet();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!address) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/wallets/${address}/transactions`);
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useRealtime(['marketplace:event', 'staking:fee_deposited'], () => load());

  if (!address) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="Connect a wallet to see your activity"
        description="Every on-chain action tied to your address — tasks, stakes, claims — shows up here as it confirms."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Activity</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={ActivityIcon} title="No on-chain activity yet" description="Actions you take will appear here in real time." />
      ) : (
        <div className="space-y-2">
          {items.map((tx) => (
            <GlassCard key={tx._id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-white">{EVENT_LABELS[tx.eventType] || tx.eventType}</p>
                <p className="text-xs text-mist-dim">{formatDateTime(tx.occurredAt)}</p>
              </div>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${tx.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-xs text-cyan hover:underline"
              >
                {truncateHash(tx.txHash)} <ExternalLink size={12} aria-hidden="true" />
              </a>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
