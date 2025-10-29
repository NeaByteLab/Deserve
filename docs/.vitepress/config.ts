import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    base: '/',
    ignoreDeadLinks: true,
    cleanUrls: true,
    head: [
      ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
      ['meta', { name: 'theme-color', content: '#158f77' }],
      ['meta', { property: 'og:type', content: 'website' }],
      [
        'style',
        {},
        `
          :root {
            --vp-c-brand-1: #158f77;
            --vp-c-brand-2: #20c9a6;
            --vp-c-brand-3: #0f6b5a;
            --vp-c-brand-soft: rgba(21, 143, 119, 0.14);
          }
          .VPHomeHero .image-container,
          .VPHomeHero .image-bg,
          .VPHomeHero .VPImage.image-src {
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            max-height: none !important;
          }
          .VPHomeHero .image img,
          .VPHomeHero .VPImage.image-src img {
            margin-top: 5% !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: contain;
          }
        `
      ]
    ],
    locales: {
      root: {
        lang: 'en-US',
        label: 'English',
        title: 'Deserve',
        description:
          'Web Framework for Deno Ecosystem - Build HTTP server effortlessly with zero configuration for maximum productivity.',
        head: [
          ['meta', { property: 'og:title', content: 'Deserve - Web Framework for Deno Ecosystem' }],
          [
            'meta',
            {
              property: 'og:description',
              content: 'Build HTTP server effortlessly with zero configuration for productivity.'
            }
          ]
        ],
        themeConfig: {
          logo: '/icon.svg',
          nav: [
            { text: 'Docs', link: '/en/getting-started/installation' },
            { text: 'Examples', link: '/en/examples' }
          ],
          sidebar: {
            '/': [
              {
                text: 'Core Concepts',
                collapsed: true,
                items: [
                  { text: 'Philosophy', link: '/en/core-concepts/philosophy' },
                  { text: 'File-based Routing', link: '/en/core-concepts/file-based-routing' },
                  { text: 'Route Patterns', link: '/en/core-concepts/route-patterns' },
                  { text: 'Context Object', link: '/en/core-concepts/context-object' },
                  { text: 'Request Handling', link: '/en/core-concepts/request-handling' }
                ]
              },
              {
                text: 'Getting Started',
                collapsed: true,
                items: [
                  { text: 'Installation', link: '/en/getting-started/installation' },
                  { text: 'Quick Start', link: '/en/getting-started/quick-start' },
                  {
                    text: 'Routes Configuration',
                    link: '/en/getting-started/routes-configuration'
                  },
                  {
                    text: 'Server Configuration',
                    link: '/en/getting-started/server-configuration'
                  }
                ]
              },
              {
                text: 'Middleware',
                collapsed: true,
                items: [
                  { text: 'Use Global', link: '/en/middleware/global' },
                  { text: 'Use Route-Specific', link: '/en/middleware/route-specific' },
                  { text: '🚧 Basic Auth', link: '/en/middleware/basic-auth' },
                  { text: '🚧 Body Limit', link: '/en/middleware/body-limit' },
                  { text: 'CORS', link: '/en/middleware/cors' },
                  { text: '🚧 Security Headers', link: '/en/middleware/security-headers' },
                  { text: 'WebSocket', link: '/en/middleware/websocket' }
                ]
              },
              {
                text: 'Static Files',
                collapsed: true,
                items: [
                  { text: 'Basic Usage', link: '/en/static-file/basic' },
                  { text: 'Multiple Directories', link: '/en/static-file/multiple' }
                ]
              },
              {
                text: 'Response',
                collapsed: true,
                items: [
                  { text: 'JSON Format', link: '/en/response/json' },
                  { text: 'Text Format', link: '/en/response/text' },
                  { text: 'HTML Format', link: '/en/response/html' },
                  { text: 'File Downloads', link: '/en/response/file' },
                  { text: 'Data Downloads', link: '/en/response/data' },
                  { text: 'Redirects', link: '/en/response/redirect' },
                  { text: 'Custom Responses', link: '/en/response/custom' }
                ]
              },
              {
                text: 'Error Handling',
                collapsed: true,
                items: [
                  { text: 'Default Behavior', link: '/en/error-handling/default-behavior' },
                  { text: 'Object Details', link: '/en/error-handling/object-details' }
                ]
              }
            ],
            '/en/': [
              {
                text: 'Core Concepts',
                collapsed: true,
                items: [
                  { text: 'Philosophy', link: '/en/core-concepts/philosophy' },
                  { text: 'File-based Routing', link: '/en/core-concepts/file-based-routing' },
                  { text: 'Route Patterns', link: '/en/core-concepts/route-patterns' },
                  { text: 'Context Object', link: '/en/core-concepts/context-object' },
                  { text: 'Request Handling', link: '/en/core-concepts/request-handling' }
                ]
              },
              {
                text: 'Getting Started',
                collapsed: true,
                items: [
                  { text: 'Installation', link: '/en/getting-started/installation' },
                  { text: 'Quick Start', link: '/en/getting-started/quick-start' },
                  {
                    text: 'Routes Configuration',
                    link: '/en/getting-started/routes-configuration'
                  },
                  {
                    text: 'Server Configuration',
                    link: '/en/getting-started/server-configuration'
                  }
                ]
              },
              {
                text: 'Middleware',
                collapsed: true,
                items: [
                  { text: 'Use Global', link: '/en/middleware/global' },
                  { text: 'Use Route-Specific', link: '/en/middleware/route-specific' },
                  { text: '🚧 Basic Auth', link: '/en/middleware/basic-auth' },
                  { text: '🚧 Body Limit', link: '/en/middleware/body-limit' },
                  { text: 'CORS', link: '/en/middleware/cors' },
                  { text: '🚧 Security Headers', link: '/en/middleware/security-headers' },
                  { text: 'WebSocket', link: '/en/middleware/websocket' }
                ]
              },
              {
                text: 'Static Files',
                collapsed: true,
                items: [
                  { text: 'Basic Usage', link: '/en/static-file/basic' },
                  { text: 'Multiple Directories', link: '/en/static-file/multiple' }
                ]
              },
              {
                text: 'Response',
                collapsed: true,
                items: [
                  { text: 'JSON Format', link: '/en/response/json' },
                  { text: 'Text Format', link: '/en/response/text' },
                  { text: 'HTML Format', link: '/en/response/html' },
                  { text: 'File Downloads', link: '/en/response/file' },
                  { text: 'Data Downloads', link: '/en/response/data' },
                  { text: 'Redirects', link: '/en/response/redirect' },
                  { text: 'Custom Responses', link: '/en/response/custom' }
                ]
              },
              {
                text: 'Error Handling',
                collapsed: true,
                items: [
                  { text: 'Default Behavior', link: '/en/error-handling/default-behavior' },
                  { text: 'Object Details', link: '/en/error-handling/object-details' }
                ]
              }
            ]
          },
          socialLinks: [{ icon: 'github', link: 'https://github.com/NeaByteLab/Deserve' }],
          search: {
            provider: 'local'
          },
          footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2025 NeaByteLab'
          }
        }
      },
      id: {
        lang: 'id-ID',
        label: 'Indonesia',
        title: 'Deserve',
        description:
          'Framework Web untuk Ekosistem Deno - Bangun server HTTP dengan mudah tanpa konfigurasi untuk produktivitas maksimal.',
        head: [
          [
            'meta',
            { property: 'og:title', content: 'Deserve - Framework Web untuk Ekosistem Deno' }
          ],
          [
            'meta',
            {
              property: 'og:description',
              content: 'Bangun server HTTP dengan mudah tanpa konfigurasi untuk produktivitas.'
            }
          ]
        ],
        themeConfig: {
          logo: '/icon.svg',
          nav: [
            { text: 'Dokumentasi', link: '/id/getting-started/installation' },
            { text: 'Contoh', link: '/id/examples' }
          ],
          sidebar: {
            '/id/': [
              {
                text: 'Konsep Inti',
                collapsed: true,
                items: [
                  { text: 'Filosofi', link: '/id/core-concepts/philosophy' },
                  {
                    text: 'Routing Berbasis File',
                    link: '/id/core-concepts/file-based-routing'
                  },
                  { text: 'Pola Rute', link: '/id/core-concepts/route-patterns' },
                  { text: 'Objek Konteks', link: '/id/core-concepts/context-object' },
                  { text: 'Penanganan Request', link: '/id/core-concepts/request-handling' }
                ]
              },
              {
                text: 'Memulai',
                collapsed: true,
                items: [
                  { text: 'Instalasi', link: '/id/getting-started/installation' },
                  { text: 'Mulai Cepat', link: '/id/getting-started/quick-start' },
                  {
                    text: 'Konfigurasi Rute',
                    link: '/id/getting-started/routes-configuration'
                  },
                  {
                    text: 'Konfigurasi Server',
                    link: '/id/getting-started/server-configuration'
                  }
                ]
              },
              {
                text: 'Middleware',
                collapsed: true,
                items: [
                  { text: 'Gunakan Global', link: '/id/middleware/global' },
                  { text: 'Gunakan Spesifik Rute', link: '/id/middleware/route-specific' },
                  { text: '🚧 Basic Auth', link: '/id/middleware/basic-auth' },
                  { text: '🚧 Body Limit', link: '/id/middleware/body-limit' },
                  { text: 'CORS', link: '/id/middleware/cors' },
                  { text: '🚧 Security Headers', link: '/id/middleware/security-headers' },
                  { text: 'WebSocket', link: '/id/middleware/websocket' }
                ]
              },
              {
                text: 'File Statis',
                collapsed: true,
                items: [
                  { text: 'Penggunaan Dasar', link: '/id/static-file/basic' },
                  { text: 'Beberapa Direktori', link: '/id/static-file/multiple' }
                ]
              },
              {
                text: 'Response',
                collapsed: true,
                items: [
                  { text: 'Format JSON', link: '/id/response/json' },
                  { text: 'Format Teks', link: '/id/response/text' },
                  { text: 'Format HTML', link: '/id/response/html' },
                  { text: 'Unduhan File', link: '/id/response/file' },
                  { text: 'Unduhan Data', link: '/id/response/data' },
                  { text: 'Pengalihan', link: '/id/response/redirect' },
                  { text: 'Respon Khusus', link: '/id/response/custom' }
                ]
              },
              {
                text: 'Penanganan Error',
                collapsed: true,
                items: [
                  { text: 'Perilaku Default', link: '/id/error-handling/default-behavior' },
                  { text: 'Detail Objek', link: '/id/error-handling/object-details' }
                ]
              }
            ]
          },
          socialLinks: [{ icon: 'github', link: 'https://github.com/NeaByteLab/Deserve' }],
          search: {
            provider: 'local'
          },
          footer: {
            message: 'Dirilis di bawah Lisensi MIT.',
            copyright: 'Hak Cipta © 2025 NeaByteLab'
          }
        }
      }
    },
    markdown: {
      lineNumbers: false,
      theme: {
        light: 'github-light',
        dark: 'github-dark'
      }
    }
  })
)
