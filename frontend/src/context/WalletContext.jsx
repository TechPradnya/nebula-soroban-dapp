import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { connectWallet, reconnectWallet, disconnectWallet } from '../services/wallet';
import { useToast } from './ToastContext';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [walletId, setWalletId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    reconnectWallet().then((session) => {
      if (session) {
        setAddress(session.address);
        setWalletId(session.walletId);
      }
    });
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const session = await connectWallet();
      setAddress(session.address);
      setWalletId(session.walletId);
      toast.success('Wallet connected');
      return session;
    } catch (err) {
      toast.error(err.message || 'Could not connect wallet');
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    disconnectWallet();
    setAddress(null);
    setWalletId(null);
  }, []);

  return (
    <WalletContext.Provider value={{ address, walletId, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
