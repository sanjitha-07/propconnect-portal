# PropConnect Portal — Frontend & MongoDB Compass Backend

PropConnect is a full-featured Commercial & Residential Property Management Portal for Tamil Nadu, structured into two dedicated folders: **`frontend/`** and **`backend/`**.

---

## 📁 Project Architecture

```text
propconnect-portal -chatbot/
├── frontend/                  # React 19 + Vite Client Application
│   ├── src/
│   │   ├── components/        # Topbar, Sidebar, MongoConsoleModal, Chatbot, etc.
│   │   ├── pages/             # Admin, Landlord, and Tenant portals
│   │   ├── utils/             # apiClient.js, chatbotEngine.js, formatters
│   │   └── data/              # Realistic Tamil Nadu Rental Data Model
│   ├── public/                # Static assets & PWA manifests
│   ├── index.html
│   ├── vite.config.js         # Vite configuration with proxy to port 5000
│   └── package.json
│
├── backend/                   # Express REST API connected to MongoDB Compass
│   ├── config/
│   │   └── db.js              # Mongoose connection & MongoDB Compass status
│   ├── models/                # 13 Mongoose Schemas & Models
│   │   └── index.js           # User, Landlord, Tenant, Property, Lease, Payment, etc.
│   ├── seed.js                # Auto-seeds complete Tamil Nadu dataset into MongoDB
│   ├── server.js              # Express 4 REST API with live query & stats routes
│   ├── .env                   # MONGODB_URI and PORT configuration
│   ├── .env.example
│   └── package.json
│
├── package.json               # Root scripts to run frontend & backend
└── README.md
```

---

## 🍃 MongoDB Compass Setup & Connection

The backend is connected to **MongoDB** using Mongoose and automatically creates and seeds the database:

- **Database Name**: `propconnect_db`
- **Compass Connection URI**: `mongodb://127.0.0.1:27017`
- **Backend API URI**: `mongodb://127.0.0.1:27017/propconnect_db`

### Connecting with MongoDB Compass:
1. Open the **MongoDB Compass** app on your desktop.
2. In the "New Connection" screen, enter:
   ```text
   mongodb://127.0.0.1:27017
   ```
3. Click **Connect**.
4. You will see the **`propconnect_db`** database with all **13 collections** automatically populated:
   - `users`
   - `landlords`
   - `tenants`
   - `properties`
   - `leases`
   - `payments`
   - `maintenance_requests`
   - `complaints`
   - `security_deposits`
   - `utility_bills`
   - `expenses`
   - `documents`
   - `notifications`

*(Optional) If using MongoDB Atlas cloud cluster, update `MONGODB_URI` in `backend/.env` with your cluster connection string.*

---

## 🚀 Running the Project

From the project root folder:

### 1. Start MongoDB Backend
```bash
npm run backend
```
*Backend runs on `http://localhost:5000` and automatically connects to MongoDB & seeds the data.*

### 2. Start React Frontend
```bash
npm run dev
```
*Frontend runs on `http://localhost:5175`.*

### 3. (Optional) Run Database Seeder Manually
```bash
npm run seed
```

### 4. Build Frontend for Production
```bash
npm run build
```

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Entity ID |
|---|---|---|---|
| **Admin** | `admin@propconnect.com` | `admin123` | N/A |
| **Landlord** | `karthik.raja@mail.com` | `land123` | `LDL001` |
| **Tenant** | `divya.priya@mail.com` | `tenant123` | `TEN001` |
