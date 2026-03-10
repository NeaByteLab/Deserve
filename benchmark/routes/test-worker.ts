import type { Context } from '@app/index.ts'

export async function GET(ctx: Context) {
  const worker = ctx.state['worker'] as { run: <T>(p: unknown) => Promise<T> } | undefined
  if (!worker?.run) {
    return ctx.send.json({ error: 'worker not enabled' }, { status: 503 })
  }
  const result = await worker.run<{ done: boolean; value: number }>({ iterations: 50_000 })
  return ctx.send.json({ hello: 'worker', value: result?.value })
}
