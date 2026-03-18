import { Router } from '@app/index.ts'

const router = new Router({ routesDir: 'benchmark/routes', viewsDir: 'benchmark/views' })

await router.serve(8000)
