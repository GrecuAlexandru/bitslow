import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { isLoggedIn, getUserName, logoutUser } from "../services/auth";

interface NavLinkProps {
	to: string;
	isActive: boolean;
	children: React.ReactNode;
	onClick?: () => void;
}

function NavLink({ to, isActive, children, onClick }: NavLinkProps) {
	return (
		<Link
			to={to}
			className={`px-3 py-2 rounded-md text-sm font-medium ${
				isActive
					? "bg-blue-700 text-white"
					: "text-gray-300 hover:bg-gray-700 hover:text-white"
			}`}
			onClick={onClick}
		>
			{children}
		</Link>
	);
}

export function Navbar() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [authenticated, setAuthenticated] = useState(false);
	const [username, setUsername] = useState<string | null>(null);
	const location = useLocation();
	const currentPath = location.pathname;

	useEffect(() => {
		// Check authentication status
		setAuthenticated(isLoggedIn());
		setUsername(getUserName());
	}, [currentPath]); // Re-check when path changes

	const handleLogout = async () => {
		await logoutUser();
		setAuthenticated(false);
		setUsername(null);
		// Close mobile menu if open
		setIsMenuOpen(false);
		// Navigate to home page after logout
		window.location.href = "/";
	};

	return (
		<nav className="bg-gray-800">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					<div className="flex items-center">
						<div className="flex-shrink-0">
							<span className="text-white font-bold text-xl">BitSlow</span>
						</div>
						{/* Desktop menu */}
						<div className="hidden md:block">
							<div className="ml-10 flex items-baseline space-x-4">
								{authenticated ? (
									<>
										<NavLink
											to="/"
											isActive={currentPath === "/" || currentPath === ""}
										>
											Dashboard
										</NavLink>
										<NavLink
											to="/transactions"
											isActive={currentPath === "/transactions"}
										>
											Transactions
										</NavLink>
									</>
								) : (
									<NavLink
										to="/"
										isActive={currentPath === "/" || currentPath === ""}
									>
										Transactions
									</NavLink>
								)}
								<NavLink
									to="/marketplace"
									isActive={currentPath === "/marketplace"}
								>
									Marketplace
								</NavLink>
							</div>
						</div>
					</div>

					{/* Authentication links - Desktop */}
					<div className="hidden md:block">
						<div className="ml-4 flex items-center md:ml-6">
							{authenticated ? (
								<div className="flex items-center space-x-4">
									<span className="text-gray-300 text-sm">
										Welcome, {username || "User"}
									</span>
									<button
										onClick={handleLogout}
										type="button"
										className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
									>
										Logout
									</button>
								</div>
							) : (
								<div className="flex items-center space-x-4">
									<NavLink
										to="/register"
										isActive={currentPath === "/register"}
									>
										Register
									</NavLink>
									<NavLink to="/login" isActive={currentPath === "/login"}>
										Login
									</NavLink>
								</div>
							)}
						</div>
					</div>

					{/* Mobile menu button */}
					<div className="md:hidden">
						<button
							onClick={() => setIsMenuOpen(!isMenuOpen)}
							className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
						>
							<span className="sr-only">Open main menu</span>
							{/* Icon when menu is closed */}
							{!isMenuOpen ? (
								<svg
									className="block h-6 w-6"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									aria-hidden="true"
								>
									<title>Menu icon</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M4 6h16M4 12h16M4 18h16"
									/>
								</svg>
							) : (
								<svg
									className="block h-6 w-6"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									aria-hidden="true"
								>
									<title>Close menu icon</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile menu, show/hide based on menu state */}
			{isMenuOpen && (
				<div className="md:hidden">
					<div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
						{authenticated ? (
							<>
								<Link
									to="/"
									className={`block px-3 py-2 rounded-md text-base font-medium ${
										currentPath === "/" || currentPath === ""
											? "bg-blue-700 text-white"
											: "text-gray-300 hover:bg-gray-700 hover:text-white"
									}`}
									onClick={() => setIsMenuOpen(false)}
								>
									Dashboard
								</Link>
								<Link
									to="/transactions"
									className={`block px-3 py-2 rounded-md text-base font-medium ${
										currentPath === "/transactions"
											? "bg-blue-700 text-white"
											: "text-gray-300 hover:bg-gray-700 hover:text-white"
									}`}
									onClick={() => setIsMenuOpen(false)}
								>
									Transactions
								</Link>
							</>
						) : (
							<Link
								to="/"
								className={`block px-3 py-2 rounded-md text-base font-medium ${
									currentPath === "/" || currentPath === ""
										? "bg-blue-700 text-white"
										: "text-gray-300 hover:bg-gray-700 hover:text-white"
								}`}
								onClick={() => setIsMenuOpen(false)}
							>
								Transactions
							</Link>
						)}
						<Link
							to="/marketplace"
							className={`block px-3 py-2 rounded-md text-base font-medium ${
								currentPath === "/marketplace"
									? "bg-blue-700 text-white"
									: "text-gray-300 hover:bg-gray-700 hover:text-white"
							}`}
							onClick={() => setIsMenuOpen(false)}
						>
							Marketplace
						</Link>

						{/* Authentication links - Mobile */}
						{authenticated ? (
							<>
								<div className="px-3 py-2 text-base font-medium text-gray-300">
									Welcome, {username || "User"}
								</div>
								<button
									onClick={handleLogout}
									type="button"
									className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
								>
									Logout
								</button>
							</>
						) : (
							<>
								<Link
									to="/register"
									className={`block px-3 py-2 rounded-md text-base font-medium ${
										currentPath === "/register"
											? "bg-blue-700 text-white"
											: "text-gray-300 hover:bg-gray-700 hover:text-white"
									}`}
									onClick={() => setIsMenuOpen(false)}
								>
									Register
								</Link>
								<Link
									to="/login"
									className={`block px-3 py-2 rounded-md text-base font-medium ${
										currentPath === "/login"
											? "bg-blue-700 text-white"
											: "text-gray-300 hover:bg-gray-700 hover:text-white"
									}`}
									onClick={() => setIsMenuOpen(false)}
								>
									Login
								</Link>
							</>
						)}
					</div>
				</div>
			)}
		</nav>
	);
}
