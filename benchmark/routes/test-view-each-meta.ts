import type { Context } from '@app/index.ts'

export async function GET(ctx: Context) {
  const items = Array.from({ length: 50 }, (_, index) => index)
  return await ctx.render('each-meta', { items })
}
