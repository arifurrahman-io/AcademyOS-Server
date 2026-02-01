const http = require("http");
const mongoose = require("mongoose");

const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");

const serverPort = Number(PORT) || 5000;

let server; // http server instance
let isShuttingDown = false;

// Track open sockets so we can destroy them on shutdown if needed
const sockets = new Set();

async function bootstrap() {
  try {
    // 1) Connect DB first
    await connectDB();
    console.log("✅ AcademyOS Database connected successfully");

    // 2) Start HTTP server
    server = http.createServer(app);

    /**
     * Timeout tuning (helps reduce hanging/pending connections)
     * - headersTimeout must be > keepAliveTimeout
     */
    server.keepAliveTimeout = 65_000; // default 5s in some stacks; raise for stability
    server.headersTimeout = 70_000;

    // Track sockets
    server.on("connection", (socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
    });

    server.listen(serverPort, () => {
      console.log(`🚀 Node Active: http://localhost:${serverPort}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
    });

    // Graceful shutdown signals
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // Process-level error handlers
    process.on("unhandledRejection", (err) => {
      console.error("❌ Unhandled Rejection:", err?.stack || err);
      shutdown("unhandledRejection", 1);
    });

    process.on("uncaughtException", (err) => {
      console.error("❌ Uncaught Exception:", err?.stack || err);
      shutdown("uncaughtException", 1);
    });
  } catch (err) {
    console.error("❌ Infrastructure Failure:", err?.stack || err);
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 * 1) Stop accepting new requests
 * 2) Allow in-flight requests to finish
 * 3) Close DB connection
 * 4) Force-close remaining sockets after timeout
 */
async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Shutdown initiated (${signal}). Draining connections...`);

  // If server never started, just close DB and exit
  if (!server) {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log("💾 MongoDB connection closed.");
      }
    } finally {
      process.exit(exitCode);
    }
    return;
  }

  // Stop taking new connections
  server.close(async (err) => {
    if (err) console.error("⚠️ Error closing HTTP server:", err);

    console.log("🧹 HTTP server stopped accepting new connections.");

    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log("💾 MongoDB connection closed.");
      }
    } catch (dbErr) {
      console.error("⚠️ Error closing MongoDB:", dbErr);
    } finally {
      console.log("✅ Shutdown complete.");
      process.exit(exitCode);
    }
  });

  // Force shutdown after 10 seconds (prevents stuck process)
  const FORCE_TIMEOUT_MS = 10_000;
  setTimeout(() => {
    console.warn("⏱️ Force closing remaining connections...");

    // Destroy any open sockets
    for (const s of sockets) {
      try {
        s.destroy();
      } catch (_) {}
    }

    process.exit(exitCode || 1);
  }, FORCE_TIMEOUT_MS).unref();
}

bootstrap();
