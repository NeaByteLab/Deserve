import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context) {
  return ctx.send.json({ hello: 'world!' })
}
