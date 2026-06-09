let overlay: HTMLDivElement | null = null
let overlayImg: HTMLImageElement | null = null

function imageSource(image: HTMLImageElement): string {
  return image.currentSrc || image.src
}

function isDiagramTrigger(target: EventTarget | null): target is HTMLImageElement {
  if (!(target instanceof HTMLImageElement) || target === overlayImg) {
    return false
  }
  return imageSource(target).includes('/diagrams/')
}

function ensureOverlay(): HTMLDivElement {
  if (overlay) {
    return overlay
  }
  overlay = document.createElement('div')
  overlay.className = 'diagram-lightbox'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlayImg = document.createElement('img')
  overlay.appendChild(overlayImg)
  overlay.addEventListener('click', (event: MouseEvent) => {
    event.stopPropagation()
    close()
  })
  document.body.appendChild(overlay)
  return overlay
}

function open(source: HTMLImageElement): void {
  const el = ensureOverlay()
  overlayImg!.src = imageSource(source)
  overlayImg!.alt = source.alt
  void el.offsetWidth
  el.classList.add('is-open')
  document.documentElement.style.overflow = 'hidden'
}

function close(): void {
  if (!overlay?.classList.contains('is-open')) {
    return
  }
  overlay.classList.remove('is-open')
  document.documentElement.style.overflow = ''
}

function onDocumentClick(event: MouseEvent): void {
  if (!isDiagramTrigger(event.target)) {
    return
  }
  event.preventDefault()
  open(event.target)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    close()
  }
}

export function setupDiagramLightbox(): void {
  if (typeof window === 'undefined') {
    return
  }
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('popstate', close)
}
