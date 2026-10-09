# RoomWise Demo & Development Setup Instructions

## Prerequisites
* Node.js v18+ and npm v9+
* MongoDB local instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas connection string

---

## Installation & Setup

1. **Clone & Install Dependencies**
   ```bash
   cd Roompilot
   npm install
   ```

2. **Configure Environment Variables**
   * Server environment configuration:
     ```bash
     cp server/.env.example server/.env
     ```
   * Update `server/.env` if your local MongoDB port or credentials differ.

3. **Start Development Servers**
   ```bash
   # In separate terminals:
   npm run dev:server  # Runs Express server at http://localhost:5000
   npm run dev:client  # Runs Vite app at http://localhost:5173
   ```
   * Backend server: `http://localhost:5000`
   * Frontend Vite app: `http://localhost:5173`

---

## Teammate Feature Branch Strategy

To ensure clean collaboration without code conflicts, team members should work on separate feature branches off `main`:

```bash
# 1. Fetch latest foundation from main
git checkout main
git pull origin main

# 2. Create feature branch according to assigned domain
git checkout -b feature/allocation-algorithm   # Member working on First-Fit & Heuristics
git checkout -b feature/hard-validator          # Member working on constraint validator
git checkout -b feature/disruption-recovery     # Member working on room closure recovery
git checkout -b feature/rbac-auth               # Member working on RBAC & Auth endpoints
git checkout -b feature/metrics-audit           # Member working on metrics & audit logs
git checkout -b feature/frontend-ui             # Member working on React components & pages
```

### Git Workflow Guidelines
* **Never commit `.env` files with secrets.**
* **Never edit another member's feature files without coordination.**
* **Run type checks before submitting a Pull Request:** `npm run type-check`
* **Keep Pull Requests focused and small.**
