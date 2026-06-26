/**
 * Import metadata for current module.
 * @description Exposes module path info and resolver.
 */
interface ImportMeta {
  /** Absolute directory path of module */
  dirname: string
  /** Absolute file path of module */
  filename: string
  /**
   * Resolve specifier against module URL.
   * @param specifier - Module specifier to resolve
   * @returns Absolute resolved URL string
   */
  resolve(specifier: string): string
}


/**
 * Deno global runtime namespace.
 * @description Ambient types for Deno runtime APIs.
 */
declare namespace Deno {
  /**
   * Environment variable accessor.
   * @description Reads and mutates process environment.
   */
  interface Env {
    /**
     * Delete environment variable.
     * @param key - Variable name to remove
     */
    delete(key: string): void
    /**
     * Get environment variable value.
     * @param key - Variable name to read
     * @returns Variable value or undefined
     */
    get(key: string): string | undefined
    /**
     * Check environment variable exists.
     * @param key - Variable name to check
     * @returns True when variable is set
     */
    has(key: string): boolean
    /**
     * Set environment variable value.
     * @param key - Variable name to write
     * @param value - Value to assign
     */
    set(key: string, value: string): void
    /**
     * Snapshot all environment variables.
     * @returns Record of all variable entries
     */
    toObject(): Record<string, string>
  }

  /**
   * Filesystem entry metadata.
   * @description Describes file type, size, and times.
   */
  interface FileInfo {
    /** Last access time */
    atime: Date | null
    /** Creation time of entry */
    birthtime: Date | null
    /** True when entry is a directory */
    isDirectory: boolean
    /** True when entry is a file */
    isFile: boolean
    /** True when entry is a symlink */
    isSymlink: boolean
    /** Last modification time */
    mtime: Date | null
    /** Entry size in bytes */
    size: number
  }

  /**
   * Open file handle reference.
   * @description Wraps an open file descriptor.
   */
  interface FsFile {
    /** Close the file handle */
    close(): void
    /**
     * Write bytes to file handle.
     * @param data - Byte content to write
     * @returns Promise resolving to bytes written
     */
    write(data: Uint8Array): Promise<number>
  }

  /**
   * Network address descriptor.
   * @description Transport, hostname, and port info.
   */
  interface NetAddr {
    /** Remote hostname or address */
    hostname: string
    /** Remote port number */
    port: number
    /** Transport protocol type */
    transport: 'tcp' | 'udp'
  }

  /**
   * Per-request serve handler info.
   * @description Remote address and completion signal.
   */
  interface ServeHandlerInfo {
    /** Promise resolving when request completes */
    completed: Promise<void>
    /** Remote peer network address */
    remoteAddr: NetAddr
  }

  /**
   * HTTP server initialization options.
   * @description Configures listen address and lifecycle.
   */
  interface ServeInit {
    /** Hostname to bind the server */
    hostname?: string
    /** Callback fired when listening starts */
    onListen?: (addr: { hostname: string; port: number }) => void
    /** Port number to listen on */
    port?: number
    /** Abort signal to stop server */
    signal?: AbortSignal
  }

  /** Global environment variable accessor */
  const env: Env

  /**
   * Get current working directory.
   * @returns Absolute working directory path
   */
  function cwd(): string
  /**
   * Exit process with status code.
   * @param code - Optional exit status code
   * @returns Never returns to caller
   */
  function exit(code?: number): never
  /**
   * Send signal to a process.
   * @param pid - Target process identifier
   * @param signo - Optional signal name
   */
  function kill(pid: number, signo?: string): void
  /**
   * Open file and return handle.
   * @param path - File path or URL
   * @param options - Read, write, create flags
   * @returns Promise resolving to file handle
   */
  function open(
    path: string | URL,
    options?: { read?: boolean; write?: boolean; create?: boolean; append?: boolean }
  ): Promise<FsFile>
  /**
   * Read file contents as bytes.
   * @param path - File path or URL
   * @returns Promise resolving to byte array
   */
  function readFile(path: string | URL): Promise<Uint8Array>
  /**
   * Read file contents as text.
   * @param path - File path or URL
   * @returns Promise resolving to file text
   */
  function readTextFile(path: string | URL): Promise<string>
  /**
   * Start HTTP server with handler.
   * @param options - Server initialization options
   * @param handler - Request to response handler
   * @returns Server with finished and shutdown
   */
  function serve(
    options: ServeInit,
    handler: (request: Request) => Response | Promise<Response>
  ): { finished: Promise<void>; shutdown(): Promise<void> }
  /**
   * Get filesystem entry metadata.
   * @param path - File path or URL
   * @returns Promise resolving to file info
   */
  function stat(path: string | URL): Promise<FileInfo>
  /**
   * Upgrade request to WebSocket.
   * @param request - Incoming upgrade request
   * @returns Socket and upgrade response pair
   */
  function upgradeWebSocket(request: Request): { socket: WebSocket; response: Response }
  /**
   * Watch filesystem paths for changes.
   * @param paths - Path or paths to watch
   * @param options - Recursive watch flag
   * @returns Async iterator of change events
   */
  function watchFs(
    paths: string | string[],
    options?: { recursive?: boolean }
  ): AsyncIterableIterator<{ kind: string; paths: string[] }>
  /**
   * Write bytes to a file.
   * @param path - File path or URL
   * @param data - Byte content or stream
   * @returns Promise resolving when write completes
   */
  function writeFile(
    path: string | URL,
    data: Uint8Array | ReadableStream<Uint8Array>
  ): Promise<void>
  /**
   * Write text to a file.
   * @param path - File path or URL
   * @param data - Text content to write
   * @param options - Append and create flags
   * @returns Promise resolving when write completes
   */
  function writeTextFile(
    path: string | URL,
    data: string,
    options?: { append?: boolean; create?: boolean }
  ): Promise<void>

  /**
   * Deno runtime error classes.
   * @description Typed errors thrown by runtime APIs.
   */
  namespace errors {
    /** Resource handle is invalid */
    class BadResource extends Error {}
    /** Data was invalid or corrupt */
    class InvalidData extends Error {}
    /** Resource was not found */
    class NotFound extends Error {}
    /** Operation is not supported */
    class NotSupported extends Error {}
    /** Permission was denied for operation */
    class PermissionDenied extends Error {}
  }
}
