import { type NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchCatalog, normaliseAgent, type NormalisedAgent } from '@/lib/bazaar'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50'),  100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    // 1. Try Supabase cache first
    const { data: cached, error } = await supabase
      .from('agents_cache')
      .select('*')
      .order('price_usd', { ascending: true })
      .range(offset, offset + limit - 1)

    if (!error && cached && cached.length > 0) {
      // Check freshness of the first row
      const cacheAge = Date.now() - new Date(cached[0].cached_at as string).getTime()
      if (cacheAge < CACHE_TTL_MS) {
        return Response.json({
          agents: cached.map(rowToAgent),
          total: cached.length,
          source: 'cache',
        })
      }
    }

    // 2. Cache stale or empty — fetch from Bazaar and upsert
    const bazaarData = await fetchCatalog(100, 0)
    const normalised = bazaarData.items.map(normaliseAgent)

    // Upsert into Supabase
    const rows = normalised.map(agentToRow)
    await supabase.from('agents_cache').upsert(rows, { onConflict: 'resource_url' })

    // Return the paginated slice
    const page = normalised.slice(offset, offset + limit)

    return Response.json({
      agents: page,
      total: bazaarData.pagination.total,
      source: 'bazaar',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch agents'
    // Return empty list rather than crash
    return Response.json({ agents: [], total: 0, error: message }, { status: 200 })
  }
}

// ── Row mappers ────────────────────────────────────────────────────────────────

function agentToRow(a: NormalisedAgent) {
  return {
    resource_url:  a.resource,
    description:   a.description,
    price_raw:     a.priceRaw,
    price_usd:     parseFloat(a.priceUsd),
    pay_to:        a.payTo,
    network:       a.networkId,
    asset:         a.asset,
    scheme:        a.scheme,
    last_updated:  a.lastUpdated,
    cached_at:     new Date().toISOString(),
  }
}

function rowToAgent(row: Record<string, unknown>): NormalisedAgent {
  return {
    resource:     row.resource_url as string,
    name:         new URL(row.resource_url as string).hostname,
    description:  (row.description as string) ?? 'AI trading agent',
    priceRaw:     row.price_raw as string,
    priceUsd:     Number(row.price_usd).toFixed(6),
    payTo:        row.pay_to as string,
    network:      row.network as string,
    networkId:    row.network as string,
    asset:        row.asset as string,
    scheme:       row.scheme as string,
    lastUpdated:  row.last_updated as string,
  }
}
