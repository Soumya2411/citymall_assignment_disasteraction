require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const logger = require('./utils/logger');
const rateLimit = require('express-rate-limit');

// Routes
const disasterRoutes = require('./routes/disasters');
const geocodeRoutes = require('./routes/geocode');
const socialMediaRoutes = require('./routes/socialMedia');
const resourcesRoutes = require('./routes/resources');
const updatesRoutes = require('./routes/officialUpdates');
const verificationRoutes = require('./routes/verification');
const reportRoutes = require('./routes/reports');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Global rate limiter
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/disasters', disasterRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/disasters', socialMediaRoutes);
app.use('/api/disasters', resourcesRoutes); // disaster-specific resource routes
app.use('/api/resources', resourcesRoutes); // independent resource routes
app.use('/api/disasters', updatesRoutes);
app.use('/api/disasters', verificationRoutes);
app.use('/api/reports', reportRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
