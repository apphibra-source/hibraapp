# Tasks: Hibra x402 AI Agent Platform

## Phase 1: Bazaar Sync + Discovery UI

- [ ] **1.1** Create Supabase tables `agents_cache` and `agent_transactions` using the SQL in design.md
- [ ] **1.2** Add RLS policies: public read on `agents_cache`, authenticated write on `agent_transactions`
- [ ] **1.3** Create `lib/bazaar.ts` — typed client for the 3 Bazaar endpoints (resources, search, merchant)
  - `fetchCatalog(limit, offset)` → paginated list
  - `searchAgents(query, maxUsdPrice, limit)` → semantic search
  - `priceRawToUsd(raw: string): string` — convert amount / 1_000_000
  - `networkToLabel(eipChainId: string): string` — chain ID → human name
- [ ] **1.4** Create `app/api/agents/catalog/route.ts` — GET handler that reads from `agents_cache` (Supabase), refreshes from Bazaar if cache is stale (>5 min)
- [ ] **1.5** Create `app/api/agents/sync/route.ts` — POST handler (cron-triggered) that fetches full catalog from Bazaar and upserts into `agents_cache`
- [ ] **1.6** Set up Vercel cron job in `vercel.json` to call `/api/agents/sync` every 5 minutes
- [ ] **1.7** Create `app/agents/page.tsx` — Agent Discovery page
  - Searchable header with text input + maxUsdPrice slider
  - Grid of `AgentCard` components (skeleton loading state)
  - Empty state if no results
  - Tab: "Browse Agents" | "My History"
- [ ] **1.8** Create `components/agents/AgentCard.tsx`
  - Props: resource, description, priceUsd, network, lastUpdated, payTo
  - "Use This Agent" button → sets agent in chat component
- [ ] **1.9** Add "AI Agent" nav link to Navbar right after "Swap" (already partially done — verify icon and routing)
- [ ] **1.10** Build check: `npm run build` must pass with no errors

---

## Phase 2: Intent Parser + LLM Integration

- [ ] **2.1** Add `ANTHROPIC_API_KEY` and `CDP_API_KEY` to `.env.local` and `.env.example` (server-side only)
- [ ] **2.2** Install `@anthropic-ai/sdk`: `npm install @anthropic-ai/sdk --legacy-peer-deps`
- [ ] **2.3** Create `lib/intent-parser.ts`
  - `parseIntentWithClaude(message, walletAddress)` — tool-calling extraction
  - `parseIntentWithRegex(message)` — fallback for basic patterns
  - Exported type: `ParsedIntent { tokenIn, amountIn, targetAgentQuery, maxUsdPrice, network }`
- [ ] **2.4** Create `app/api/ai-agent/intent/route.ts` — POST handler
  - Validate input (message max 500 chars, address checksum)
  - Call intent parser (Claude first, regex fallback)
  - Call Bazaar search with `targetAgentQuery`
  - Return ParsedIntent + top 3 matched agents
  - Never expose Anthropic errors to client
- [ ] **2.5** Create `hooks/useIntentParser.ts` — React hook that calls `/api/ai-agent/intent`
  - States: idle | loading | success | error
  - Debounced submit on Enter key or button click
- [ ] **2.6** Create `components/agents/IntentInput.tsx`
  - Large text area with placeholder "Describe what you want..."
  - Submit button with loading spinner
  - Inline error display
- [ ] **2.7** Build + type check passes

---

## Phase 3: x402 Payment Executor + CDP Facilitator

- [ ] **3.1** Install `@x402/fetch` if stable, otherwise implement raw fetch + header approach:
  ```typescript
  // lib/x402-executor.ts
  async function callWithPayment(url, paymentProof): Promise<Response>
  async function parsePaymentRequired(resp): Promise<PaymentRequirements>
  async function buildPaymentProof(req, signedTx): Promise<string>
  ```
- [ ] **3.2** Create `lib/cdp-facilitator.ts`
  - `verifyPayment(requirements, payment)` → POST to CDP Facilitator `/verify`
  - `settlePayment(requirements, payment)` → POST to CDP Facilitator `/settle`
  - All calls include `X-CDP-API-KEY` header from `process.env.CDP_API_KEY`
- [ ] **3.3** Create `app/api/ai-agent/execute/route.ts` — POST handler
  - Validate `agentResourceUrl` is a valid HTTPS URL
  - Validate `network` is `eip155:8453`
  - Step 1: Call agent URL → handle 402
  - Step 2: CDP Facilitator `/verify`
  - Step 3: Broadcast signed USDC payment tx
  - Step 4: CDP Facilitator `/settle`
  - Step 5: Retry agent with `X-PAYMENT` header
  - Step 6: Store result in `agent_transactions` table
  - Step 7: Call `HibraAgentRegistry.mintReceipt` via backend wallet
- [ ] **3.4** Create `hooks/useAgentExecute.ts` — React hook for the execute flow
  - Manages multi-step status: approving | swapping | paying | calling | success | error
  - Calls `/api/ai-agent/execute` with signed tx from wagmi
- [ ] **3.5** Create `components/agents/IntentPreviewCard.tsx`
  - Shows: matched agent, route visualization, cost breakdown
  - Slippage selector (50bps default)
  - Execute button with step-by-step status
  - Success state with tx hash + Basescan link
- [ ] **3.6** Integration test: mock agent server returns 402, verify full flow completes

---

## Phase 4: HibraRouter Smart Contract

- [ ] **4.1** Create `contracts/contracts/HibraRouter.sol`
  - Implements `IHibraRouter` interface from design.md
  - Primary route: Aerodrome `swapExactETHForTokens` / `swapExactTokensForTokens`
  - Fallback route: Uniswap V3 `exactInputSingle`
  - Hard cap: `maxUsdcPerSwap = 10_000 * 1e6` (10,000 USDC)
  - Max slippage: 500 bps (5%)
  - Ownable for parameter updates
- [ ] **4.2** Write Hardhat tests for HibraRouter
  - ETH → USDC via Aerodrome, with `payTo` transfer
  - ERC-20 → USDC via Uniswap V3 fallback
  - Reverts on slippage exceeded
  - Reverts on cap exceeded
  - `AgentCallFunded` event emitted correctly
- [ ] **4.3** Deploy HibraRouter to Base Sepolia testnet
- [ ] **4.4** Verify HibraRouter on Basescan
- [ ] **4.5** Add `NEXT_PUBLIC_HIBRA_ROUTER_ADDRESS` to env and `lib/contracts/addresses.ts`
- [ ] **4.6** Create `lib/contracts/abis/hibraRouter.ts` with router ABI

---

## Phase 5: HibraAgentRegistry ERC-1155

- [ ] **5.1** Create `contracts/contracts/HibraAgentRegistry.sol`
  - ERC-1155 with operator role (Hibra backend)
  - `mintReceipt(to, resourceUrl, usdcCost)` → deterministic tokenId from keccak256(resourceUrl)
  - Emits `AgentReceiptMinted` event
  - `receiptsOf(user)` view function
  - On-chain metadata: base64-encoded JSON with agent info
- [ ] **5.2** Write Hardhat tests for registry
  - Mint receipt, verify tokenId, verify event
  - Non-operator cannot mint
  - Same URL → same tokenId (idempotent)
- [ ] **5.3** Deploy HibraAgentRegistry to Base Sepolia
- [ ] **5.4** Verify on Basescan
- [ ] **5.5** Add contract address to env and addresses.ts
- [ ] **5.6** Create `lib/contracts/abis/hibraAgentRegistry.ts`

---

## Phase 6: Full Frontend Integration

- [ ] **6.1** Update `app/agents/page.tsx` to include IntentInput + IntentPreviewCard
- [ ] **6.2** Wire up `useIntentParser` hook to IntentInput component
- [ ] **6.3** Wire up `useAgentExecute` hook to IntentPreviewCard Execute button
- [ ] **6.4** Build "My History" tab: fetch from `agent_transactions` for connected wallet
- [ ] **6.5** Create `components/agents/AgentTransactionRow.tsx` for history list
- [ ] **6.6** Handle wallet connection gate: show RainbowKit connect modal if not connected
- [ ] **6.7** Handle wrong network: show "Switch to Base" if chain ≠ 8453
- [ ] **6.8** Add x402 agent call recording to Hibra score system (+50 pts per agent call)
- [ ] **6.9** Mobile responsive: agent cards grid 1 col on mobile, 2 on tablet, 3 on desktop
- [ ] **6.10** Full build + type check passes

---

## Phase 7: Testing

- [ ] **7.1** Unit tests for `lib/bazaar.ts` — mock Bazaar API responses
- [ ] **7.2** Unit tests for `lib/intent-parser.ts` — regex extraction edge cases
- [ ] **7.3** Integration test for `/api/ai-agent/intent` — mock Claude response
- [ ] **7.4** Integration test for `/api/ai-agent/execute` — mock agent 402 + CDP facilitator
- [ ] **7.5** Hardhat mainnet fork test: HibraRouter swap ETH → USDC via Aerodrome on Base fork
- [ ] **7.6** E2E test: discovery page loads, search returns results, intent parsed, preview shown
- [ ] **7.7** Security check: confirm no API keys in client bundle (`NEXT_PUBLIC_` only for safe values)
- [ ] **7.8** Deploy to production: update Vercel env vars, run cron sync, smoke test full flow

---

## Environment Variables Checklist

```bash
# Server-side only (never NEXT_PUBLIC_)
ANTHROPIC_API_KEY=sk-ant-...
CDP_API_KEY=...

# Frontend safe
NEXT_PUBLIC_HIBRA_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_HIBRA_REGISTRY_ADDRESS=0x...
```
