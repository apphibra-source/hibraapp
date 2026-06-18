# Hibra — AI-Powered DEX Aggregator on Base

Hibra is an open-source DEX aggregator on Base network. It finds the best swap routes across Uniswap V3, Aerodrome, SushiSwap, and PancakeSwap V3 — and includes an AI agent powered by xAI Grok that lets you swap tokens using natural language.

Live at [hibra.app](https://hibra.app)

## Features

- **Multi-DEX aggregation** — Uniswap V3, Aerodrome, SushiSwap, PancakeSwap V3
- **AI swap agent** — Chat with Grok to find routes and execute swaps
- **x402 payments** — AI swaps require a $0.10 USDC microtransaction (on-chain, via Coinbase x402)
- **NFT Trader tiers** — Bronze / Silver / Gold / Diamond based on trading score
- **On-chain leaderboard** — Powered by Supabase
- **Profile page** — Portfolio balances + full transaction history
- **Mobile-responsive** — Works on any device

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| Web3 | wagmi v3, viem, RainbowKit v2 |
| AI | xAI Grok (`grok-3`) via OpenAI-compatible API |
| Payments | Coinbase x402 + CDP |
| Database | Supabase (PostgreSQL) |
| Contracts | Solidity 0.8.24, Hardhat v3, OpenZeppelin v5 |

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-username/hibra.git
cd hibra
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your values — see `.env.example` for all required variables:

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `NEXT_PUBLIC_BASE_RPC_URL` | [alchemy.com](https://alchemy.com) or use public `https://mainnet.base.org` |
| `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` | [supabase.com](https://supabase.com) |
| `XAI_API_KEY` | [console.x.ai](https://console.x.ai) |
| `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET` | [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) |
| `PAYMENT_WALLET_ADDRESS` | Your wallet address (receives x402 fees) |
| `MINT_SIGNER_PRIVATE_KEY` | Private key used to sign NFT mint approvals |

### 3. Set up Supabase

Run this SQL in your Supabase SQL Editor:

```sql
create table user_scores (
  address          text primary key,
  score            integer not null default 0,
  swap_count       integer not null default 0,
  volume_usd       numeric not null default 0,
  consecutive_days integer not null default 0,
  last_activity    timestamptz not null default now()
);

create table swap_records (
  id           uuid primary key default gen_random_uuid(),
  user_address text not null,
  token_in     text not null,
  token_out    text not null,
  amount_in    text not null,
  amount_out   text not null,
  dex          text not null,
  tx_hash      text not null unique,
  volume_usd   numeric not null default 0,
  score_earned integer not null default 0,
  created_at   timestamptz not null default now()
);

create index on user_scores (score desc);
create index on swap_records (user_address, created_at desc);

-- RLS (public read/write for demo — tighten in production)
alter table user_scores enable row level security;
create policy "public read"   on user_scores for select using (true);
create policy "public insert" on user_scores for insert with check (true);
create policy "public update" on user_scores for update using (true);

alter table swap_records enable row level security;
create policy "public read"   on swap_records for select using (true);
create policy "public insert" on swap_records for insert with check (true);
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** x402 AI payments only activate on public HTTPS domains. On localhost the AI agent runs without payment.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example` in Vercel's project settings
4. Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://hibra.app`)
5. Deploy

## NFT Contracts

Four Trader NFT tiers are deployed on Base mainnet:

| Tier | Required Score | Contract Address |
|------|---------------|-----------------|
| Bronze | 500+ pts | `0xF377BAC078Af4f6112b9Ca8DCACA0044F8dD2eF8` |
| Silver | 1000+ pts | `0x80fE9521638C0d18B3F8cbF512e30D2249caA5F6` |
| Gold | 1500+ pts | `0xaA8909D483B6763F638D7a3a35b4BcA805f02375` |
| Diamond | 2000+ pts | `0x521b325241325c65c600479E6D2C58522f2fB8a6` |

To deploy your own contracts:

```bash
cd contracts
cp .env.example .env
# Fill in PRIVATE_KEY, ALCHEMY_API_KEY, OWNER_ADDRESS
npx hardhat run scripts/deploy.js --network base
```

## Scoring

| Action | Points |
|--------|--------|
| Complete a swap | +50 pts |
| Mint a Trader NFT | +100 pts |

## Project Structure

```
app/              # Next.js app router pages and API routes
components/       # React components (swap, agent, profile, leaderboard)
hooks/            # Custom React hooks (quotes, balances, swap execution)
lib/              # Core logic (DEX quote fetchers, contracts, Supabase)
contracts/        # Hardhat project — Solidity NFT contracts
types/            # TypeScript types
constants/        # Token list and contract addresses
```

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
