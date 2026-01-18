import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression";
import axios from "axios";
import connectDB from "../config/db.js";
import authRoutes from "./routes/auth.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import { errorHandler, notFound } from "./utils/errorHandler.js";

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:80',
  'http://localhost',
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); 
    }
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
}));

app.use(compression());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} [${duration}ms]`);
  });
  next();
});


app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/ping", (req, res) => {
  res.status(200).json({ message: "pong" });
});

app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);


app.use(notFound);
app.use(errorHandler);

const keepAlive = () => {
  const backendUrl = process.env.RENDER_EXTERNAL_URL;
  
  if (!backendUrl) {
    console.log('⚠️ RENDER_EXTERNAL_URL not set, skipping keep-alive');
    return;
  }

  setInterval(() => {
    axios.get(`${backendUrl}/health`)
      .then(() => console.log('✅ Keep-alive ping sent'))
      .catch((err) => console.log('⚠️ Keep-alive failed:', err.message));
  }, 10 * 60 * 1000); 
};

if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
  keepAlive();
  console.log('🔄 Keep-alive scheduler started (10-minute intervals)');
}

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: ${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + PORT}/health`);
});