import type * as Types from '@interfaces/index.ts'

/**
 * DVE template parser
 * @description Converts template text into AST nodes
 */
export class Parser {
  /**
   * Parse template into AST
   * @description Extracts tags and builds block structures
   * @param templateText - Raw template content
   * @returns List of AST nodes
   */
  static parse(templateText: string): Types.AstNode[] {
    const astNodes: Types.AstNode[] = []
    const templateTagRegex = /\{\{\{[\s\S]*?\}\}\}|\{\{[\s\S]*?\}\}/g
    let scanIndex = 0
    const frameStack: Types.DveStackFrame[] = []
    const appendAstNode = (node: Types.AstNode) => {
      const stackFrame = frameStack[frameStack.length - 1]
      if (!stackFrame) {
        astNodes.push(node)
        return
      }
      if (stackFrame.kind === 'if') {
        const ifNode = stackFrame.node as Extract<Types.AstNode, { type: 'if' }>
        if (stackFrame.inElse) {
          ifNode.elseNodes.push(node)
        } else {
          ifNode.thenNodes.push(node)
        }
        return
      }
      const eachNode = stackFrame.node as Extract<Types.AstNode, { type: 'each' }>
      eachNode.nodes.push(node)
    }
    let match: RegExpExecArray | null
    while ((match = templateTagRegex.exec(templateText)) !== null) {
      const rawTemplateTag = match[0] ?? ''
      const tagStartIndex = match.index
      if (tagStartIndex > scanIndex) {
        appendAstNode({ type: 'text', value: templateText.slice(scanIndex, tagStartIndex) })
      }
      scanIndex = tagStartIndex + rawTemplateTag.length
      if (rawTemplateTag.startsWith('{{{')) {
        const tagContent = rawTemplateTag.slice(3, -3).trim()
        if (tagContent) {
          appendAstNode({ type: 'var', path: tagContent, raw: true })
        }
        continue
      }
      const tagContent = rawTemplateTag.slice(2, -2).trim()
      if (!tagContent) {
        continue
      }
      if (tagContent.startsWith('>')) {
        const includeTemplatePath = tagContent.slice(1).trim()
        if (includeTemplatePath) {
          appendAstNode({ type: 'include', templatePath: includeTemplatePath })
        }
        continue
      }
      if (tagContent.startsWith('#if ')) {
        const dataPath = tagContent.slice(4).trim()
        const ifNode: Extract<Types.AstNode, { type: 'if' }> = {
          type: 'if',
          path: dataPath,
          thenNodes: [],
          elseNodes: []
        }
        appendAstNode(ifNode)
        frameStack.push({ kind: 'if', node: ifNode, inElse: false })
        continue
      }
      if (tagContent === 'else') {
        const stackFrame = frameStack[frameStack.length - 1]
        if (stackFrame?.kind === 'if') {
          stackFrame.inElse = true
        }
        continue
      }
      if (tagContent === '/if') {
        const stackFrame = frameStack[frameStack.length - 1]
        if (stackFrame?.kind === 'if') {
          frameStack.pop()
        }
        continue
      }
      if (tagContent.startsWith('#each ')) {
        const eachClauseText = tagContent.slice(6).trim()
        const asClauseMatch = eachClauseText.match(/^(.+)\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)$/)
        const dataPath = (asClauseMatch?.[1] ?? eachClauseText).trim()
        const itemName = (asClauseMatch?.[2] ?? 'item').trim()
        const eachNode: Extract<Types.AstNode, { type: 'each' }> = {
          type: 'each',
          path: dataPath,
          itemName,
          nodes: []
        }
        appendAstNode(eachNode)
        frameStack.push({ kind: 'each', node: eachNode, inElse: false })
        continue
      }
      if (tagContent === '/each') {
        const stackFrame = frameStack[frameStack.length - 1]
        if (stackFrame?.kind === 'each') {
          frameStack.pop()
        }
        continue
      }
      appendAstNode({ type: 'var', path: tagContent, raw: false })
    }
    if (scanIndex < templateText.length) {
      appendAstNode({ type: 'text', value: templateText.slice(scanIndex) })
    }
    return astNodes
  }
}
