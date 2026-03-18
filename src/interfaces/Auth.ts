/** Basic Auth middleware options. */
export interface BasicAuthOptions {
  /** Allowed username/password pairs */
  users: BasicAuthUser[]
}

/** Single Basic Auth user credential. */
export interface BasicAuthUser {
  /** Login name */
  username: string
  /** Password */
  password: string
}
