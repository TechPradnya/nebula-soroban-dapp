import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Coins, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../services/api.js';
import { useContractTx } from '../hooks/useContractTx.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import GlassCard from '../components/ui/GlassCard.jsx';
import StatusPill from '../components/ui/StatusPill.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { formatXlm, truncateAddress } from '../utils/format.js';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliverable, setDeliverable] = useState('');
  const { address } = useWallet();
  const { execute, pending } = useContractTx();

  async function load() {
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useRealtime(['marketplace:event'], (msg) => {
    if (String(msg.payload?.relatedTaskId) === String(id)) load();
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!task) {
    return <p className="text-mist-dim">Task not found.</p>;
  }

  const isClient = address === task.clientAddress;
  const isFreelancer = address && address === task.freelancerAddress;

  async function runAction(method, args, argTypes) {
    await execute({ contract: 'marketplace', method, args, argTypes });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-mist-dim hover:text-mist">
        <ArrowLeft size={16} /> Back to marketplace
      </Link>

      <GlassCard className="p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-white">{task.title}</h1>
          <StatusPill status={task.status} />
        </div>
        <p className="whitespace-pre-wrap text-mist-dim">{task.description}</p>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-mist-dim">Budget</p>
            <p className="flex items-center gap-1 font-mono text-amber">
              <Coins size={14} /> {formatXlm(task.amount)} XLM
            </p>
          </div>
          <div>
            <p className="text-xs text-mist-dim">Client</p>
            <p className="font-mono text-sm">{truncateAddress(task.clientAddress, { head: 6, tail: 6 }) || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-mist-dim">Freelancer</p>
            <p className="font-mono text-sm">{truncateAddress(task.freelancerAddress, { head: 6, tail: 6 }) || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-mist-dim">Category</p>
            <p className="text-sm capitalize">{task.category}</p>
          </div>
        </div>

        {task.txHashes?.created && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${task.txHashes.created}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-xs text-cyan hover:underline"
          >
            View on Stellar Expert <ExternalLink size={12} />
          </a>
        )}
      </GlassCard>

      <GlassCard className="p-6 space-y-4">
        <h2 className="font-display font-semibold text-white">Actions</h2>

        {!address && <p className="text-sm text-mist-dim">Connect a wallet to interact with this task.</p>}

        {address && task.status === 'open' && !isClient && (
          <button
            disabled={pending}
            onClick={() => runAction('accept_task', [address, Number(task.onChainId)], ['address', 'u64'])}
            className="btn-primary"
          >
            {pending && <Loader2 size={16} className="animate-spin" />}
            Accept this task
          </button>
        )}

        {address && task.status === 'open' && isClient && (
          <button
            disabled={pending}
            onClick={() => runAction('cancel_task', [address, Number(task.onChainId)], ['address', 'u64'])}
            className="btn-secondary"
          >
            Cancel & refund myself
          </button>
        )}

        {address && task.status === 'in_progress' && isFreelancer && (
          <div className="space-y-3">
            <textarea
              value={deliverable}
              onChange={(e) => setDeliverable(e.target.value)}
              rows={3}
              placeholder="Link to deliverable, repo, or notes for the client"
              className="input-field resize-none"
            />
            <button
              disabled={pending || !deliverable}
              onClick={() =>
                runAction(
                  'submit_work',
                  [address, Number(task.onChainId), deliverable],
                  ['address', 'u64', 'string'],
                )
              }
              className="btn-primary"
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              Submit work for review
            </button>
          </div>
        )}

        {address && task.status === 'submitted' && isClient && (
          <button
            disabled={pending}
            onClick={() => runAction('approve_task', [address, Number(task.onChainId)], ['address', 'u64'])}
            className="btn-primary"
          >
            {pending && <Loader2 size={16} className="animate-spin" />}
            Approve & release payment
          </button>
        )}

        {address &&
          ['in_progress', 'submitted'].includes(task.status) &&
          (isClient || isFreelancer) && (
            <button
              disabled={pending}
              onClick={() => runAction('raise_dispute', [address, Number(task.onChainId)], ['address', 'u64'])}
              className="btn-secondary"
            >
              Raise a dispute
            </button>
          )}
      </GlassCard>
    </div>
  );
}
