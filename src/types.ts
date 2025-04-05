export interface Transaction {
	id: number;
	coin_id: number;
	amount: number;
	transaction_date: string;
	seller_id: number | null;
	seller_name: string | null;
	buyer_id: number;
	buyer_name: string;
	bit1: number;
	bit2: number;
	bit3: number;
	value: number;
	computedBitSlow: string;
}

export interface UserRegistration {
	name: string;
	email: string;
	password: string;
	phone?: string;
	address?: string;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface AuthResponse {
	success: boolean;
	message: string;
	userId?: number;
	token?: string;
	name?: string;
	email?: string;
}

export interface AuthUser {
	id: number;
	name: string;
	email: string;
}

export interface Coin {
	coin_id: number;
	client_id: number;
	client_name: string;
	bit1: number;
	bit2: number;
	bit3: number;
	value: number;
	created_at: string;
}
