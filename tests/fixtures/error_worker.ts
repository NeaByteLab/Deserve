self.onmessage = () => {
  self.postMessage({ error: true, message: 'worker error' })
}
