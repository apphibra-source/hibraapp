# BaseAgg — DEX Aggregator on Base

A DEX aggregator on Base network that finds the best swap routes across Uniswap V3, Aerodrome, SushiSwap, and PancakeSwap V3.

## Features

- 🔄 Multi-DEX quote aggregation (Uniswap V3, Aerodrome, SushiSwap, PancakeSwap V3)
- 💎 NFT Trader tiers (Bronze / Silver / Gold / Diamond)
- 🏆 On-chain leaderboard with Supabase
- 👤 Profile page with portfolio & transaction history
- 📱 Mobile-responsive UI

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS v4
- **Web3:** wagmi v3, viem, RainbowKit v2
- **Database:** Supabase (PostgreSQL)
- **Contracts:** Solidity 0.8.24, Hardhat v3, OpenZeppelin v5

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-username/baseagg.git
cd baseagg
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your values in `.env.local`:
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — from [cloud.walletconnect.com](https://cloud.walletconnect.com)
- `NEXT_PUBLIC_BASE_RPC_URL` — Alchemy or public Base RPC
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from [supabase.com](https://supabase.com)

### 3. Set up Supabase

Run this SQL in your Supabase SQL Editor:

```sql
create table user_scores (
  address       text primary key,
  score         integer not null default 0,
  swap_count    integer not null default 0,
  volume_usd    numeric not null default 0,
  consecutive_days integer not null default 0,
  last_activity timestamptz not null default now()
);

create table swap_records (
  id            uuid primary key default gen_random_uuid(),
  user_address  text not null,
  token_in      text not null,
  token_out     text not null,
  amount_in     text not null,
  amount_out    text not null,
  dex           text not null,
  tx_hash       text not null unique,
  volume_usd    numeric not null default 0,
  score_earned  integer not null default 0,
  created_at    timestamptz not null default now()
);

create index on user_scores (score desc);
create index on swap_records (user_address, created_at desc);

-- Enable RLS with public read/write for demo
alter table user_scores enable row level security;
create policy "public read" on user_scores for select using (true);
create policy "public insert" on user_scores for insert with check (true);
create policy "public update" on user_scores for update using (true);

alter table swap_records enable row level security;
create policy "public read" on swap_records for select using (true);
create policy "public insert" on swap_records for insert with check (true);
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## NFT Contracts

The 4 Trader NFT contracts are deployed on Base mainnet:

| Tier | Required Score | Address |
|------|---------------|---------|
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

- Every swap: **+50 pts**
- Mint any NFT: **+100 pts**

## License

MIT
