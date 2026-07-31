import {
  StellarWalletsKit,
  WalletNetwork,
  FreighterModule,
  AlbedoModule,
  xBullModule,
} from '@creit.tech/stellar-wallets-kit';

const NETWORK =
  import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC' ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET;

let kit = null;

function getKit() {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: NETWORK,
      selectedWalletId: FreighterModule.id,
      modules: [new FreighterModule(), new AlbedoModule(), new xBullModule()],
    });
  }
  return kit;
}

/** Opens the wallet picker modal and resolves once the user connects. */
function connectWallet() {
  return new Promise((resolve, reject) => {
    const walletsKit = getKit();
    walletsKit.openModal({
      onWalletSelected: async (option) => {
        try {
          walletsKit.setWallet(option.id);
          const { address } = await walletsKit.getAddress();
          localStorage.setItem('nebula_wallet_id', option.id);
          resolve({ address, walletId: option.id });
        } catch (err) {
          reject(err);
        }
      },
      onClosed: (err) => {
        if (err) reject(err);
      },
    });
  });
}

/** Restores a previously connected wallet without showing the picker. */
async function reconnectWallet() {
  const savedWalletId = localStorage.getItem('nebula_wallet_id');
  if (!savedWalletId) return null;

  const walletsKit = getKit();
  walletsKit.setWallet(savedWalletId);
  try {
    const { address } = await walletsKit.getAddress();
    return { address, walletId: savedWalletId };
  } catch (err) {
    localStorage.removeItem('nebula_wallet_id');
    return null;
  }
}

/** Signs an unsigned transaction XDR built by the backend. */
async function signTransaction(xdr) {
  const walletsKit = getKit();
  const { signedTxXdr } = await walletsKit.signTransaction(xdr, {
    networkPassphrase: NETWORK,
  });
  return signedTxXdr;
}

function disconnectWallet() {
  localStorage.removeItem('nebula_wallet_id');
}

export { connectWallet, reconnectWallet, signTransaction, disconnectWallet };
