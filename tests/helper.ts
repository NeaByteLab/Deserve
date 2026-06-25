import * as Core from '@core/index.ts'

export default class Helper {
  static createTestContext(
    url = 'http://localhost/',
    requestInit?: RequestInit
  ): Core.Context {
    const request = new Request(url, requestInit)
    return new Core.Context(request, new URL(url), null, undefined, undefined, null, () => {})
  }

  static okNext(): Promise<Response> {
    return Promise.resolve(new Response('ok'))
  }
}
