import type { Context } from '@app/index.ts'

export function GET(ctx: Context) {
  return ctx.send.json({ hello: 'world!' })
}
