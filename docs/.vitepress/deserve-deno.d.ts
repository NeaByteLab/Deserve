declare namespace Deno {
  interface Env {
    get(key: string): string | undefined
    set(key: string, value: string): void
    has(key: string): boolean
    delete(key: string): void
    toObject(): Record<string, string>
  }
  const env: Env

  function cwd(): string
  function exit(code?: number): never
  function kill(pid: number, signo?: string): void
  function readTextFile(path: string | URL): Promise<string>
  function readFile(path: string | URL): Promise<Uint8Array>
  function writeFile(
    path: string | URL,
    data: Uint8Array | ReadableStream<Uint8Array>
  ): Promise<void>
  interface FsFile {
    write(data: Uint8Array): Promise<number>
    close(): void
  }
  function open(
    path: string | URL,
    options?: { read?: boolean; write?: boolean; create?: boolean; append?: boolean }
  ): Promise<FsFile>
  function watchFs(
    paths: string | string[],
    options?: { recursive?: boolean }
  ): AsyncIterableIterator<{ kind: string; paths: string[] }>

  interface ServeInit {
    port?: number
    hostname?: string
    signal?: AbortSignal
    onListen?: (addr: { hostname: string; port: number }) => void
  }
  function serve(
    options: ServeInit,
    handler: (request: Request) => Response | Promise<Response>
  ): { finished: Promise<void>; shutdown(): Promise<void> }

  function upgradeWebSocket(request: Request): { socket: WebSocket; response: Response }

  namespace errors {
    class NotFound extends Error {}
    class InvalidData extends Error {}
    class NotSupported extends Error {}
    class BadResource extends Error {}
    class PermissionDenied extends Error {}
  }
}
