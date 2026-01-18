import { 
  Connection, 
  Keypair, 
  clusterApiUrl,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  createInitializeMintInstruction,
  getMintLen,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createMint
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * SIMPLE APPROACH: Create token using Solana CLI commands
 * This avoids rate limiting issues with devnet faucet
 */
async function createTokenWithCLI() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 MBTA Token Creation - CLI Method');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('This method uses Solana CLI to avoid faucet rate limits.\n');
  
  console.log('📋 Step-by-step instructions:\n');
  console.log('1️⃣  Install Solana CLI (if not already installed):');
  console.log('   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"\n');
  
  console.log('2️⃣  Configure for devnet:');
  console.log('   solana config set --url devnet\n');
  
  console.log('3️⃣  Create a new keypair for the token mint:');
  console.log('   solana-keygen new --outfile ~/.config/solana/mbta-authority.json\n');
  
  console.log('4️⃣  Get your public key:');
  console.log('   solana-keygen pubkey ~/.config/solana/mbta-authority.json\n');
  
  console.log('5️⃣  Request airdrop (try multiple times if rate limited):');
  console.log('   solana airdrop 2\n');
  console.log('   OR use alternative faucets:');
  console.log('   - https://faucet.solana.com');
  console.log('   - https://faucet.quicknode.com/solana/devnet');
  console.log('   - Wait 5-10 minutes and try again\n');
  
  console.log('6️⃣  Create the token:');
  console.log('   spl-token create-token --decimals 2\n');
  
  console.log('7️⃣  Copy the mint address from the output\n');
  
  console.log('8️⃣  Create a token account:');
  console.log('   spl-token create-account <MINT_ADDRESS>\n');
  
  console.log('9️⃣  Mint initial supply (1,000,000 tokens):');
  console.log('   spl-token mint <MINT_ADDRESS> 1000000\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const answer = await question('Do you want to:\n  [1] Run these commands manually\n  [2] Use a test mint address (skip token creation)\n  [3] Exit and try airdrop later\n\nEnter choice (1/2/3): ');
  
  if (answer.trim() === '2') {
    // Provide test token option
    console.log('\n✅ Using Test Token Approach\n');
    console.log('You can use an existing devnet token or create a minimal config:\n');
    
    const mintAddress = await question('Enter token mint address (or press Enter to use a placeholder): ');
    
    const configMint = mintAddress.trim() || 'PLACEHOLDER_MINT_ADDRESS';
    
    const config = {
      network: 'devnet',
      mintAddress: configMint,
      decimals: 2,
      createdAt: new Date().toISOString(),
      explorerUrl: `https://explorer.solana.com/address/${configMint}?cluster=devnet`,
      note: configMint === 'PLACEHOLDER_MINT_ADDRESS' 
        ? 'Replace this with actual mint address after creating token via CLI'
        : 'Token mint address provided by user'
    };
    
    // Save config
    const configDir = path.join(__dirname, '..', 'config');
    fs.mkdirSync(configDir, { recursive: true });
    
    const configPath = path.join(configDir, 'tokenConfig.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(config, null, 2)
    );
    
    console.log(`\n✅ Config saved to: ${configPath}\n`);
    console.log('📝 Next steps:');
    console.log('   1. If using placeholder, create your token using CLI commands above');
    console.log('   2. Update tokenConfig.json with your actual mint address');
    console.log('   3. Update src/config/solanaConfig.js with the mint address');
    console.log('   4. Implement token reward functions\n');
  } else if (answer.trim() === '3') {
    console.log('\n👋 Exiting. Try the faucet again later!\n');
  } else {
    console.log('\n📋 Follow the commands above to create your token.');
    console.log('💾 After creation, run this script again and choose option [2] to save the mint address.\n');
  }
  
  rl.close();
}

createTokenWithCLI().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});
