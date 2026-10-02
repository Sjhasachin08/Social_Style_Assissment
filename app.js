// app.js
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();

const questionRoutes = require('./routes/questionRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

function createApp() {
  const app = express();

  app.use(cors({ credentials: true, origin: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/questions', questionRoutes);
  app.use('/api/assessments', assessmentRoutes);

  // View routes (simple static HTML pages — auth/role gating happens
  // client-side via /api/auth/me, since these are plain static files)
  const views = path.join(__dirname, 'views');
  app.get('/', (req, res) => res.sendFile(path.join(views, 'index.html')));
  // Admin-only login — regular participants never see or need this.
  app.get('/login', (req, res) => res.sendFile(path.join(views, 'login.html')));
  // Public self-signup has been removed; redirect any old links to login.
  app.get('/signup', (req, res) => res.redirect('/login'));
  app.get('/assessment', (req, res) => res.sendFile(path.join(views, 'assessment.html')));
  app.get('/result/:id', (req, res) => res.sendFile(path.join(views, 'result.html')));
  app.get('/history', (req, res) => res.sendFile(path.join(views, 'history.html')));
  app.get('/admin/users', (req, res) => res.sendFile(path.join(views, 'admin-users.html')));

  // The old "enter your name/email" step is replaced by real accounts —
  // keep the old link working by sending it straight to the assessment.
  app.get('/participant', (req, res) => res.redirect('/assessment'));

  // 404 for unknown API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API route not found.' });
  });

  // Centralized error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error.'
    });
  });

  return app;
}

module.exports = createApp;
