import { useState, useEffect } from 'react';
import { Upload, CheckCircle, Wallet as WalletIcon } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { cn } from "../lib/utils";
import AnimatedGradientText from './AnimatedGradientText';
import { hasTicketNFT } from '../config/solanaConfig';

export default function TicketUpload({ onVerified }) {
  const { publicKey, connected } = useWallet();
  const [file, setFile] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [checkingNFT, setCheckingNFT] = useState(false);
  const [hasNFT, setHasNFT] = useState(false);
  const [showNFTModal, setShowNFTModal] = useState(false);

  // Check for NFT ticket when wallet connects
  useEffect(() => {
    if (connected && publicKey && !verified) {
      checkForNFTTicket();
    }
  }, [connected, publicKey]);

  const checkForNFTTicket = async () => {
    setCheckingNFT(true);
    try {
      const nftExists = await hasTicketNFT(publicKey);
      setHasNFT(nftExists);
      
      if (nftExists) {
        // Auto-verify if NFT found
        setTimeout(() => {
          setVerified(true);
          onVerified?.();
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking NFT:', error);
    } finally {
      setCheckingNFT(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleVerify(selectedFile);
    }
  };

  const handleVerify = async (uploadedFile) => {
    setVerifying(true);
    
    // Simulate automatic verification (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setVerifying(false);
    setVerified(true);
    
    // Call parent callback after 1 second
    setTimeout(() => {
      onVerified?.();
    }, 1000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      handleVerify(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <AnimatedGradientText as="h2" className="text-4xl mb-2">
          Upload Your Ticket
        </AnimatedGradientText>
        <p className="text-slate-300 text-lg">
          Verify your MBTA ticket to start playing
        </p>
        
        {/* Solana NFT Badge */}
        {connected && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-pink-500/20 border border-pink-500/30 rounded-full">
            <WalletIcon size={16} className="text-pink-400" />
            <span className="text-sm text-pink-300 font-semibold">
              {hasNFT ? '✅ NFT Ticket Detected' : 'Wallet Connected'}
            </span>
          </div>
        )}
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "relative w-full max-w-md h-64 border-2 border-dashed rounded-2xl transition-all duration-300",
          verified 
            ? "border-green-500 bg-green-500/10" 
            : "border-slate-600 bg-slate-800/50 hover:border-purple-500 hover:bg-slate-800/70"
        )}
      >
        <input
          type="file"
          id="ticket-upload"
          className="hidden"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          disabled={verified}
        />
        
        <label
          htmlFor="ticket-upload"
          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
        >
          {!file && !verifying && !verified && !checkingNFT && (
            <>
              <Upload className="w-16 h-16 text-purple-400 mb-4" />
              <p className="text-white font-semibold text-lg mb-2">
                Drop your ticket here
              </p>
              <p className="text-slate-400 text-sm">
                or click to browse
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Supports: JPG, PNG, PDF
              </p>
              {connected && (
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowNFTModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg text-white font-semibold text-sm hover:shadow-lg transition-all"
                  >
                    🎫 Mint Ticket NFT
                  </button>
                </div>
              )}
            </>
          )}

          {checkingNFT && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <AnimatedGradientText className="text-2xl">
                Checking NFT Ticket...
              </AnimatedGradientText>
              <p className="text-pink-300 text-sm">
                Verifying blockchain ownership
              </p>
            </div>
          )}

          {verifying && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <AnimatedGradientText className="text-2xl">
                Verifying Ticket...
              </AnimatedGradientText>
            </div>
          )}

          {verified && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="w-20 h-20 text-green-400 animate-bounce" />
              <AnimatedGradientText className="text-2xl">
                Ticket Verified! ✓
              </AnimatedGradientText>
              {hasNFT && connected && (
                <div className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 border border-pink-500/30 rounded-full">
                  <WalletIcon size={16} className="text-pink-400" />
                  <span className="text-sm text-pink-300 font-semibold">
                    NFT Ticket Used
                  </span>
                </div>
              )}
              <p className="text-green-300 text-sm">
                Starting game...
              </p>
            </div>
          )}
        </label>
      </div>

      {file && !verified && !verifying && (
        <p className="text-slate-400 text-sm text-center max-w-md">
          🔒 Your ticket will be automatically verified. This demo accepts all ticket uploads.
          {connected && (
            <span className="block mt-2 text-pink-400">
              💎 NFT tickets provide instant verification via blockchain
            </span>
          )}
        </p>
      )}

      {/* NFT Mint Modal */}
      {showNFTModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowNFTModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 max-w-md w-full border border-pink-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-white mb-4 font-display">
              🎫 Mint Ticket NFT
            </h3>
            <p className="text-slate-300 mb-6">
              NFT ticket minting will be available soon! This feature will allow you to:
            </p>
            <ul className="text-slate-400 space-y-2 mb-6 text-sm">
              <li>✅ Instant verification via blockchain</li>
              <li>✅ Transferable digital tickets</li>
              <li>✅ Collect rare route NFTs</li>
              <li>✅ Earn $MBTA token rewards</li>
            </ul>
            <button
              onClick={() => setShowNFTModal(false)}
              className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg text-white font-semibold hover:shadow-lg transition-all"
            >
              Coming Soon! 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
