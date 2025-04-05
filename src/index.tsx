import { serve } from "bun";
import { Database } from "bun:sqlite";
import { seedDatabase } from "./seed";
import index from "./index.html";
import { computeBitSlow } from "./bitslow";
import type { Transaction, Coin } from "./types";
import { hashPassword } from "./utils/password_hashing";
import { TokenManager } from "./utils/auth_token";

// Initialize the database
const db = new Database(":memory:");

TokenManager.initialize(db);

// Seed the database with random data
seedDatabase(db, {
	clientCount: 30,
	bitSlowCount: 20,
	transactionCount: 50,
	clearExisting: true,
});

// Cache will expire after 2 minutes
const CACHE_EXPIRY_TIME = 2 * 60 * 1000;

// Cache for transactions and coins
interface TransactionCache {
	data: {
		transactions: any[];
		total: number;
		page: number;
		pageSize: number;
	};
	timestamp: number;
}

interface CoinCache {
	data: {
		coins: any[];
		total: number;
		page: number;
		pageSize: number;
	};
	timestamp: number;
}

// Maps to store cached data
const transactionCache: Map<string, TransactionCache> = new Map();
const coinCache: Map<string, CoinCache> = new Map();

// Coin pages only differ by page and pageSize
// Generate a cache key from pagination parameters
function generateCoinCacheKey(page: number, pageSize: number): string {
	return `coins-${page}-${pageSize}`;
}

// Transaction pages differ by page, pageSize, and filters
// Generate a cache key from request parameters
function generateTransactionsCacheKey(
	page: number,
	pageSize: number,
	filters: {
		startDate?: string | null;
		endDate?: string | null;
		minValue?: string | null;
		maxValue?: string | null;
		buyerName?: string | null;
		sellerName?: string | null;
	},
): string {
	return `transactions-${page}-${pageSize}-${JSON.stringify(filters)}`;
}

const server = serve({
	routes: {
		// Serve index.html for all unmatched routes.
		"/*": index,
		"/api/transactions": {
			POST: () => {
				// This endpoint is not meant to be accessed directly via POST
				return new Response("Use GET to fetch transactions", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			GET: async (req) => {
				try {
					// Get pagination parameters from query string
					const url = new URL(req.url);
					const page = Number.parseInt(url.searchParams.get("page") || "1");
					const pageSize = Number.parseInt(url.searchParams.get("pageSize") || "15");

					// Get filter parameters
					const startDate = url.searchParams.get("startDate");
					const endDate = url.searchParams.get("endDate");
					const minValue = url.searchParams.get("minValue");
					const maxValue = url.searchParams.get("maxValue");
					const buyerName = url.searchParams.get("buyerName");
					const sellerName = url.searchParams.get("sellerName");

					// Generate cache key based on all query parameters
					const cacheKey = generateTransactionsCacheKey(page, pageSize, {
						startDate,
						endDate,
						minValue,
						maxValue,
						buyerName,
						sellerName,
					});

					// Check if we have a valid cache entry
					const cachedData = transactionCache.get(cacheKey);
					const now = Date.now();

					// Return cached data if it's fresh
					if (cachedData && now - cachedData.timestamp < CACHE_EXPIRY_TIME) {
						console.log("🔄 Using server-side cached transactions data");
						return Response.json(cachedData.data);
					}

					// Validate page and pageSize
					const validPage = page > 0 ? page : 1;
					const validPageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 15;

					// Calculate offset
					const offset = (validPage - 1) * validPageSize;

					// Build query with filters
					let countQuery = `
						SELECT COUNT(*) as total
						FROM transactions t
						LEFT JOIN clients seller ON t.seller_id = seller.id
						JOIN clients buyer ON t.buyer_id = buyer.id
						JOIN coins c ON t.coin_id = c.coin_id
						WHERE 1=1
            		`;

					// Add filter conditions to count query
					const countParams: any[] = [];

					if (startDate) {
						countQuery += " AND t.transaction_date >= ?";
						countParams.push(startDate);
					}

					if (endDate) {
						countQuery += " AND t.transaction_date <= ?";
						countParams.push(endDate);
					}

					if (minValue) {
						countQuery += " AND c.value >= ?";
						countParams.push(minValue);
					}

					if (maxValue) {
						countQuery += " AND c.value <= ?";
						countParams.push(maxValue);
					}

					if (buyerName) {
						countQuery += " AND buyer.name LIKE ?";
						countParams.push(`%${buyerName}%`);
					}

					if (sellerName) {
						countQuery +=
							" AND (seller.name LIKE ? OR (seller.name IS NULL AND ? = 'Original Issuer'))";
						countParams.push(`%${sellerName}%`, sellerName);
					}

					// Get total count with filters
					let totalCount: { total: number };
					totalCount = db.query(countQuery).get() as { total: number };

					// Base data query
					let dataQuery = `
						SELECT
							t.id,
							t.coin_id,
							t.amount,
							t.transaction_date,
							seller.id as seller_id,
							seller.name as seller_name,
							buyer.id as buyer_id,
							buyer.name as buyer_name,
							c.bit1,
							c.bit2,
							c.bit3,
							c.value
						FROM transactions t
						LEFT JOIN clients seller ON t.seller_id = seller.id
						JOIN clients buyer ON t.buyer_id = buyer.id
						JOIN coins c ON t.coin_id = c.coin_id
						WHERE 1=1
            		`;

					// Add filters to data query
					const dataParams: any[] = [];

					if (startDate) {
						dataQuery += " AND t.transaction_date >= ?";
						dataParams.push(startDate);
					}

					if (endDate) {
						dataQuery += " AND t.transaction_date <= ?";
						dataParams.push(endDate);
					}

					if (minValue) {
						dataQuery += " AND c.value >= ?";
						dataParams.push(minValue);
					}

					if (maxValue) {
						dataQuery += " AND c.value <= ?";
						dataParams.push(maxValue);
					}

					if (buyerName) {
						dataQuery += " AND buyer.name LIKE ?";
						dataParams.push(`%${buyerName}%`);
					}

					if (sellerName) {
						dataQuery +=
							" AND (seller.name LIKE ? OR (seller.name IS NULL AND ? = 'Original Issuer'))";
						dataParams.push(`%${sellerName}%`, sellerName);
					}

					// Add ordering and pagination
					dataQuery += " ORDER BY t.transaction_date DESC LIMIT ? OFFSET ?";
					dataParams.push(validPageSize, offset);

					// Execute query with parameters
					let transactions;
					if (dataParams.length > 0) {
						const stmt = db.prepare(dataQuery);
						transactions = stmt.all(...(dataParams as any[]));
					} else {
						transactions = db.query(dataQuery).all();
					}

					// Add computed BitSlow to each transaction
					const enhancedTransactions = (transactions as Transaction[]).map(
						(transaction) => ({
							...transaction,
							computedBitSlow: computeBitSlow(
								transaction.bit1,
								transaction.bit2,
								transaction.bit3,
							),
						}),
					);

					// Prepare response data
					const responseData = {
						transactions: enhancedTransactions,
						total: totalCount.total,
						page: validPage,
						pageSize: validPageSize,
					};

					// Cache the response
					transactionCache.set(cacheKey, {
						data: responseData,
						timestamp: Date.now(),
					});

					return Response.json(responseData);
				} catch (error) {
					console.error("Error fetching transactions:", error);
					return new Response("Error fetching transactions", { status: 500 });
				}
			},
		},
		"/api/register": {
			GET: () => {
				// This endpoint is not meant to be accessed directly via GET
				return new Response("Use POST to register", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			POST: async (req) => {
				console.log("Register endpoint called with method:", req.method);

				try {
					const data = await req.json();
					console.log("Received registration data:", data);

					// Validate the input
					if (!data.name || !data.email || !data.password) {
						return new Response(
							JSON.stringify({
								message: "Name, email, and password are required",
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Check if email already exists
					const existingUser = db
						.query("SELECT id FROM clients WHERE email = ?")
						.get(data.email);
					if (existingUser) {
						return new Response(
							JSON.stringify({ message: "Email already in use" }),
							{ status: 409, headers: { "Content-Type": "application/json" } },
						);
					}

					// Hash the password
					const passwordHash = hashPassword(data.password);

					// Insert the new user
					const insertClient = db.prepare(`
						INSERT INTO clients (name, email, phone, address, password_hash)
						VALUES (?, ?, ?, ?, ?)
					`);

					const info = insertClient.run(
						data.name,
						data.email,
						data.phone || null,
						data.address || null,
						passwordHash,
					);

					return new Response(
						JSON.stringify({
							success: true,
							message: "Registration successful",
							userId: info.lastInsertRowid,
						}),
						{ status: 201, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Registration error:", error);
					return new Response(
						JSON.stringify({ message: "Server error during registration" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
		"/api/login": {
			GET: () => {
				// This endpoint is not meant to be accessed directly via GET
				return new Response("Use POST to login", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			POST: async (req) => {
				try {
					const data = await req.json();
					console.log("Login attempt:", { email: data.email });

					// Validate required fields
					if (!data.email || !data.password) {
						return new Response(
							JSON.stringify({ message: "Email and password are required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Define user type
					type User = {
						id: number;
						name: string;
						email: string;
						password_hash: string;
					};

					// Find user by email
					const user = db
						.query<User, string>(`
						SELECT id, name, email, password_hash
						FROM clients
						WHERE email = ?
					`)
						.get(data.email);

					// Check if user exists
					if (!user) {
						return new Response(
							JSON.stringify({ message: "Invalid email or password" }),
							{ status: 401, headers: { "Content-Type": "application/json" } },
						);
					}

					// Verify password
					const passwordHash = hashPassword(data.password);
					if (passwordHash !== user.password_hash) {
						return new Response(
							JSON.stringify({ message: "Invalid email or password" }),
							{ status: 401, headers: { "Content-Type": "application/json" } },
						);
					}

					// Generate token
					const token = await TokenManager.createToken(user.id, user.email);

					// Return success with token
					return new Response(
						JSON.stringify({
							success: true,
							message: "Login successful",
							userId: user.id,
							name: user.name,
							email: user.email,
							token,
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Login error:", error);
					return new Response(
						JSON.stringify({ message: "Server error during login" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},

		"/api/auth/verify": {
			POST: () => {
				// This endpoint is not meant to be accessed directly via POST
				return new Response("Use GET to verify token", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			GET: async (req) => {
				// Extract authorization header
				const authHeader = req.headers.get("Authorization");

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					return new Response(
						JSON.stringify({
							authenticated: false,
							message: "No token provided",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				// Get token from header
				const token = authHeader.split(" ")[1];

				// Verify token
				const userData = await TokenManager.verifyToken(token);

				if (!userData) {
					return new Response(
						JSON.stringify({
							authenticated: false,
							message: "Invalid or expired token",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				// Return user information
				return new Response(
					JSON.stringify({
						authenticated: true,
						userId: userData.userId,
						email: userData.email,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
		"/api/user": {
			POST: () => {
				// This endpoint is not meant to be accessed directly via POST
				return new Response("Use GET to fetch user data", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			GET: async (req) => {
				// Extract authorization header
				const authHeader = req.headers.get("Authorization");

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					return new Response(
						JSON.stringify({
							authenticated: false,
							message: "No token provided",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				// Get token from header
				const token = authHeader.split(" ")[1];

				// Verify token
				const userData = await TokenManager.verifyToken(token);

				if (!userData) {
					return new Response(
						JSON.stringify({
							authenticated: false,
							message: "Invalid or expired token",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				type UserDetails = {
					id: number;
					name: string;
					email: string;
					phone: string | null;
					address: string | null;
					created_at: string;
				};

				// Fetch user details from database using userId
				const user = db
					.query<UserDetails, number>(`
					SELECT id, name, email, phone, address, created_at
					FROM clients
					WHERE id = ?
				`)
					.get(userData.userId);

				if (!user) {
					return new Response(
						JSON.stringify({ success: false, message: "User not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				// Return all user data (excluding password hash for security)
				return new Response(
					JSON.stringify({
						authenticated: true,
						user: {
							id: user.id,
							name: user.name,
							email: user.email,
							phone: user.phone,
							address: user.address,
							createdAt: user.created_at,
						},
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
		"/api/user/transactions": {
			POST: () => {
				// This endpoint is not meant to be accessed directly via POST
				return new Response("Use GET to fetch user transactions", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			GET: async (req) => {
				// Extract authorization header
				const authHeader = req.headers.get("Authorization");

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					return new Response(
						JSON.stringify({
							authenticated: false,
							message: "No token provided",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				// Get token from header
				const token = authHeader.split(" ")[1];

				// Verify token
				const userData = await TokenManager.verifyToken(token);

				if (!userData) {
					return new Response(
						JSON.stringify({
							authenticated: false,
							message: "Invalid or expired token",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				type UserTransaction = {
					id: number;
					buyer_id: number;
					seller_id: number;
					coin_id: number;
					transaction_date: string;
					amount: number;
				};

				const transactions = db
					.query<UserTransaction, [number, number]>(`
					SELECT id, buyer_id, seller_id, coin_id, transaction_date, amount
					FROM transactions
					WHERE buyer_id = ? OR seller_id = ?
					ORDER BY transaction_date DESC
				`)
					.all(userData.userId, userData.userId);

				return Response.json(transactions);
			},
		},
		"/api/user/currency": {
			POST: () => {
				// This endpoint is not meant to be accessed directly via POST
				return new Response("Use GET to fetch user currency", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			GET: async (req) => {
				// Extract authorization header
				const authHeader = req.headers.get("Authorization");

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					return new Response(
						JSON.stringify({
							authenticated: false,
							message: "No token provided",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				// Get token from header
				const token = authHeader.split(" ")[1];

				// Verify token
				const userData = await TokenManager.verifyToken(token);

				if (!userData) {
					return new Response(
						JSON.stringify({
							authenticated: false,
							message: "Invalid or expired token",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				// Count the number of BitSlow coins the user has
				const coinCount = db
					.query("SELECT COUNT(*) as totalCoins FROM coins WHERE client_id = ?")
					.get(userData.userId);

				return Response.json(coinCount);
			},
		},
		"/api/user/monetaryValue": {
			POST: () => {
				// This endpoint is not meant to be accessed directly via POST
				return new Response("Use GET to fetch user monetary value", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			GET: async (req) => {
				// Extract authorization header
				const authHeader = req.headers.get("Authorization");

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					return new Response(
						JSON.stringify({
							authenticated: false,
							message: "No token provided",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				// Get token from header
				const token = authHeader.split(" ")[1];

				// Verify token
				const userData = await TokenManager.verifyToken(token);

				if (!userData) {
					return new Response(
						JSON.stringify({
							authenticated: false,
							message: "Invalid or expired token",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				const monetaryValue = db
					.query(
						"SELECT SUM(value) as totalValue FROM coins WHERE client_id = ?",
					)
					.get(userData.userId);

				return Response.json(monetaryValue);
			},
		},
		"/api/coins": {
			POST: () => {
				// This endpoint is not meant to be accessed directly via POST
				return new Response("Use GET to fetch coins", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			GET: async (req) => {
				try {
					// Get pagination parameters from query string
					const url = new URL(req.url);
					const page = Number.parseInt(url.searchParams.get("page") || "1");
					const pageSize = Number.parseInt(url.searchParams.get("pageSize") || "15");

					// Generate cache key based on pagination parameters
					const cacheKey = generateCoinCacheKey(page, pageSize);

					// Check if we have a valid cache entry
					const cachedData = coinCache.get(cacheKey);
					const now = Date.now();

					// Return cached data if it's fresh
					if (cachedData && now - cachedData.timestamp < CACHE_EXPIRY_TIME) {
						console.log("🔄 Using server-side cached coins data");
						return Response.json(cachedData.data);
					}

					// Validate page and pageSize
					const validPage = page > 0 ? page : 1;
					const validPageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 15;

					// Calculate offset
					const offset = (validPage - 1) * validPageSize;

					// Get total count
					const totalCount = db
						.query("SELECT COUNT(*) as total FROM coins")
						.get() as { total: number };

					// Get coins with client names using a LEFT JOIN
					const coins = db
						.query(`
						SELECT
							c.coin_id,
							c.bit1,
							c.bit2,
							c.bit3,
							c.value,
							c.client_id,
							cl.name AS client_name
						FROM coins c
						LEFT JOIN clients cl ON c.client_id = cl.id
						ORDER BY c.coin_id
						LIMIT ? OFFSET ?
					`)
						.all(validPageSize, offset);

					// Add computed BitSlow to each coin
					const enhancedCoins = coins.map((coin: any) => ({
						...coin,
						computedBitSlow: computeBitSlow(coin.bit1, coin.bit2, coin.bit3),
					}));

					// Prepare response data
					const responseData = {
						coins: enhancedCoins,
						total: totalCount.total,
						page: validPage,
						pageSize: validPageSize,
					};

					// Cache the response
					coinCache.set(cacheKey, {
						data: responseData,
						timestamp: Date.now(),
					});

					return Response.json(responseData);
				} catch (error) {
					console.error("Error fetching coins:", error);
					return new Response("Error fetching coins", { status: 500 });
				}
			},
		},
		"/api/coins/buy": {
			GET: () => {
				// This endpoint is not meant to be accessed directly via GET
				return new Response("Use POST to buy a coin", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			POST: async (req) => {
				// Extract authorization header
				const authHeader = req.headers.get("Authorization");

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					return new Response(
						JSON.stringify({ success: false, message: "No token provided" }),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				// Get token from header
				const token = authHeader.split(" ")[1];

				// Verify token
				const userData = await TokenManager.verifyToken(token);

				if (!userData) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "Invalid or expired token",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				try {
					const data = await req.json();

					// Validate coin_id
					if (!data.coin_id) {
						return new Response(
							JSON.stringify({
								success: false,
								message: "Coin ID is required",
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					const coinId = data.coin_id;
					const buyerId = userData.userId;

					// Start transaction
					db.exec("BEGIN TRANSACTION");

					// Check if coin exists and has no owner
					const coin = db
						.query<Coin, number>(
							"SELECT coin_id, client_id, value FROM coins WHERE coin_id = ?",
						)
						.get(coinId);

					if (!coin) {
						db.exec("ROLLBACK");
						return new Response(
							JSON.stringify({ success: false, message: "Coin not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					if (coin.client_id !== null) {
						db.exec("ROLLBACK");
						return new Response(
							JSON.stringify({
								success: false,
								message: "Coin already has an owner",
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Update coin ownership
					db.query("UPDATE coins SET client_id = ? WHERE coin_id = ?").run(
						buyerId,
						coinId,
					);

					// Create transaction record
					const now = new Date().toISOString();
					db.query(`
						INSERT INTO transactions (
							buyer_id, seller_id, coin_id, transaction_date, amount
						) VALUES (?, NULL, ?, ?, ?)
					`).run(buyerId, coinId, now, coin.value);

					// Commit transaction
					db.exec("COMMIT");

					// Clear cache
					transactionCache.clear();
					console.log("Cache cleared after coin purchase");

					coinCache.clear();
					console.log("Coin cache cleared after purchase");

					return new Response(
						JSON.stringify({
							success: true,
							message: "Coin purchased successfully",
							coin_id: coinId,
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					db.exec("ROLLBACK");
					console.error("Error buying coin:", error);
					return new Response(
						JSON.stringify({
							success: false,
							message: "Server error during purchase",
						}),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
		"/api/coins/available-combinations": {
			POST: () => {
				// This endpoint is not meant to be accessed directly via POST
				return new Response("Use GET to check available combinations", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			GET: async (req) => {
				try {
					const MAX_COMBINATIONS = 10 * 10 * 10;

					// Count existing coins
					const existingCount = db
						.query("SELECT COUNT(*) as count FROM coins")
						.get() as { count: number };

					// Check if there are still available combinations
					const available = existingCount.count < MAX_COMBINATIONS;

					return Response.json({
						available,
						used: existingCount.count,
						total: MAX_COMBINATIONS,
					});
				} catch (error) {
					console.error("Error checking available combinations:", error);
					return new Response(
						JSON.stringify({ success: false, message: "Server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
		"/api/coins/generate": {
			GET: () => {
				// This endpoint is not meant to be accessed directly via GET
				return new Response("Use POST to generate a coin", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			POST: async (req) => {
				// Extract authorization header
				const authHeader = req.headers.get("Authorization");

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					return new Response(
						JSON.stringify({ success: false, message: "No token provided" }),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				// Get token from header
				const token = authHeader.split(" ")[1];

				// Verify token
				const userData = await TokenManager.verifyToken(token);

				if (!userData) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "Invalid or expired token",
						}),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				try {
					const data = await req.json();

					// Validate the value
					if (
						!data.value ||
						typeof data.value !== "number" ||
						data.value <= 0
					) {
						return new Response(
							JSON.stringify({
								success: false,
								message: "Valid monetary value is required",
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Start transaction
					db.exec("BEGIN TRANSACTION");

					// Function to generate unique bit values
					function generateUniqueBits() {
						// Get all existing bit combinations
						const existingBits = db
							.query(`
							SELECT bit1, bit2, bit3 FROM coins
						`)
							.all() as { bit1: number; bit2: number; bit3: number }[];

						const existingCombinations = new Set();
						existingBits.forEach((bit) => {
							existingCombinations.add(`${bit.bit1}-${bit.bit2}-${bit.bit3}`);
						});

						// Try to find a unique combination (with a limit to prevent infinite loops)
						const MAX_ATTEMPTS = 10000;
						let attempts = 0;
						let bit1;
						let bit2;
						let bit3;
						let combinationKey;

						do {
							bit1 = Math.floor(Math.random() * 10) + 1; // 1-10
							bit2 = Math.floor(Math.random() * 10) + 1; // 1-10
							bit3 = Math.floor(Math.random() * 10) + 1; // 1-10
							combinationKey = `${bit1}-${bit2}-${bit3}`;
							attempts++;

							if (attempts > MAX_ATTEMPTS) {
								throw new Error(
									"Could not find unique bit combination after many attempts",
								);
							}
						} while (existingCombinations.has(combinationKey));

						return { bit1, bit2, bit3 };
					}

					// Generate unique bits
					const { bit1, bit2, bit3 } = generateUniqueBits();

					// Insert the new coin
					const stmt = db.prepare(`
						INSERT INTO coins (bit1, bit2, bit3, value, client_id)
						VALUES (?, ?, ?, ?, ?)
					`);

					const result = stmt.run(
						bit1,
						bit2,
						bit3,
						data.value,
						userData.userId,
					);
					const coinId = Number(result.lastInsertRowid);

					// Create a transaction record for the coin generation
					const now = new Date().toISOString();
					db.query(`
						INSERT INTO transactions (
							buyer_id, seller_id, coin_id, transaction_date, amount
						) VALUES (?, NULL, ?, ?, ?)
					`).run(userData.userId, coinId, now, data.value);

					// Commit transaction
					db.exec("COMMIT");

					if (transactionCache) {
						transactionCache.clear();
					}
					coinCache.clear();
					console.log("Caches cleared after coin generation");

					return new Response(
						JSON.stringify({
							success: true,
							message: "Coin generated successfully",
							coin_id: coinId,
							bit1,
							bit2,
							bit3,
							value: data.value,
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					// Rollback transaction in case of error
					db.exec("ROLLBACK");

					console.error("Error generating coin:", error);
					const errorMessage =
						error instanceof Error ? error.message : "Unknown error";

					return new Response(
						JSON.stringify({
							success: false,
							message: `Error generating coin: ${errorMessage}`,
						}),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
		"/api/coins/:id/history": {
			POST: () => {
				// This endpoint is not meant to be accessed directly via POST
				return new Response("Use GET to fetch coin history", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			GET: async (req) => {
				try {
					// Get the coin ID from the URL
					const url = new URL(req.url);
					const pathParts = url.pathname.split("/");
					const coinId = Number.parseInt(pathParts[pathParts.length - 2]);

					if (Number.isNaN(coinId)) {
						return new Response(
							JSON.stringify({ success: false, message: "Invalid coin ID" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Verify the coin exists
					const coin = db
						.query("SELECT * FROM coins WHERE coin_id = ?")
						.get(coinId) as Coin;

					if (!coin) {
						return new Response(
							JSON.stringify({ success: false, message: "Coin not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					// Get the transaction history for this coin
					const transactions = db
						.query(`
						SELECT
							t.transaction_date,
							t.amount,
							seller.id as seller_id,
							seller.name as seller_name,
							buyer.id as buyer_id,
							buyer.name as buyer_name
						FROM transactions t
						LEFT JOIN clients seller ON t.seller_id = seller.id
						JOIN clients buyer ON t.buyer_id = buyer.id
						WHERE t.coin_id = ?
						ORDER BY t.transaction_date ASC
					`)
						.all(coinId);

					// Generate ownership timeline based on transactions
					const ownershipHistory = [];
					let lastOwnerId = null;
					let isFirstTransaction = true;

					for (const tx of transactions as any[]) {
						// First transaction is generated (no real seller)
						if (isFirstTransaction) {
							ownershipHistory.push({
								date: tx.transaction_date,
								owner_id: tx.buyer_id,
								owner_name: tx.buyer_name,
								type: "generated",
								amount: tx.amount,
								previous_owner_id: null,
								previous_owner_name: "Original Issuer",
							});
							isFirstTransaction = false;
						} else {
							ownershipHistory.push({
								date: tx.transaction_date,
								owner_id: tx.buyer_id,
								owner_name: tx.buyer_name,
								type: "transfer",
								amount: tx.amount,
								previous_owner_id: tx.seller_id,
								previous_owner_name: tx.seller_name,
							});
						}

						lastOwnerId = tx.buyer_id;
					}

					// Add current owner info
					const currentOwner = {
						date: "Current",
						owner_id: coin.client_id,
						owner_name: coin.client_id
							? (
								db
									.query("SELECT name FROM clients WHERE id = ?")
									.get(coin.client_id) as any
							)?.name
							: null,
						type: "current",
						amount: null,
						previous_owner_id: lastOwnerId,
						previous_owner_name: lastOwnerId
							? (
								db
									.query("SELECT name FROM clients WHERE id = ?")
									.get(lastOwnerId) as any
							)?.name
							: null,
					};

					if (ownershipHistory.length > 0) {
						currentOwner.previous_owner_id =
							ownershipHistory[ownershipHistory.length - 1].owner_id;
						currentOwner.previous_owner_name =
							ownershipHistory[ownershipHistory.length - 1].owner_name;
					}

					// If the coin has no current owner, it's available for purchase
					if (coin.client_id === null) {
						currentOwner.owner_name = "Available for Purchase";
					}

					// Add current status to the history timeline
					ownershipHistory.push(currentOwner);

					return Response.json({
						success: true,
						coin_id: coinId,
						history: ownershipHistory,
					});
				} catch (error) {
					console.error("Error fetching coin history:", error);
					return new Response(
						JSON.stringify({
							success: false,
							message: "Error fetching coin history",
						}),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
		"/api/logout": {
			GET: () => {
				// This endpoint is not meant to be accessed directly via GET
				return new Response("Use POST to logout", {
					status: 405,
					headers: { "Content-Type": "text/plain" },
				});
			},
			POST: async (req) => {
				// Extract authorization header
				const authHeader = req.headers.get("Authorization");

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					return new Response(
						JSON.stringify({ success: false, message: "No token provided" }),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				// Get token from header
				const token = authHeader.split(" ")[1];

				// Remove token
				const removed = await TokenManager.removeToken(token);

				return new Response(
					JSON.stringify({
						success: removed,
						message: removed ? "Logout successful" : "Token not found",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
	development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url}`);
