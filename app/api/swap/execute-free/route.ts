/**
 * POST /api/swap/execute-free
 *
 * Free swap execution endpoint — used by the /swap page.
 * No x402 payment required.
 *
 * For AI Agent swaps with $0.10 USDC fee, use /api/swap/execute.
 */

import { executeSwapHandler } from '@/lib/swap/executeSwapHandler'

export const POST = executeSwapHandler
