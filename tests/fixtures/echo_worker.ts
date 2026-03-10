self.onmessage = (e: MessageEvent) => {
  self.postMessage(e.data)
}
