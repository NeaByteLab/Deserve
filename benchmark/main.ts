import { Router } from '@app/index.ts'

const router = new Router({ routesDir: 'benchmark/routes' })

await router.serve(8000)
