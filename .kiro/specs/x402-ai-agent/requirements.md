# Requirements: Hibra x402 AI Agent Platform

## Introduction

Hibra.app integrates the x402 HTTP payment protocol to create an AI agent monetization and discovery platform on Base mainnet. Users discover autonomous trading agents through the Coinbase x402 Bazaar, pay per-call in USDC via on-chain micropayments, and execute the resulting swap signals through Hibra's existing aggregator routing (Uniswap V3, Aerodrome, SushiSwap, PancakeSwap V3).

**Key clarification:** x402 is a HTTP payment protocol, not a token standard. Agent tokens (ERC-1155 receipts) are an on-chain record layer built on top of x402 HTTP payments.

---

## Functional Requirements

### FR-1: Agent Discovery Page (`/agents`)

1. The system SHALL fetch and display a paginated catalog of x402 agents from `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources` on page load.
2. Each agent card SHALL display: name/description from metadata, price per call in USD (amount / 1_000_000 for USDC 6-decimal), network badge (mapped from EIP-155 chain ID), last updated timestamp, and a "Use This Agent" CTA.
3. The page SHALL support free-text search that calls `/discovery/search?query=<input>&network=eip155:8453&limit=20`.
4. The page SHALL support filtering by `maxUsdPrice` (slider or input, in USD) passed as query param to the search endpoint.
5. The catalog SHALL refresh at most once per 60 seconds per browser session to avoid excessive API calls.
6. IF the Bazaar API returns an empty list or an error, the page SHALL display a non-blocking message and render an empty state without crashing.

### FR-2: Intent Parser API (`POST /api/ai-agent/intent`)

1. The endpoint SHALL accept `{ userMessage: string, walletAddress: string }` and return a structured `ParsedIntent` or a structured error.
2. The endpoint SHALL use Claude (Anthropic API with tool-calling) to extract: `tokenIn`, `amountIn`, `targetAgentQuery`, `maxUsdPrice`, `network`.
3. WHEN Claude is unavailable or returns an error, the endpoint SHALL fall back to regex-based extraction and return the best available result.
4. After extracting `targetAgentQuery`, the endpoint SHALL call `/discovery/search` with that query and return the top 3 matching agents with pricing and description.
5. The Anthropic API key SHALL never be exposed to the browser — all LLM calls happen server-side only.

### FR-3: x402 Payment Executor (`POST /api/ai-agent/execute`)

1. The endpoint SHALL accept `{ agentResourceUrl: string, signedUsdcTx: string, walletAddress: string }`.
2. The executor SHALL call the agent API, receive HTTP 402, parse the `X-PAYMENT-REQUIRED` response header for payment requirements.
3. The executor SHALL verify the submitted USDC payment via the CDP Facilitator at `https://api.cdp.coinbase.com/platform/v2/x402`.
4. After payment confirmation, the executor SHALL retry the agent API with the `X-PAYMENT` proof header and return the agent's response (signal, confidence, trade parameters) to the frontend.
5. The executor SHALL store each call in the `agent_transactions` Supabase table (see Database Schema).

### FR-4: HibraRouter Smart Contract

1. The contract SHALL accept ETH or any ERC-20 token as input.
2. The contract SHALL route input through Aerodrome Finance (primary) or Uniswap V3 (fallback) to output USDC on Base.
3. The contract SHALL emit a `AgentCallFunded(address indexed user, address indexed payTo, uint256 usdcAmount, string agentResourceUrl)` event for attribution.
4. The contract SHALL enforce a maximum slippage of 5% (500 bps) on all AMM swaps.
5. The contract SHALL revert if the output USDC amount is less than the required x402 payment amount.

### FR-5: HibraAgentRegistry Smart Contract (ERC-1155)

1. The contract SHALL mint an ERC-1155 NFT receipt when a user successfully completes an x402 agent call.
2. Each token ID SHALL map to a unique agent identified by the SHA-256 hash of its `resourceUrl`.
3. The contract SHALL allow the Hibra backend (operator role) to call `mint(address to, uint256 tokenId, uint256 amount)`.
4. Token metadata SHALL include: agent description, resource URL, call cost in USDC, call timestamp.

### FR-6: AI Chat & Swap Component

1. The component SHALL render a text input accepting natural language commands up to 500 characters.
2. After intent parsing, the component SHALL display a preview card showing: matched agent, route (tokenIn → USDC → x402 → agent), cost per call, agent signal preview.
3. The "Execute" button SHALL trigger: (a) HibraRouter swap to USDC, (b) x402 payment to agent's `payTo` address, (c) agent API call with payment proof, (d) ERC-1155 receipt mint.
4. The component SHALL use `sendTransactionAsync` from the existing wagmi hooks (standard EOA, no ERC-4337).
5. WHILE a transaction is in-flight, the Execute button SHALL be disabled with a step label ("Swapping…", "Paying…", "Calling Agent…").

### FR-7: Transaction History

1. The `/agents` page SHALL include a tab showing past agent calls for the connected wallet.
2. Each row SHALL display: agent name, cost paid (USDC), signal received summary, resulting swap outcome, timestamp, Basescan link.

---

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Intent parse endpoint SHALL respond in < 2 seconds (p95) |
| NFR-2 | x402 pay + retry cycle SHALL complete in < 3 seconds (p95) |
| NFR-3 | Bazaar catalog fetch SHALL complete in < 1.5 seconds |
| NFR-4 | All API routes SHALL return structured JSON errors — never raw stack traces |
| NFR-5 | The frontend SHALL remain usable (read-only browse) without a connected wallet |
| NFR-6 | Supabase agent cache SHALL be refreshed by background cron every 5 minutes |

---

## x402 Compliance Requirements

1. The executor SHALL handle HTTP 402 responses containing `X-PAYMENT-REQUIRED` header with JSON-encoded payment requirements.
2. Payment requirements SHALL be parsed according to the schema: `{ scheme, network, amount, asset, payTo }`.
3. The executor SHALL format the `X-PAYMENT` proof header as base64-encoded JSON: `{ x402Version, scheme, network, payload: { signature, transaction } }`.
4. The executor SHALL call the CDP Facilitator `/verify` before submitting payment and `/settle` after the agent confirms.
5. Amount fields from the Bazaar API SHALL always be treated as smallest token unit. For USDC (6 decimals): display value = `amount / 1_000_000`.
6. Network IDs SHALL be mapped: `eip155:8453` → "Base Mainnet", `eip155:84532` → "Base Sepolia", `eip155:1` → "Ethereum".

---

## Security Requirements

1. Anthropic API key, CDP API key, and any operator private keys SHALL only reside in server-side environment variables, never in `NEXT_PUBLIC_` variables.
2. The HibraRouter contract SHALL enforce a hard cap of 10,000 USDC per single swap to limit exposure.
3. Slippage on AMM swaps SHALL be capped at 5% (500 bps) — configurable by contract owner, not by users.
4. All agent resource URLs received from the Bazaar SHALL be validated as HTTPS URLs before calling them.
5. The executor SHALL validate that the payment `network` field matches `eip155:8453` before proceeding — reject cross-chain payment requirements.
6. User wallet addresses SHALL be validated as checksummed Ethereum addresses on input.
