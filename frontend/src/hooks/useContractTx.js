import { useState } from 'react';
import { api } from '../services/api';
import { signTransaction } from '../services/wallet';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';

/**
 * Every on-chain write in Nebula follows the same three-hop flow:
 *   1. Backend builds + simulates an unsigned XDR for the requested method
 *   2. The connected wallet (Freighter/Albedo/xBull) signs it locally
 *   3. Backend submits the signed XDR and polls until it settles
 * The backend never touches a private key at any point.
 */
export function useContractTx() {
  const [pending, setPending] = useState(false);
  const { address } = useWallet();
  const toast = useToast();

  async function execute({ contract, method, args, argTypes }) {
    if (!address) {
      toast.error('Connect a wallet first');
      throw new Error('No wallet connected');
    }

    setPending(true);
    try {
      const built = await api.post(
        '/transactions/build',
        { contract, method, args, argTypes, sourceAddress: address },
        { auth: true },
      );
      const signedXdr = await signTransaction(built.data.xdr);
      const result = await api.post('/transactions/submit', { signedXdr }, { auth: true });
      toast.success('Transaction confirmed on-chain');
      return result.data;
    } catch (err) {
      toast.error(err.message || 'Transaction failed');
      throw err;
    } finally {
      setPending(false);
    }
  }

  return { execute, pending };
}
