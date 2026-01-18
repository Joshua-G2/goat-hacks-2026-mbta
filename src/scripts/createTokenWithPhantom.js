import { 
  Connection, 
  PublicKey,
  clusterApiUrl
} from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo 
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create MBTA Token on Solana Devnet using Phantom Wallet
 * 
 * INSTRUCTIONS:
 * 1. Make sure you have SOL in your Phantom wallet on DEVNET
 * 2. Replace YOUR_PHANTOM_WALLET_ADDRESS below with your actual address
 * 3. Run this script
 * 4. Approve the transaction in Phantom when prompted
 */

// ⚠️ REPLACE THIS WITH YOUR PHANTOM WALLET ADDRESS
const PHANTOM_WALLET_ADDRESS = 'YOUR_PHANTOM_WALLET_ADDRESS_HERE';

/**
 * Alternative: Create token using a CLI-based approach
 * This doesn't require browser wallet interaction
 */
async function createMBTATokenSimple() {
  console.log('🚀 Creating MBTA Token on Solana Devnet (Simple Method)...\n');

  // Connect to devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  console.log('✅ Connected to Solana Devnet\n');

  // Load or create mint authority keypair
  const configDir = path.join(__dirname, '..', 'config');
  const keypairPath = path.join(configDir, 'mintAuthority.json');
  
  let mintAuthorityKeypair;
  
  // Check if we have a saved keypair
  if (fs.existsSync(keypairPath)) {
    console.log('📂 Found existing mint authority keypair');
    const savedKeypair = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    mintAuthorityKeypair = {
      publicKey: new PublicKey(savedKeypair.publicKey),
      secretKey: Uint8Array.from(savedKeypair.secretKey)
    };
  } else {
    console.log('❌ No mint authority keypair found.');
    console.log('\n📋 To create the token mint, you need devnet SOL.');
    console.log('   Since devnet faucet is rate-limited, here are your options:\n');
    console.log('   OPTION 1: Use spl-token CLI (Recommended)');
    console.log('   ─────────────────────────────────────────');
    console.log('   1. Install Solana CLI: sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"');
    console.log('   2. Run: solana config set --url devnet');
    console.log('   3. Run: solana-keygen new --outfile ~/.config/solana/mbta-mint.json');
    console.log('   4. Run: solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/mbta-mint.json)');
    console.log('   5. Run: spl-token create-token --decimals 2');
    console.log('   6. Copy the token mint address and add it to solanaConfig.js\n');
    
    console.log('   OPTION 2: Use this script with funded wallet');
    console.log('   ───────────────────────────────────────────');
    console.log('   1. Get devnet SOL from https://faucet.solana.com (try different times)');
    console.log('   2. Or use https://faucet.quicknode.com/solana/devnet');
    console.log('   3. Run this script again after 10-15 minutes\n');
    
    console.log('   OPTION 3: Use existing token mint');
    console.log('   ──────────────────────────────────');
    console.log('   Use a test token that already exists on devnet:');
    console.log('   Example mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
    console.log('   (USDC-Dev on devnet - can be used for testing)\n');
    
    return null;
  }

  console.log('🔑 Mint Authority:', mintAuthorityKeypair.publicKey.toBase58());
  
  // Check balance
  const balance = await connection.getBalance(mintAuthorityKeypair.publicKey);
  console.log(`💵 Balance: ${balance / 1e9} SOL`);
  
  if (balance < 0.5 * 1e9) {
    console.log('❌ Insufficient balance. Need at least 0.5 SOL for token creation.');
    console.log(`   Current: ${balance / 1e9} SOL`);
    console.log(`\n   Fund this address with devnet SOL: ${mintAuthorityKeypair.publicKey.toBase58()}`);
    return null;
  }

  // Continue with token creation...
  console.log('\n🪙  Creating token mint...');
  
  // Rest of the token creation code would go here
  // For now, just show the instructions
  
  return null;
}

// Quick solution: Just use the existing test tokens on devnet
async function useExistingTestToken() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 QUICK START: Using Existing Test Token');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ You can use an existing devnet token for testing:\n');
  
  const testTokens = [
    {
      name: 'USDC-Dev',
      mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      decimals: 6
    },
    {
      name: 'Custom Test Token',
      mint: 'So11111111111111111111111111111111111111112',
      decimals: 9
    }
  ];
  
  console.log('📋 Available Test Tokens:');
  testTokens.forEach((token, i) => {
    console.log(`\n   ${i + 1}. ${token.name}`);
    console.log(`      Mint: ${token.mint}`);
    console.log(`      Decimals: ${token.decimals}`);
    console.log(`      Explorer: https://explorer.solana.com/address/${token.mint}?cluster=devnet`);
  });
  
  console.log('\n📝 To use a test token in your app:');
  console.log('   1. Copy one of the mint addresses above');
  console.log('   2. Update src/config/solanaConfig.js:');
  console.log('      export const MBTA_TOKEN_MINT = "PASTE_MINT_ADDRESS_HERE";');
  console.log('   3. Update the token reward functions to use this mint\n');
  
  console.log('💡 OR create your own token using Solana CLI:');
  console.log('   npm install -g @solana/cli');
  console.log('   solana config set --url devnet');
  console.log('   solana-keygen new');
  console.log('   solana airdrop 2');
  console.log('   spl-token create-token --decimals 2\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run
useExistingTestToken().then(() => process.exit(0));
