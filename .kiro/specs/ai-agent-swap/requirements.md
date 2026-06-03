# Requirements Document

## Introduction

The AI Agent Swap feature adds an "AI Agent" page to Hibra.app — a DEX aggregator on Base mainnet. The page gives users three interconnected capabilities: natural-language intent parsing that converts free-text swap commands into executable trades routed through Hibra's existing aggregator (Uniswap V3, Aerodrome, SushiSwap, PancakeSwap V3); a discovery catalog of AI agents available on the Coinbase x402 Bazaar; and one-click swap execution that acquires fractional ownership (x402 agent tokens) via the existing wagmi/viem transaction pipeline. A new "AI Agent" navbar entry placed immediately after "Swap" routes users to `/ai-agent`.

## Glossary

- **AI_Agent_Page**: The Next.js page rendered at `/ai-agent` that hosts all sub-features of this specification.
- **Intent_Parser**: The server-side module that accepts a natural-language string and returns a structured `ParsedIntent` object containing token symbols, amount, and swap direction.
- **ParsedIntent**: A structured object with fields `tokenIn`, `tokenOut`, `amountIn`, and an optional `strategy` (e.g., "highest yield").
- **Aggregator**: The existing Hibra quote API at `/api/quotes` that queries Uniswap V3, Aerodrome, SushiSwap, and PancakeSwap V3 on Base mainnet and returns the best route.
- **Preview_Card**: A UI component that displays the parsed trade details — token pair, amount, best DEX, estimated output, fees, and price impact — before execution.
- **x402_Bazaar**: The Coinbase x402 Bazaar API (https://docs.cdp.coinbase.com/x402/bazaar) that exposes a catalog of AI agents as investable tokens on Base.
- **Agent_Token**: An x402 hybrid semi-fungible token on Base representing fractional ownership of an AI agent, combining ERC-20 tradability with ERC-721 unique identity.
- **Agent_Card**: A UI component that renders a single agent's name, description, yield metrics, and an "Invest" action.
- **Bazaar_Client**: The client module responsible for fetching and caching agent listings from the x402 Bazaar API.
- **Swap_Executor**: The existing `useSwapExecution` hook in `hooks/useSwapExecution.ts` that builds calldata and calls `sendTransactionAsync`.
- **Navbar**: The `Navbar` component in `components/layout/Navbar.tsx` that renders top-level navigation links.

---

## Requirements

### Requirement 1: AI Agent Navbar Entry

**User Story:** As a Hibra user, I want to see an "AI Agent" link in the navbar right after "Swap", so that I can navigate directly to the AI agent page from anywhere in the app.

#### Acceptance Criteria

1. THE Navbar SHALL render an "AI Agent" navigation link positioned immediately after the "Swap" link in both the desktop tab row and the mobile tab bar.
2. WHEN a user navigates to any path under `/ai-agent`, THE Navbar SHALL apply the active highlight style (purple gradient background, white text, font-weight 600) to the "AI Agent" link.
3. WHEN a user clicks the "AI Agent" link, THE Navbar SHALL route the user to `/ai-agent` using Next.js client-side navigation with no full-page reload.

---

### Requirement 2: AI Agent Page Shell

**User Story:** As a Hibra user, I want a dedicated AI Agent page at `/ai-agent`, so that I have a focused space to interact with AI-powered trading and agent discovery.

#### Acceptance Criteria

1. THE AI_Agent_Page SHALL be accessible at the URL path `/ai-agent` and render within the existing root layout (Navbar, Footer, global styles).
2. THE AI_Agent_Page SHALL display a page heading that identifies it as the AI Agent interface.
3. WHEN the page is rendered without a connected wallet, THE AI_Agent_Page SHALL display the intent input field and agent catalog in a read-only browse state without triggering any wallet prompts.

---

### Requirement 3: Natural-Language Intent Input

**User Story:** As a trader, I want to type a natural-language command like "Swap 0.01 ETH into the highest yield AI agent", so that I do not need to manually select tokens and amounts in the standard swap widget.

#### Acceptance Criteria

1. THE AI_Agent_Page SHALL render a text input field that accepts free-text swap commands of up to 500 characters.
2. WHEN a user submits a non-empty command, THE Intent_Parser SHALL parse the input and return a `ParsedIntent` containing `tokenIn` symbol, `tokenOut` symbol or strategy, and `amountIn` value within 5 seconds.
3. IF the Intent_Parser cannot extract a valid token symbol or a non-zero numeric amount from the input, THEN THE Intent_Parser SHALL return a structured error with a human-readable description of what was missing.
4. WHEN the Intent_Parser returns an error, THE AI_Agent_Page SHALL display the error description inline below the input field without clearing the user's text.
5. THE Intent_Parser SHALL recognise at minimum the following token symbols present in `lib/tokens.ts`: ETH, WETH, USDC, USDT, DAI, WBTC, cbBTC, AERO, BRETT, VIRTUAL, DEGEN, USDS.

---

### Requirement 4: Swap Quote Retrieval for Parsed Intents

**User Story:** As a trader, I want the system to automatically fetch the best swap route after my intent is parsed, so that I can see the trade details before committing.

#### Acceptance Criteria

1. WHEN the Intent_Parser returns a valid `ParsedIntent`, THE AI_Agent_Page SHALL call the Aggregator at `/api/quotes` with the resolved token addresses and parsed `amountIn`.
2. WHEN the Aggregator returns one or more quotes, THE AI_Agent_Page SHALL identify the quote with the highest `amountOut` as the best route.
3. WHILE quote fetching is in progress, THE AI_Agent_Page SHALL display a loading indicator in place of the Preview_Card.
4. IF the Aggregator returns no quotes for the requested token pair, THEN THE AI_Agent_Page SHALL display an inline message stating that no route was found and invite the user to try a different token pair.
5. WHEN the best quote is determined, THE AI_Agent_Page SHALL render the Preview_Card showing: input token symbol and amount, output token symbol and estimated amount, selected DEX name, fee percentage, and price impact percentage.

---

### Requirement 5: Transaction Preview and Slippage

**User Story:** As a trader, I want to review the full transaction details before signing, so that I can verify the expected output and slippage before committing funds.

#### Acceptance Criteria

1. THE Preview_Card SHALL display input amount, estimated output amount, DEX name, fee, price impact, and the current slippage tolerance.
2. THE Preview_Card SHALL allow the user to adjust slippage tolerance in basis-point increments with preset values of 50 (0.5%) and 100 (1.0%) and a free-entry field accepting values between 1 and 5000.
3. IF the price impact displayed in the Preview_Card exceeds 5%, THEN THE Preview_Card SHALL render a visible warning indicator adjacent to the price impact figure.
4. WHEN the user adjusts slippage, THE Preview_Card SHALL immediately recalculate and display the updated minimum output amount without re-fetching quotes.

---

### Requirement 6: One-Click Swap Execution

**User Story:** As a trader, I want to click a single "Execute" button on the Preview Card to submit the swap transaction, so that I can complete the trade with minimal friction after reviewing the details.

#### Acceptance Criteria

1. WHEN a user clicks the "Execute" button on the Preview_Card, THE Swap_Executor SHALL initiate the token approval (if required) followed by the swap transaction using `sendTransactionAsync` from the existing wagmi hooks.
2. WHILE the Swap_Executor is processing an approval or swap transaction, THE Preview_Card SHALL disable the "Execute" button and display a status label reflecting the current step ("Approving…" or "Swapping…").
3. WHEN the swap transaction is confirmed on-chain with a non-reverted receipt, THE AI_Agent_Page SHALL display a success notification containing the transaction hash with a link to Basescan.
4. IF the swap transaction is reverted on-chain or the user rejects the wallet prompt, THEN THE Swap_Executor SHALL set status to `error` and THE AI_Agent_Page SHALL display an error notification without navigating away from the page.
5. WHEN a swap executed via the AI_Agent_Page is confirmed, THE AI_Agent_Page SHALL call the existing `/api/score` endpoint to record the swap and update the user's score identically to swaps performed via the standard Swap page.

---

### Requirement 7: x402 Bazaar Agent Catalog

**User Story:** As an investor, I want to browse AI agents listed on the Coinbase x402 Bazaar, so that I can discover agents, evaluate their performance metrics, and choose one to invest in.

#### Acceptance Criteria

1. THE AI_Agent_Page SHALL fetch the list of available agents from the x402 Bazaar API on page load and display them as a scrollable grid of Agent_Cards.
2. WHEN the Bazaar_Client successfully retrieves agents, each Agent_Card SHALL display at minimum: agent name, a short description, and the agent token contract address on Base.
3. WHERE yield or APY data is provided by the Bazaar API, each Agent_Card SHALL display the yield metric alongside the agent name.
4. WHILE the Bazaar_Client is fetching agents, THE AI_Agent_Page SHALL display skeleton placeholder cards in place of the agent grid.
5. IF the Bazaar_Client request fails or returns an empty list, THEN THE AI_Agent_Page SHALL display a non-blocking error message below the intent input and render an empty agent grid without crashing the page.
6. THE AI_Agent_Page SHALL refresh the agent catalog at most once per 60 seconds to avoid excessive API calls during the same browser session.

---

### Requirement 8: Agent Token Investment via Swap

**User Story:** As an investor, I want to click "Invest" on an Agent Card to swap a token into that agent's x402 token, so that I can acquire fractional ownership of the agent with one interaction.

#### Acceptance Criteria

1. WHEN a user clicks the "Invest" button on an Agent_Card, THE AI_Agent_Page SHALL pre-fill the intent input with the agent's token address as `tokenOut` and focus the amount field so the user can specify the input amount.
2. WHEN a user confirms the investment amount and the Aggregator finds a valid route to the agent token, THE Preview_Card SHALL render with the agent token as the output token and display the same fields as a standard swap preview.
3. WHEN a user executes an agent token investment, THE Swap_Executor SHALL use the same approval-then-swap pipeline as standard swaps, with the agent token contract address substituted as `tokenOut`.
4. IF the agent token contract address returned by the Bazaar API is not a valid 42-character Ethereum address beginning with `0x`, THEN THE AI_Agent_Page SHALL display an inline error on the Agent_Card and prevent the swap flow from initiating.

---

### Requirement 9: Wallet Connection Gate for Execution

**User Story:** As a user who has not connected a wallet, I want to be prompted to connect before executing a transaction, so that I cannot accidentally attempt a transaction without a wallet.

#### Acceptance Criteria

1. WHEN a user without a connected wallet clicks the "Execute" button on the Preview_Card, THE AI_Agent_Page SHALL open the RainbowKit connect modal instead of initiating any transaction.
2. WHEN a user without a connected wallet clicks "Invest" on an Agent_Card, THE AI_Agent_Page SHALL open the RainbowKit connect modal instead of pre-filling the intent input with a pending transaction.
3. WHILE a user's wallet is connected to a network other than Base mainnet (chain ID 8453), THE Preview_Card SHALL replace the "Execute" button with a "Switch to Base" button that opens the RainbowKit chain-switch modal.

---

### Requirement 10: Intent Parser Implementation Strategy

**User Story:** As a developer, I want a clearly defined intent parsing approach, so that the feature ships reliably without incurring unnecessary API costs or latency.

#### Acceptance Criteria

1. THE Intent_Parser SHALL be implemented as a Next.js API route at `/api/ai-agent/parse` that accepts a POST request with a `{ command: string }` body and returns a `ParsedIntent` or an error object.
2. THE Intent_Parser SHALL first attempt rule-based extraction using regular expressions to identify token symbols and numeric amounts before making any external LLM API call.
3. WHERE a rule-based parse produces a low-confidence result (i.e., no numeric amount or no recognised token symbol is found), THE Intent_Parser SHALL fall back to the Anthropic Claude API to attempt extraction.
4. THE Intent_Parser SHALL not expose the Anthropic API key to the browser and SHALL only call the Anthropic SDK from the server-side API route.
5. IF the Anthropic API call fails due to a network error or rate-limit response, THEN THE Intent_Parser SHALL return the best available rule-based result or a structured error, and SHALL NOT propagate the raw Anthropic error message to the client.
