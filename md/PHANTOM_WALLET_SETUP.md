# Phantom Wallet Setup Guide - MBTA Transit Game

## Problem: Can't See Tokens in Phantom Wallet

You likely received **SOL** (Solana's native cryptocurrency) from a faucet, but you're looking in the wrong place or the app isn't configured correctly.

## ✅ Step-by-Step Solution

### 1. **Check Phantom Wallet is on Devnet**
   - Open Phantom wallet extension
   - Click the hamburger menu (☰) → Settings
   - Scroll to "Developer Settings"
   - Click "Change Network"
   - Select **"Devnet"** (NOT Mainnet)
   - ⚠️ This is crucial! Faucet tokens only work on Devnet

### 2. **Verify SOL Balance in Phantom**
   - Open Phantom wallet
   - You should see SOL balance at the top
   - If you see "0 SOL", the faucet transaction might not have completed
   - Check recent activity in Phantom to see if transaction arrived

### 3. **Get Devnet SOL from Faucet (If Balance is 0)**

   **Option A: Solana Faucet (Recommended)**
   1. Copy your wallet address from Phantom
   2. Go to: https://faucet.solana.com/
   3. Paste your address
   4. Click "Request Airdrop"
   5. Wait 30-60 seconds
   6. Refresh Phantom wallet

   **Option B: QuickNode Faucet**
   1. Go to: https://faucet.quicknode.com/solana/devnet
   2. Paste your wallet address
   3. Complete CAPTCHA
   4. Click "Request SOL"

### 4. **Connect Wallet to App**
   1. Open the app at http://localhost:5176/
   2. Click "Select Wallet" button
   3. Choose **Phantom** from the list
   4. Click "Connect" in Phantom popup
   5. Your SOL balance should appear in:
      - WalletConnect component (top of app)
      - Points Tracker (Wallet Balance card)

---

## 🔍 Understanding Token Types

### SOL (Native Token)
- ✅ What you got from the faucet
- ✅ Shows in Phantom wallet main screen
- ✅ Shows in app's WalletConnect component
- Used to pay transaction fees on Solana

### $MBTA Token (Custom SPL Token)
- ❌ NOT deployed yet (mock/placeholder)
- ❌ Won't show in Phantom (doesn't exist on devnet)
- Currently shows fake balance in app for demo purposes
- Will be real token in future updates

---

## 🐛 Troubleshooting

### "I requested from faucet but still 0 SOL"
**Solutions:**
1. **Wait 1-2 minutes** - Devnet can be slow
2. **Check Phantom activity tab** - Look for incoming transaction
3. **Try different faucet** - Some faucets have daily limits
4. **Verify devnet mode** - Most common mistake!

### "App shows 0 SOL even though Phantom shows balance"
**Solutions:**
1. **Disconnect and reconnect** wallet in app
2. **Refresh the page** (hard refresh: Cmd+Shift+R on Mac)
3. **Check browser console** for errors (F12 → Console tab)
4. **Verify publicKey** in app matches Phantom address

### "Wallet won't connect"
**Solutions:**
1. **Allow popup** - Check if browser blocked Phantom popup
2. **Unlock Phantom** - Make sure wallet is unlocked
3. **Restart browser** - Sometimes Phantom extension needs restart
4. **Clear site data** - Settings → Privacy → Clear browsing data

---

## 🎮 App Features That Work Now

With SOL in your devnet wallet, you can:

✅ **View SOL Balance** - Shows real balance from blockchain
✅ **Connect/Disconnect** - Phantom wallet integration working
✅ **Play Game** - Upload ticket and start playing
✅ **Track Progress** - Points, tokens (mock), time tracking

---

## 📊 Current Token Display in App

| Location | Token Type | Source |
|----------|-----------|--------|
| WalletConnect Component | SOL | ✅ Real (from blockchain) |
| Points Tracker - Wallet Card | $MBTA | ❌ Mock (random number) |
| TicketUpload - NFT Badge | NFT | ❌ Mock (33% random) |

---

## 🚀 Future Updates

Coming soon:
- Real $MBTA SPL token deployment on devnet
- Actual NFT ticket minting via Metaplex
- Token rewards for completing routes
- NFT collectibles for rare achievements

---

## 📝 Quick Reference: Wallet Addresses

**Your Phantom Address:**
- Copy from Phantom → Click address to copy
- Format: `5Kj4pQbPm...Nx2mN2p` (Base58 encoded)
- Same address works on all Solana networks (mainnet/devnet/testnet)
- Network determines which tokens you see

**Devnet vs Mainnet:**
- **Devnet** = Testing network (fake tokens, no real value)
- **Mainnet** = Production network (real tokens, real value)
- ⚠️ Always use devnet for this app!

---

## ✅ Verification Checklist

Before reporting issues, verify:

- [ ] Phantom is on **Devnet** network
- [ ] Phantom shows SOL balance > 0
- [ ] App is running at http://localhost:5176/
- [ ] Wallet is **connected** in app (see green checkmark)
- [ ] Browser allows popups for localhost
- [ ] No console errors (F12 → Console tab)

---

## 🆘 Still Having Issues?

1. **Check browser console** (F12) for error messages
2. **Screenshot Phantom balance** showing SOL amount
3. **Screenshot app wallet display** showing connection status
4. **Check Solana devnet status**: https://status.solana.com/
5. **Try different browser** (Chrome recommended for Phantom)

---

## 📌 Important Notes

- Devnet tokens have **no real value** - they're for testing only
- Faucets have **rate limits** - usually 1 airdrop per address per 24h
- The $MBTA token shown in app is **placeholder/mock data**
- Real token deployment coming in future updates
