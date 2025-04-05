import { useState, useEffect, useMemo } from "react";
import { Coin } from "../types";
import { getAuthToken } from "../services/auth";
import { GenerateCoinModal } from "../components/GenerateCoinModal";
import { CoinHistoryModal } from "../components/CoinHistoryModal";
import { isLoggedIn } from "../services/auth";
import { Toast } from "../components/Toast";

const ENDPOINT_URL = "http://localhost:3000/";

async function buyCoin(
	coinId: number,
	setToast: (
		data: { message: string; type: "success" | "error" } | null,
	) => void,
	refreshCoins: () => void,
): Promise<void> {
	// Check if user is logged in
	if (!isLoggedIn()) {
		setToast({
			message: "You must be logged in to buy coins.",
			type: "error",
		});
		return;
	}

	try {
		const response = await fetch(`${ENDPOINT_URL}api/coins/buy`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${getAuthToken()}`,
			},
			body: JSON.stringify({ coin_id: coinId }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || "Failed to buy coin");
		}

		// Show success message
		setToast({
			message: `BitSlow #${coinId} purchased successfully!`,
			type: "success",
		});

		// Refresh coin data
		refreshCoins();
	} catch (error) {
		console.error("Error buying coin:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";

		setToast({
			message: `Failed to buy coin: ${errorMessage}`,
			type: "error",
		});
	}
}

function useCoins(initialPage = 1, initialPageSize = 30) {
	const [coins, setCoins] = useState<Coin[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [page, setPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [totalCoins, setTotalCoins] = useState(0);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [toastError, setToastError] = useState<{
		message: string;
		type: "error";
	} | null>(null);

	const fetchPage = (pageNum: number, size: number, bypassCache = false) => {
		setLoading(true);

		const params = new URLSearchParams();
		params.append("page", pageNum.toString());
		params.append("pageSize", size.toString());
		if (bypassCache) {
			params.append("_t", Date.now().toString());
		}

		fetch(`${ENDPOINT_URL}api/coins?${params.toString()}`)
			.then((response) => response.json())
			.then((data) => {
				setCoins(data.coins);
				setTotalCoins(data.total);
				setLoading(false);
			})
			.catch((err) => {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to fetch coins";
				setError(err);
				setLoading(false);
				// Set toast error
				setToastError({
					message: `Error loading coins: ${errorMessage}`,
					type: "error",
				});
			});
	};

	// Force refresh function that bypasses cache
	const refresh = () => {
		fetchPage(page, pageSize, true);
		setRefreshTrigger((prev) => prev + 1); // Increment trigger to force re-render
	};

	useEffect(() => {
		fetchPage(page, pageSize);
	}, [page, pageSize, refreshTrigger]);

	return {
		coins,
		loading,
		error,
		page,
		pageSize,
		totalCoins,
		setPage,
		setPageSize,
		refresh,
		toastError,
		setToastError,
	};
}

export function MarketplacePage() {
	const {
		coins,
		loading,
		error,
		page,
		pageSize,
		totalCoins,
		setPage,
		setPageSize,
		refresh,
		toastError,
		setToastError,
	} = useCoins();

	const [loadingTime, setLoadingTime] = useState(0);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [hasAvailableCombinations, setHasAvailableCombinations] =
		useState(true);
	const [selectedCoinId, setSelectedCoinId] = useState<number | null>(null);
	const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
	const [authenticated, setAuthenticated] = useState(false);
	const [toast, setToast] = useState<{
		message: string;
		type: "success" | "error";
	} | null>(null);

	useEffect(() => {
		if (toastError) {
			setToast(toastError);
			setToastError(null); // Clear the error after showing toast
		}
	}, [toastError]);

	useEffect(() => {
		setAuthenticated(isLoggedIn());
	}, []);

	const openHistoryModal = (coinId: number) => {
		setSelectedCoinId(coinId);
		setIsHistoryModalOpen(true);
	};

	// Check if new BitSlow combinations are available
	useEffect(() => {
		fetch(`${ENDPOINT_URL}api/coins/available-combinations`, {
			headers: {
				Authorization: `Bearer ${getAuthToken()}`,
			},
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(
						`Failed to fetch available combinations (status ${response.status})`,
					);
				}
				return response.json();
			})
			.then((data) => {
				setHasAvailableCombinations(data.available);
			})
			.catch((error) => {
				console.error("Error checking available combinations:", error);
				// Show toast for this error
				setToast({
					message: `Error checking available combinations: ${error.message}`,
					type: "error",
				});
			});
	}, [coins]);

	// Timer to track loading time
	useEffect(() => {
		let timerId: number | undefined;

		if (loading) {
			timerId = window.setInterval(() => {
				setLoadingTime((prevTime) => prevTime + 1);
			}, 1000);
		} else {
			setLoadingTime(0);
		}

		return () => {
			if (timerId) clearInterval(timerId);
		};
	}, [loading]);

	const totalPages = Math.ceil(totalCoins / pageSize);

	const refreshCoins = () => {
		refresh();
	};

	// Handle page change
	const handlePrevPage = () => {
		if (page > 1) setPage(page - 1);
	};

	const handleNextPage = () => {
		if (page < totalPages) setPage(page + 1);
	};

	// Handle specific page change
	const handlePageChange = (newPage: number) => {
		if (newPage > 0 && newPage <= totalPages) {
			setPage(newPage);
		}
	};

	// Generate page numbers for pagination display
	const pageNumbers = useMemo(() => {
		const visiblePages = [];

		// Always show first page
		visiblePages.push(1);

		// Calculate start and end pages to show
		let startPage = Math.max(2, page - 2);
		let endPage = Math.min(totalPages - 1, page + 2);

		if (startPage > 2) {
			visiblePages.push(-1);
		}

		// Add middle pages
		for (let i = startPage; i <= endPage; i++) {
			visiblePages.push(i);
		}

		if (endPage < totalPages - 1) {
			visiblePages.push(-2);
		}

		// Add last page if there's more than one page
		if (totalPages > 1) {
			visiblePages.push(totalPages);
		}

		return visiblePages;
	}, [page, totalPages]);

	if (loading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-gray-50">
				<div className="w-16 h-16 mb-4 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
				<div className="animate-pulse flex flex-col items-center">
					<h2 className="text-xl font-semibold text-gray-700 mb-2">
						Loading Coins
					</h2>
					<p className="text-sm text-gray-600 mb-2">
						Time elapsed: {loadingTime} seconds
					</p>
					<div className="flex space-x-1">
						<div
							className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
							style={{ animationDelay: "0ms" }}
						></div>
						<div
							className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
							style={{ animationDelay: "150ms" }}
						></div>
						<div
							className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
							style={{ animationDelay: "300ms" }}
						></div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-red-500 p-4 text-center">
				Error loading coins: {error.message}
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

	return (
		<div className="max-w-7xl mx-auto p-4">
			{/* Show toast notification when active */}
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}
			<div className="flex justify-between items-center mb-4">
				<h1 className="text-3xl font-bold text-gray-800">BitSlow Coins</h1>
				{authenticated && hasAvailableCombinations && (
					<button
						onClick={() => setIsModalOpen(true)}
						className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-150 ease-in-out"
					>
						Generate Coin
					</button>
				)}
			</div>
			{/* Coin Generation Modal */}
			<GenerateCoinModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSuccess={(coinId) => {
					// Show success toast
					setToast({
						message: `BitSlow #${coinId} generated successfully!`,
						type: "success",
					});

					// Refresh the coins list after successful generation
					refresh();
				}}
			/>

			{/* Coin History Modal */}
			<CoinHistoryModal
				isOpen={isHistoryModalOpen}
				onClose={() => setIsHistoryModalOpen(false)}
				coinId={selectedCoinId}
			/>

			{/* Show toast notification when active */}
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}

			{/* Pagination and page size controls */}
			<div className="flex justify-between items-center mb-4">
				<div className="flex items-center">
					<span className="text-gray-600 mr-4">
						Page {page} of {totalPages} ({totalCoins} total)
					</span>
					<div className="flex space-x-2">
						<button
							onClick={handlePrevPage}
							disabled={page <= 1}
							className={`px-3 py-1 rounded ${
								page <= 1
									? "bg-gray-200 text-gray-500 cursor-not-allowed"
									: "bg-gray-800 text-white hover:bg-gray-700"
							}`}
						>
							Prev
						</button>
						<button
							onClick={handleNextPage}
							disabled={page >= totalPages}
							className={`px-3 py-1 rounded ${
								page >= totalPages
									? "bg-gray-200 text-gray-500 cursor-not-allowed"
									: "bg-gray-800 text-white hover:bg-gray-700"
							}`}
						>
							Next
						</button>
					</div>
				</div>
			</div>

			{coins.length === 0 ? (
				<div className="bg-white p-8 rounded-lg shadow-md text-center">
					<p className="text-gray-500">No coins found</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg shadow-md">
					<table className="w-full border-collapse bg-white">
						<thead>
							<tr className="bg-gray-800 text-white">
								<th className="p-4 text-left">BitSlow</th>
								<th className="p-4 text-left">Bits</th>
								<th className="p-4 text-center">Monetary Value</th>
								<th className="p-4 text-center">History</th>
								<th className="p-4 text-right">Current Owner</th>
							</tr>
						</thead>
						<tbody>
							{coins.map((coin, index) => (
								<tr
									key={coin.coin_id}
									className={`hover:bg-gray-50 transition-colors ${index === coins.length - 1 ? "" : "border-b border-gray-200"}`}
								>
									<td className="p-4">
										<div>
											<div className="">{coin.coin_id}</div>
										</div>
									</td>
									<td className="p-4">
										{coin.bit1}, {coin.bit2}, {coin.bit3}
									</td>
									<td className="p-4 text-center font-semibold text-gray-800">
										${coin.value.toLocaleString()}
									</td>
									<td className="p-4 text-center">
										<button
											onClick={() => openHistoryModal(coin.coin_id)}
											className="text-blue-500 hover:text-blue-700 flex items-center justify-center mx-auto"
											title="View ownership history"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-5 w-5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
												<path
													fillRule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
													clipRule="evenodd"
												/>
											</svg>
											<span className="ml-1">History</span>
										</button>
									</td>
									<td className="p-4 text-right text-gray-700">
										{coin.client_name == null ? (
											<button
												className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded transition duration-150 ease-in-out"
												onClick={() =>
													buyCoin(coin.coin_id, setToast, refreshCoins)
												}
											>
												Buy
											</button>
										) : (
											coin.client_name
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Pagination controls */}
			{totalPages > 1 && (
				<div className="flex justify-center mt-6">
					<nav className="flex items-center">
						<button
							onClick={handlePrevPage}
							disabled={page <= 1}
							className={`px-3 py-1 rounded-l-md border ${
								page <= 1
									? "bg-gray-100 text-gray-400 cursor-not-allowed"
									: "bg-white text-gray-700 hover:bg-gray-50"
							}`}
						>
							Previous
						</button>

						{pageNumbers.map((pageNum, idx) =>
							pageNum < 0 ? (
								<span
									key={`ellipsis-${idx}`}
									className="px-3 py-1 border-t border-b bg-white text-gray-700"
								>
									...
								</span>
							) : (
								<button
									key={pageNum}
									onClick={() => handlePageChange(pageNum)}
									className={`px-3 py-1 border-t border-b border-r ${
										page === pageNum
											? "bg-blue-500 text-white"
											: "bg-white text-gray-700 hover:bg-gray-50"
									}`}
								>
									{pageNum}
								</button>
							),
						)}

						<button
							onClick={handleNextPage}
							disabled={page >= totalPages}
							className={`px-3 py-1 rounded-r-md border-t border-r border-b ${
								page >= totalPages
									? "bg-gray-100 text-gray-400 cursor-not-allowed"
									: "bg-white text-gray-700 hover:bg-gray-50"
							}`}
						>
							Next
						</button>
					</nav>
				</div>
			)}
		</div>
	);
}

export default MarketplacePage;
