# BonkBot — Telegram Solana Trading Bot

A production-ready Solana trading bot for Telegram, modeled after BonkBot, Maestro, and Trojan. Features encrypted persistent wallet storage, SOL/SPL transfers, Jupiter-powered swaps, portfolio tracking, and more.

## Features

| Feature | Status |
|---|---|
| Wallet generation (persistent, encrypted) | ✅ |
| Show public key | ✅ |
| Export private key (with auto-delete) | ✅ |
| Import existing wallet | ✅ |
| Multi-wallet support | ✅ |
| SOL balance | ✅ |
| SPL token portfolio | ✅ |
| USD valuations | ✅ |
| Send SOL | ✅ |
| Send SPL tokens | ✅ |
| Swap via Jupiter Aggregator | ✅ |
| Priority fee control | ✅ |
| Slippage control | ✅ |
| Transaction history | ✅ |
| Solscan links | ✅ |
| Rate limiting | ✅ |
| Global error handling | ✅ |
| Input validation | ✅ |
| Graceful shutdown | ✅ |

## Setup

### Prerequisites

- [Bun](https://bun.sh) v1.2+
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- A Solana RPC endpoint (recommended: [Helius](https://helius.dev))
- An encryption key (32+ characters)

### Installation

```bash
git clone <repo-url> bonkbot
cd bonkbot
bun install
```

### Configuration

Copy `.env.example` to `.env` and fill in your values:

```env
BOT_TOKEN=your_telegram_bot_token
ENCRYPTION_KEY=your_32_char_minimum_encryption_key
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
JUPITER_API_URL=https://quote-api.jup.ag/v6
NODE_ENV=development
```

> **IMPORTANT**: `ENCRYPTION_KEY` is used to AES-256-GCM encrypt all private keys at rest. Losing this key = losing access to all user wallets.

### Running

```bash
bun run index.ts
```

For devnet testing:

```bash
RPC_URL=https://api.devnet.solana.com bun run index.ts
```

## Architecture

```
bonkbot/
├── index.ts                     # Entrypoint
├── src/
│   ├── config.ts                # Environment validation (zod)
│   ├── types.ts                 # Shared TypeScript interfaces
│   ├── bot/
│   │   ├── index.ts             # Bot bootstrap & graceful shutdown
│   │   ├── middleware/
│   │   │   ├── auth.ts          # User registration middleware
│   │   │   ├── errorHandler.ts  # Global error handler
│   │   │   └── rateLimit.ts     # Per-user rate limiting
│   │   ├── handlers/
│   │   │   ├── start.ts         # /start command & main menu
│   │   │   ├── wallet.ts        # Wallet actions
│   │   │   ├── portfolio.ts     # Balance & token holdings
│   │   │   ├── swap.ts          # Swap entry handler
│   │   │   └── settings.ts      # User preferences
│   │   └── scenes/
│   │       ├── sendSol.ts       # Send SOL wizard
│   │       ├── sendToken.ts     # Send SPL token wizard
│   │       └── swap.ts          # Token swap wizard
│   ├── services/
│   │   ├── db.service.ts        # SQLite operations
│   │   ├── wallet.service.ts    # Key generation & encryption
│   │   ├── solana.service.ts    # RPC calls & transactions
│   │   ├── swap.service.ts      # Jupiter quote & swap
│   │   └── price.service.ts     # Token price caching
│   ├── db/
│   │   ├── schema.ts            # Table definitions
│   │   └── migrations.ts        # Auto-run on startup
│   └── utils/
│       ├── crypto.ts            # AES-256-GCM encrypt/decrypt
│       ├── format.ts            # SOL/token formatting helpers
│       ├── validate.ts          # Pubkey & amount validation
│       └── keyboard.ts          # Inline keyboard builders
├── data/                        # SQLite database location
├── .env.example
└── package.json
```

## Security

- **Private keys are AES-256-GCM encrypted** before being written to SQLite, using the `ENCRYPTION_KEY` env variable.
- **Keys are decrypted only on demand** and never stored in plaintext in memory beyond a single request.
- **Private key export messages auto-delete** after 30 seconds.
- **Rate limiting** prevents spam and abuse.
- **No stack traces** are ever exposed to users.

## Commands & Flows

- `/start` — Welcome message and main menu
- **Wallet** — Generate, show, export, import wallets
- **Portfolio** — View SOL balance, SPL token holdings, and USD values
- **Swap** — Token-to-token swaps via Jupiter Aggregator
- **Send** — Send SOL or SPL tokens to any Solana address
- **Settings** — Configure slippage tolerance and priority fees

## Testing

### Manual Devnet Testing

1. Set `RPC_URL=https://api.devnet.solana.com`
2. Airdrop SOL: `https://solfaucet.com` or `https://faucet.solana.com`
3. Test: Generate Wallet → View Portfolio → Send SOL → Swap
4. Test error paths: invalid address, insufficient funds

## License

MIT
