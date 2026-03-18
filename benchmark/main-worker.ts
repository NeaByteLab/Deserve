import { Router } from '@app/index.ts'

const workerCode = `
const defaultIterations = 50000
self.onmessage = (e) => {
  const data = e.data || {}
  const n = Math.max(0, Number(data.iterations) || defaultIterations)
  let value = 0
  for (let i = 0; i < n; i++) value += Math.sqrt(i)
  self.postMessage({ done: true, value })
}
export {}
`

const workerScriptUrl = URL.createObjectURL(
  new Blob([workerCode], { type: 'application/javascript' })
)

const router = new Router({
  routesDir: 'benchmark/routes',
  viewsDir: 'benchmark/views',
  worker: { scriptURL: workerScriptUrl, poolSize: 4 }
})

await router.serve(8000)
