import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleSuccess = () => {
		setSuccess(true);
		setTimeout(() => {
			// navigate("/");
			window.location.href = "/";
		}, 2000);
	};

	const handleError = (errorMessage: string) => {
		setError(errorMessage);
		// Clear error after 5 seconds
		setTimeout(() => {
			setError(null);
		}, 5000);
	};

	return (
		<div className="min-h-screen flex flex-col justify-center">
			<div className="sm:mx-auto sm:w-full sm:max-w-md">
				<h1 className="text-center text-3xl font-extrabold text-gray-900">
					Login to BitSlow
				</h1>
				<p className="mt-2 text-center text-sm text-gray-600">
					Welcome back! Please log in to your account.
				</p>
			</div>

			{error && (
				<div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
					<div
						className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative"
						role="alert"
					>
						<strong className="font-bold">Error!</strong>
						<span className="block sm:inline"> {error}</span>
					</div>
				</div>
			)}

			{success ? (
				<div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
					<div
						className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative"
						role="alert"
					>
						<strong className="font-bold">Success!</strong>
						<span className="block sm:inline">
							{" "}
							You are now logged in. Redirecting...
						</span>
					</div>
				</div>
			) : (
				<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
					<LoginForm onSuccess={handleSuccess} onError={handleError} />
				</div>
			)}
		</div>
	);
}

export default LoginPage;
