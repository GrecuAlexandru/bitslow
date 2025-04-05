import { useState, useEffect } from "react";
import { getAuthToken } from "@/services/auth";
import { Toast } from "../components/Toast";

interface OwnershipRecord {
	date: string;
	owner_id: number | null;
	owner_name: string | null;
	type: string;
	amount: number | null;
	previous_owner_id: number | null;
	previous_owner_name: string | null;
}

interface CoinHistoryModalProps {
	isOpen: boolean;
	onClose: () => void;
	coinId: number | null;
}

const ENDPOINT_URL = "http://localhost:3000/";

export function CoinHistoryModal({
	isOpen,
	onClose,
	coinId,
}: CoinHistoryModalProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [history, setHistory] = useState<OwnershipRecord[]>([]);
	const [toast, setToast] = useState<{
		message: string;
		type: "success" | "error";
	} | null>(null);

	useEffect(() => {
		if (isOpen && coinId) {
			fetchCoinHistory(coinId);
		}
	}, [isOpen, coinId]);

	const fetchCoinHistory = async (id: number) => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch(`${ENDPOINT_URL}api/coins/${id}/history`, {
				headers: {
					Authorization: `Bearer ${getAuthToken()}`,
				},
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to fetch coin history");
			}

			setHistory(data.history);
		} catch (err) {
			console.error("Error fetching coin history:", err);
			const errorMessage =
				err instanceof Error ? err.message : "An unknown error occurred";
			setError(errorMessage);
			setToast({ message: errorMessage, type: "error" });
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	console.log(history);

	// Format date to be more readable
	const formatDate = (dateStr: string) => {
		if (dateStr === "Current") return "Current";
		const date = new Date(dateStr);
		return date.toLocaleString();
	};

	return (
		<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-md w-full">
				<div className="p-6">
					<div className="flex justify-between items-center mb-4">
						<h3 className="text-xl font-semibold text-gray-800">
							BitSlow #{coinId} Ownership History
						</h3>
						<button
							type="button"
							onClick={onClose}
							className="text-gray-500 hover:text-gray-700"
						>
							<svg
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Close icon</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{isLoading ? (
						<div className="flex justify-center my-8">
							<div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin" />
						</div>
					) : history.length === 0 ? (
						<div className="text-gray-500 my-4">
							No history available for this coin.
						</div>
					) : (
						<div className="mt-4">
							<div className="relative">
								{/* Timeline line */}
								<div className="absolute top-0 bottom-0 left-5 w-0.5 bg-gray-200" />

								{/* Timeline events */}
								{history.map((record, index) => (
									<div key={`history-${record.date}-${index}`} className="relative flex items-start mb-6">
										{/* Timeline dot */}
										<div
											className={`absolute left-5.5 w-2.5 h-2.5 mt-1.5 -ml-1.5 rounded-full ${record.type === "generated"
												? "bg-green-500"
												: record.type === "current"
													? "bg-blue-500"
													: "bg-yellow-500"
												}`}
										/>

										{/* Timeline content */}
										<div className="ml-12">
											<div className="text-sm text-gray-500">
												{formatDate(record.date)}
											</div>

											<div className="mt-1">
												{record.type === "generated" ? (
													<>
														<span className="font-medium text-green-600">
															Generated
														</span>
														<span className="text-gray-700"> by </span>
														<span className="font-medium text-gray-900">
															{record.owner_name || "Admin"}
														</span>
														{record.amount && (
															<div className="text-sm text-gray-600">
																Value: ${record.amount.toLocaleString()}
															</div>
														)}
													</>
												) : record.type === "current" ? (
													<div className="font-medium text-blue-600">
														{record.owner_id === null
															? "Available for Purchase"
															: `Currently owned by ${record.owner_name}`}
													</div>
												) : (
													<>
														<span className="font-medium text-gray-900">
															{record.owner_name}
														</span>
														<span className="text-gray-700">
															{" "}
															purchased from{" "}
														</span>
														<span className="font-medium text-gray-900">
															{record.previous_owner_name || "Original Issuer"}
														</span>
														{record.amount && (
															<div className="text-sm text-gray-600">
																Transaction value: $
																{record.amount.toLocaleString()}
															</div>
														)}
													</>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					<div className="mt-6 flex justify-end">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
						>
							Close
						</button>
					</div>
				</div>
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

export default CoinHistoryModal;
