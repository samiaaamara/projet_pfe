const express = require('express');
const router = express.Router();
const db = require('../db');

// GET questions for a formation (formateur view)
router.get('/formation/:formationId', (req, res) => {
  db.query(
    `SELECT q.*, u.nom AS etudiant_nom
     FROM questions q
     JOIN users u ON q.etudiant_id = u.id
     WHERE q.formation_id = ?
     ORDER BY q.date_question DESC`,
    [req.params.formationId],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    }
  );
});

// GET questions by a student
router.get('/mes-questions/:userId', (req, res) => {
  db.query(
    `SELECT q.*, f.titre AS formation_titre
     FROM questions q
     JOIN formations f ON q.formation_id = f.id
     WHERE q.etudiant_id = ?
     ORDER BY q.date_question DESC`,
    [req.params.userId],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    }
  );
});

// POST ask a question
router.post('/', (req, res) => {
  const { formation_id, etudiant_id, question } = req.body;
  if (!formation_id || !etudiant_id || !question?.trim()) {
    return res.status(400).json({ error: 'Données manquantes' });
  }
  db.query(
    'INSERT INTO questions (formation_id, etudiant_id, question) VALUES (?, ?, ?)',
    [formation_id, etudiant_id, question.trim()],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId, message: 'Question posée ✅' });
    }
  );
});

// PUT answer a question
router.put('/:id/reponse', (req, res) => {
  const { reponse } = req.body;
  if (!reponse?.trim()) return res.status(400).json({ error: 'Réponse manquante' });
  db.query(
    'UPDATE questions SET reponse = ?, date_reponse = NOW() WHERE id = ?',
    [reponse.trim(), req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Question non trouvée' });
      res.json({ message: 'Réponse ajoutée ✅' });
    }
  );
});

// DELETE a question
router.delete('/:id', (req, res) => {
  db.query('DELETE FROM questions WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Question supprimée' });
  });
});

module.exports = router;