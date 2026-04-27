const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Trop de tentatives. Réessayez dans 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/formations', require('./routes/formation.routes'));
app.use('/api/etudiant', require('./routes/etudiant.routes'));
app.use('/api/formateur', require('./routes/formateur.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/messages', require('./routes/messages.routes'));
app.use('/api/questions', require('./routes/questions.routes'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));
