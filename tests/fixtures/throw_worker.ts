self.onmessage = () => {
  throw new Error('uncaught worker failure for crash-recovery test')
}
