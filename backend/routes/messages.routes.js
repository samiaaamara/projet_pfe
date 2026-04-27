const express = require('express');
const router = express.Router();
const db = require('../db');

// GET contacts with last message preview and unread count
router.get('/contacts/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);

  db.query('SELECT role FROM users WHERE id = ?', [userId], (err, result) => {
    if (err || !result.length) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const role = result[0].role;
    let sql, params;

    if (role === 'etudiant') {
      sql = `
        SELECT DISTINCT u.id, u.nom, u.role,
          (SELECT contenu FROM messages
           WHERE (expediteur_id = u.id AND destinataire_id = ?)
              OR (expediteur_id = ? AND destinataire_id = u.id)
           ORDER BY date_envoi DESC LIMIT 1) AS dernier_message,
          (SELECT COUNT(*) FROM messages
           WHERE expediteur_id = u.id AND destinataire_id = ? AND lu = 0) AS non_lus
        FROM inscriptions i
        JOIN formations f ON i.formation_id = f.id
        JOIN formateurs fo ON f.formateur_id = fo.id
        JOIN users u ON fo.user_id = u.id
        WHERE i.etudiant_id = (SELECT id FROM etudiants WHERE user_id = ?)
      `;
      params = [userId, userId, userId, userId];
    } else if (role === 'formateur') {
      sql = `
        SELECT DISTINCT u.id, u.nom, u.role,
          (SELECT contenu FROM messages
           WHERE (expediteur_id = u.id AND destinataire_id = ?)
              OR (expediteur_id = ? AND destinataire_id = u.id)
           ORDER BY date_envoi DESC LIMIT 1) AS dernier_message,
          (SELECT COUNT(*) FROM messages
           WHERE expediteur_id = u.id AND destinataire_id = ? AND lu = 0) AS non_lus
        FROM formations f
        JOIN inscriptions i ON i.formation_id = f.id
        JOIN etudiants e ON i.etudiant_id = e.id
        JOIN users u ON e.user_id = u.id
        WHERE f.formateur_id = (SELECT id FROM formateurs WHERE user_id = ?)
      `;
      params = [userId, userId, userId, userId];
    } else {
      return res.json([]);
    }

    db.query(sql, params, (err2, contacts) => {
      if (err2) return res.status(500).json(err2);
      res.json(contacts);
    });
  });
});

// GET conversation between two users (auto-marks as read)
router.get('/conversation/:userId/:otherId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const otherId = parseInt(req.params.otherId);

  db.query(
    'UPDATE messages SET lu = 1 WHERE expediteur_id = ? AND destinataire_id = ? AND lu = 0',
    [otherId, userId],
    () => {}
  );

  db.query(
    `SELECT m.id, m.contenu, m.date_envoi, m.expediteur_id, m.lu, u.nom AS expediteur_nom
     FROM messages m
     JOIN users u ON m.expediteur_id = u.id
     WHERE (m.expediteur_id = ? AND m.destinataire_id = ?)
        OR (m.expediteur_id = ? AND m.destinataire_id = ?)
     ORDER BY m.date_envoi ASC`,
    [userId, otherId, otherId, userId],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    }
  );
});

// POST send a message
router.post('/send', (req, res) => {
  const { expediteur_id, destinataire_id, contenu } = req.body;
  if (!expediteur_id || !destinataire_id || !contenu?.trim()) {
    return res.status(400).json({ error: 'Données manquantes' });
  }
  db.query(
    'INSERT INTO messages (expediteur_id, destinataire_id, contenu) VALUES (?, ?, ?)',
    [expediteur_id, destinataire_id, contenu.trim()],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId, message: 'Message envoyé ✉️' });
    }
  );
});

// GET unread messages count
router.get('/unread-count/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  db.query(
    'SELECT COUNT(*) AS count FROM messages WHERE destinataire_id = ? AND lu = 0',
    [userId],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json({ count: results[0].count });
    }
  );
});

module.exports = router;

