const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// LOGIN
router.post('/login', (req, res) => {
  const { email, mot_de_passe } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const user = results[0];

    const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!valid) return res.status(401).json({ message: 'Identifiants incorrects' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const baseUser = { id: user.id, nom: user.nom, email: user.email, role: user.role };

    if (user.role === 'etudiant') {
      db.query('SELECT id FROM etudiants WHERE user_id = ?', [user.id], (err2, rows) => {
        if (err2) return res.status(500).json(err2);
        res.json({ token, user: { ...baseUser, etudiantId: rows[0]?.id || null } });
      });
    } else if (user.role === 'formateur') {
      db.query('SELECT id FROM formateurs WHERE user_id = ?', [user.id], (err2, rows) => {
        if (err2) return res.status(500).json(err2);
        res.json({ token, user: { ...baseUser, formateurId: rows[0]?.id || null } });
      });
    } else {
      res.json({ token, user: baseUser });
    }
  });
});


router.post('/register', async (req, res) => {
  const { nom, email, mot_de_passe, role, specialite, departement, niveau, cin } = req.body;

  try {
    // =========================
    // 🔍 Vérification champs
    // =========================
    if (!nom || !email || !mot_de_passe || !role) {
      return res.status(400).json({ message: "Champs manquants ❌" });
    }

    // =========================
    // 🔍 Email déjà utilisé
    // =========================
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, users) => {
      if (err) return res.status(500).send(err);

      if (users.length > 0) {
        return res.status(400).json({ message: "Email déjà utilisé ❌" });
      }

      // =========================
      // 🔐 Hash password
      // =========================
      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

      // =========================
      // 👤 Création USER
      // =========================
      db.query(
        'INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
        [nom, email, hashedPassword, role],
        (err2, result) => {
          if (err2) return res.status(500).send(err2);

          const userId = result.insertId;

          // =========================
          // 🎓 ETUDIANT
          // =========================
          if (role === 'etudiant') {

            if (!cin) {
              return res.status(400).json({ message: "CIN obligatoire ❌" });
            }

            // vérifier CIN
            db.query('SELECT * FROM etudiants WHERE cin = ?', [cin], (err3, resultCin) => {
              if (err3) return res.status(500).send(err3);

              if (resultCin.length > 0) {
                return res.status(400).json({ message: "CIN déjà utilisé ❌" });
              }

              db.query(
                `INSERT INTO etudiants 
                 (user_id, progression, departement, niveau, specialite, cin)
                 VALUES (?, 0, ?, ?, ?, ?)`,
                [userId, departement, niveau, specialite, cin],
                (err4) => {
                  if (err4) return res.status(500).send(err4);

                  return res.json({ message: "Étudiant créé avec succès 🎓" });
                }
              );
            });

          }

          // =========================
          // 👨‍🏫 FORMATEUR
          // =========================
          else if (role === 'formateur') {

            db.query(
              'INSERT INTO formateurs (user_id, specialite) VALUES (?, ?)',
              [userId, specialite || null],
              (err5) => {
                if (err5) return res.status(500).send(err5);

                return res.json({ message: "Formateur créé avec succès 👨‍🏫" });
              }
            );

          }

          // =========================
          // ⚙ ADMIN
          // =========================
          else if (role === 'admin') {

            db.query(
              'INSERT INTO admins (user_id) VALUES (?)',
              [userId],
              (err6) => {
                if (err6) return res.status(500).send(err6);

                return res.json({ message: "Admin créé avec succès ⚙️" });
              }
            );
          }
        }
      );
    });

  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Déconnexion réussie' });
});
module.exports = router;
