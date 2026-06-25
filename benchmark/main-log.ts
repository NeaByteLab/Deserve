import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: {
    directory: 'benchmark/routes'
  },
  views: {
    directory: 'benchmark/views'
  }
})

router.on(() => {})

await router.serve(8000)
