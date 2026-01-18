import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState, useCallback } from 'react';
import { getSolBalance, truncateAddress, formatBalance } from '../config/solanaConfig';
import AnimatedBorderTrail from './AnimatedBorderTrail';
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * WalletConnect Component
 * 
 * Handles Solana wallet connection with elegant UI
 * - Phantom/Solflare wallet support
 * - Shows wallet address and SOL balance
 * - Pink gradient theme matching app design
 */
export default function WalletConnect() {
  const { publicKey, connected, disconnect } = useWallet();
  const [solBalance, setSolBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      console.log('❌ Cannot fetch balance - no publicKey');
      return;
    }
    
    const walletAddress = publicKey.toBase58();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 BALANCE CHECK STARTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👛 Wallet Address:', walletAddress);
    console.log('🌐 Network: DEVNET (not mainnet!)');
    console.log('🔗 Check balance online: https://explorer.solana.com/address/' + walletAddress + '?cluster=devnet');
    console.log('💡 If balance shows 10 SOL there but 0 here, it\'s an RPC issue');
    
    setIsLoading(true);
    try {
      const balance = await getSolBalance(publicKey);
      console.log('✅ SOL Balance Result:', balance, 'SOL');
      if (balance === 0) {
        console.log('⚠️ Balance is 0. Debugging:');
        console.log('  1. Open this link in a new tab:');
        console.log('     https://explorer.solana.com/address/' + walletAddress + '?cluster=devnet');
        console.log('  2. Does it show 10 SOL there?');
        console.log('     → YES: RPC connection problem (keep reading)');
        console.log('     → NO: You\'re on mainnet, not devnet');
        console.log('  3. If RPC issue, the getSolBalance function failed silently');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      setSolBalance(balance);
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  // Fetch SOL balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      console.log('👛 Wallet connected, fetching balance...');
      fetchBalance();
    } else {
      console.log('❌ Wallet disconnected');
      setSolBalance(0);
    }
  }, [connected, publicKey, fetchBalance]);

  if (!connected) {
    return (
      <div className="wallet-connect-container">
        <AnimatedBorderTrail trailColor="from-pink-400 to-purple-500" size="small">
          <div className="wallet-button-wrapper">
            <WalletMultiButton className="wallet-adapter-button-custom" />
          </div>
        </AnimatedBorderTrail>

        {/* Help Info */}
        <div className="wallet-help-info">
          <p className="help-text">
            🌐 Make sure Phantom is on <strong>Devnet</strong>
          </p>
          <a 
            href="https://faucet.solana.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="help-link"
          >
            Need SOL? Get from Faucet →
          </a>
        </div>
        
        <style>{`
          .wallet-connect-container {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: center;
          }

          .wallet-help-info {
            text-align: center;
            padding: 12px 16px;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 8px;
            max-width: 300px;
          }

          .help-text {
            color: #93c5fd;
            font-size: 13px;
            margin: 0 0 8px 0;
            font-family: 'Inter', sans-serif;
          }

          .help-text strong {
            color: #60a5fa;
            font-weight: 700;
          }

          .help-link {
            color: #3b82f6;
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
            display: inline-block;
          }

          .help-link:hover {
            color: #2563eb;
            transform: translateX(3px);
          }

          .wallet-button-wrapper {
            background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            padding: 2px;
            border: 1px solid rgba(236, 72, 153, 0.2);
          }

          .wallet-adapter-button-custom {
            background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%) !important;
            border: none !important;
            border-radius: 10px !important;
            font-family: 'Space Grotesk', sans-serif !important;
            font-weight: 600 !important;
            font-size: 0.95rem !important;
            padding: 12px 24px !important;
            transition: all 0.3s ease !important;
            color: white !important;
            box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3) !important;
          }

          .wallet-adapter-button-custom:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(236, 72, 153, 0.5) !important;
          }

          .wallet-adapter-button-custom:not([disabled]):hover {
            background: linear-gradient(135deg, #db2777 0%, #9333ea 100%) !important;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="wallet-connected-container">
      <AnimatedBorderTrail trailColor="from-pink-400 to-purple-500" size="small">
        <div className="wallet-info-card">
          {/* Devnet Badge */}
          <div className="devnet-badge">
            <span className="devnet-dot">🟢</span>
            <span className="devnet-text">DEVNET</span>
          </div>

          {/* Wallet Address */}
          <div className="wallet-address-section">
            <div className="wallet-icon">💎</div>
            <div className="wallet-details">
              <div className="wallet-label">Wallet</div>
              <div className="wallet-address">
                {truncateAddress(publicKey?.toBase58(), 4)}
              </div>
            </div>
          </div>

          {/* SOL Balance */}
          <div className="balance-section">
            <div className="balance-label">
              SOL Balance
              <button onClick={fetchBalance} className="refresh-button" title="Refresh balance">
                🔄
              </button>
            </div>
            <div className="balance-value">
              {isLoading ? (
                <span className="loading-spinner">⌛</span>
              ) : (
                <>
                  <span className="balance-amount">{formatBalance(solBalance, 4)}</span>
                  <span className="balance-symbol">SOL</span>
                </>
              )}
            </div>
            {solBalance === 0 && !isLoading && (
              <div className="zero-balance-warning">
                <span className="warning-icon">⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>No SOL on DEVNET</div>
                  <a 
                    href="https://faucet.solana.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="faucet-link"
                  >
                    → Get Free Devnet SOL (click here)
                  </a>
                </div>
              </div>
            )}
            <div className="balance-info">
              Earn 0.001 SOL per point from rides
            </div>
          </div>

          {/* Disconnect Button */}
          <button onClick={disconnect} className="disconnect-button">
            <span>Disconnect</span>
            <span className="disconnect-icon">🚪</span>
          </button>
        </div>
      </AnimatedBorderTrail>

      <style>{`
        .wallet-connected-container {
          position: relative;
        }

        .wallet-info-card {
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
          backdrop-filter: blur(20px);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid rgba(236, 72, 153, 0.2);
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 280px;
          box-shadow: 0 8px 32px rgba(236, 72, 153, 0.2);
        }

        .devnet-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 6px;
          align-self: flex-start;
        }

        .devnet-dot {
          font-size: 8px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .devnet-text {
          color: #22c55e;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          font-family: 'Space Grotesk', sans-serif;
        }

        .zero-balance-warning {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 8px;
          padding: 12px;
          background: rgba(251, 146, 60, 0.2);
          border: 1px solid rgba(251, 146, 60, 0.5);
          border-radius: 8px;
          font-size: 12px;
        }

        .warning-icon {
          font-size: 14px;
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .faucet-link {
          color: #fbbf24;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          display: inline-block;
        }

        .faucet-link:hover {
          color: #fcd34d;
          text-decoration: underline;
          transform: translateX(2px);
        }

        .wallet-address-section {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(236, 72, 153, 0.1);
        }

        .wallet-icon {
          font-size: 28px;
          filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.4));
        }

        .wallet-details {
          flex: 1;
        }

        .wallet-label {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .wallet-address {
          color: white;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Space Grotesk', monospace;
          letter-spacing: 0.02em;
        }

        .balance-section {
          padding: 12px 0;
          border-bottom: 1px solid rgba(236, 72, 153, 0.1);
        }

        .balance-label {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .refresh-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.85rem;
          padding: 2px;
          opacity: 0.7;
          transition: all 0.2s ease;
        }
        
        .refresh-button:hover {
          opacity: 1;
          transform: rotate(180deg);
        }
        
        .balance-info {
          margin-top: 8px;
          padding: 8px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 6px;
          font-size: 0.7rem;
          color: #93c5fd;
          line-height: 1.4;
        }

        .balance-value {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .balance-amount {
          color: white;
          font-size: 24px;
          font-weight: 800;
          font-family: 'Space Grotesk', sans-serif;
        }

        .balance-symbol {
          color: #a855f7;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .loading-spinner {
          font-size: 20px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .disconnect-button {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          padding: 10px 16px;
          color: #fca5a5;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: 'Space Grotesk', sans-serif;
        }

        .disconnect-button:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #ef4444;
          transform: translateY(-1px);
        }

        .disconnect-icon {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
