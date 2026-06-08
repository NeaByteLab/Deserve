import type * as Types from '@interfaces/index.ts'
import { assertEquals } from '@std/assert'
import * as Routing from '@routing/index.ts'

const writeGranted = (await Deno.permissions.query({ name: 'write' })).state === 'granted'

const ROUTE_SOURCE = `export function GET(ctx) {
  return ctx.send.text('watched')
}
`

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function makeRoutesDir(): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: 'deserve-routes-' })
  return await Deno.realPath(dir)
}

function collectEvents(handler: Routing.Handler): { kinds: string[]; stop: () => void } {
  const kinds: string[] = []
  const stop = handler.onEvent((event: Types.EventBase) => {
    kinds.push(event.kind)
  })
  return { kinds, stop }
}

Deno.test({
  name: 'Watcher#watch hot-reloads a newly added route file',
  ignore: !writeGranted,
  fn: async () => {
    const dir = await makeRoutesDir()
    const handler = new Routing.Handler()
    const events = collectEvents(handler)
    const stop = Routing.Watcher.watch(handler, dir)
    try {
      await delay(50)
      await Deno.writeTextFile(`${dir}/hello.ts`, ROUTE_SOURCE)
      await delay(600)
      assertEquals(events.kinds.includes('route:reloaded'), true)
      const res = await handler.createHandler()(new Request('http://localhost/hello'))
      assertEquals(res.status, 200)
      assertEquals(await res.text(), 'watched')
    } finally {
      events.stop()
      stop()
      await Deno.remove(dir, { recursive: true })
    }
  }
})

Deno.test({
  name: 'Watcher#watch ignores files with non-route extensions',
  ignore: !writeGranted,
  fn: async () => {
    const dir = await makeRoutesDir()
    const handler = new Routing.Handler()
    const events = collectEvents(handler)
    const stop = Routing.Watcher.watch(handler, dir)
    try {
      await delay(50)
      await Deno.writeTextFile(`${dir}/readme.md`, '# not a route')
      await delay(500)
      assertEquals(events.kinds.includes('route:reloaded'), false)
    } finally {
      events.stop()
      stop()
      await Deno.remove(dir, { recursive: true })
    }
  }
})

Deno.test({
  name: 'Watcher#watch removes a route when its file is deleted',
  ignore: !writeGranted,
  fn: async () => {
    const dir = await makeRoutesDir()
    const handler = new Routing.Handler()
    const stop = Routing.Watcher.watch(handler, dir)
    const events = collectEvents(handler)
    try {
      await delay(50)
      await Deno.writeTextFile(`${dir}/gone.ts`, ROUTE_SOURCE)
      await delay(600)
      assertEquals(events.kinds.includes('route:reloaded'), true)
      await Deno.remove(`${dir}/gone.ts`)
      await delay(600)
      assertEquals(events.kinds.includes('route:removed'), true)
      const res = await handler.createHandler()(new Request('http://localhost/gone'))
      assertEquals(res.status, 404)
      await res.body?.cancel()
    } finally {
      events.stop()
      stop()
      await Deno.remove(dir, { recursive: true })
    }
  }
})

Deno.test('Watcher#watch returns a no-op stop handle for a non-existent directory', () => {
  const handler = new Routing.Handler()
  const stop = Routing.Watcher.watch(handler, './does-not-exist-routes-dir-' + Date.now())
  assertEquals(typeof stop, 'function')
  stop()
})

Deno.test({
  name: 'Watcher#watch stop handle halts further reloads',
  ignore: !writeGranted,
  fn: async () => {
    const dir = await makeRoutesDir()
    const handler = new Routing.Handler()
    const events = collectEvents(handler)
    const stop = Routing.Watcher.watch(handler, dir)
    await delay(50)
    stop()
    await delay(50)
    try {
      await Deno.writeTextFile(`${dir}/late.ts`, ROUTE_SOURCE)
      await delay(500)
      assertEquals(events.kinds.includes('route:reloaded'), false)
    } finally {
      events.stop()
      await Deno.remove(dir, { recursive: true })
    }
  }
})
