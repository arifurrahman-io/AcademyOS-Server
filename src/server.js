const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");
const mongoose = require("mongoose");

/**
 * Server Lifecycle Management
 * Orchestrates database connectivity and listener initialization.
 */
const startServer = async () => {
  try {
    // 1. Establish Database Connectivity
    await connectDB();
    console.log("✅ AcademyOS Database connected successfully");

    // 2. Initialize Listener
    const serverPort = PORT || 5000;
    const server = app.listen(serverPort, () => {
      console.log(`🚀 Node Active: http://localhost:${serverPort}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
    });

    /**
     * GRACEFUL SHUTDOWN LOGIC
     * Prevents data corruption and handles the "404 Node Not Found" loop
     * by ensuring the process finishes pending tasks before restarting.
     */
    const shutdown = (signal) => {
      console.log(
        `\n shadowing ${signal} received. Shutting down gracefully...`,
      );
      server.close(async () => {
        console.log("🛑 HTTP server closed.");
        await mongoose.connection.close(false);
        console.log("💾 MongoDB connection closed.");
        process.exit(0);
      });
    };

    // Listen for termination signals
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Infrastructure Failure:", error.message);
    process.exit(1);
  }
};

/**
 * GLOBAL EXCEPTION TRACKING
 * Catches errors outside of the Express lifecycle (e.g., DB connection drops)
 */
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection detected:", err.message);
  // Give the server 1 second to log before exiting
  setTimeout(() => process.exit(1), 1000);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception detected:", err.message);
  process.exit(1);
});

startServer();
