import { useState } from "react";
import { Link } from "react-router-dom";

interface RegisterFormProps {
	onSuccess?: () => void;
	onError?: (error: string) => void;
	className?: string;
}

export function RegisterForm({
	onSuccess,
	onError,
	className,
}: RegisterFormProps) {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
		phone: "",
		address: "",
	});
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const validate = () => {
		const newErrors: Record<string, string> = {};

		if (!formData.name.trim()) {
			newErrors.name = "Name is required";
		}

		if (!formData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
			newErrors.email = "Email is invalid";
		}

		if (!formData.password) {
			newErrors.password = "Password is required";
		} else if (formData.password.length < 8) {
			newErrors.password = "Password must be at least 8 characters";
		}

		if (formData.password !== formData.confirmPassword) {
			newErrors.confirmPassword = "Passwords do not match";
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
			const response = await fetch("/api/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: formData.name,
					email: formData.email,
					password: formData.password,
					phone: formData.phone,
					address: formData.address,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Registration failed");
			}

			setFormData({
				name: "",
				email: "",
				password: "",
				confirmPassword: "",
				phone: "",
				address: "",
			});

			onSuccess?.();
		} catch (error) {
			onError?.(error instanceof Error ? error.message : "Registration failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-6 max-w-3xl mx-auto">
			<div className="rounded-lg border bg-card text-card-foreground shadow-lg overflow-hidden">
				<div className="flex flex-col space-y-1.5 p-6 bg-gray-50">
					<h3 className="text-2xl font-semibold leading-none tracking-tight">
						Create an Account
					</h3>
					<p className="text-sm text-gray-500">
						Fill in the details below to register for a new account
					</p>
				</div>
				<div className="p-8 pt-6">
					<form onSubmit={handleSubmit}>
						<div className="flex flex-col gap-6">
							<div className="grid gap-2">
								<label
									htmlFor="name"
									className="text-sm font-medium flex items-center gap-1"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4 text-gray-500"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<title>User icon</title>
										<path
											fillRule="evenodd"
											d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
											clipRule="evenodd"
										/>
									</svg>
									Full Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="name"
									name="name"
									value={formData.name}
									onChange={handleChange}
									className={`flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${errors.name ? "border-red-500" : ""}`}
									placeholder="Enter your full name"
								/>
								{errors.name && (
									<p className="text-red-500 text-xs mt-1">{errors.name}</p>
								)}
							</div>

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

							<div className="grid md:grid-cols-2 gap-4">
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
										placeholder="Create a password"
									/>
									{errors.password && (
										<p className="text-red-500 text-xs mt-1">
											{errors.password}
										</p>
									)}
								</div>

								<div className="grid gap-2">
									<label
										htmlFor="confirmPassword"
										className="text-sm font-medium flex items-center gap-1"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4 text-gray-500"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<title>Confirm Password icon</title>
											<path
												fillRule="evenodd"
												d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clipRule="evenodd"
											/>
										</svg>
										Confirm Password <span className="text-red-500">*</span>
									</label>
									<input
										type="password"
										id="confirmPassword"
										name="confirmPassword"
										value={formData.confirmPassword}
										onChange={handleChange}
										className={`flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${errors.confirmPassword ? "border-red-500" : ""}`}
										placeholder="Confirm your password"
									/>
									{errors.confirmPassword && (
										<p className="text-red-500 text-xs mt-1">
											{errors.confirmPassword}
										</p>
									)}
								</div>
							</div>

							<div className="grid md:grid-cols-2 gap-4">
								<div className="grid gap-2">
									<label
										htmlFor="phone"
										className="text-sm font-medium flex items-center gap-1"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4 text-gray-500"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<title>Phone icon</title>
											<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
										</svg>
										Phone Number
									</label>
									<input
										type="tel"
										id="phone"
										name="phone"
										value={formData.phone}
										onChange={handleChange}
										className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
										placeholder="Enter your phone number (optional)"
									/>
								</div>

								<div className="grid gap-2">
									<label
										htmlFor="address"
										className="text-sm font-medium flex items-center gap-1"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4 text-gray-500"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<title>Address icon</title>
											<path
												fillRule="evenodd"
												d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
												clipRule="evenodd"
											/>
										</svg>
										Address
									</label>
									<input
										type="text"
										id="address"
										name="address"
										value={formData.address}
										onChange={handleChange}
										className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
										placeholder="Enter your address (optional)"
									/>
								</div>
							</div>
							<button
								type="submit"
								disabled={isLoading}
								className="flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 h-11 w-full mt-4 text-sm font-medium transition-colors disabled:opacity-50"
							>
								{isLoading ? (
									<>
										<span className="mr-2 h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
										Processing...
									</>
								) : (
									"Create Account"
								)}
							</button>
						</div>
						<div className="mt-6 text-center text-sm">
							Already have an account?{" "}
							<Link
								to="/login"
								className="text-primary font-medium hover:underline underline-offset-4 transition-all"
							>
								Log in
							</Link>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
