import { inBrowser, onContentUpdated } from 'vitepress'

const packageManagers = new Set(['npm', 'yarn', 'pnpm', 'bun', 'deno'])
const storageKey = 'deserve:package-manager-tab'

function getStoredManager(): string | null {
  try {
    return localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

function setStoredManager(title: string): void {
  try {
    localStorage.setItem(storageKey, title)
  } catch {
    return
  }
}

function getInputLabel(group: Element, input: HTMLInputElement): HTMLLabelElement | undefined {
  return Array.from(group.querySelectorAll<HTMLLabelElement>('.tabs label')).find(
    (label) => label.htmlFor === input.id
  )
}

function getInputTitle(input: HTMLInputElement): string | undefined {
  const group = input.closest('.vp-code-group')
  if (!group) {
    return undefined
  }
  const title = getInputLabel(group, input)?.dataset.title
  return title && packageManagers.has(title) ? title : undefined
}

function hasManagerTabs(group: Element): boolean {
  return Array.from(group.querySelectorAll<HTMLLabelElement>('.tabs label')).some((label) =>
    packageManagers.has(label.dataset.title ?? '')
  )
}

function activateTab(group: Element, title: string): void {
  const labels = Array.from(group.querySelectorAll<HTMLLabelElement>('.tabs label'))
  const tabIndex = labels.findIndex((label) => label.dataset.title === title)
  if (tabIndex < 0) {
    return
  }
  const inputs = Array.from(group.querySelectorAll<HTMLInputElement>('.tabs input'))
  const blocks = group.querySelector('.blocks')
  const nextBlock = blocks?.children[tabIndex]
  if (!nextBlock) {
    return
  }
  inputs.forEach((input) => {
    input.checked = false
  })
  if (inputs[tabIndex]) {
    inputs[tabIndex].checked = true
  }
  Array.from(blocks.children).forEach((block) => {
    block.classList.remove('active')
  })
  nextBlock.classList.add('active')
}

function syncGroups(root: ParentNode, title: string): void {
  if (!packageManagers.has(title)) {
    return
  }
  root.querySelectorAll('.vp-code-group').forEach((group) => {
    if (hasManagerTabs(group)) {
      activateTab(group, title)
    }
  })
}

export function syncPackageTabs(): void {
  if (!inBrowser) {
    return
  }
  onContentUpdated(() => {
    const title = getStoredManager()
    if (title) {
      syncGroups(document, title)
    }
  })
  window.addEventListener('click', (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) {
      return
    }
    if (!input.matches('.vp-code-group input')) {
      return
    }
    const title = getInputTitle(input)
    if (!title) {
      return
    }
    setStoredManager(title)
    queueMicrotask(() => syncGroups(document, title))
  })
}
