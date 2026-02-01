const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const errorHandler = require("./middlewares/errorHandler");
const routes = require("./routes");

const app = express();

/**
 * SECURITY & LOGGING
 */
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

/**
 * REQUEST PARSING
 * This is the critical fix for "Blank Fields".
 * It allows Express to read req.body from your React Frontend.
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * API HEALTH CHECK
 * Useful for monitoring and breaking the 404 loop on restarts.
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AcademyOS API Node is Active",
    version: "1.0.0",
  });
});

/**
 * APPLICATION ROUTES
 */
app.use("/api/v1", routes);

/**
 * GLOBAL 404 HANDLER
 * This prevents the "404 Node Not Found" browser lockout.
 * It ensures the frontend always receives a JSON response it can handle.
 */
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Node Error: Endpoint [${req.method}] ${req.originalUrl} does not exist on this server.`,
  });
});

/**
 * GLOBAL ERROR HANDLER
 * Catch-all for 500 errors and Mongoose validation failures.
 */
app.use(errorHandler);

module.exports = app;
