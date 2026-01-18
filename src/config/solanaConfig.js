import { Connection, clusterApiUrl, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

/**
 * Solana Configuration for MBTA Transit Game
 * 
 * Uses Devnet for development and testing
 * Mock token mint for future $MBTA token integration
 */

// Network configuration - using faster public RPC
export const NETWORK = 'devnet';
// Try multiple RPC endpoints for better reliability
// Using public RPCs that don't require API keys
export const RPC_ENDPOINTS = [
  clusterApiUrl(NETWORK),
  'https://api.devnet.solana.com',
  'https://rpc.ankr.com/solana_devnet'
];

// Create connection with commitment level
export const connection = new Connection(RPC_ENDPOINTS[0], {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
});

// Mock $MBTA token mint address (placeholder for future deployment)
// This is a devnet address - replace with actual mint address when token is deployed
export const MBTA_TOKEN_MINT = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Token configuration
export const MBTA_TOKEN_DECIMALS = 9; // Standard Solana token decimals
export const MBTA_TOKEN_SYMBOL = '$MBTA';

/**
 * Get SOL balance for a wallet address
 * @param {PublicKey} publicKey - Wallet public key
 * @returns {Promise<number>} Balance in SOL
 */
export async function getSolBalance(publicKey) {
  try {
    if (!publicKey) return 0;
    
    console.log('🔍 Fetching balance for:', publicKey.toBase58());
    
    // Try primary endpoint
    try {
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      console.log('✅ Balance fetched successfully:', solBalance, 'SOL');
      return solBalance;
    } catch (primaryError) {
      console.warn('⚠️ Primary RPC failed, trying fallback...', primaryError.message);
      
      // Try fallback endpoint
      const fallbackConnection = new Connection(RPC_ENDPOINTS[1], 'confirmed');
      const balance = await fallbackConnection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      console.log('✅ Balance fetched from fallback:', solBalance, 'SOL');
      return solBalance;
    }
  } catch (error) {
    console.error('❌ Error fetching SOL balance:', error.message);
    console.log('💡 This might be a network issue. Balance will show 0.');
    return 0;
  }
}

/**
 * Get mock $MBTA token balance
 * TODO: Replace with actual SPL token balance query when token is deployed
 * @param {PublicKey} publicKey - Wallet public key
 * @returns {Promise<number>} Mock token balance
 */
export async function getMBTATokenBalance(publicKey) {
  try {
    if (!publicKey) return 0;
    
    // Mock balance based on wallet address (for demo purposes)
    // In production, this will query actual SPL token account
    const addressString = publicKey.toBase58();
    const mockBalance = parseInt(addressString.slice(-4), 16) % 10000;
    
    return mockBalance;
  } catch (error) {
    console.error('Error fetching MBTA token balance:', error);
    return 0;
  }
}

/**
 * Format balance with commas and decimals
 * @param {number} balance - Balance to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted balance
 */
export function formatBalance(balance, decimals = 2) {
  if (typeof balance !== 'number') return '0';
  return balance.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Truncate wallet address for display
 * @param {string} address - Full wallet address
 * @param {number} chars - Number of characters to show on each side
 * @returns {string} Truncated address (e.g., "5Kj4...mN2p")
 */
export function truncateAddress(address, chars = 4) {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Check if wallet has NFT ticket (mock implementation)
 * TODO: Implement actual NFT ownership verification using Metaplex
 * @param {PublicKey} publicKey - Wallet public key
 * @returns {Promise<boolean>} Whether wallet owns ticket NFT
 */
export async function hasTicketNFT(publicKey) {
  try {
    if (!publicKey) return false;
    
    // Mock NFT ownership check
    // In production, query Metaplex for NFT ownership
    const addressString = publicKey.toBase58();
    const hasNFT = parseInt(addressString.slice(-2), 16) % 3 === 0; // ~33% chance for demo
    
    return hasNFT;
  } catch (error) {
    console.error('Error checking NFT ownership:', error);
    return false;
  }
}

export default {
  NETWORK,
  RPC_ENDPOINTS,
  connection,
  MBTA_TOKEN_MINT,
  MBTA_TOKEN_DECIMALS,
  MBTA_TOKEN_SYMBOL,
  getSolBalance,
  getMBTATokenBalance,
  formatBalance,
  truncateAddress,
  hasTicketNFT
};
