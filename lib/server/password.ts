import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummy: Promise<string> | undefined;

/** A real hash to compare against when the account does not exist, so response time does not reveal accounts. */
export function dummyHash(): Promise<string> {
  dummy ??= bcrypt.hash("no-such-account", COST);
  return dummy;
}
