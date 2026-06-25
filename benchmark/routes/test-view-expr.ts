import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context) {
  const user = { name: 'Nea', isAdmin: true }
  return await ctx.render('expr', { user })
}
