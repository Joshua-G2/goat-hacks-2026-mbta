import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';

const walletAddress = '2gqzLnFvzqKUfnzMHySBAARDPakwFFcV3Y3rjX1Y6ebi';
const endpoints = [
  clusterApiUrl('devnet'),  // Default Solana RPC
  'https://api.devnet.solana.com',
  'https://rpc.ankr.com/solana_devnet'
];

async function checkBalance() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Checking balance for:', walletAddress);
  console.log('Network: DEVNET');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log('Trying:', endpoint);
      const conn = new Connection(endpoint, 'confirmed');
      const pubkey = new PublicKey(walletAddress);
      const balance = await conn.getBalance(pubkey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      console.log('✅ SUCCESS!');
      console.log('Balance:', solBalance, 'SOL');
      console.log('Lamports:', balance);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    } catch (error) {
      console.log('❌ Failed:', error.message);
      console.log('');
    }
  }
  
  console.log('❌ ALL ENDPOINTS FAILED!');
  console.log('This is a NETWORK CONNECTIVITY issue.');
  console.log('\nPossible causes:');
  console.log('1. Your internet connection is blocking Solana RPC');
  console.log('2. Corporate firewall or VPN');
  console.log('3. Network proxy settings');
  console.log('\nTry:');
  console.log('- Disable VPN if using one');
  console.log('- Check if you can access https://api.devnet.solana.com/ in browser');
  console.log('- Try from a different network');
}

checkBalance();
