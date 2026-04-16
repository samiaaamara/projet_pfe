const express = require('express');
const router = express.Router();
const db = require('../db');

// Tous les utilisateurs
router.get('/users', (req, res) => {
  db.query('SELECT id, nom, email, role FROM users', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Étudiants
router.get('/etudiants', (req, res) => {
  const sql = `
    SELECT u.nom, u.email, e.progression
    FROM etudiants e
    JOIN users u ON e.user_id = u.id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Formateurs
router.get('/formateurs', (req, res) => {
  const sql = `
    SELECT u.nom, u.email, f.specialite
    FROM formateurs f
    JOIN users u ON f.user_id = u.id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Formations
router.get('/formations', (req, res) => {
  const sql = `
    SELECT f.titre, f.description, u.nom AS formateur
    FROM formations f
    JOIN formateurs fo ON f.formateur_id = fo.id
    JOIN users u ON fo.user_id = u.id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

module.exports = router;

// ➕ Ajouter formation
router.post('/formations', (req, res) => {
  const { titre, description, date_debut, formateur_id, specialite } = req.body;

  const sql = `
    INSERT INTO formations (titre, description, date_debut, formateur_id, specialite)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [titre, description, date_debut, formateur_id, specialite], (err) => {
    if (err) return res.status(500).json(err);

    res.json({ message: 'Formation ajoutée avec succès ✅' });
  });
});

// ✏️ Modifier formation
router.put('/formations/:id', (req, res) => {
  const { id } = req.params;
  const { titre, description, date_debut } = req.body;

  const sql = `
    UPDATE formations
    SET titre = ?, description = ?, date_debut = ?
    WHERE id = ?
  `;

  db.query(sql, [titre, description, date_debut, id], (err) => {
    if (err) return res.status(500).json(err);

    res.json({ message: 'Formation modifiée ✅' });
  });
});

// ❌ Supprimer formation
router.delete('/formations/:id', (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM formations WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json(err);

    res.json({ message: 'Formation supprimée ❌' });
  });
});
// 📊 Stats
router.get('/stats', (req, res) => {
  const stats = {};

  db.query('SELECT COUNT(*) AS total FROM etudiants', (err, e) => {
    stats.etudiants = e[0].total;

    db.query('SELECT COUNT(*) AS total FROM formateurs', (err, f) => {
      stats.formateurs = f[0].total;

      db.query('SELECT COUNT(*) AS total FROM formations', (err, fo) => {
        stats.formations = fo[0].total;

        db.query('SELECT COUNT(*) AS total FROM inscriptions', (err, i) => {
          stats.inscriptions = i[0].total;

          res.json(stats);
        });
      });
    });
  });
});