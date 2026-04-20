const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const authRoutes = require('./routes/auth.routes');
const formationRoutes = require('./routes/formation.routes');

app.use('/api/auth', authRoutes);
app.use('/api/formations', formationRoutes);
app.use('/api/etudiant', require('./routes/etudiant.routes'));
app.use('/api/formateur', require('./routes/formateur.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
