/** Basic Auth middleware options. */
export interface BasicAuthOptions {
  /** Allowed username/password pairs */
  readonly users: readonly BasicAuthUser[]
}

/** Single Basic Auth user credential. */
export interface BasicAuthUser {
  /** Login name */
  readonly username: string
  /** Password */
  readonly password: string
}
