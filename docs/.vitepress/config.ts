import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Deserve',
  description:
    'HTTP server with file-based routing library for Deno. Drop files in folders and get instant API endpoints with zero configuration. Supports middleware, dynamic routes, and more.',
  base: '/deserve/',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    logo: '/logo.svg',
    nav: [{ text: 'Home', link: '/' }],
    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Quick Start', link: '/getting-started/quick-start' },
            { text: 'Custom Configuration', link: '/getting-started/custom-configuration' }
          ]
        },
        {
          text: 'Core Concepts & Rules',
          items: [
            { text: 'File-based Routing', link: '/core-concepts/file-based-routing' },
            { text: 'Route Patterns', link: '/core-concepts/route-patterns' },
            { text: 'HTTP Methods', link: '/core-concepts/http-methods' }
          ]
        },
        {
          text: 'Middleware',
          items: [
            { text: 'Global Middleware', link: '/middleware/global' },
            { text: 'Route-Specific Middleware', link: '/middleware/route-specific' },
            { text: 'CORS Middleware', link: '/middleware/cors' }
          ]
        },
        {
          text: 'Send Response Utility',
          items: [
            { text: 'JSON Format', link: '/response/json' },
            { text: 'Text Format', link: '/response/text' },
            { text: 'HTML Format', link: '/response/html' },
            { text: 'Redirect', link: '/response/redirect' }
          ]
        },
        {
          text: 'Static File Serving',
          items: [
            { text: 'Basic Static Serving', link: '/static-file/basic' },
            { text: 'Multiple Directories', link: '/static-file/multiple' }
          ]
        },
        {
          text: 'Error Handling',
          items: [{ text: 'Object Details', link: '/error-handling/object-details' }]
        }
      ]
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/NeaByteLab/Deserve' }],
    search: {
      provider: 'local'
    }
  }
})
