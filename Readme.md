# RoomWise — Smart Classroom Allocation & Disruption Recovery System

> **Original Note:** commitcon hackathon

RoomWise is a shared six-member hackathon system built with React, TypeScript, Vite, Tailwind CSS, Node.js, Express, and MongoDB.

## Project Structure

```
Roompilot/
├── docs/                      # Architecture, API contracts, RBAC matrix & demo setup guides
├── shared/types/              # Standard domain and API TypeScript contracts
├── server/                    # Express + Node.js + TypeScript backend & Mongoose models
└── client/                    # React + TypeScript + Vite + Tailwind CSS frontend
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Configure Environment
```bash
cp server/.env.example server/.env
```

### 3. Run Development Servers
```bash
npm run dev:server
npm run dev:client
```

## Documentation
* [ARCHITECTURE.md](docs/ARCHITECTURE.md)
* [API_CONTRACTS.md](docs/API_CONTRACTS.md)
* [RBAC_MATRIX.md](docs/RBAC_MATRIX.md)
* [DEMO_INSTRUCTIONS.md](docs/DEMO_INSTRUCTIONS.md)
