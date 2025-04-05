import { useState } from "react";
import { getAuthToken } from "@/services/auth";
import { Toast } from "../components/Toast";

const ENDPOINT_URL = "http://localhost:3000/";

interface GenerateCoinModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (coidId: number) => void;
}

export function GenerateCoinModal({
	isOpen,
	onClose,
	onSuccess,
}: GenerateCoinModalProps) {
	const [amount, setAmount] = useState<number | "">("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [toast, setToast] = useState<{
		message: string;
		type: "success" | "error";
	} | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (amount === "" || amount <= 0) {
			const errorMessage = "Please enter a valid amount greater than 0";
			setError(errorMessage);
			setToast({ message: errorMessage, type: "error" });
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch(`${ENDPOINT_URL}api/coins/generate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${getAuthToken()}`,
				},
				body: JSON.stringify({ value: amount }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to generate coin");
			}

			// Success
			setAmount("");
			onSuccess(data.coin_id);
			onClose();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "An unknown error occurred";
			setError(errorMessage);
			setToast({ message: errorMessage, type: "error" });
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-md w-full">
				<div className="p-6">
					<h3 className="text-xl font-semibold text-gray-800 mb-4">
						Generate New BitSlow Coin
					</h3>

					<form onSubmit={handleSubmit}>
						<div className="mb-4">
							<label
								htmlFor="amount"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Monetary Value ($)
							</label>
							<input
								type="number"
								id="amount"
								value={amount}
								onChange={(e) =>
									setAmount(e.target.value === "" ? "" : Number(e.target.value))
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Enter amount"
								min="1"
								required
							/>
						</div>

						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
								disabled={isLoading}
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
								disabled={isLoading}
							>
								{isLoading ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
										Generating...
									</>
								) : (
									"Generate Coin"
								)}
							</button>
						</div>
					</form>
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

export default GenerateCoinModal;
