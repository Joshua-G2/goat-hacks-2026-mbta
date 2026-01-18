import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSolBalance, getMBTATokenBalance } from '../config/solanaConfig';

/**
 * Custom hook to fetch and manage Solana wallet balances
 * 
 * @returns {Object} Balance information and loading state
 */
export function useSolanaBalance() {
  const { publicKey, connected } = useWallet();
  const [solBalance, setSolBalance] = useState(0);
  const [mbtaBalance, setMbtaBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!connected || !publicKey) {
      setSolBalance(0);
      setMbtaBalance(0);
      setError(null);
      return;
    }

    fetchBalances();
  }, [connected, publicKey]);

  const fetchBalances = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    setError(null);

    try {
      const [sol, mbta] = await Promise.all([
        getSolBalance(publicKey),
        getMBTATokenBalance(publicKey)
      ]);

      setSolBalance(sol);
      setMbtaBalance(mbta);
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    solBalance,
    mbtaBalance,
    isLoading,
    error,
    refresh: fetchBalances,
    connected
  };
}

export default useSolanaBalance;
