import type { Context } from '@app/index.ts'

export async function GET(ctx: Context) {
  return await ctx.render('include', { name: 'Nea' })
}
