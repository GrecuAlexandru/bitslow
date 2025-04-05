import React, { useEffect, useState } from "react";
import { getAuthToken } from "../services/auth";
import { Toast } from "../components/Toast";

interface Transaction {
	id: number;
	coin_id: number;
	seller_id: number | null;
	buyer_id: number;
	amount: number;
	transaction_date: string;
}

export function DashboardPage() {
	const [transactions, setTransactions] = useState<number>(0);
	const [bitSlowCurrency, setBitSlowCurrency] = useState<number>(0);
	const [monetaryValue, setMonetaryValue] = useState<number>(0);
	const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
	const [userId, setUserId] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [toast, setToast] = useState<{
		message: string;
		type: "success" | "error";
	} | null>(null);

	useEffect(() => {
		const fetchUserData = async () => {
			const token = getAuthToken();
			if (!token) {
				setIsLoading(false);
				return;
			}

			try {
				// Fetch user ID and basic info
				const userResponse = await fetch("/api/user", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				});

				if (userResponse.ok) {
					const userData = await userResponse.json();
					setUserId(userData.user.id);
				} else {
					console.error("Failed to fetch user data");
					setToast({ message: "Failed to fetch user data", type: "error" });
				}

				// Fetch currency count
				const currencyResponse = await fetch("/api/user/currency", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				});

				if (currencyResponse.ok) {
					const currencyData = await currencyResponse.json();
					setBitSlowCurrency(currencyData.totalCoins || 0);
				}

				// Fetch monetary value
				const valueResponse = await fetch("/api/user/monetaryValue", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				});

				if (valueResponse.ok) {
					const valueData = await valueResponse.json();
					setMonetaryValue(valueData.totalValue || 0);
				}

				// Fetch user transactions
				const transactionsResponse = await fetch("/api/user/transactions", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				});

				if (transactionsResponse.ok) {
					const transactionsData = await transactionsResponse.json();
					setUserTransactions(transactionsData);
					setTransactions(transactionsData.length);
				}
			} catch (error) {
				console.error("Error fetching dashboard data:", error);
				setToast({ message: "Error fetching dashboard data", type: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		fetchUserData();
	}, []);

	if (isLoading) {
		return <div className="dashboard p-4">Loading dashboard data...</div>;
	}

	return (
		<div className="dashboard p-4">
			<h1 className="text-2xl font-bold">Dashboard</h1>
			<div className="stats grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
				<div className="stat bg-white rounded shadow p-4">
					<h2 className="text-gray-500">Total Transactions</h2>
					<p className="text-2xl font-semibold">{transactions}</p>
				</div>
				<div className="stat bg-white rounded shadow p-4">
					<h2 className="text-gray-500">Total BitSlow Currency</h2>
					<p className="text-2xl font-semibold">{bitSlowCurrency}</p>
				</div>
				<div className="stat bg-white rounded shadow p-4">
					<h2 className="text-gray-500">Total Monetary Value</h2>
					<p className="text-2xl font-semibold">${monetaryValue.toFixed(2)}</p>
				</div>
			</div>
			<div className="transaction-list mt-8">
				<h2 className="text-xl font-semibold mb-4">Your Transactions</h2>
				{userTransactions.length > 0 ? (
					<div className="overflow-x-auto">
						{/* Desktop view */}
						<table className="min-w-full border border-gray-200 hidden md:table">
							<thead className="bg-gray-50">
								<tr>
									<th className="border px-4 py-2">ID</th>
									<th className="border px-4 py-2">Coin ID</th>
									<th className="border px-4 py-2">Role</th>
									<th className="border px-4 py-2">Amount</th>
									<th className="border px-4 py-2">Date</th>
								</tr>
							</thead>
							<tbody>
								{userTransactions.map((txn) => (
									<tr key={txn.id} className="hover:bg-gray-50">
										<td className="border px-4 py-2">{txn.id}</td>
										<td className="border px-4 py-2">{txn.coin_id}</td>
										<td className="border px-4 py-2">
											{txn.buyer_id === userId ? "Buyer" : "Seller"}
										</td>
										<td className="border px-4 py-2">
											${Number(txn.amount).toFixed(2)}
										</td>
										<td className="border px-4 py-2">
											{new Date(txn.transaction_date).toLocaleString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>

						{/* Mobile view */}
						<div className="md:hidden space-y-4">
							{userTransactions.map((txn) => (
								<div key={txn.id} className="bg-white rounded shadow p-4">
									<div className="grid grid-cols-2 gap-2">
										<div className="text-gray-500">ID:</div>
										<div>{txn.id}</div>

										<div className="text-gray-500">Coin ID:</div>
										<div>{txn.coin_id}</div>

										<div className="text-gray-500">Role:</div>
										<div>{txn.buyer_id === userId ? "Buyer" : "Seller"}</div>

										<div className="text-gray-500">Amount:</div>
										<div>${Number(txn.amount).toFixed(2)}</div>

										<div className="text-gray-500">Date:</div>
										<div>{new Date(txn.transaction_date).toLocaleString()}</div>
									</div>
								</div>
							))}
						</div>
					</div>
				) : (
					<p className="text-gray-500">No transactions found.</p>
				)}
			</div>
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}
		</div>
	);
}
