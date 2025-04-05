import { useState } from "react";
import { Link } from "react-router-dom";
import type { LoginCredentials } from "../types";
import { loginUser } from "../services/auth";

interface LoginFormProps {
	onSuccess?: () => void;
	onError?: (error: string) => void;
	className?: string;
}

export function LoginForm({ onSuccess, onError, className }: LoginFormProps) {
	const [formData, setFormData] = useState<LoginCredentials>({
		email: "",
		password: "",
	});
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const validate = () => {
		const newErrors: Record<string, string> = {};

		if (!formData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
			newErrors.email = "Email is invalid";
		}

		if (!formData.password) {
			newErrors.password = "Password is required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) {
			return;
		}

		setIsLoading(true);

		try {
			const response = await loginUser(formData);
			onSuccess?.();
		} catch (error) {
			onError?.(error instanceof Error ? error.message : "Login failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-6 max-w-3xl mx-auto">
			<div className="rounded-lg border bg-card text-card-foreground shadow-lg overflow-hidden">
				<div className="flex flex-col space-y-1.5 p-6 bg-gray-50">
					<h3 className="text-2xl font-semibold leading-none tracking-tight">
						Login to Your Account
					</h3>
					<p className="text-sm text-gray-500">
						Enter your credentials to access your account
					</p>
				</div>
				<div className="p-8 pt-6">
					<form onSubmit={handleSubmit}>
						<div className="flex flex-col gap-6">
							<div className="grid gap-2">
								<label
									htmlFor="email"
									className="text-sm font-medium flex items-center gap-1"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4 text-gray-500"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<title>Email icon</title>
										<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
										<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
									</svg>
									Email Address <span className="text-red-500">*</span>
								</label>
								<input
									type="email"
									id="email"
									name="email"
									value={formData.email}
									onChange={handleChange}
									className={`flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${errors.email ? "border-red-500" : ""}`}
									placeholder="Enter your email"
								/>
								{errors.email && (
									<p className="text-red-500 text-xs mt-1">{errors.email}</p>
								)}
							</div>

							<div className="grid gap-2">
								<label
									htmlFor="password"
									className="text-sm font-medium flex items-center gap-1"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4 text-gray-500"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<title>Password icon</title>
										<path
											fillRule="evenodd"
											d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
											clipRule="evenodd"
										/>
									</svg>
									Password <span className="text-red-500">*</span>
								</label>
								<input
									type="password"
									id="password"
									name="password"
									value={formData.password}
									onChange={handleChange}
									className={`flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${errors.password ? "border-red-500" : ""}`}
									placeholder="Enter your password"
								/>
								{errors.password && (
									<p className="text-red-500 text-xs mt-1">{errors.password}</p>
								)}
							</div>

							<button
								type="submit"
								disabled={isLoading}
								className="flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 h-11 w-full mt-4 text-sm font-medium transition-colors disabled:opacity-50"
							>
								{isLoading ? (
									<>
										<span className="mr-2 h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
										Logging in...
									</>
								) : (
									"Login"
								)}
							</button>
						</div>
						<div className="mt-6 text-center text-sm">
							Don't have an account?{" "}
							<Link
								to="/register"
								className="text-primary font-medium hover:underline underline-offset-4 transition-all"
							>
								Register here
							</Link>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
