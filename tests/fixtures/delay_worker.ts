self.onmessage = (e: MessageEvent) => {
  const payload = e.data as { id?: unknown; delay?: number }
  const delay = typeof payload?.delay === 'number' ? payload.delay : 0
  setTimeout(() => {
    self.postMessage(e.data)
  }, delay)
}
