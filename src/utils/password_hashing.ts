import { createHash } from "node:crypto";

// Hash a password using SHA-256
export function hashPassword(password: string): string {
	return createHash("sha256").update(password).digest("hex");
}
