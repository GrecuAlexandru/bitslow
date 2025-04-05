import type { ReactNode } from "react";
import { Navbar } from "./components/Navbar";

interface LayoutProps {
	children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
	return (
		<div className="flex flex-col min-h-screen">
			<Navbar />
			<main className="flex-grow">{children}</main>
		</div>
	);
}

export default Layout;
