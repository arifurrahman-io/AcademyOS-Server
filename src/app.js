const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(helmet());
app.use(morgan("dev"));

const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cache-Control",
    "Pragma",
    "Expires",
  ],
  exposedHeaders: ["Content-Length", "Content-Type"],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ✅ Express 5 এ '*' দিলে path-to-regexp error আসে, তাই /.*/
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AcademyOS API Node is Active",
    version: "1.0.0",
  });
});

app.use("/api/v1", routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Node Error: Endpoint [${req.method}] ${req.originalUrl} does not exist on this server.`,
  });
});

app.use(errorHandler);

module.exports = app;
