import { Router } from '@app/index.ts'

const router = new Router({ routesDir: 'benchmark/routes', viewsDir: 'benchmark/views' })

// Empty listener
router.on(() => {})

await router.serve(8000)
