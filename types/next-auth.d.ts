import "next-auth";

declare module "next-auth" {
  interface Session {
    /** Session version at sign-in; compared with User.sessionVersion on every request. */
    sv: number;
  }
  interface User {
    sessionVersion?: number;
  }
}
