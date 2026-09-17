import { afterEach, describe, expect, it, vi } from 'vitest'
import { getOrderBook } from '../src/polymarket-client.ts'

function stubBookResponse(body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  })))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getOrderBook', () => {
  it('sorts bids best-first (highest price) even when the CLOB API returns them worst-first', async () => {
    stubBookResponse({
      bids: [
        { price: '0.01', size: '311789.61' },
        { price: '0.05', size: '156.29' },
        { price: '0.14', size: '33.6' },
      ],
      asks: [],
    })

    const book = await getOrderBook('token-id', new AbortController().signal)

    expect(book.bids.map(b => b.price)).toEqual([0.14, 0.05, 0.01])
  })

  it('sorts asks best-first (lowest price) even when the CLOB API returns them worst-first', async () => {
    stubBookResponse({
      bids: [],
      asks: [
        { price: '0.99', size: '2446' },
        { price: '0.95', size: '250' },
        { price: '0.79', size: '74.2' },
      ],
    })

    const book = await getOrderBook('token-id', new AbortController().signal)

    expect(book.asks.map(a => a.price)).toEqual([0.79, 0.95, 0.99])
  })

  it('regression: index 0 must be the tightest price, not whatever the API happened to list first', async () => {
    // This is the exact shape that produced the bug: bids ascending, asks
    // descending, so naive `bids[0]`/`asks[0]` picked the worst price in
    // the book (0.01 / 0.99) instead of the best (0.14 / 0.79).
    stubBookResponse({
      bids: [{ price: '0.01', size: '311789.61' }, { price: '0.14', size: '33.6' }],
      asks: [{ price: '0.99', size: '2446' }, { price: '0.79', size: '74.2' }],
    })

    const book = await getOrderBook('token-id', new AbortController().signal)

    expect(book.bids[0]?.price).toBe(0.14)
    expect(book.asks[0]?.price).toBe(0.79)
  })
})
