# Design: Hibra x402 AI Agent Platform

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Next.js)                           │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐  │
│  │ /agents page │    │   AI Chat & Swap Component               │  │
│  │  Discovery   │    │  ┌────────────────────────────────────┐  │  │
│  │  Catalog     │    │  │ Natural Language Input             │  │  │
│  │  Agent Cards │    │  │ "Find ETH momentum agent < $0.01"  │  │  │
│  │  Search/Filter│   │  └────────────────┬───────────────────┘  │  │
│  └──────┬───────┘    │                   │ POST /api/ai-agent/   │  │
│         │            │                   │ intent                │  │
│         │ GET        │  ┌────────────────▼───────────────────┐  │  │
│         │ /api/      │  │ Intent Preview Card                │  │  │
│         │ agents/    │  │ • Matched agent + description      │  │  │
│         │ catalog    │  │ • Route: ETH → USDC → x402         │  │  │
│         │            │  │ • Cost: $0.001 per call            │  │  │
│         │            │  │ • [Execute] button                 │  │  │
│         │            │  └────────────────┬───────────────────┘  │  │
│         │            │                   │ POST /api/ai-agent/   │  │
│         │            │                   │ execute               │  │
│         │            └───────────────────┼──────────────────────┘  │
└─────────┼─────────────────────────────── │ ────────────────────────┘
          │                                │
          │ wagmi sendTransactionAsync      │
          │ (HibraRouter swap call)         │
          ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTES (server)                  │
│                                                                  │
│  ┌─────────────────────┐    ┌──────────────────────────────┐   │
│  │ GET /api/agents/    │    │ POST /api/ai-agent/intent    │   │
│  │ catalog             │    │ • Claude tool-calling         │   │
│  │ (Bazaar sync cache) │    │ • Regex fallback              │   │
│  └─────────┬───────────┘    │ • Calls /discovery/search    │   │
│            │                └──────────────┬───────────────┘   │
│  ┌─────────▼───────────┐                   │                   │
│  │ Supabase Cache      │    ┌──────────────▼───────────────┐   │
│  │ agents table        │    │ POST /api/ai-agent/execute   │   │
│  │ agent_transactions  │    │ 1. Call agent → 402           │   │
│  └─────────────────────┘    │ 2. Parse X-PAYMENT-REQUIRED  │   │
│                             │ 3. CDP Facilitator /verify   │   │
│                             │ 4. Submit USDC payment tx     │   │
│                             │ 5. CDP Facilitator /settle   │   │
│                             │ 6. Retry agent w/ X-PAYMENT  │   │
│                             │ 7. Mint ERC-1155 receipt      │   │
│                             │ 8. Store in Supabase          │   │
│                             └──────────────┬───────────────┘   │
└──────────────────────────────────────────── │ ──────────────────┘
                                              │
        ┌─────────────────────────────────────┼──────────────────┐
        │              EXTERNAL SERVICES      │                   │
        │                                     │                   │
        │  ┌──────────────────┐    ┌──────────▼──────────────┐  │
        │  │ Coinbase Bazaar  │    │ CDP Facilitator          │  │
        │  │ /discovery/      │    │ /verify  /settle         │  │
        │  │ resources        │    │ (requires CDP API key)   │  │
        │  │ /search          │    └──────────┬───────────────┘  │
        │  │ (no auth needed) │               │                   │
        │  └──────────────────┘    ┌──────────▼───────────────┐  │
        │                          │  x402 Agent API           │  │
        │                          │  (third-party provider)   │  │
        │                          │  Returns: signal,          │  │
        │                          │  confidence, trade params  │  │
        │                          └──────────────────────────┘  │
        └─────────────────────────────────────────────────────────┘
                                              │
        ┌─────────────────────────────────────┼──────────────────┐
        │              BASE MAINNET            │                   │
        │                                     │                   │
        │  ┌──────────────────────┐  ┌────────▼────────────────┐ │
        │  │ HibraAgentRegistry   │  │ HibraRouter Contract     │ │
        │  │ ERC-1155             │  │ ETH/ERC20 → USDC         │ │
        │  │ mint(user, agentId)  │  │ via Aerodrome / Uni V3   │ │
        │  └──────────────────────┘  └─────────────────────────┘ │
        └─────────────────────────────────────────────────────────┘
```

---

## Smart Contract Interfaces

### IHibraRouter

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IHibraRouter {
    event AgentCallFunded(
        address indexed user,
        address indexed payTo,
        uint256 usdcAmount,
        string agentResourceUrl
    );

    /// @notice Swap ETH to USDC and transfer to payTo for x402 payment
    /// @param payTo The merchant address from x402 payment requirements
    /// @param minUsdcOut Minimum USDC output (slippage protection, max 5%)
    /// @param agentResourceUrl The agent's resource URL for attribution event
    function swapETHToUSDCAndPay(
        address payTo,
        uint256 minUsdcOut,
        string calldata agentResourceUrl
    ) external payable returns (uint256 usdcSent);

    /// @notice Swap ERC-20 to USDC and transfer to payTo
    /// @param tokenIn Input token address
    /// @param amountIn Input token amount
    /// @param payTo Merchant address
    /// @param minUsdcOut Minimum USDC output
    /// @param agentResourceUrl Agent URL for attribution
    function swapTokenToUSDCAndPay(
        address tokenIn,
        uint256 amountIn,
        address payTo,
        uint256 minUsdcOut,
        string calldata agentResourceUrl
    ) external returns (uint256 usdcSent);

    /// @notice Max spend cap in USDC (6 decimals), e.g. 10_000_000_000 = $10,000
    function maxUsdcPerSwap() external view returns (uint256);

    /// @notice Max slippage in bps, hardcoded 500 (5%)
    function maxSlippageBps() external view returns (uint256);
}
```

### IHibraAgentRegistry

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IHibraAgentRegistry {
    event AgentReceiptMinted(
        address indexed user,
        uint256 indexed tokenId,
        string agentResourceUrl,
        uint256 usdcCost,
        uint256 timestamp
    );

    /// @notice Mint a receipt NFT for a completed agent call
    /// @param to Recipient (user who called the agent)
    /// @param agentResourceUrl The agent's resource URL
    /// @param usdcCost Amount paid in USDC (smallest unit)
    function mintReceipt(
        address to,
        string calldata agentResourceUrl,
        uint256 usdcCost
    ) external returns (uint256 tokenId);

    /// @notice Get all receipts for a user
    function receiptsOf(address user) external view returns (uint256[] memory tokenIds);

    /// @notice Deterministic token ID from resource URL
    function resourceUrlToTokenId(string calldata resourceUrl) external pure returns (uint256);
}
```

---

## Backend API Contract

### POST /api/ai-agent/intent

**Request:**
```typescript
{
  userMessage: string        // max 500 chars, e.g. "Find ETH momentum agent under $0.01"
  walletAddress: string      // checksummed 0x address
}
```

**Response (success):**
```typescript
{
  parsedIntent: {
    tokenIn: string          // e.g. "ETH"
    amountIn: string         // e.g. "0.01"
    targetAgentQuery: string // e.g. "highest yield momentum agent"
    maxUsdPrice: string      // e.g. "0.01"
    network: "eip155:8453"
  },
  matchedAgents: Array<{
    resource: string         // agent API URL
    description: string
    priceUsd: string         // human-readable, e.g. "0.001000"
    priceRaw: string         // raw amount from Bazaar
    payTo: string            // merchant wallet
    network: string          // "Base Mainnet"
    lastUpdated: string
  }>                         // top 3 matches
}
```

**Response (error):**
```typescript
{
  error: string              // human-readable
  code: "PARSE_FAILED" | "NO_AGENTS_FOUND" | "LLM_ERROR"
}
```

### POST /api/ai-agent/execute

**Request:**
```typescript
{
  agentResourceUrl: string   // validated HTTPS URL
  walletAddress: string
  payTo: string              // merchant address from Bazaar
  amountRaw: string          // USDC amount in smallest unit
  signedSwapTx: string       // hex-encoded signed HibraRouter calldata
}
```

**Response (success):**
```typescript
{
  agentResponse: {
    signal: string           // e.g. "BUY" | "SELL" | "HOLD"
    confidence: number       // 0-1
    tokenPair: string        // e.g. "ETH/USDC"
    rawData: unknown         // agent-specific payload
  },
  receiptTokenId: string     // ERC-1155 token ID minted
  txHash: string             // USDC payment tx hash on Base
  usdcPaid: string           // human-readable USD amount
}
```

**Response (error):**
```typescript
{
  error: string
  code: "PAYMENT_FAILED" | "AGENT_ERROR" | "FACILITATOR_ERROR" | "INVALID_URL"
}
```

---

## x402 Payment Flow Sequence

```
User         Frontend      /api/execute    CDP Facilitator   Agent API
 │               │               │               │               │
 │  click        │               │               │               │
 │ [Execute] ───►│               │               │               │
 │               │ POST execute  │               │               │
 │               │──────────────►│               │               │
 │               │               │  GET agent    │               │
 │               │               │──────────────────────────────►│
 │               │               │               │  HTTP 402     │
 │               │               │◄─────────────────────────────-│
 │               │               │  parse X-PAYMENT-REQUIRED     │
 │               │               │               │               │
 │               │               │  POST /verify │               │
 │               │               │──────────────►│               │
 │               │               │  verified ✓   │               │
 │               │               │◄──────────────│               │
 │               │               │               │               │
 │               │  sign tx prompt              │               │
 │               │◄──────────────│               │               │
 │ approve ─────►│               │               │               │
 │               │ signedTx ────►│               │               │
 │               │               │  submit USDC tx on Base       │
 │               │               │──────────────────────────────►│
 │               │               │  (on-chain settlement)        │
 │               │               │               │               │
 │               │               │  POST /settle │               │
 │               │               │──────────────►│               │
 │               │               │  settled ✓    │               │
 │               │               │◄──────────────│               │
 │               │               │               │               │
 │               │               │  GET agent + X-PAYMENT header │
 │               │               │──────────────────────────────►│
 │               │               │               │  200 + signal │
 │               │               │◄──────────────────────────────│
 │               │               │               │               │
 │               │               │  mint ERC-1155 receipt        │
 │               │               │  store in Supabase            │
 │               │ response      │               │               │
 │               │◄──────────────│               │               │
 │  success UI◄──│               │               │               │
```

---

## Database Schema (Supabase)

### Table: `agents_cache`
```sql
create table agents_cache (
  resource_url    text primary key,
  description     text,
  price_raw       text not null,        -- smallest unit
  price_usd       numeric(10,6) not null, -- converted
  pay_to          text not null,
  network         text not null,        -- e.g. "eip155:8453"
  asset           text not null,        -- USDC contract address
  scheme          text not null,        -- "exact"
  last_updated    timestamptz not null,
  cached_at       timestamptz default now()
);
create index on agents_cache (network);
create index on agents_cache (price_usd);
```

### Table: `agent_transactions`
```sql
create table agent_transactions (
  id              uuid primary key default gen_random_uuid(),
  wallet_address  text not null,
  agent_url       text not null,
  pay_to          text not null,
  usdc_paid_raw   text not null,
  usdc_paid_usd   numeric(10,6) not null,
  tx_hash         text not null,
  receipt_token_id text,
  signal          text,
  confidence      numeric(4,3),
  raw_response    jsonb,
  created_at      timestamptz default now()
);
create index on agent_transactions (wallet_address, created_at desc);
create index on agent_transactions (agent_url);
```
