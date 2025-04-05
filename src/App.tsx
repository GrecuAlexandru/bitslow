import "./index.css";
import React, { useState, useEffect } from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import { TransactionsPage } from "./pages/TransactionsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";
import { Layout } from "./Layout";
import { MarketplacePage } from "./pages/MarketplacePage";
import { isLoggedIn } from "./services/auth";

export function App() {
	const [authenticated, setAuthenticated] = useState(false);

	useEffect(() => {
		// Check authentication status
		setAuthenticated(isLoggedIn());
	});

	return (
		<Router>
			<Layout>
				<Routes>
					<Route path="/register" element={<RegisterPage />} />
					<Route path="/login" element={<LoginPage />} />
					<Route path="/marketplace" element={<MarketplacePage />} />
					<Route path="/transactions" element={<TransactionsPage />} />
					<Route
						path="/"
						element={authenticated ? <DashboardPage /> : <TransactionsPage />}
					/>
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Layout>
		</Router>
	);
}

export default App;
