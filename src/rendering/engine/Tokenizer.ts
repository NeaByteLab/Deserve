import type * as Types from '@interfaces/index.ts'

/**
 * DVE expression tokenizer.
 * @description Converts expression string into token list.
 */
export class Tokenizer {
  /**
   * Check if character is whitespace.
   * @description Tests for space, newline, tab, carriage return.
   * @param char - Single character to test
   * @returns True when whitespace
   */
  private static isWhitespace(char: string): boolean {
    return char === ' ' || char === '\n' || char === '\t' || char === '\r'
  }

  /**
   * Check if character is digit.
   * @description Tests for ASCII 0-9 characters.
   * @param char - Single character to test
   * @returns True when digit
   */
  private static isDigitChar(char: string): boolean {
    return char >= '0' && char <= '9'
  }

  /**
   * Check if character starts identifier.
   * @description Tests for letters, underscore, dollar, at sign.
   * @param char - Single character to test
   * @returns True when valid identifier start
   */
  private static isIdentifierStartChar(char: string): boolean {
    return (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char === '_' ||
      char === '$' ||
      char === '@'
    )
  }

  /**
   * Check if character continues identifier.
   * @description Tests for identifier start chars or digits.
   * @param char - Single character to test
   * @returns True when valid identifier char
   */
  private static isIdentifierChar(char: string): boolean {
    return Tokenizer.isIdentifierStartChar(char) || Tokenizer.isDigitChar(char)
  }

  /**
   * Tokenize expression into tokens.
   * @description Supports strings, numbers, idents, operators.
   * @param expressionText - Raw expression text
   * @returns List of expression tokens
   * @throws {Deno.errors.InvalidData} When tokenization fails
   */
  static tokenize(expressionText: string): Types.ExprToken[] {
    const exprTokens: Types.ExprToken[] = []
    let cursorIndex = 0
    while (cursorIndex < expressionText.length) {
      const currentChar = expressionText[cursorIndex] ?? ''
      if (Tokenizer.isWhitespace(currentChar)) {
        cursorIndex++
        continue
      }
      const twoCharOp = expressionText.slice(cursorIndex, cursorIndex + 2)
      const threeCharOp = expressionText.slice(cursorIndex, cursorIndex + 3)
      if (threeCharOp === '===') {
        exprTokens.push({ kind: 'op', value: '===' })
        cursorIndex += 3
        continue
      }
      if (threeCharOp === '!==') {
        exprTokens.push({ kind: 'op', value: '!==' })
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
        exprTokens.push({ kind: 'op', value: twoCharOp })
        cursorIndex += 2
        continue
      }
      if (twoCharOp === '?.') {
        exprTokens.push({ kind: 'op', value: '?.' })
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
        exprTokens.push({ kind: 'op', value: currentChar })
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
          throw new Deno.errors.InvalidData('Unterminated string literal in DVE expression')
        }
        exprTokens.push({ kind: 'string', value: stringValue })
        continue
      }
      if (Tokenizer.isDigitChar(currentChar)) {
        let endIndex = cursorIndex
        while (
          endIndex < expressionText.length &&
          Tokenizer.isDigitChar(expressionText[endIndex] ?? '')
        ) {
          endIndex++
        }
        if (expressionText[endIndex] === '.') {
          endIndex++
          while (
            endIndex < expressionText.length &&
            Tokenizer.isDigitChar(expressionText[endIndex] ?? '')
          ) {
            endIndex++
          }
        }
        const expChar = expressionText[endIndex]
        if (expChar === 'e' || expChar === 'E') {
          endIndex++
          const signChar = expressionText[endIndex]
          if (signChar === '+' || signChar === '-') {
            endIndex++
          }
          while (
            endIndex < expressionText.length &&
            Tokenizer.isDigitChar(expressionText[endIndex] ?? '')
          ) {
            endIndex++
          }
        }
        const numberText = expressionText.slice(cursorIndex, endIndex)
        exprTokens.push({ kind: 'number', value: Number(numberText) })
        cursorIndex = endIndex
        continue
      }
      if (Tokenizer.isIdentifierStartChar(currentChar)) {
        let endIndex = cursorIndex + 1
        while (
          endIndex < expressionText.length &&
          Tokenizer.isIdentifierChar(expressionText[endIndex] ?? '')
        ) {
          endIndex++
        }
        const identifierName = expressionText.slice(cursorIndex, endIndex)
        exprTokens.push({ kind: 'ident', value: identifierName })
        cursorIndex = endIndex
        continue
      }
      throw new Deno.errors.InvalidData(
        `Invalid DVE expression token near ${expressionText.slice(cursorIndex, cursorIndex + 10)}`
      )
    }
    return exprTokens
  }
}
