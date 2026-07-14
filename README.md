# BonkBot Telegram Bot

A self-hosted Telegram bot for creating and managing Solana wallets, viewing token balances, sending SOL and SPL tokens, and requesting/executing swaps through a configurable Jupiter-compatible API.

> [!WARNING]
> This project handles private keys and can submit irreversible blockchain transactions. It is an educational starter project, not audited financial software. Review the security notes and known limitations before using it with real funds.

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Current implementation status](#current-implementation-status)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the bot](#running-the-bot)
- [Telegram usage](#telegram-usage)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Wallet and transaction flows](#wallet-and-transaction-flows)
- [Security model](#security-model)
- [Known limitations](#known-limitations)
- [Development](#development)
- [Testing](#testing)
- [Deployment checklist](#deployment-checklist)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [License](#license)

## Overview

BonkBot Telegram Bot provides a menu-driven Telegram interface for common Solana wallet operations. Each Telegram user can create or import a wallet. Private keys are encrypted before being stored in a local SQLite database, and the bot decrypts the active wallet when it needs to sign a transaction.

The current application includes:

- Telegram commands, inline keyboards, and wizard-style flows built with Telegraf.
- Solana RPC integration for balances, token accounts, SOL transfers, and SPL-token transfers.
- Jupiter-compatible quote and swap requests.
- SQLite persistence for users, wallets, settings, and transaction records.
- AES-256-GCM encryption for private keys stored at rest.
- Basic validation, rate limiting, error handling, and graceful shutdown.

This repository is not affiliated with, endorsed by, or maintained by the official BONK project, BonkBot, Jupiter, Telegram, or Solana Labs.

## Features

### Wallet management

- Generate a new Solana keypair.
- Import a base58-encoded Solana secret key.
- Display the active wallet's public key.
- Export the active wallet's private key after a warning and confirmation step.
- Automatically attempt to delete the private-key export message after 30 seconds.
- Store multiple wallet records per Telegram user in SQLite.
- Encrypt private keys with AES-256-GCM before database storage.

### Portfolio

- Display the active wallet's native SOL balance.
- List non-zero SPL token accounts.
- Fetch token prices through Jupiter's price endpoint.
- Show estimated USD values where a price is available.
- Recognize SOL, USDC, BONK, and WIF with human-readable symbols.

### Transfers

- Validate Solana recipient addresses.
- Send native SOL.
- Select and send an SPL token from the wallet's holdings.
- Present a confirmation step before submitting a transfer.
- Store submitted transaction signatures in SQLite.
- Provide Solscan transaction links.

### Swaps

- Use SOL or a manually supplied token mint as the input token.
- Select SOL, USDC, BONK, WIF, or a custom mint as the output token.
- Request quotes with the user's configured slippage.
- Display estimated output, minimum received, price impact, and route labels.
- Sign and submit serialized versioned transactions returned by the swap API.
- Store submitted swap signatures in SQLite.

### Operational safeguards

- Validate required environment variables with Zod.
- Apply an in-memory per-user rate limit of 15 actions per minute.
- Catch unhandled middleware errors and return a generic user-facing message.
- Stop the Telegram bot on `SIGINT` or `SIGTERM`.
- Enable SQLite WAL mode and foreign-key enforcement.

## Current implementation status

| Capability | Status | Notes |
| --- | --- | --- |
| User registration | Implemented | Created automatically from Telegram updates. |
| Wallet generation | Implemented | New secret keys are encrypted before persistence. |
| Wallet import/export | Implemented | Uses base58 secret keys; Telegram remains a sensitive transport. |
| Multiple wallet storage | Partial | Multiple records can be stored, but there is no Telegram UI for selecting or deleting wallets. |
| SOL balance | Implemented | Loaded through the configured Solana RPC endpoint. |
| SPL token holdings | Implemented | Lists non-zero legacy SPL Token Program accounts. |
| USD valuation | Implemented with fallback | Missing or failed prices are treated as zero. |
| SOL transfer | Implemented | Submitted transactions are not subsequently reconciled to confirmed/failed status. |
| SPL token transfer | Experimental | The current amount conversion assumes 9 token decimals. |
| Jupiter quote/swap | Experimental | Decimal handling currently assumes 9 decimals for SOL/output formatting and 6 for non-SOL input amounts. |
| Slippage presets | Implemented | Stored and passed to quote requests. |
| Custom slippage | Implemented | Numeric messages may also be handled outside the intended settings flow. |
| Priority-fee settings | UI/storage only | Transfer execution does not currently consume the saved setting. |
| Custom priority fee | Not completed | The UI asks for input, but no dedicated handler stores it. |
| Notifications setting | Display only | No toggle or notification workflow is implemented. |
| Transaction history UI | Not implemented | Records exist in SQLite, but no Telegram handler displays them. |
| Persistent Telegram scenes | Not implemented | Telegraf sessions are in memory; the `sessions` table is currently unused. |
| Automated tests | Not included | Manual devnet testing is recommended. |

## Technology stack

- **Runtime:** Bun
- **Language:** TypeScript with ES modules
- **Telegram framework:** Telegraf
- **Blockchain SDK:** `@solana/web3.js`
- **SPL token utilities:** `@solana/spl-token`
- **Database:** `bun:sqlite`
- **Validation:** Zod
- **Private-key encoding:** bs58
- **Encryption:** Node.js `crypto`, AES-256-GCM

## Requirements

- Bun with support for `bun:sqlite`.
- A Telegram bot token created through BotFather.
- A Solana JSON-RPC endpoint.
- A secret encryption passphrase of at least 32 characters.
- Network access to Telegram, the configured Solana RPC endpoint, and the configured Jupiter-compatible endpoints.

A dedicated, paid RPC provider is strongly recommended for anything beyond local experimentation because public endpoints may be rate-limited.

## Installation

### 1. Clone or extract the project

```bash
git clone <repository-url> bonkbot-tg-bot
cd bonkbot-tg-bot
```

When using the downloaded archive, extract it and enter the extracted directory instead.

### 2. Install dependencies

```bash
bun install
```

The project includes both `bun.lock` and `package-lock.json`, but the application itself depends on Bun-specific SQLite APIs. Use Bun to run the bot.

### 3. Create the environment file

```bash
cp .env.example .env
```

Fill in every required value before starting the application.

### 4. Create the data directory

```bash
mkdir -p data
```

The database service opens `data/bonkbot.db`. The directory must exist and be writable by the process.

## Configuration

The application validates environment variables at startup in `src/config.ts`. Invalid or missing values cause the process to exit.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `BOT_TOKEN` | Yes | None | Telegram Bot API token. |
| `ENCRYPTION_KEY` | Yes | None | Passphrase used to derive the AES-256-GCM key; minimum 32 characters. |
| `RPC_URL` | Yes | None | Solana JSON-RPC endpoint. |
| `JUPITER_API_URL` | No | `https://quote-api.jup.ag/v6` | Base URL expected to expose `/quote` and `/swap`. |
| `NODE_ENV` | No | `development` | Must be `development`, `production`, or `test`. |

Example `.env`:

```dotenv
BOT_TOKEN=1234567890:replace_with_your_telegram_bot_token
ENCRYPTION_KEY=replace_with_a_unique_random_secret_of_at_least_32_characters
RPC_URL=https://api.devnet.solana.com
JUPITER_API_URL=https://quote-api.jup.ag/v6
NODE_ENV=development
```

### Generate an encryption key

A random value is safer than a memorable password. For example:

```bash
openssl rand -hex 32
```

Store the result in a secret manager in production. Never commit `.env` to source control.

> [!CAUTION]
> All stored wallets depend on the same `ENCRYPTION_KEY`. Losing it makes existing encrypted private keys unrecoverable. Changing it without migrating the stored keys also prevents decryption.

### Network selection

The network is determined entirely by `RPC_URL`.

Devnet example:

```dotenv
RPC_URL=https://api.devnet.solana.com
```

Mainnet example:

```dotenv
RPC_URL=https://api.mainnet-beta.solana.com
```

Solscan links generated by the current code do not append a cluster query parameter. They therefore point to Solscan's default cluster even when the bot is connected to devnet.

## Running the bot

Start the bot from the project root:

```bash
bun run index.ts
```

Expected startup messages include:

```text
[DB] Migrations complete
[BonkBot] Starting...
[Bot] Launch successful
```

Stop it with `Ctrl+C`. The entrypoint listens for `SIGINT` and `SIGTERM` and asks Telegraf to stop cleanly.

## Telegram usage

### Start and main menu

Open the bot in Telegram and send:

```text
/start
```

The main menu contains:

- **Wallet** — generate, display, export, or import a wallet.
- **Portfolio** — show SOL, tokens, and estimated USD value.
- **Swap** — request and execute a token swap.
- **Send** — send SOL or an SPL token.
- **Settings** — configure slippage and view priority-fee options.

### Recommended first-run flow

1. Start the bot with `/start`.
2. Open **Wallet** and generate a wallet.
3. Copy and verify the public key.
4. On devnet, fund it from a trusted faucet.
5. Open **Portfolio** and verify the balance.
6. Test a very small SOL transfer.
7. Test token and swap flows only after reviewing the decimal limitations below.

## Architecture

```text
bonkbot-tg-bot/
├── index.ts                         # Process entrypoint and signal handlers
├── package.json                     # Package metadata and dependencies
├── tsconfig.json                    # Strict TypeScript configuration
├── .env.example                     # Environment-variable template
├── data/                            # Runtime SQLite directory; ignored by Git
└── src/
    ├── config.ts                    # Zod environment validation
    ├── types.ts                     # Shared application interfaces
    ├── bot/
    │   ├── index.ts                 # Telegraf setup, middleware, scenes, launch
    │   ├── handlers/
    │   │   ├── start.ts             # /start and main-menu navigation
    │   │   ├── wallet.ts            # Wallet menu, generate, show, import/export
    │   │   ├── portfolio.ts         # SOL/token balances and USD estimates
    │   │   ├── swap.ts              # Swap-scene entry action
    │   │   └── settings.ts          # Slippage and priority-fee settings UI
    │   ├── middleware/
    │   │   ├── auth.ts              # Automatic user creation/update
    │   │   ├── errorHandler.ts       # Global middleware error handling
    │   │   └── rateLimit.ts         # In-memory per-user rate limiting
    │   └── scenes/
    │       ├── sendSol.ts            # SOL transfer wizard
    │       ├── sendToken.ts          # SPL-token transfer wizard
    │       └── swap.ts               # Jupiter quote/execution wizard
    ├── db/
    │   ├── schema.ts                # SQLite table definitions
    │   └── migrations.ts            # Startup schema creation and pragmas
    ├── services/
    │   ├── db.service.ts            # SQLite data-access singleton
    │   ├── wallet.service.ts        # Key generation, import, export, encryption
    │   ├── solana.service.ts        # RPC reads and transfer submission
    │   ├── swap.service.ts          # Quote, swap, and price API calls
    │   └── price.service.ts         # 30-second in-memory price cache
    └── utils/
        ├── crypto.ts                # AES-256-GCM encryption/decryption
        ├── format.ts                # SOL, token, USD, and link formatting
        ├── validate.ts              # Address, amount, and slippage validation
        └── keyboard.ts              # Telegram inline-keyboard builders
```

### Request lifecycle

1. Telegram sends an update to Telegraf through long polling.
2. Session, error, rate-limit, authentication, and scene middleware run in order.
3. The matching action, command, text handler, or wizard step executes.
4. Services read or write SQLite, call Solana RPC, or call the swap API.
5. For signed operations, the active wallet key is decrypted and used to sign the transaction.
6. The bot sends a result and, where available, a Solscan link back to Telegram.

## Data model

The database is created automatically at `data/bonkbot.db`.

### `users`

Stores the Telegram user ID, username, creation time, and a JSON settings object.

### `wallets`

Stores wallet metadata and the encrypted base58 private key. A user may have multiple records, but only the first wallet is automatically active unless another wallet is selected programmatically.

### `transactions`

Stores submitted SOL transfers, token transfers, and swaps. New records are created with a `pending` status. The current bot does not run a reconciliation worker to update that status.

### `sessions`

Defined by the schema but not connected to Telegraf's session middleware in the current implementation.

SQLite is configured with:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```

## Wallet and transaction flows

### Wallet generation

1. `Keypair.generate()` creates a Solana keypair.
2. The 64-byte secret key is base58-encoded.
3. The configured encryption passphrase is hashed with SHA-256 to derive a 32-byte encryption key.
4. The secret is encrypted using AES-256-GCM with a random 16-byte IV.
5. The database stores the payload as `iv:authenticationTag:ciphertext`.

### Wallet import

The import text handler accepts a base58-looking string of 87 or 88 characters, decodes it, and passes it to `Keypair.fromSecretKey`. A valid key is encrypted and inserted into the wallet table.

### SOL transfer

The wizard collects a recipient and SOL amount, checks the current balance, builds a versioned transaction containing a compute-unit-price instruction and a system transfer instruction, signs it, and submits it to the configured RPC endpoint.

The balance check does not reserve SOL for transaction fees. Sending the full displayed balance may fail.

### SPL-token transfer

The bot lists non-zero token accounts, lets the user choose a mint, creates or loads associated token accounts, builds a transfer instruction, signs the transaction, and submits it.

The current wizard converts the human amount using `10^9`, regardless of the token mint's actual decimals. This must be corrected before relying on arbitrary token transfers.

### Swap

The bot requests a quote from:

```text
<JUPITER_API_URL>/quote
```

It then posts the quote to:

```text
<JUPITER_API_URL>/swap
```

The returned base64 transaction is deserialized, signed by the active wallet, and submitted through the configured Solana connection.

The current quote amount conversion and output formatting use fixed decimal assumptions. Review [Known limitations](#known-limitations) before testing non-SOL assets.

## Security model

### What the code currently protects

- Private keys are not stored as plaintext in SQLite.
- AES-GCM provides authenticated encryption, so altered ciphertext should fail decryption.
- A random IV is generated for every encryption operation.
- `.env` and the `data/` directory are excluded by `.gitignore`.
- Private-key export requires an explicit confirmation action.
- The export response is scheduled for deletion after 30 seconds.
- User-facing global errors do not include stack traces.

### Important security boundaries

This is a **custodial application** from the server operator's perspective. The process can decrypt every wallet stored with its configured encryption key. Anyone who gains access to both the database and the environment secret can recover the wallets.

Telegram is not an appropriate secure channel for long-term secret handling. Importing or exporting a private key can expose it through message history, notifications, screenshots, backups, compromised devices, Telegram clients, logs, or bot-administrator access. Message deletion is best-effort and does not guarantee that all copies disappear.

### Recommended hardening before real use

- Run only in private chats and explicitly reject group/supergroup contexts.
- Add an allowlist when the bot is intended for a limited set of operators.
- Store `ENCRYPTION_KEY` in a managed secret store rather than a plain environment file.
- Separate database and secret access across infrastructure boundaries where possible.
- Encrypt backups and test restoration procedures.
- Add structured security logging without logging private keys, seed material, or full sensitive payloads.
- Implement transaction simulation and explicit fee estimation before signing.
- Add token-mint metadata and decimal verification for every token operation.
- Require a second confirmation for large-value transactions.
- Add withdrawal and swap limits.
- Add monitoring, alerting, dependency scanning, and incident-response procedures.
- Obtain an independent security review before using real funds.

## Known limitations

The following limitations are present in the current source code:

1. **Token transfer decimals are fixed at 9.** Many SPL tokens use other decimal counts, so the submitted raw amount may be incorrect.
2. **Swap input decimals are fixed.** SOL uses 9 decimals; every other input mint is treated as if it used 6 decimals.
3. **Swap output display uses 9 decimals.** Expected and minimum output values may be displayed incorrectly for tokens with different decimals.
4. **No token-balance check occurs before a token transfer or swap.** Failures are generally left to the RPC or swap transaction.
5. **SOL validation does not reserve network fees.** A transfer of the entire balance may fail.
6. **Saved priority-fee preferences are not wired into sends.** SOL sends use the service's fixed default, while Jupiter swaps request automatic prioritization.
7. **Custom priority-fee input is unfinished.** The interface prompts for a number but has no dedicated persistence handler.
8. **Notification preferences are not actionable.** The setting exists in the model and UI output only.
9. **Multiple-wallet management is incomplete.** The database supports multiple wallets, but the Telegram UI does not switch, rename, list, or delete them.
10. **Transaction statuses remain pending.** The bot stores submitted signatures but does not confirm them asynchronously or update records.
11. **No transaction-history screen exists.** Database methods are present, but no handler exposes them.
12. **Sessions are process-local.** Restarting the bot interrupts active wizard flows; the database `sessions` table is unused.
13. **Rate limiting is process-local.** Limits reset on restart and are not shared across multiple instances.
14. **The rate-limit map has no cleanup routine.** Long-running public bots may retain entries for users who no longer interact.
15. **Private-chat enforcement is absent.** Users could interact with the bot in contexts that are unsafe for wallet secrets.
16. **The generic numeric settings handler is global.** Numeric text can be interpreted as a custom slippage value outside a dedicated settings state.
17. **Only legacy SPL Token Program accounts are queried.** Token-2022 holdings are not included.
18. **Solscan links are not cluster-aware.** Devnet transactions may open on the wrong explorer cluster.
19. **Price failures silently become zero.** Portfolio totals may understate value when the price API is unavailable.
20. **No automated test suite is included.** Transaction and security behavior has not been verified by repository tests.

## Development

### Type checking

The project is configured with strict TypeScript settings and no emitted JavaScript:

```bash
bunx tsc --noEmit
```

### Useful development command

```bash
NODE_ENV=development bun --watch index.ts
```

### Coding guidelines

- Keep private-key material inside the smallest possible scope.
- Never log secret keys, encrypted payloads, bot tokens, or full environment values.
- Validate all callback data and user input, even when Telegram buttons generated it.
- Read actual mint decimals before converting human-readable token amounts.
- Simulate transactions where practical before submission.
- Preserve the separation between Telegram handlers, blockchain services, persistence, and formatting utilities.
- Add tests for every financial calculation and unit conversion.

## Testing

No automated tests are currently included. Use devnet and disposable wallets for manual testing.

### Suggested manual devnet test plan

1. Configure a devnet RPC endpoint and a separate test bot token.
2. Start the bot and create a new wallet.
3. Verify that `data/bonkbot.db` is created and contains no plaintext private key.
4. Fund the wallet with devnet SOL.
5. Confirm the portfolio displays the SOL balance.
6. Send a small amount of SOL to another devnet address.
7. Verify the signature independently with a devnet-aware explorer or RPC query.
8. Restart the bot and confirm the wallet remains accessible with the same encryption key.
9. Start a wizard, restart the process, and confirm the current session limitation is understood.
10. Test invalid addresses, zero/negative amounts, malformed private keys, insufficient funds, unavailable RPC, and unavailable swap API.
11. Verify rate-limit behavior after more than 15 actions in one minute.
12. Verify that exported key messages are deleted when the bot has permission to delete them.

Do not test arbitrary SPL token transfers until the fixed decimal conversion is corrected.

## Deployment checklist

Before deploying beyond local development:

- [ ] Use a dedicated Telegram bot token.
- [ ] Use a unique high-entropy encryption key stored in a secret manager.
- [ ] Create and permission the `data/` directory for only the bot service account.
- [ ] Configure encrypted, access-controlled database backups.
- [ ] Use a reliable Solana RPC endpoint with appropriate limits.
- [ ] Verify that the configured swap API supports the expected `/quote` and `/swap` contracts.
- [ ] Restrict the bot to private chats and intended users.
- [ ] Fix token decimal handling for transfers and swaps.
- [ ] Implement transaction simulation, fee reservation, and confirmation tracking.
- [ ] Add persistent sessions or make interrupted flows recoverable.
- [ ] Add tests, linting, dependency auditing, and CI.
- [ ] Add process supervision and restart policies.
- [ ] Add monitoring for database failures, RPC errors, rejected transactions, and unexpected exports.
- [ ] Review all user-facing financial values for correct decimal handling.
- [ ] Complete an independent security review.

## Troubleshooting

### `Invalid environment variables`

The startup validator prints every invalid field. Check that:

- `BOT_TOKEN` is present.
- `ENCRYPTION_KEY` contains at least 32 characters.
- `RPC_URL` and `JUPITER_API_URL` are valid absolute URLs.
- `NODE_ENV` is one of the accepted values.

### `unable to open database file`

Create the runtime directory and make it writable:

```bash
mkdir -p data
chmod 700 data
```

### The bot starts but does not reply

- Confirm that the token belongs to the correct bot.
- Ensure another process is not already polling with the same token.
- Verify outbound access to Telegram.
- Review the process logs for middleware errors.

### Portfolio values show `$0`

A zero price can mean the price service did not return data for the mint or the request failed. The token balance may still be present.

### A SOL transfer fails despite a sufficient displayed balance

The validation compares only the transfer amount with the account balance and does not reserve the transaction fee. Try a smaller amount.

### Token transfer amount is wrong or the transaction fails

The current transfer wizard assumes the token uses 9 decimals. Do not use it for tokens with a different mint decimal configuration until the implementation is fixed.

### A swap quote looks incorrectly formatted

The current implementation uses fixed decimal assumptions for quote amounts and display values. Verify the input and output mint decimals independently.

### Existing wallets cannot be opened after changing `ENCRYPTION_KEY`

The old key is required to decrypt existing records. Restore the previous secret or implement a controlled migration that decrypts each record with the old key and re-encrypts it with the new one.

## Contributing

Contributions are welcome, especially for:

- Correct mint-decimal handling.
- Transaction simulation and confirmation reconciliation.
- Complete multi-wallet management.
- Persistent Telegraf sessions.
- Private-chat and user allowlist enforcement.
- Token-2022 support.
- Cluster-aware explorer links.
- Automated unit, integration, and security tests.
- CI, linting, and dependency auditing.

For a clean contribution:

1. Create a focused branch.
2. Keep changes small and explain security implications.
3. Add or update tests for financial calculations and signing flows.
4. Run type checking and relevant manual devnet tests.
5. Never include real bot tokens, private keys, databases, or `.env` files in commits.

## Disclaimer

This software is provided for educational and development purposes. Cryptocurrency transactions are irreversible and may result in loss of funds. The maintainers and contributors do not provide financial, investment, custody, security, or legal advice and are not responsible for losses, failed transactions, compromised keys, third-party API behavior, or misuse of this software.

Use disposable wallets and devnet while developing. Do not deposit funds you cannot afford to lose.

## License

This project is licensed under the MIT License. See [`LICENSE.md`](LICENSE.md) for the full text.
