import type * as Types from '@interfaces/index.ts'
import { assertEquals } from '@std/assert'
import * as Rendering from '@rendering/index.ts'

const writeGranted = (await Deno.permissions.query({ name: 'write' })).state === 'granted'

function createFakeEngine(viewsDir: string): {
  engine: Types.WatchableEngine
  invalidated: string[]
  refreshCount: number
  refreshedBatches: string[][]
} {
  const invalidated: string[] = []
  const refreshedBatches: string[][] = []
  let refreshCount = 0
  const engine: Types.WatchableEngine = {
    viewsDir,
    invalidateFile(absPath: string): void {
      invalidated.push(absPath)
    },
    refreshPaths(): void {
      refreshCount++
    },
    notifyRefresh(paths: readonly string[]): void {
      refreshedBatches.push([...paths])
    }
  }
  return {
    engine,
    invalidated,
    get refreshCount(): number {
      return refreshCount
    },
    refreshedBatches
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function makeViewsDir(): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: 'deserve-views-' })
  return await Deno.realPath(dir)
}

Deno.test({
  name: 'Watcher#watch ignores non-.dve files',
  ignore: !writeGranted,
  fn: async () => {
    const dir = await makeViewsDir()
    const recorder = createFakeEngine(dir)
    const stop = Rendering.Watcher.watch(recorder.engine)
    try {
      await delay(50)
      await Deno.writeTextFile(`${dir}/notes.txt`, 'not a template')
      await delay(400)
      assertEquals(recorder.invalidated.length, 0)
      assertEquals(recorder.refreshCount, 0)
    } finally {
      stop()
      await Deno.remove(dir, { recursive: true })
    }
  }
})

Deno.test({
  name: 'Watcher#watch invalidates and refreshes when a .dve template changes',
  ignore: !writeGranted,
  fn: async () => {
    const dir = await makeViewsDir()
    await Deno.writeTextFile(`${dir}/page.dve`, 'Hello {{ name }}.')
    const recorder = createFakeEngine(dir)
    const stop = Rendering.Watcher.watch(recorder.engine)
    try {
      await delay(50)
      await Deno.writeTextFile(`${dir}/page.dve`, 'Hello {{ name }}!')
      await delay(400)
      assertEquals(recorder.invalidated.length >= 1, true)
      assertEquals(recorder.invalidated.some((p) => p.endsWith('page.dve')), true)
      assertEquals(recorder.refreshCount >= 1, true)
      assertEquals(recorder.refreshedBatches.length >= 1, true)
    } finally {
      stop()
      await Deno.remove(dir, { recursive: true })
    }
  }
})

Deno.test('Watcher#watch returns a no-op stop handle for a non-existent directory', () => {
  const recorder = createFakeEngine('./does-not-exist-views-dir-' + Date.now())
  const stop = Rendering.Watcher.watch(recorder.engine)
  assertEquals(typeof stop, 'function')
  stop()
  assertEquals(recorder.invalidated.length, 0)
})

Deno.test({
  name: 'Watcher#watch stop handle releases the watcher and halts further invalidation',
  ignore: !writeGranted,
  fn: async () => {
    const dir = await makeViewsDir()
    const recorder = createFakeEngine(dir)
    const stop = Rendering.Watcher.watch(recorder.engine)
    await delay(50)
    stop()
    await delay(50)
    await Deno.writeTextFile(`${dir}/late.dve`, 'late')
    await delay(400)
    try {
      assertEquals(recorder.invalidated.length, 0)
    } finally {
      await Deno.remove(dir, { recursive: true })
    }
  }
})
