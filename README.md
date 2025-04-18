## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime (latest version recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/GrecuAlexandru/bitslow.git
cd bitslow
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun dev
```

## Codebase Structure

The application is structured as follows:

```
src/
├── components/           # Reusable UI components
│   ├── CoinHistoryModal.tsx
│   ├── GenerateCoinModal.tsx
│   ├── LoginForm.tsx
│   ├── Navbar.tsx
│   ├── RegisterForm.tsx
│   └── Toast.tsx
├── pages/                # Application pages
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   ├── MarketplacePage.tsx
│   ├── RegisterPage.tsx
│   └── TransactionsPage.tsx
├── services/             # API services
│   └── auth.ts
├── utils/                # Utility functions
│   ├── auth_token.ts
│   └── password_hashing.ts
├── App.tsx               # Root component
├── bitslow.ts            # BitSlow calculation logic
├── frontend.tsx          # Frontend entry point
├── index.css             # Global styles
├── index.html            # HTML template
├── index.tsx             # Backend server initialization
├── Layout.tsx            # Application layout
├── logo.svg              # App logo
├── seed.ts               # Database seeding
└── types.ts              # TypeScript types
```
