import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

// 🔹 Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import regionRoutes from './routes/regionRoutes.js';
import userRoutes from './routes/usersRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import reportRoutes from "./routes/reportRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import revenueRoutes from "./routes/revenueRoutes.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import retailerRoutes from "./routes/retailerRoutes.js";
import tourApprovalRoutes from "./routes/tourApprovalRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import guestRoutes from "./routes/guestRoutes.js"; // ✅ Guest routes
import customerDatabaseRoutes from "./routes/customerDatabaseRoutes.js"; // ✅ Customer Database routes
import assetRequestRoutes from "./routes/assetRequestRoutes.js"; // ✅ Asset Request routes


async function start() {
  await connectDB();

  const app = express();

  // 🔹 Middlewares
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Authorization',
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // 🔹 Health & Root
  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
  app.get('/', (_req, res) => res.send('tracker API is up'));

  // 🔹 Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/region', regionRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/manager', managerRoutes);   // ✅ only once
  app.use('/api/customers', customerRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/branch', branchRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/admin/users", adminUserRoutes);  // new route
  app.use("/api/assignments", assignmentRoutes); 
  app.use("/api/revenue", uploadRoutes);
  app.use("/api/revenue", revenueRoutes);
  app.use("/api/holidays", holidayRoutes);
  app.use("/api/retailers", retailerRoutes);
  app.use("/api/tour", tourApprovalRoutes);
  app.use("/api/stock", stockRoutes);
  app.use("/api/guest", guestRoutes); // ✅ Guest routes
  app.use("/api/customer-database", customerDatabaseRoutes); // ✅ Customer Database routes
  app.use("/api/asset-requests", assetRequestRoutes); // ✅ Asset Request routes
  app.use("/uploads", express.static("uploads"));

  // Serve frontend static files if built (Vite build outputs to frontend/dist)
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const clientDist = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(clientDist));

    // SPA fallback: serve index.html for non-API routes so client-side routing works
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      const indexFile = path.join(clientDist, 'index.html');
      res.sendFile(indexFile, (err) => {
        if (err) next();
      });
    });
  } catch (err) {
    console.warn('Frontend static serving not configured:', err && err.message);
  }

  // 🔹 404 Fallback (API / other requests)
  app.use((req, res) =>
    res.status(404).json({ message: 'Not Found', path: req.originalUrl })
  );

  // 🔹 Start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`API running on port ${PORT}`)
  );
}

start().catch((e) => {
  console.error('Fatal boot error:', e);
  process.exit(1);
});
