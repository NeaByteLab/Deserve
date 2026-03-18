import type { Context } from '@app/index.ts'

export async function GET(ctx: Context) {
  const user = { name: 'Nea', isAdmin: true }
  return await ctx.render('expr', { user })
}
