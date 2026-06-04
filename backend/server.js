const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./db');
(async () => {
  try {
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_profil VARCHAR(255) DEFAULT NULL');
    await db.query('ALTER TABLE formations ADD COLUMN IF NOT EXISTS date_publication DATETIME DEFAULT NULL');
    await db.query(`UPDATE formations SET date_publication = COALESCE(date_debut, NOW()) WHERE date_publication IS NULL AND status IN ('published','en_cours','terminée','archivée')`);

    // Quiz tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS quiz (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        formation_id   INT NOT NULL UNIQUE,
        titre          VARCHAR(200) NOT NULL DEFAULT 'Quiz de validation',
        seuil_reussite INT NOT NULL DEFAULT 70,
        nb_tentatives  INT NOT NULL DEFAULT 3,
        FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
      )
 `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS questions_quiz (
        id       INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id  INT NOT NULL,
        question TEXT NOT NULL,
        ordre    INT DEFAULT 0,
        FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE
      )
 `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS reponses_quiz (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        question_id  INT NOT NULL,
        reponse      TEXT NOT NULL,
        est_correcte BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (question_id) REFERENCES questions_quiz(id) ON DELETE CASCADE
      )
 `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS tentatives_quiz (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        candidat_id    INT DEFAULT NULL,
        externe_id     INT DEFAULT NULL,
        quiz_id        INT NOT NULL,
        score          INT NOT NULL,
        reussi         BOOLEAN NOT NULL DEFAULT FALSE,
        date_tentative DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE
      )
 `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        email      VARCHAR(255) NOT NULL,
        token      VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        INDEX idx_token (token),
        INDEX idx_email (email)
      )
 `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS seance_modules (
        seance_id INT NOT NULL,
        module_id INT NOT NULL,
        PRIMARY KEY (seance_id, module_id),
        FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules_formation(id) ON DELETE CASCADE
      )
    `);
  } catch (err) {
    console.error('Erreur init DB:', err.message);
  }
})();

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
app.use('/api/candidat', require('./routes/candidat.routes'));
app.use('/api/formateur', require('./routes/formateur.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/messages', require('./routes/messages.routes'));
app.use('/api/externe', require('./routes/externe.routes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));
