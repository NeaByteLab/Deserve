import type { EnhanceAppContext } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import '@shikijs/vitepress-twoslash/style.css'
import 'virtual:group-icons.css'
import './custom.css'
import { syncPackageTabs } from './synced-tabs'
import { setupDiagramLightbox } from './diagram-lightbox'

export default {
  extends: DefaultTheme,
  setup() {
    const parentSetup = (DefaultTheme as { setup?: () => void }).setup
    parentSetup?.()
    syncPackageTabs()
    setupDiagramLightbox()
  },
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue)
  }
}
