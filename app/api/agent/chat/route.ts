import { type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { QuoteResult } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Tool definitions ──────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: 'searchTrendingTokens',
    description: 'Search for tokens on Base network using GeckoTerminal. Use this to find a token address when the user mentions a token by name.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Token name or symbol to search for, e.g. "BRETT", "DEGEN", "VIRTUAL"',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getBestQuote',
    description: 'Get the best swap quote from Hibra aggregator. Returns all available routes. IMPORTANT: After calling this, you MUST call buildSwapIntent with the best quote data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tokenIn: {
          type: 'string',
          description: 'Input token address. ETH=0x0000000000000000000000000000000000000000, WETH=0x4200000000000000000000000000000000000006, USDC=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, AERO=0x940181a94A35A4569E4529A3CDfB74e38FD98631',
        },
        tokenInSymbol: { type: 'string', description: 'Symbol of input token e.g. ETH, USDC' },
        tokenInDecimals: { type: 'number', description: 'Decimals of input token (ETH=18, USDC=6)' },
        tokenOut: {
          type: 'string',
          description: 'Output token address',
        },
        tokenOutSymbol: { type: 'string', description: 'Symbol of output token' },
        tokenOutDecimals: { type: 'number', description: 'Decimals of output token' },
        amountIn: { type: 'string', description: 'Human-readable amount e.g. "0.01"' },
        amountInRaw: {
          type: 'string',
          description: 'Amount in smallest unit. For ETH: multiply by 1e18. For USDC: multiply by 1e6. Example: 0.01 ETH = "10000000000000000"',
        },
      },
      required: ['tokenIn', 'tokenInSymbol', 'tokenInDecimals', 'tokenOut', 'tokenOutSymbol', 'tokenOutDecimals', 'amountIn', 'amountInRaw'],
    },
  },
  {
    name: 'buildSwapIntent',
    description: 'Build the swap confirmation card for the user. Call this after getBestQuote with the best quote data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tokenIn: { type: 'string' },
        tokenInSymbol: { type: 'string' },
        tokenInDecimals: { type: 'number' },
        tokenOut: { type: 'string' },
        tokenOutSymbol: { type: 'string' },
        tokenOutDecimals: { type: 'number' },
        amountIn: { type: 'string', description: 'Human-readable amount' },
        amountInRaw: { type: 'string', description: 'Raw amount in smallest unit' },
        dex: { type: 'string', description: 'Best DEX name from the quote' },
        amountOut: { type: 'string', description: 'Human-readable estimated output amount' },
        fee: { type: 'string', description: 'Fee from the best quote' },
      },
      required: ['tokenIn', 'tokenInSymbol', 'tokenInDecimals', 'tokenOut', 'tokenOutSymbol', 'tokenOutDecimals', 'amountIn', 'amountInRaw', 'dex', 'amountOut', 'fee'],
    },
  },
]

// ── Tool execution ────────────────────────────────────────────────────────────

// Store last quotes per request to attach to buildSwapIntent
let lastQuotesCache: QuoteResult[] | null = null

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  origin: string
): Promise<unknown> {
  if (name === 'searchTrendingTokens') {
    const query = input.query as string
    const url = `https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(query)}&network=base&page=1`
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) return { error: `GeckoTerminal returned ${res.status}` }
      const data = await res.json() as {
        data?: Array<{
          attributes?: {
            name?: string
            fdv_usd?: string
            volume_usd?: { h24?: string }
          }
          relationships?: {
            base_token?: { data?: { id?: string } }
          }
        }>
      }
      const items = (data.data ?? []).slice(0, 5).map((pool) => {
        const attrs = pool.attributes ?? {}
        const tokenId = pool.relationships?.base_token?.data?.id ?? ''
        const address = tokenId.includes('_') ? `0x${tokenId.split('_')[1]}` : tokenId
        return {
          name: attrs.name ?? 'Unknown',
          address,
          fdv: attrs.fdv_usd ?? '0',
          volume24h: attrs.volume_usd?.h24 ?? '0',
        }
      })
      return { results: items }
    } catch (err) {
      return { error: String(err) }
    }
  }

  if (name === 'getBestQuote') {
    const tokenIn = input.tokenIn as string
    const tokenOut = input.tokenOut as string
    const amountInRaw = input.amountInRaw as string
    const tokenOutDecimals = input.tokenOutDecimals as number

    try {
      const res = await fetch(`${origin}/api/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenIn,
          tokenOut,
          amountIn: amountInRaw,
          decimalsOut: tokenOutDecimals,
        }),
      })
      if (!res.ok) return { error: `Quotes API returned ${res.status}` }
      const data = await res.json() as { quotes?: QuoteResult[] }

      // Cache the quotes so buildSwapIntent can use them
      lastQuotesCache = data.quotes ?? []

      if (!data.quotes || data.quotes.length === 0) {
        return { error: 'No routes found for this token pair' }
      }

      // Return simplified quote info for Claude to use in buildSwapIntent
      const best = data.quotes[0]
      return {
        quotes: data.quotes.map((q: QuoteResult) => ({
          dex: q.dexName,
          amountOut: q.amountOutFormatted,
          fee: q.fee,
          isBest: q.isBest,
        })),
        bestQuote: {
          dex: best.dexName,
          amountOut: best.amountOutFormatted,
          fee: best.fee,
        },
        message: `Found ${data.quotes.length} routes. Best: ${best.dexName} with ${best.amountOutFormatted} output`,
      }
    } catch (err) {
      return { error: String(err) }
    }
  }

  if (name === 'buildSwapIntent') {
    // Attach the actual best QuoteResult (needed for swap execution)
    // amountOut is bigint — must be serialized as string for JSON transport
    const bestQuote = lastQuotesCache?.[0] ?? null
    const serializedQuote = bestQuote
      ? {
          ...bestQuote,
          amountOut: bestQuote.amountOut.toString(),
          gasEstimate: bestQuote.gasEstimate?.toString() ?? null,
        }
      : null
    return {
      swapIntent: {
        ...input,
        quoteRaw: serializedQuote,
      },
      ready: true,
    }
  }

  return { error: `Unknown tool: ${name}` }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Reset cache per request
  lastQuotesCache = null

  try {
    const body = await request.json() as { message: string }
    const { message } = body

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    const origin = request.nextUrl.origin

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: message },
    ]

    let swapIntent: Record<string, unknown> | null = null
    let finalText = ''

    // ── Agentic loop ──────────────────────────────────────────────────────────
    while (true) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: `You are a DeFi trading assistant for Hibra, a DEX aggregator on Base network.

When user wants to swap tokens, follow this EXACT sequence:
1. If token address not known, use searchTrendingTokens first
2. Call getBestQuote with the correct token addresses and amount
3. ALWAYS call buildSwapIntent after getBestQuote with the best quote data

Known token addresses on Base:
- ETH: 0x0000000000000000000000000000000000000000 (decimals: 18)
- WETH: 0x4200000000000000000000000000000000000006 (decimals: 18)
- USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (decimals: 6)
- AERO: 0x940181a94A35A4569E4529A3CDfB74e38FD98631 (decimals: 18)
- USDT: 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2 (decimals: 6)
- DAI: 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb (decimals: 18)

Amount conversion:
- 0.01 ETH raw = "10000000000000000" (0.01 * 10^18)
- 1 USDC raw = "1000000" (1 * 10^6)
- 10 USDC raw = "10000000"

After getting the best quote from getBestQuote, call buildSwapIntent with:
- The same tokenIn, tokenOut, symbols, decimals, amountIn, amountInRaw
- dex = best quote dex name
- amountOut = best quote amountOut  
- fee = best quote fee

Always respond in the same language as the user.`,
        tools,
        messages,
      })

      if (response.stop_reason === 'end_turn') {
        for (const block of response.content) {
          if (block.type === 'text') {
            finalText = block.text
          }
        }
        break
      }

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content })

        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeTool(
              block.name,
              block.input as Record<string, unknown>,
              origin
            )

            if (block.name === 'buildSwapIntent') {
              const resultObj = result as { swapIntent?: Record<string, unknown> }
              if (resultObj.swapIntent) {
                swapIntent = resultObj.swapIntent
              }
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            })
          }
        }

        messages.push({ role: 'user', content: toolResults })
        continue
      }

      break
    }

    return Response.json({ message: finalText, swapIntent })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return Response.json({ error: message }, { status: 500 })
  }
}
