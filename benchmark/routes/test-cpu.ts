import type { Context } from '@neabyte/deserve'

export function GET(_ctx: Context) {
  let value = 0
  for (let i = 0; i < 50_000; i++) {
    value += Math.sqrt(i)
  }
  return _ctx.send.json({ hello: 'cpu', value })
}
