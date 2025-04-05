import { useState, useEffect, useMemo } from "react";
import { Transaction } from "../types";
import { Toast } from "../components/Toast";

const ENDPOINT_URL = "http://localhost:3000/";

const PAGE_SIZE_OPTIONS = [15, 30, 50];

// Fetch transactions with pagination and filters
function fetchTransactionsPage(
	page: number,
	pageSize: number,
	filters: {
		startDate?: string;
		endDate?: string;
		minValue?: string;
		maxValue?: string;
		buyerName?: string;
		sellerName?: string;
	},
): Promise<{ transactions: Transaction[]; total: number }> {
	// Build query parameters
	const params = new URLSearchParams();
	params.append("page", page.toString());
	params.append("pageSize", pageSize.toString());

	// Add filters to query parameters if they exist
	if (filters.startDate) params.append("startDate", filters.startDate);
	if (filters.endDate) params.append("endDate", filters.endDate);
	if (filters.minValue) params.append("minValue", filters.minValue);
	if (filters.maxValue) params.append("maxValue", filters.maxValue);
	if (filters.buyerName) params.append("buyerName", filters.buyerName);
	if (filters.sellerName) params.append("sellerName", filters.sellerName);

	return fetch(`${ENDPOINT_URL}api/transactions?${params.toString()}`)
		.then((response) => response.json())
		.catch((error) => {
			console.error("Error fetching data:", error);
			throw error;
		});
}

// Custom hook to manage transactions state and fetch data
function useTransactions(
	initialPage = 1,
	initialPageSize = PAGE_SIZE_OPTIONS[0],
) {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [page, setPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [totalTransactions, setTotalTransactions] = useState(0);
	const [filters, setFilters] = useState({
		startDate: "",
		endDate: "",
		minValue: "",
		maxValue: "",
		buyerName: "",
		sellerName: "",
	});

	const fetchPage = (
		pageNum: number,
		size: number,
		currentFilters = filters,
	) => {
		setLoading(true);
		fetchTransactionsPage(pageNum, size, currentFilters)
			.then((data) => {
				setTransactions(data.transactions);
				setTotalTransactions(data.total);
				setLoading(false);
			})
			.catch((err) => {
				setError(err);
				setLoading(false);
			});
	};

	useEffect(() => {
		fetchPage(page, pageSize);
	}, [page, pageSize, filters]);

	// Apply filters and reset to page 1
	const applyFilters = (newFilters: typeof filters) => {
		setFilters(newFilters);
		setPage(1);
	};

	return {
		transactions,
		loading,
		error,
		page,
		pageSize,
		totalTransactions,
		filters,
		setPage,
		setPageSize,
		applyFilters,
	};
}

export function TransactionsPage() {
	const {
		transactions,
		loading,
		error,
		page,
		pageSize,
		totalTransactions,
		filters,
		setPage,
		setPageSize,
		applyFilters,
	} = useTransactions();

	const [loadingTime, setLoadingTime] = useState(0);
	const [filterForm, setFilterForm] = useState({
		startDate: "",
		endDate: "",
		minValue: "",
		maxValue: "",
		buyerName: "",
		sellerName: "",
	});
	const [toast, setToast] = useState<{
		message: string;
		type: "success" | "error";
	} | null>(null);

	// Count loading time
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

	// Show toast if there's an error
	useEffect(() => {
		if (error) {
			setToast({
				message: `Error loading transactions: ${error.message}`,
				type: "error",
			});
		}
	}, [error]);

	const totalPages = Math.ceil(totalTransactions / pageSize);

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

	// Handle page size change
	const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newSize = parseInt(e.target.value);
		setPageSize(newSize);
		setPage(1);
	};

	// Handle filter changes
	const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFilterForm((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	// Submit filters
	const handleFilterSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Create a copy of the filter form to modify
		const adjustedFilters = { ...filterForm };

		// If there's an end date, add one day to include the full day in the search
		if (adjustedFilters.endDate) {
			const endDate = new Date(adjustedFilters.endDate);
			endDate.setDate(endDate.getDate() + 1);
			adjustedFilters.endDate = endDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
		}

		applyFilters(adjustedFilters);
	};

	// Reset filters
	const handleResetFilters = () => {
		const resetFilters = {
			startDate: "",
			endDate: "",
			minValue: "",
			maxValue: "",
			buyerName: "",
			sellerName: "",
		};
		setFilterForm(resetFilters);
		applyFilters(resetFilters);
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
						Loading Transactions
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

	return (
		<div className="max-w-7xl mx-auto p-4">
			<h1 className="text-3xl font-bold mb-4 text-gray-800">
				BitSlow Transactions
			</h1>

			{/* Filters Panel */}
			<div className="bg-white p-4 rounded-lg shadow-md mb-6">
				<h2 className="text-lg font-semibold mb-3">Filters</h2>
				<form onSubmit={handleFilterSubmit}>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Date Range
							</label>
							<div className="flex space-x-2">
								<input
									type="date"
									name="startDate"
									value={filterForm.startDate}
									onChange={handleFilterChange}
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
									placeholder="Start Date"
								/>
								<input
									type="date"
									name="endDate"
									value={filterForm.endDate}
									onChange={handleFilterChange}
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
									placeholder="End Date"
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Value Range
							</label>
							<div className="flex space-x-2">
								<input
									type="number"
									name="minValue"
									value={filterForm.minValue}
									onChange={handleFilterChange}
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
									placeholder="Min Value"
								/>
								<input
									type="number"
									name="maxValue"
									value={filterForm.maxValue}
									onChange={handleFilterChange}
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
									placeholder="Max Value"
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Names
							</label>
							<div className="flex space-x-2">
								<input
									type="text"
									name="buyerName"
									value={filterForm.buyerName}
									onChange={handleFilterChange}
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
									placeholder="Buyer Name"
								/>
								<input
									type="text"
									name="sellerName"
									value={filterForm.sellerName}
									onChange={handleFilterChange}
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
									placeholder="Seller Name"
								/>
							</div>
						</div>
					</div>
					<div className="flex justify-end space-x-2">
						<button
							type="button"
							onClick={handleResetFilters}
							className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Reset Filters
						</button>
						<button
							type="submit"
							className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Apply Filters
						</button>
					</div>
				</form>
			</div>

			{/* Pagination and page size controls */}
			<div className="flex justify-between items-center mb-4">
				<div className="flex items-center">
					<label htmlFor="pageSize" className="mr-2 text-gray-600">
						Show:
					</label>
					<select
						id="pageSize"
						value={pageSize}
						onChange={handlePageSizeChange}
						className="border border-gray-300 rounded px-2 py-1"
					>
						{PAGE_SIZE_OPTIONS.map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					</select>
				</div>
				<div className="flex items-center">
					<span className="text-gray-600 mr-4">
						Page {page} of {totalPages} ({totalTransactions} total)
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

			{transactions.length === 0 ? (
				<div className="bg-white p-8 rounded-lg shadow-md text-center">
					<p className="text-gray-500">No transactions found</p>
					{(filters.startDate ||
						filters.endDate ||
						filters.minValue ||
						filters.maxValue ||
						filters.buyerName ||
						filters.sellerName) && (
						<p className="text-sm text-gray-400 mt-2">
							Try adjusting your filters
						</p>
					)}
				</div>
			) : (
				<div className="rounded-lg shadow-md">
					{/* Table header - visible only on medium screens and up */}
					<div className="hidden md:flex bg-gray-800 text-white rounded-t-lg">
						<div className="p-3 md:p-4 w-14 md:w-[10%] text-left">ID</div>
						<div className="p-3 md:p-4 w-[25%] text-left">BitSlow</div>
						<div className="p-3 md:p-4 w-[15%] text-left hidden lg:block">
							Seller
						</div>
						<div className="p-3 md:p-4 w-[15%] text-left hidden lg:block">
							Buyer
						</div>
						<div className="p-3 md:p-4 w-[15%] text-right">Amount</div>
						<div className="p-3 md:p-4 flex-grow text-left">Date</div>
					</div>

					{/* Responsive transaction items */}
					<div className="bg-white divide-y divide-gray-200">
						{transactions.map((transaction, index) => (
							<div
								key={transaction.id}
								className="hover:bg-gray-50 transition-colors"
							>
								{/* Mobile view */}
								<div className="block md:hidden p-4">
									<div className="flex justify-between mb-2">
										<span className="text-xs text-gray-500">
											ID: {transaction.id}
										</span>
										<span className="text-xs text-gray-500">
											{new Date(transaction.transaction_date).toLocaleString()}
										</span>
									</div>
									<div className="font-medium text-gray-800 mb-1">
										{transaction.computedBitSlow}
									</div>
									<div className="text-xs text-gray-500 mb-1">
										Bits: {transaction.bit1}, {transaction.bit2},{" "}
										{transaction.bit3}
									</div>
									<div className="text-xs text-gray-500 mb-2">
										Value: ${transaction.value.toLocaleString()}
									</div>
									<div className="flex justify-between">
										<div>
											<div className="text-sm font-medium">Seller:</div>
											<div className="text-sm text-gray-700">
												{transaction.seller_name
													? transaction.seller_name
													: "Original Issuer"}
											</div>
										</div>
										<div>
											<div className="text-sm font-medium">Buyer:</div>
											<div className="text-sm text-gray-700">
												{transaction.buyer_name}
											</div>
										</div>
										<div>
											<div className="text-sm font-medium">Amount:</div>
											<div className="text-sm font-semibold text-gray-800">
												${transaction.amount.toLocaleString()}
											</div>
										</div>
									</div>
								</div>

								{/* Tablet/Desktop view */}
								<div className="hidden md:flex items-center">
									<div className="p-3 md:p-4 w-14 md:w-[10%] text-gray-600">
										{transaction.id}
									</div>
									<div className="p-3 md:p-4 w-[25%]">
										<div className="font-medium text-gray-800">
											{transaction.computedBitSlow}
										</div>
										<div className="text-xs text-gray-500 mt-1">
											Bits: {transaction.bit1}, {transaction.bit2},{" "}
											{transaction.bit3}
										</div>
										<div className="text-xs text-gray-500">
											Value: ${transaction.value.toLocaleString()}
										</div>
									</div>
									<div className="p-3 md:p-4 w-[15%] text-gray-700 hidden lg:block">
										{transaction.seller_name
											? transaction.seller_name
											: "Original Issuer"}
									</div>
									<div className="p-3 md:p-4 w-[15%] text-gray-700 hidden lg:block">
										{transaction.buyer_name}
									</div>
									<div className="p-3 md:p-4 w-[15%] text-right font-semibold text-gray-800">
										${transaction.amount.toLocaleString()}
									</div>
									<div className="p-3 md:p-4 flex-grow text-sm text-gray-600">
										{new Date(transaction.transaction_date).toLocaleString()}
									</div>
								</div>
							</div>
						))}
					</div>
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

export default TransactionsPage;
