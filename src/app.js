const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// 1. SECURITY & LOGGING
app.use(helmet()); // Sets various HTTP headers for security
app.use(morgan("dev")); // Request logging

// 2. DYNAMIC CORS CONFIGURATION
const allowedOrigins = [
  "http://localhost:5173", // Local development
  "https://academyos-psi.vercel.app", // REPLACE with your actual Vercel URL
  // You can also use process.env.CLIENT_URL if you set it in Render environment variables
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.endsWith(".vercel.app")
    ) {
      callback(null, true);
    } else {
      callback(
        new Error("Node Error: Origin blocked by AcademyOS Security Policy"),
      );
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["Content-Length", "X-Response-Time"],
  maxAge: 86400, // 24 hours cache for preflight requests
};

app.use(cors(corsOptions));

// 3. MIDDLEWARES
// Fix for Express 5 path-to-regexp and handle preflight for all routes
app.options(/(.*)/, cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. SYSTEM HEALTH CHECK
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AcademyOS API Node is Active",
    environment: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// 5. API ROUTES
app.use("/api/v1", routes);

// 6. 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Node Error: Endpoint [${req.method}] ${req.originalUrl} does not exist on this cluster.`,
  });
});

// 7. GLOBAL ERROR OVERRIDE
app.use(errorHandler);

module.exports = app;
