const express = require('express');
const router = express.Router();
const db = require('../db');
const validate = require('../middleware/validate');
const { messageSchema } = require('../validators/schemas');

router.get('/contacts/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const [userRows] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!userRows.length) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const role = userRows[0].role;
    let sql, params;

    if (role === 'candidat') {
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
        WHERE i.candidat_id = (SELECT id FROM candidats WHERE user_id = ?)
 `;
      params = [userId, userId, userId, userId];
    } else if (role === 'formateur') {
      sql = `
        SELECT DISTINCT u.id, u.nom,
          CASE WHEN u.role = 'candidat' THEN 'etudiant' ELSE u.role END AS role,
          (SELECT contenu FROM messages
           WHERE (expediteur_id = u.id AND destinataire_id = ?)
              OR (expediteur_id = ? AND destinataire_id = u.id)
           ORDER BY date_envoi DESC LIMIT 1) AS dernier_message,
          (SELECT COUNT(*) FROM messages
           WHERE expediteur_id = u.id AND destinataire_id = ? AND lu = 0) AS non_lus
        FROM users u
        WHERE u.id IN (
          SELECT c.user_id FROM inscriptions i
          JOIN formations f ON i.formation_id = f.id
          JOIN candidats c ON i.candidat_id = c.id
          WHERE f.formateur_id = (SELECT id FROM formateurs WHERE user_id = ?)
          UNION
          SELECT ex.user_id FROM inscriptions_externes ie
          JOIN formations f ON ie.formation_id = f.id
          JOIN externes ex ON ie.externe_id = ex.id
          WHERE f.formateur_id = (SELECT id FROM formateurs WHERE user_id = ?)
          AND ie.statut_paiement = 'payé'
          UNION
          SELECT id FROM users WHERE role = 'admin'
        )
 `;
      params = [userId, userId, userId, userId, userId];
    } else if (role === 'admin') {
      sql = `
        SELECT DISTINCT u.id, u.nom, u.role,
          (SELECT contenu FROM messages
           WHERE (expediteur_id = u.id AND destinataire_id = ?)
              OR (expediteur_id = ? AND destinataire_id = u.id)
           ORDER BY date_envoi DESC LIMIT 1) AS dernier_message,
          (SELECT COUNT(*) FROM messages
           WHERE expediteur_id = u.id AND destinataire_id = ? AND lu = 0) AS non_lus
        FROM formateurs fo
        JOIN users u ON fo.user_id = u.id
 `;
      params = [userId, userId, userId];
    } else if (role === 'externe') {
      sql = `
        SELECT DISTINCT u.id, u.nom, u.role,
          (SELECT contenu FROM messages
           WHERE (expediteur_id = u.id AND destinataire_id = ?)
              OR (expediteur_id = ? AND destinataire_id = u.id)
           ORDER BY date_envoi DESC LIMIT 1) AS dernier_message,
          (SELECT COUNT(*) FROM messages
           WHERE expediteur_id = u.id AND destinataire_id = ? AND lu = 0) AS non_lus
        FROM inscriptions_externes ie
        JOIN formations f ON ie.formation_id = f.id
        JOIN formateurs fo ON f.formateur_id = fo.id
        JOIN users u ON fo.user_id = u.id
        WHERE ie.externe_id = (SELECT id FROM externes WHERE user_id = ?)
        AND ie.statut_paiement = 'payé'
 `;
      params = [userId, userId, userId, userId];
    } else {
      return res.json([]);
    }

    const [contacts] = await db.query(sql, params);
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conversation/:userId/:otherId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const otherId = parseInt(req.params.otherId);
  try {
    db.query(
 'UPDATE messages SET lu = 1 WHERE expediteur_id = ? AND destinataire_id = ? AND lu = 0',
      [otherId, userId]
    ).catch(() => {});

    const [results] = await db.query(
 `SELECT m.id, m.contenu, m.date_envoi, m.expediteur_id, m.lu, u.nom AS expediteur_nom
       FROM messages m
       JOIN users u ON m.expediteur_id = u.id
       WHERE (m.expediteur_id = ? AND m.destinataire_id = ?)
          OR (m.expediteur_id = ? AND m.destinataire_id = ?)
       ORDER BY m.date_envoi ASC`,
      [userId, otherId, otherId, userId]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send', validate(messageSchema), async (req, res) => {
  const { expediteur_id, destinataire_id, contenu } = req.body;
  try {
    const [result] = await db.query(
 'INSERT INTO messages (expediteur_id, destinataire_id, contenu) VALUES (?, ?, ?)',
      [expediteur_id, destinataire_id, contenu.trim()]
    );
    res.json({ id: result.insertId, message: 'Message envoyé ️' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unread-count/:userId', async (req, res) => {
  try {
    const [results] = await db.query(
 'SELECT COUNT(*) AS count FROM messages WHERE destinataire_id = ? AND lu = 0',
      [parseInt(req.params.userId)]
    );
    res.json({ count: results[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
