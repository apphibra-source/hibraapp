import { type NextRequest } from 'next/server'
import { searchAgents } from '@/lib/bazaar'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query    = searchParams.get('q') ?? ''
  const maxPrice = searchParams.get('maxPrice') ?? undefined
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '20'), 20)

  if (!query.trim()) {
    return Response.json({ agents: [] })
  }

  try {
    const agents = await searchAgents(query, maxPrice, limit)
    return Response.json({ agents })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed'
    return Response.json({ agents: [], error: message })
  }
}
