# FinByt - Crypto Portfolio Dashboard

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)
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

### Prices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prices?symbols=btc,eth` | Get prices for symbols |
| GET | `/api/prices/portfolio` | Get prices for portfolio |
| GET | `/api/prices/supported` | List supported symbols |

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
- Cloud deployment (Vercel + Railway)

## Author

**Eduard Militaru**
- GitHub: [@EduardMilitaruG](https://github.com/EduardMilitaruG)
- LinkedIn: [Eduard Militaru](https://linkedin.com/in/eduardmilitaru)

## License

MIT License

---

*Built as a portfolio project demonstrating full-stack development with authentication*
