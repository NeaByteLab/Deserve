self.onmessage = (e: MessageEvent) => {
  const payload = e.data as { hang?: boolean }
  if (payload && payload.hang === true) {
    return
  }
  self.postMessage(e.data)
}
