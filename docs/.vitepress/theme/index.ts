import type { EnhanceAppContext } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import '@shikijs/vitepress-twoslash/style.css'
import 'virtual:group-icons.css'
import './custom.css'
import { syncPackageTabs } from './synced-tabs'

export default {
  extends: DefaultTheme,
  setup() {
    const parentSetup = (DefaultTheme as { setup?: () => void }).setup
    parentSetup?.()
    syncPackageTabs()
  },
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue)
  }
}
