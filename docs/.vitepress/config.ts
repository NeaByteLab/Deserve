import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { createFileSystemTypesCache } from '@shikijs/vitepress-twoslash/cache-fs'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'
import llmstxt from 'vitepress-plugin-llms'
import { fileURLToPath } from 'node:url'
import { readFileSync, globSync } from 'node:fs'

const hostname = 'https://docs-deserve.neabyte.com'
const docsRoot = fileURLToPath(new URL('..', import.meta.url))
const diagramImageMap = buildDiagramImageMap(docsRoot, hostname)

function buildDiagramImageMap(
  root: string,
  host: string
): Map<string, { url: string; caption: string }[]> {
  const map = new Map<string, { url: string; caption: string }[]>()
  const pattern = /!\[([^\]]*)\]\((\/diagrams\/[^)]+\.png)\)/g
  const files = globSync('**/*.md', { cwd: root }).filter(
    (file) => !file.startsWith('node_modules') && !file.includes('.vitepress')
  )
  for (const file of files) {
    const content = readFileSync(`${root}/${file}`, 'utf-8')
    const images: { url: string; caption: string }[] = []
    for (const match of content.matchAll(pattern)) {
      images.push({ url: `${host}${match[2]}`, caption: match[1].trim() })
    }
    if (images.length === 0) {
      continue
    }
    const route = '/' + file.replace(/(index)?\.md$/, '').replace(/\/$/, '')
    map.set(route === '/' ? '/' : route, images)
  }
  return map
}

const deserveTypes = readFileSync(
  fileURLToPath(new URL('./deserve-types.ts', import.meta.url)),
  'utf-8'
)
const deserveDeno = readFileSync(
  fileURLToPath(new URL('./deserve-deno.d.ts', import.meta.url)),
  'utf-8'
)
const startYear = 2025
const currentYear = new Date().getFullYear()
const copyrightYears = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`

export default withMermaid(
  defineConfig({
    base: '/',
    cleanUrls: true,
    lastUpdated: true,
    ignoreDeadLinks: true,
    sitemap: {
      hostname,
      transformItems(items) {
        return items
          .filter((item) => !item.url.startsWith('README'))
          .map((item) => {
            const route = '/' + item.url.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '')
            const images = diagramImageMap.get(route === '/' ? '/' : route)
            return images ? { ...item, img: images } : item
          })
      }
    },
    themeConfig: {
      search: {
        provider: 'local'
      }
    },
    head: [
      ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
      [
        'link',
        {
          rel: 'alternate',
          type: 'text/plain',
          title: 'llms.txt',
          href: `${hostname}/llms.txt`
        }
      ],
      ['meta', { name: 'theme-color', content: '#158f77' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:image', content: `${hostname}/image.png` }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:image', content: `${hostname}/image.png` }],
      ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }]
    ],
    title: 'Deserve',
    description: 'Web Framework for Deno Ecosystem',
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
            { text: 'Docs', link: '/getting-started/installation' },
            { text: 'Examples', link: '/examples' },
            {
              text: 'LLM',
              items: [
                { text: 'llms.txt', link: '/llms.txt', target: '_blank' },
                { text: 'llms-full.txt', link: '/llms-full.txt', target: '_blank' }
              ]
            }
          ],
          sidebar: {
            '/': [
              {
                text: 'Core Concepts',
                collapsed: true,
                items: [
                  { text: 'Philosophy', link: '/core-concepts/philosophy' },
                  { text: 'Zero Dependency', link: '/core-concepts/zero-dependency' },
                  { text: 'File-based Routing', link: '/core-concepts/file-based-routing' },
                  { text: 'Route Patterns', link: '/core-concepts/route-patterns' },
                  { text: 'Context Object', link: '/core-concepts/context-object' },
                  { text: 'Request Handling', link: '/core-concepts/request-handling' },
                  { text: 'Hot Reload', link: '/core-concepts/hot-reload' },
                  { text: 'Multi-Service', link: '/core-concepts/multi-service' }
                ]
              },
              {
                text: 'Getting Started',
                collapsed: true,
                items: [
                  { text: 'Installation', link: '/getting-started/installation' },
                  { text: 'Quick Start', link: '/getting-started/quick-start' },
                  { text: 'Built for Teams', link: '/getting-started/built-for-teams' },
                  {
                    text: 'Routes Configuration',
                    link: '/getting-started/routes-configuration'
                  },
                  {
                    text: 'Server Configuration',
                    link: '/getting-started/server-configuration'
                  }
                ]
              },
              {
                text: 'Rendering',
                collapsed: true,
                items: [
                  { text: 'Overview', link: '/rendering/' },
                  { text: 'Template Syntax', link: '/rendering/syntax' },
                  { text: 'Performance and Limits', link: '/rendering/performance' },
                  { text: 'Streaming Rendering', link: '/rendering/streaming' }
                ]
              },
              {
                text: 'Middleware',
                collapsed: true,
                items: [
                  { text: 'Use Global', link: '/middleware/global' },
                  { text: 'Use Route-Specific', link: '/middleware/route-specific' },
                  { text: 'Basic Auth', link: '/middleware/basic-auth' },
                  { text: 'Body Limit', link: '/middleware/body-limit' },
                  { text: 'CORS', link: '/middleware/cors' },
                  { text: 'CSRF', link: '/middleware/csrf' },
                  { text: 'IP Restriction', link: '/middleware/ip' },
                  { text: 'Security Headers', link: '/middleware/security-headers' },
                  { text: 'Session', link: '/middleware/session' },
                  { text: 'WebSocket', link: '/middleware/websocket' },
                  {
                    text: 'Observability',
                    collapsed: true,
                    items: [
                      { text: 'Overview', link: '/middleware/observability/overview' },
                      { text: 'Event Reference', link: '/middleware/observability/events' },
                      { text: 'Request Logging', link: '/middleware/observability/logging' },
                      { text: 'Error Reporting', link: '/middleware/observability/errors' }
                    ]
                  },
                  {
                    text: 'Validation',
                    collapsed: true,
                    items: [
                      { text: 'Overview', link: '/middleware/validation/overview' },
                      { text: 'Define Schema', link: '/middleware/validation/define-schema' },
                      {
                        text: 'Validator Middleware',
                        link: '/middleware/validation/validator-middleware'
                      },
                      {
                        text: 'Reading Validated Data',
                        link: '/middleware/validation/reading-data'
                      },
                      {
                        text: 'Advanced Patterns',
                        link: '/middleware/validation/advanced-patterns'
                      }
                    ]
                  }
                ]
              },
              {
                text: 'Static Files',
                collapsed: true,
                items: [
                  { text: 'Basic Usage', link: '/static-file/basic' },
                  { text: 'Multiple Directories', link: '/static-file/multiple' }
                ]
              },
              {
                text: 'Response',
                collapsed: true,
                items: [
                  { text: 'JSON', link: '/response/json' },
                  { text: 'Text', link: '/response/text' },
                  { text: 'HTML', link: '/response/html' },
                  { text: 'Downloads', link: '/response/download' },
                  { text: 'Empty', link: '/response/empty' },
                  { text: 'Custom', link: '/response/custom' },
                  { text: 'Redirects', link: '/response/redirect' }
                ]
              },
              {
                text: 'Error Handling',
                collapsed: true,
                items: [
                  { text: 'Default Behavior', link: '/error-handling/default-behavior' },
                  { text: 'Defense in Depth', link: '/error-handling/defense-in-depth' },
                  { text: 'Object Details', link: '/error-handling/object-details' }
                ]
              },
              {
                text: 'By Design',
                collapsed: true,
                items: [
                  { text: 'Overview', link: '/by-design/' },
                  { text: 'Compression', link: '/by-design/compress' },
                  { text: 'Pretty JSON', link: '/by-design/pretty-json' },
                  { text: 'HTTPS Redirect', link: '/by-design/https-redirect' },
                  { text: 'Bearer Auth', link: '/by-design/bearer-auth' },
                  { text: 'XSS Input Sanitizer', link: '/by-design/xss' },
                  { text: 'Caching', link: '/by-design/cache' },
                  { text: 'Rate Limiting', link: '/by-design/rate-limit' },
                  { text: 'Request ID', link: '/by-design/request-id' },
                  { text: 'Method Override', link: '/by-design/method-override' },
                  { text: 'Locale Redirect', link: '/by-design/locale-redirect' },
                  { text: 'Server-Timing', link: '/by-design/server-timing' },
                  { text: 'Distributed Tracing', link: '/by-design/tracing' }
                ]
              },
              {
                text: 'Recipes',
                collapsed: true,
                items: [
                  {
                    text: 'Deno Desktop',
                    collapsed: true,
                    items: [
                      { text: 'Overview', link: '/recipes/desktop/overview' },
                      { text: 'Building the App', link: '/recipes/desktop/getting-started' },
                      { text: 'Serving the UI', link: '/recipes/desktop/serving' },
                      { text: 'Windows, Menus, Tray', link: '/recipes/desktop/native-apis' },
                      { text: 'Bindings and HTTP Bridge', link: '/recipes/desktop/bindings' },
                      { text: 'Notifications and Updates', link: '/recipes/desktop/notifications-updates' },
                      { text: 'Backends and Distribution', link: '/recipes/desktop/distribution' }
                    ]
                  },
                  { text: 'File Uploads', link: '/recipes/file-upload' },
                  { text: 'Streaming Data', link: '/recipes/streaming-data' },
                  { text: 'Object Storage', link: '/recipes/object-storage' },
                  { text: 'Graceful Shutdown', link: '/recipes/graceful-shutdown' },
                  { text: 'Production Deploy', link: '/recipes/production-deploy' },
                  { text: 'Audit Compliance', link: '/recipes/audit-compliance' },
                  { text: 'Worker Pool', link: '/recipes/worker-pool' }
                ]
              }
            ]
          },
          socialLinks: [{ icon: 'github', link: 'https://github.com/NeaByteLab/Deserve' }],
          footer: {
            message: 'Released under the MIT License.',
            copyright: `Copyright © ${copyrightYears} NeaByteLab`
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
          outline: { label: 'Pada halaman ini' },
          docFooter: {
            prev: 'Halaman sebelumnya',
            next: 'Halaman berikutnya'
          },
          lastUpdated: {
            text: 'Terakhir diperbarui'
          },
          darkModeSwitchLabel: 'Tampilan',
          lightModeSwitchTitle: 'Beralih ke tema terang',
          darkModeSwitchTitle: 'Beralih ke tema gelap',
          sidebarMenuLabel: 'Menu',
          returnToTopLabel: 'Kembali ke atas',
          langMenuLabel: 'Ganti bahasa',
          skipToContentLabel: 'Lewati ke konten',
          nav: [
            { text: 'Dokumentasi', link: '/id/getting-started/installation' },
            { text: 'Contoh', link: '/id/examples' },
            {
              text: 'LLM',
              items: [
                { text: 'llms.txt', link: '/llms.txt', target: '_blank' },
                { text: 'llms-full.txt', link: '/llms-full.txt', target: '_blank' }
              ]
            }
          ],
          sidebar: {
            '/id/': [
              {
                text: 'Konsep Inti',
                collapsed: true,
                items: [
                  { text: 'Filosofi', link: '/id/core-concepts/philosophy' },
                  { text: 'Tanpa Dependensi', link: '/id/core-concepts/zero-dependency' },
                  {
                    text: 'Routing Berbasis File',
                    link: '/id/core-concepts/file-based-routing'
                  },
                  { text: 'Pola Rute', link: '/id/core-concepts/route-patterns' },
                  { text: 'Objek Konteks', link: '/id/core-concepts/context-object' },
                  { text: 'Penanganan Request', link: '/id/core-concepts/request-handling' },
                  { text: 'Hot Reload', link: '/id/core-concepts/hot-reload' },
                  { text: 'Multi-Service', link: '/id/core-concepts/multi-service' }
                ]
              },
              {
                text: 'Memulai',
                collapsed: true,
                items: [
                  { text: 'Instalasi', link: '/id/getting-started/installation' },
                  { text: 'Mulai Cepat', link: '/id/getting-started/quick-start' },
                  { text: 'Dibangun untuk Tim', link: '/id/getting-started/built-for-teams' },
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
                text: 'Rendering',
                collapsed: true,
                items: [
                  { text: 'Ringkasan', link: '/id/rendering/' },
                  { text: 'Sintaks Template', link: '/id/rendering/syntax' },
                  { text: 'Performa dan Batas', link: '/id/rendering/performance' },
                  { text: 'Streaming Rendering', link: '/id/rendering/streaming' }
                ]
              },
              {
                text: 'Middleware',
                collapsed: true,
                items: [
                  { text: 'Gunakan Global', link: '/id/middleware/global' },
                  { text: 'Gunakan Spesifik Rute', link: '/id/middleware/route-specific' },
                  { text: 'Basic Auth', link: '/id/middleware/basic-auth' },
                  { text: 'Body Limit', link: '/id/middleware/body-limit' },
                  { text: 'CORS', link: '/id/middleware/cors' },
                  { text: 'CSRF', link: '/id/middleware/csrf' },
                  { text: 'Pembatasan IP', link: '/id/middleware/ip' },
                  { text: 'Security Headers', link: '/id/middleware/security-headers' },
                  { text: 'Session', link: '/id/middleware/session' },
                  { text: 'WebSocket', link: '/id/middleware/websocket' },
                  {
                    text: 'Observability',
                    collapsed: true,
                    items: [
                      { text: 'Ringkasan', link: '/id/middleware/observability/overview' },
                      { text: 'Referensi Event', link: '/id/middleware/observability/events' },
                      { text: 'Request Logging', link: '/id/middleware/observability/logging' },
                      { text: 'Pelaporan Error', link: '/id/middleware/observability/errors' }
                    ]
                  },
                  {
                    text: 'Validasi',
                    collapsed: true,
                    items: [
                      { text: 'Ringkasan', link: '/id/middleware/validation/overview' },
                      { text: 'Define Schema', link: '/id/middleware/validation/define-schema' },
                      {
                        text: 'Middleware Validator',
                        link: '/id/middleware/validation/validator-middleware'
                      },
                      {
                        text: 'Membaca Data Tervalidasi',
                        link: '/id/middleware/validation/reading-data'
                      },
                      {
                        text: 'Pola Lanjutan',
                        link: '/id/middleware/validation/advanced-patterns'
                      }
                    ]
                  }
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
                  { text: 'JSON', link: '/id/response/json' },
                  { text: 'Teks', link: '/id/response/text' },
                  { text: 'HTML', link: '/id/response/html' },
                  { text: 'Unduhan', link: '/id/response/download' },
                  { text: 'Kosong', link: '/id/response/empty' },
                  { text: 'Kustom', link: '/id/response/custom' },
                  { text: 'Pengalihan', link: '/id/response/redirect' }
                ]
              },
              {
                text: 'Penanganan Error',
                collapsed: true,
                items: [
                  { text: 'Perilaku Default', link: '/id/error-handling/default-behavior' },
                  { text: 'Pertahanan Berlapis', link: '/id/error-handling/defense-in-depth' },
                  { text: 'Detail Objek', link: '/id/error-handling/object-details' }
                ]
              },
              {
                text: 'Sesuai Desain',
                collapsed: true,
                items: [
                  { text: 'Ringkasan', link: '/id/by-design/' },
                  { text: 'Kompresi', link: '/id/by-design/compress' },
                  { text: 'Pretty JSON', link: '/id/by-design/pretty-json' },
                  { text: 'HTTPS Redirect', link: '/id/by-design/https-redirect' },
                  { text: 'Bearer Auth', link: '/id/by-design/bearer-auth' },
                  { text: 'XSS Input Sanitizer', link: '/id/by-design/xss' },
                  { text: 'Caching', link: '/id/by-design/cache' },
                  { text: 'Rate Limiting', link: '/id/by-design/rate-limit' },
                  { text: 'Request ID', link: '/id/by-design/request-id' },
                  { text: 'Method Override', link: '/id/by-design/method-override' },
                  { text: 'Locale Redirect', link: '/id/by-design/locale-redirect' },
                  { text: 'Server-Timing', link: '/id/by-design/server-timing' },
                  { text: 'Distributed Tracing', link: '/id/by-design/tracing' }
                ]
              },
              {
                text: 'Resep',
                collapsed: true,
                items: [
                  {
                    text: 'Deno Desktop',
                    collapsed: true,
                    items: [
                      { text: 'Ringkasan', link: '/id/recipes/desktop/overview' },
                      { text: 'Membangun Aplikasi', link: '/id/recipes/desktop/getting-started' },
                      { text: 'Menyajikan UI', link: '/id/recipes/desktop/serving' },
                      { text: 'Jendela, Menu, Tray', link: '/id/recipes/desktop/native-apis' },
                      { text: 'Bindings dan Jembatan HTTP', link: '/id/recipes/desktop/bindings' },
                      { text: 'Notifikasi dan Update', link: '/id/recipes/desktop/notifications-updates' },
                      { text: 'Backend dan Distribusi', link: '/id/recipes/desktop/distribution' }
                    ]
                  },
                  { text: 'Upload File', link: '/id/recipes/file-upload' },
                  { text: 'Streaming Data', link: '/id/recipes/streaming-data' },
                  { text: 'Object Storage', link: '/id/recipes/object-storage' },
                  { text: 'Graceful Shutdown', link: '/id/recipes/graceful-shutdown' },
                  { text: 'Production Deploy', link: '/id/recipes/production-deploy' },
                  { text: 'Audit Kepatuhan', link: '/id/recipes/audit-compliance' },
                  { text: 'Worker Pool', link: '/id/recipes/worker-pool' }
                ]
              }
            ]
          },
          socialLinks: [{ icon: 'github', link: 'https://github.com/NeaByteLab/Deserve' }],
          footer: {
            message: 'Dirilis di bawah Lisensi MIT.',
            copyright: `Hak Cipta © ${copyrightYears} NeaByteLab`
          }
        }
      }
    },
    markdown: {
      lineNumbers: false,
      theme: {
        light: 'github-light',
        dark: 'github-dark'
      },
      languages: ['js', 'jsx', 'ts', 'tsx'],
      codeTransformers: [
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
          twoslashOptions: {
            extraFiles: {
              'deserve.ts': deserveTypes,
              'deserve-deno.d.ts': deserveDeno
            },
            compilerOptions: {
              lib: ['ESNext', 'DOM', 'DOM.Iterable'],
              types: [],
              paths: {
                '@neabyte/deserve': ['./deserve.ts']
              }
            }
          }
        })
      ],
      config(md) {
        md.use(groupIconMdPlugin)
      }
    },
    vite: {
      plugins: [
        groupIconVitePlugin({
          defaultLabels: ['deno', 'npm']
        }),
        llmstxt({
          domain: hostname,
          title: 'Deserve',
          description: 'Web Framework for Deno Ecosystem',
          details:
            'Deserve is a zero-dependency, zero-configuration HTTP framework for Deno. It provides file-based routing, composable middleware, streaming responses, and a typed Context API for building servers with maximum productivity.',
          ignoreFiles: ['id/**', 'index.md', 'README.md']
        })
      ]
    },
    transformHead({ pageData }) {
      const fm = pageData.frontmatter
      const title = fm.title ? `${fm.title} | Deserve` : 'Deserve - Web Framework for Deno'
      const description =
        fm.description ?? 'Build HTTP server effortlessly with zero configuration for productivity.'
      const url = `${hostname}/${pageData.relativePath.replace(/(index)?\.md$/, '')}`
      return [
        ['link', { rel: 'canonical', href: url }],
        ['meta', { property: 'og:title', content: title }],
        ['meta', { property: 'og:description', content: description }],
        ['meta', { property: 'og:url', content: url }],
        ['meta', { name: 'twitter:title', content: title }],
        ['meta', { name: 'twitter:description', content: description }]
      ]
    }
  })
)
