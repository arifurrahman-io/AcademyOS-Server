const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes');

const app = express();

// Global Middlewares
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for Vite frontend and future Android app
app.use(morgan('dev')); // Logging
app.use(express.json()); // Body parser
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/v1', routes);

// Global Error Handler (Must be last)
app.use(errorHandler);

module.exports = app;