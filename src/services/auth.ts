import type {
	UserRegistration,
	LoginCredentials,
	AuthResponse,
} from "../types";

const API_BASE_URL = "http://localhost:3000/api";

// Register a new user
export async function registerUser(
	userData: UserRegistration,
): Promise<AuthResponse> {
	try {
		const response = await fetch(`${API_BASE_URL}/register`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(userData),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || "Registration failed");
		}

		return data;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error("An unknown error occurred during registration");
	}
}

// Login user
export async function loginUser(
	credentials: LoginCredentials,
): Promise<AuthResponse> {
	try {
		const response = await fetch(`${API_BASE_URL}/login`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(credentials),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || "Login failed");
		}

		// Store token in localStorage for persistence
		if (data.token) {
			localStorage.setItem("authToken", data.token);
			localStorage.setItem("userId", data.userId);
			localStorage.setItem("userName", data.name);
		}

		return data;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error("An unknown error occurred during login");
	}
}

// Verify if user is authenticated
export async function verifyAuth(): Promise<boolean> {
	try {
		const token = localStorage.getItem("authToken");

		if (!token) {
			return false;
		}

		const response = await fetch(`${API_BASE_URL}/auth/verify`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		const data = await response.json();
		return data.authenticated === true;
	} catch (error) {
		console.error("Auth verification error:", error);
		return false;
	}
}

// Log out user
export function logoutUser(): Promise<void> {
	const token = localStorage.getItem("authToken");

	localStorage.removeItem("authToken");
	localStorage.removeItem("userId");
	localStorage.removeItem("userName");

	if (!token) {
		return Promise.resolve();
	}

	return fetch(`${API_BASE_URL}/logout`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
		.then(() => {})
		.catch((error) => {
			console.error("Logout error:", error);
		});
}

// Get current user's token
export function getAuthToken(): string | null {
	return localStorage.getItem("authToken");
}

// Get current user's ID
export function getUserId(): string | null {
	return localStorage.getItem("userId");
}

// Get current user's name
export function getUserName(): string | null {
	return localStorage.getItem("userName");
}

// Check if user is logged in (synchronous check)
export function isLoggedIn(): boolean {
	return localStorage.getItem("authToken") !== null;
}
