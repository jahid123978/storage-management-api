const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const storageRoutes = require('./routes/storageRoutes');
const itemRoutes = require('./routes/itemRoutes');
const folderRoutes = require('./routes/folderRoutes');

// Connect to DB
connectDB();

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/storage', storageRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/folders', folderRoutes);

// Health Check
app.get('/api/v1/health', (req, res) => res.status(200).json({ status: 'success', data: { uptime: process.uptime(), timestamp: new Date().toISOString() } }));

// Error Handler
app.use(errorHandler);

module.exports = app;