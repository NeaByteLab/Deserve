import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('Cookie serialize allows SameSite None with secure', () => {
  const value = Core.Cookie.serialize('sid', 'abc', { sameSite: 'None', secure: true })
  assertEquals(value.includes('SameSite=None'), true)
  assertEquals(value.includes('Secure'), true)
})

Deno.test('Cookie serialize appends expires from Date', () => {
  const value = Core.Cookie.serialize('sid', 'abc', { expires: new Date(0) })
  assertEquals(value.includes('Expires='), true)
})

Deno.test('Cookie serialize appends maxAge and flags', () => {
  const value = Core.Cookie.serialize('sid', 'abc', {
    maxAge: 60,
    secure: true,
    httpOnly: true
  })
  assertEquals(value.includes('Max-Age=60'), true)
  assertEquals(value.includes('Secure'), true)
  assertEquals(value.includes('HttpOnly'), true)
})

Deno.test('Cookie serialize appends path and domain', () => {
  const value = Core.Cookie.serialize('sid', 'abc', { path: '/', domain: 'example.com' })
  assertEquals(value.includes('Path=/'), true)
  assertEquals(value.includes('Domain=example.com'), true)
})

Deno.test('Cookie serialize builds basic name value pair', () => {
  assertEquals(Core.Cookie.serialize('sid', 'abc'), 'sid=abc')
})

Deno.test('Cookie serialize throws on SameSite None without secure', () => {
  let threw = false
  try {
    Core.Cookie.serialize('sid', 'abc', { sameSite: 'None' })
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
})

Deno.test('Cookie serialize throws on empty name', () => {
  let threw = false
  try {
    Core.Cookie.serialize('', 'abc')
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
})

Deno.test('Cookie serialize throws on invalid expires', () => {
  let threw = false
  try {
    Core.Cookie.serialize('sid', 'abc', { expires: new Date('invalid') })
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
})

Deno.test('Cookie serialize throws on non-finite maxAge', () => {
  let threw = false
  try {
    Core.Cookie.serialize('sid', 'abc', { maxAge: Infinity })
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
})

Deno.test('Cookie serialize url-encodes name and value', () => {
  assertEquals(Core.Cookie.serialize('a b', 'c d'), 'a%20b=c%20d')
})
