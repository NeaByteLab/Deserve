---
layout: home

hero:
  name: "Deserve"
  text: "Web Framework"
  tagline: "Build HTTP servers effortlessly with zero configuration for maximum productivity."
  image:
    src: /image.png
    alt: Deserve

  actions:
    - theme: brand
      text: Get Started
      link: /en/getting-started/installation

    - theme: alt
      text: View on GitHub
      link: https://github.com/NeaByteLab/Deserve

features:
  - icon: ⚡
    title: Lightning Fast
    details: Built for performance with Deno's native HTTP capabilities. Zero overhead, maximum speed.
    link: /en/core-concepts/philosophy

  - icon: 📁
    title: File-Based Routing
    details: Your file structure becomes your API structure. Intuitive and maintainable.
    link: /en/core-concepts/file-based-routing

  - icon: 🎯
    title: Zero Configuration
    details: Drop files in folders and get instant API endpoints. No complex setup required.
    link: /en/core-concepts/route-patterns

  - icon: 🛡️
    title: Built-in Middleware
    details: CORS, sessions, body limits, security headers, and basic auth out of the box.
    link: /en/middleware/global

  - icon: 🖼️
    title: Template Engine
    details: DVE template engine with conditionals, loops, includes, and streaming rendering.
    link: /en/rendering/

  - icon: 🔄
    title: Hot Reload
    details: Routes and templates auto-reload on file changes. No server restart needed.
    link: /en/core-concepts/hot-reload
