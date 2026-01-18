import { 
  Connection, 
  Keypair, 
  clusterApiUrl,
  LAMPORTS_PER_SOL
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
 * Create MBTA Token on Solana Devnet
 * This script creates a real SPL token that can be verified on explorer.solana.com
 */
async function createMBTAToken() {
  console.log('🚀 Creating MBTA Token on Solana Devnet...\n');

  // Connect to devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  console.log('✅ Connected to Solana Devnet\n');

  // Generate a new keypair for the mint authority
  // In production, you would load this from a secure location
  const mintAuthority = Keypair.generate();
  console.log('🔑 Mint Authority Public Key:', mintAuthority.publicKey.toBase58());
  
  // Request airdrop to fund the mint authority
  console.log('\n💰 Requesting airdrop to fund mint authority...');
  console.log('⚠️  If airdrop fails due to rate limiting, you can:');
  console.log('   1. Visit https://faucet.solana.com');
  console.log('   2. Send devnet SOL to:', mintAuthority.publicKey.toBase58());
  console.log('   3. Re-run this script\n');
  
  let balance = await connection.getBalance(mintAuthority.publicKey);
  
  // Try airdrop if balance is low
  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    try {
      const airdropSignature = await connection.requestAirdrop(
        mintAuthority.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      
      // Wait for airdrop confirmation with timeout
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature: airdropSignature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed');
      console.log('✅ Airdrop confirmed!');
      
      balance = await connection.getBalance(mintAuthority.publicKey);
    } catch (error) {
      console.log('❌ Airdrop failed (rate limit or network issue)');
      console.log('\n⏸️  SCRIPT PAUSED - Manual funding required:');
      console.log('   1. Copy this address:', mintAuthority.publicKey.toBase58());
      console.log('   2. Get devnet SOL from: https://faucet.solana.com');
      console.log('   3. Wait 30 seconds for funding to arrive');
      console.log('   4. Press Ctrl+C to exit, then re-run the script\n');
      
      // Save the keypair so user can fund it
      const tempKeypairPath = path.join(__dirname, '..', 'config', 'mintAuthority-temp.json');
      fs.mkdirSync(path.dirname(tempKeypairPath), { recursive: true });
      fs.writeFileSync(
        tempKeypairPath,
        JSON.stringify(Array.from(mintAuthority.secretKey))
      );
      console.log(`💾 Temporary keypair saved to: ${tempKeypairPath}`);
      console.log('   (This will be replaced with the final version after token creation)\n');
      
      throw new Error('Airdrop failed - manual funding required. See instructions above.');
    }
  }
  
  console.log(`💵 Mint Authority Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);
  
  // Verify sufficient balance
  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    throw new Error(`Insufficient balance: ${balance / LAMPORTS_PER_SOL} SOL. Need at least 0.5 SOL.`);
  }

  // Create the token mint
  console.log('🪙  Creating MBTA Token Mint...');
  const mint = await createMint(
    connection,
    mintAuthority,
    mintAuthority.publicKey, // mint authority
    null, // freeze authority (null = no freeze)
    2 // decimals (2 = 100 subunits per token, like cents)
  );
  
  console.log('✅ Token Mint Created!');
  console.log('🎫 MBTA Token Mint Address:', mint.toBase58());
  console.log(`🔍 View on Explorer: https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet\n`);

  // Create token account for the mint authority
  console.log('📦 Creating token account for mint authority...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    mintAuthority,
    mint,
    mintAuthority.publicKey
  );
  console.log('✅ Token Account Created:', tokenAccount.address.toBase58());

  // Mint initial supply (1,000,000 tokens with 2 decimals = 100,000,000 subunits)
  const initialSupply = 100_000_000; // 1,000,000.00 MBTA tokens
  console.log('\n💵 Minting initial supply...');
  await mintTo(
    connection,
    mintAuthority,
    mint,
    tokenAccount.address,
    mintAuthority.publicKey,
    initialSupply
  );
  console.log(`✅ Minted ${initialSupply / 100} MBTA tokens to authority account\n`);

  // Save configuration
  const config = {
    network: 'devnet',
    mintAddress: mint.toBase58(),
    mintAuthority: mintAuthority.publicKey.toBase58(),
    tokenAccount: tokenAccount.address.toBase58(),
    decimals: 2,
    initialSupply: initialSupply / 100,
    createdAt: new Date().toISOString(),
    explorerUrl: `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`
  };

  // Save mint authority keypair
  const keypairPath = path.join(__dirname, '..', 'config', 'mintAuthority.json');
  fs.writeFileSync(
    keypairPath,
    JSON.stringify(Array.from(mintAuthority.secretKey))
  );
  console.log(`🔐 Mint authority keypair saved to: ${keypairPath}`);
  console.log('⚠️  KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT!\n');

  // Save config
  const configPath = path.join(__dirname, '..', 'config', 'tokenConfig.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify(config, null, 2)
  );
  console.log(`📄 Token config saved to: ${configPath}\n`);

  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ MBTA TOKEN CREATION COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Token Details:');
  console.log('   Network:', config.network);
  console.log('   Mint Address:', config.mintAddress);
  console.log('   Decimals:', config.decimals);
  console.log('   Initial Supply:', config.initialSupply, 'MBTA');
  console.log('\n🔗 Verification:');
  console.log('   Explorer:', config.explorerUrl);
  console.log('\n📝 Next Steps:');
  console.log('   1. Update src/config/solanaConfig.js with the mint address');
  console.log('   2. Add mintAuthority.json to .gitignore');
  console.log('   3. Implement token reward functions');
  console.log('   4. Test token transfers in the game');
  console.log('\n💡 Tip: Use this mint address in your game to send real blockchain transactions!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return config;
}

// Run the script
createMBTAToken()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error creating token:', error);
    process.exit(1);
  });
