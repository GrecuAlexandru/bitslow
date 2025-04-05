import { randomBytes } from "node:crypto";
import type { Database } from "bun:sqlite";

// Token data structure
interface TokenData {
	userId: number;
	email: string;
	expiresAt: number;
}

// Storage interface
interface TokenStorage {
	set(token: string, data: TokenData): Promise<void>;
	get(token: string): Promise<TokenData | null>;
	delete(token: string): Promise<boolean>;
}

// Database-based implementation for token storage
class DatabaseTokenStorage implements TokenStorage {
	private db: Database;

	constructor(db: Database) {
		this.db = db;
	}

	async set(token: string, data: TokenData): Promise<void> {
		try {
			const stmt = this.db.prepare(`
                INSERT INTO auth_tokens (token, client_id, email, expires_at)
                VALUES (?, ?, ?, ?)
            `);

			stmt.run(
				token,
				data.userId,
				data.email,
				new Date(data.expiresAt).toISOString(),
			);
		} catch (error) {
			console.error("Error storing token in database:", error);
			throw error;
		}
	}

	async get(token: string): Promise<TokenData | null> {
		try {
			const result = this.db
				.query(`
                SELECT client_id, email, expires_at
                FROM auth_tokens
                WHERE token = ?
            `)
				.get(token) as {
				client_id: number;
				email: string;
				expires_at: string;
			} | null;

			if (!result) {
				return null;
			}

			return {
				userId: result.client_id,
				email: result.email,
				expiresAt: new Date(result.expires_at).getTime(),
			};
		} catch (error) {
			console.error("Error retrieving token from database:", error);
			return null;
		}
	}

	async delete(token: string): Promise<boolean> {
		try {
			const stmt = this.db.prepare(`
                DELETE FROM auth_tokens
                WHERE token = ?
            `);

			const result = stmt.run(token);
			return result.changes > 0;
		} catch (error) {
			console.error("Error deleting token from database:", error);
			return false;
		}
	}
}

class MemoryTokenStorage implements TokenStorage {
	private tokens: Map<string, TokenData> = new Map();

	async set(token: string, data: TokenData): Promise<void> {
		this.tokens.set(token, data);
	}

	async get(token: string): Promise<TokenData | null> {
		return this.tokens.get(token) || null;
	}

	async delete(token: string): Promise<boolean> {
		return this.tokens.delete(token);
	}
}

export class TokenManager {
	private static storage: TokenStorage = new MemoryTokenStorage();
	private static initialized = false;

	// Default token expiration time (6 hours)
	private static EXPIRATION_TIME = 6 * 60 * 60 * 1000;

	// Initialize with database connection
	static initialize(db: Database): void {
		TokenManager.storage = new DatabaseTokenStorage(db);
		TokenManager.initialized = true;
		console.log("TokenManager initialized with database storage");
	}

	// Set a different storage implementation
	static setStorage(storage: TokenStorage): void {
		TokenManager.storage = storage;
	}

	// Generate a secure token for a user
	static async createToken(userId: number, email: string): Promise<string> {
		if (!TokenManager.initialized) {
			console.warn(
				"TokenManager not initialized with database. Using in-memory storage.",
			);
		}

		// Generate a random token
		const tokenBytes = randomBytes(32);
		const token = tokenBytes.toString("hex");

		// Store token with user data and expiration
		await TokenManager.storage.set(token, {
			userId,
			email,
			expiresAt: Date.now() + TokenManager.EXPIRATION_TIME,
		});

		return token;
	}

	// Verify if a token is valid and return user data
	static async verifyToken(token: string): Promise<TokenData | null> {
		if (!token) {
			return null;
		}

		const tokenData = await TokenManager.storage.get(token);

		if (!tokenData) {
			return null; // Token not found
		}

		// Check if token is expired
		if (Date.now() > tokenData.expiresAt) {
			await TokenManager.storage.delete(token); // Clean up expired token
			return null;
		}

		return tokenData;
	}

	// Invalidate a token (for logout)
	static async removeToken(token: string): Promise<boolean> {
		return await TokenManager.storage.delete(token);
	}
}
