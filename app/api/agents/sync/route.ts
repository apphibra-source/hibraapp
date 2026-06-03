/**
 * Cron endpoint — called every 5 minutes by Vercel cron.
 * Fetches full x402 Bazaar catalog and upserts into Supabase.
 */
import { supabase } from '@/lib/supabase'
import { fetchCatalog, normaliseAgent } from '@/lib/bazaar'

export async function POST() {
  try {
    let total = 0
    let offset = 0
    const limit = 1000

    // Paginate through entire catalog
    while (true) {
      const batch = await fetchCatalog(limit, offset)
      const rows = batch.items.map((item) => {
        const a = normaliseAgent(item)
        return {
          resource_url: a.resource,
          description:  a.description,
          price_raw:    a.priceRaw,
          price_usd:    parseFloat(a.priceUsd),
          pay_to:       a.payTo,
          network:      a.networkId,
          asset:        a.asset,
          scheme:       a.scheme,
          last_updated: a.lastUpdated,
          cached_at:    new Date().toISOString(),
        }
      })

      if (rows.length > 0) {
        const { error } = await supabase
          .from('agents_cache')
          .upsert(rows, { onConflict: 'resource_url' })

        if (error) throw error
        total += rows.length
      }

      if (batch.items.length < limit) break
      offset += limit
    }

    return Response.json({ success: true, synced: total })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
