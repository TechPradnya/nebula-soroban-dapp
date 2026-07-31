import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { useContractTx } from '../../hooks/useContractTx.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api, ApiClientError } from '../../services/api.js';
import { toStroops } from '../../utils/format.js';

const CATEGORIES = ['development', 'design', 'writing', 'marketing', 'data', 'other'];
const DEFAULT_FEE_BPS = 1000; // 10%, mirrors the deployed contract's configured fee

const INITIAL_FORM = { title: '', description: '', category: 'development', amountXlm: '', tags: '' };

export default function CreateTaskModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState([]);
  const { address } = useWallet();
  const { execute } = useContractTx();
  const toast = useToast();

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleClose() {
    setForm(INITIAL_FORM);
    setFieldErrors([]);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!address) {
      toast.error('Connect a wallet before posting a task');
      return;
    }

    setSubmitting(true);
    setFieldErrors([]);
    try {
      const amountStroops = toStroops(form.amountXlm);

      const result = await execute({
        contract: 'marketplace',
        method: 'create_task',
        args: [address, amountStroops, form.description],
        argTypes: ['address', 'i128', 'string'],
      });

      const onChainId = Number(result.returnValue);

      const saved = await api.post(
        '/tasks',
        {
          onChainId,
          title: form.title,
          description: form.description,
          category: form.category,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          clientAddress: address,
          amount: String(amountStroops),
          feeBps: DEFAULT_FEE_BPS,
          txHash: result.hash,
        },
        { auth: true },
      );

      toast.success(`Task #${onChainId} posted and escrowed`);
      onCreated?.(saved.data);
      handleClose();
    } catch (err) {
      // The on-chain leg (useContractTx) already surfaces its own toast on
      // failure. If the funds escrowed successfully but the metadata write
      // failed validation, show exactly which fields to fix rather than a
      // generic toast — the money already moved, so this needs to be fixable.
      if (err instanceof ApiClientError && err.details) {
        setFieldErrors(err.details);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Post a task">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {fieldErrors.length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-400/5 p-3 text-sm text-red-300"
          >
            <ul className="list-disc space-y-1 pl-4">
              {fieldErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm text-mist-dim" htmlFor="task-title">
            Title
          </label>
          <input
            id="task-title"
            required
            minLength={5}
            maxLength={140}
            value={form.title}
            onChange={update('title')}
            className="input-field"
            placeholder="Build a landing page"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-mist-dim" htmlFor="task-description">
            Description
          </label>
          <textarea
            id="task-description"
            required
            minLength={20}
            maxLength={5000}
            rows={4}
            value={form.description}
            onChange={update('description')}
            className="input-field resize-none"
            placeholder="What needs to get done, and what does &lsquo;done&rsquo; look like?"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-mist-dim" htmlFor="task-category">
              Category
            </label>
            <select
              id="task-category"
              value={form.category}
              onChange={update('category')}
              className="input-field capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-mist-dim" htmlFor="task-budget">
              Budget (XLM)
            </label>
            <input
              id="task-budget"
              required
              type="number"
              min="1"
              step="0.01"
              value={form.amountXlm}
              onChange={update('amountXlm')}
              className="input-field font-mono"
              placeholder="500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-mist-dim" htmlFor="task-tags">
            Tags (comma separated)
          </label>
          <input
            id="task-tags"
            value={form.tags}
            onChange={update('tags')}
            className="input-field"
            placeholder="react, stellar, ui"
          />
        </div>

        <p className="text-xs text-mist-dim">
          Submitting escrows the full amount on-chain immediately via your connected wallet. A 10% platform
          fee is only taken when you approve completed work.
        </p>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {submitting ? 'Awaiting wallet signature…' : 'Escrow & post task'}
        </button>
      </form>
    </Modal>
  );
}
