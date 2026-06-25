import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context) {
  return await ctx.render('include', { name: 'Nea' })
}
