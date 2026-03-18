import type * as Types from '@interfaces/index.ts'

/**
 * DVE expression tokenizer
 * @description Converts expression string into token list
 */
export class Tokenizer {
  /**
   * Tokenize expression into tokens
   * @description Supports strings, numbers, idents, operators
   * @param expressionText - Raw expression text
   * @returns List of expression tokens
   * @throws {Error} When tokenization fails
   */
  static tokenize(expressionText: string): Types.ExprToken[] {
    const exprTokens: Types.ExprToken[] = []
    let cursorIndex = 0
    const pushToken = (token: Types.ExprToken) => exprTokens.push(token)
    const isWhitespace = (char: string) =>
      char === ' ' || char === '\n' || char === '\t' || char === '\r'
    const isDigitChar = (char: string) => char >= '0' && char <= '9'
    const isIdentifierStartChar = (char: string) =>
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char === '_' ||
      char === '$' ||
      char === '@'
    const isIdentifierChar = (char: string) => isIdentifierStartChar(char) || isDigitChar(char)
    while (cursorIndex < expressionText.length) {
      const currentChar = expressionText[cursorIndex] ?? ''
      if (isWhitespace(currentChar)) {
        cursorIndex++
        continue
      }
      const twoCharOp = expressionText.slice(cursorIndex, cursorIndex + 2)
      const threeCharOp = expressionText.slice(cursorIndex, cursorIndex + 3)
      if (threeCharOp === '===') {
        pushToken({ kind: 'op', value: '===' })
        cursorIndex += 3
        continue
      }
      if (threeCharOp === '!==') {
        pushToken({ kind: 'op', value: '!==' })
        cursorIndex += 3
        continue
      }
      if (
        twoCharOp === '&&' ||
        twoCharOp === '||' ||
        twoCharOp === '??' ||
        twoCharOp === '>=' ||
        twoCharOp === '<=' ||
        twoCharOp === '==' ||
        twoCharOp === '!='
      ) {
        pushToken({ kind: 'op', value: twoCharOp })
        cursorIndex += 2
        continue
      }
      if (twoCharOp === '?.') {
        pushToken({ kind: 'op', value: '?.' })
        cursorIndex += 2
        continue
      }
      if (
        currentChar === '(' ||
        currentChar === ')' ||
        currentChar === '?' ||
        currentChar === ':' ||
        currentChar === '.' ||
        currentChar === '!' ||
        currentChar === '+' ||
        currentChar === '-' ||
        currentChar === '*' ||
        currentChar === '/' ||
        currentChar === '%' ||
        currentChar === '>' ||
        currentChar === '<'
      ) {
        pushToken({ kind: 'op', value: currentChar })
        cursorIndex++
        continue
      }
      if (currentChar === "'" || currentChar === '"') {
        const quoteChar = currentChar
        cursorIndex++
        let stringValue = ''
        let isClosed = false
        while (cursorIndex < expressionText.length) {
          const currentStringChar = expressionText[cursorIndex] ?? ''
          if (currentStringChar === '\\') {
            const escapeCode = expressionText[cursorIndex + 1] ?? ''
            if (escapeCode === 'n') {
              stringValue += '\n'
            } else if (escapeCode === 't') {
              stringValue += '\t'
            } else if (escapeCode === 'r') {
              stringValue += '\r'
            } else {
              stringValue += escapeCode
            }
            cursorIndex += 2
            continue
          }
          if (currentStringChar === quoteChar) {
            cursorIndex++
            isClosed = true
            break
          }
          stringValue += currentStringChar
          cursorIndex++
        }
        if (!isClosed) {
          throw new Error('Unterminated string literal in DVE expression.')
        }
        pushToken({ kind: 'string', value: stringValue })
        continue
      }
      if (isDigitChar(currentChar)) {
        let endIndex = cursorIndex
        while (endIndex < expressionText.length && isDigitChar(expressionText[endIndex] ?? '')) {
          endIndex++
        }
        if (expressionText[endIndex] === '.') {
          endIndex++
          while (endIndex < expressionText.length && isDigitChar(expressionText[endIndex] ?? '')) {
            endIndex++
          }
        }
        const numberText = expressionText.slice(cursorIndex, endIndex)
        pushToken({ kind: 'number', value: Number(numberText) })
        cursorIndex = endIndex
        continue
      }
      if (isIdentifierStartChar(currentChar)) {
        let endIndex = cursorIndex + 1
        while (
          endIndex < expressionText.length &&
          isIdentifierChar(expressionText[endIndex] ?? '')
        ) {
          endIndex++
        }
        const identifierName = expressionText.slice(cursorIndex, endIndex)
        pushToken({ kind: 'ident', value: identifierName })
        cursorIndex = endIndex
        continue
      }
      throw new Error(
        `Invalid DVE expression token near: ${expressionText.slice(cursorIndex, cursorIndex + 10)}.`
      )
    }
    return exprTokens
  }
}
