import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`🚀 RoomWise Backend Server running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
    console.log(`📡 Healthcheck available at http://localhost:${env.PORT}/api/v1/health`);
  });
};

startServer();
