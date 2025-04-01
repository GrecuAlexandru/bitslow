// Define the Transaction interface based on the API response
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