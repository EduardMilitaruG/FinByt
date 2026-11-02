# FinByt - Crypto Portfolio Dashboard

[![CI](https://github.com/EduardMilitaruG/FinByt/actions/workflows/ci.yml/badge.svg)](https://github.com/EduardMilitaruG/FinByt/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

A full-stack investment portfolio dashboard for tracking cryptocurrencies, stocks, and ETFs with real-time price updates via the CoinGecko API. Features JWT authentication for secure, personalized portfolios.

## Live Demo

**[https://client-eight-ebon-78.vercel.app](https://client-eight-ebon-78.vercel.app)**

Demo credentials:
- Email: `demo@finbyt.app`
- Password: `demo123456`

## Key Features

- **User Authentication** - Secure JWT-based login and registration
- **Private Portfolios** - Each user has their own protected portfolio
- **Portfolio Management** - Full CRUD operations for managing investment assets
- **Live Crypto Prices** - Real-time price updates from CoinGecko API with intelligent caching
- **Multi-Asset Support** - Track cryptocurrencies, stocks, and ETFs in one place
- **Profit/Loss Tracking** - Real-time P/L calculations with color-coded indicators
- **Responsive Design** - Dark theme UI optimized for all screen sizes

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| Axios | API communication with JWT interceptor |
| Context API | Authentication state management |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express | Web framework |
| SQLite + better-sqlite3 | Data persistence |
| JWT + bcrypt | Authentication |
| CoinGecko API | Live crypto prices |

### Deployment
| Service | Component |
|---------|-----------|
| Vercel | Frontend hosting |
| Railway | Backend API hosting |

## Project Architecture

```
FinByt/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AssetForm.jsx
│   │   │   ├── AssetTable.jsx
│   │   │   ├── DeleteConfirm.jsx
│   │   │   ├── Login.jsx
│   │   │   └── PortfolioSummary.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── priceService.js
│   │   └── App.jsx
│   └── package.json
│
├── server/                    # Node.js backend
│   ├── controllers/
│   │   ├── assetController.js
│   │   ├── authController.js
│   │   └── priceController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   └── database.js
│   ├── routes/
│   │   ├── assetRoutes.js
│   │   ├── authRoutes.js
│   │   └── priceRoutes.js
│   ├── services/
│   │   └── coinGeckoService.js
│   └── server.js
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/EduardMilitaruG/FinByt.git
cd FinByt

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Environment Variables

**Server (.env)**
```env
PORT=3001
JWT_SECRET=your-secret-key
NODE_ENV=development
```

**Client (.env)**
```env
VITE_API_URL=http://localhost:3001/api
```

### Running Locally

```bash
# Terminal 1: Start backend server
cd server && npm run dev
# Server runs on http://localhost:3001

# Terminal 2: Start frontend
cd client && npm run dev
# Frontend runs on http://localhost:5173
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user (protected) |

### Assets (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | Get user's assets |
| GET | `/api/assets/:id` | Get single asset |
| POST | `/api/assets` | Create new asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |
| POST | `/api/assets/update-prices` | Batch-update crypto prices for the user's assets |

### Prices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prices?symbols=btc,eth` | Get prices for symbols |
| GET | `/api/prices/portfolio` | Refresh prices for the user's crypto assets (protected) |
| GET | `/api/prices/supported` | List supported symbols |

## Testing

75 API and unit tests run with Vitest and Supertest on every push and pull
request, alongside client lint and build ([CI workflow](.github/workflows/ci.yml)).
Each test run uses a fresh in-memory SQLite database, and CoinGecko is stubbed,
so the suite needs no network and no setup.

```bash
cd server
npm test                 # 75 tests
npm run test:coverage
```

| File | What it covers |
|---|---|
| `tests/auth.api.test.js` | Register/login rules, duplicate and mixed-case emails, forged, expired and `alg: none` tokens |
| `tests/assets.api.test.js` | CRUD, auth on every route, one user's assets invisible to another, type and boundary validation, malformed JSON |
| `tests/prices.test.js` | Symbol mapping, cache hits, 429 and network-error fallbacks, portfolio price refresh scoped to the caller |
| `tests/unit.test.js` | JWT secret handling, email and asset validators |

### Bugs the tests found

18 of these tests fail against the code before the fixes.

| Area | Before | After |
|---|---|---|
| `GET /api/prices/portfolio` | No auth. Any visitor could read every user's crypto symbols and overwrite prices on all accounts | Requires a token, reads and updates only the caller's assets |
| JWT secret | Fell back to a string published in this repo when `JWT_SECRET` was unset, so tokens could be forged | Server refuses to start in production without `JWT_SECRET`; tokens limited to HS256 |
| `quantity: "abc"` on create/update | Stored as text in a `REAL` column (SQLite's `CHECK (quantity > 0)` passes for text) | 400 |
| Price batch with `"lots"` or `-1` | Stored | 400 |
| `Ana@Test.dev` after `ana@test.dev` | Second account created | 409, emails normalized |
| Numeric password / non-string login email | 500 | 400 |
| `currentPrice: 0` | Replaced by `buyPrice` (`0 \|\| buyPrice`) | Kept as 0 |

## Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  assetName TEXT NOT NULL,
  symbol TEXT NOT NULL,
  assetType TEXT CHECK(assetType IN ('crypto', 'stock', 'etf')),
  quantity REAL NOT NULL,
  buyPrice REAL NOT NULL,
  currentPrice REAL DEFAULT 0,
  notes TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

## Skills Demonstrated

- Full-stack JavaScript development
- JWT authentication implementation
- RESTful API design with protected routes
- React Context API for state management
- Axios interceptors for token handling
- Database design with foreign key relationships
- Third-party API integration with caching
- API testing with Vitest + Supertest, including auth and multi-user isolation
- CI with GitHub Actions
- Cloud deployment (Vercel + Railway)

## Author

**Eduard Militaru**
- GitHub: [@EduardMilitaruG](https://github.com/EduardMilitaruG)
- LinkedIn: [Eduard Militaru](https://linkedin.com/in/eduardmilitaru)

## License

MIT License

---

*Built as a portfolio project demonstrating full-stack development with authentication*
