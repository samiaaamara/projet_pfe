const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/unread-count/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  db.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND lu = 0',
    [userId],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json({ count: results[0].count });
    }
  );
});

router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  db.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY date_creation DESC LIMIT 50',
    [userId],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    }
  );
});

router.put('/lire-tout/:userId', (req, res) => {
  db.query('UPDATE notifications SET lu = 1 WHERE user_id = ?', [req.params.userId], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  });
});

router.put('/:id/lire', (req, res) => {
  db.query('UPDATE notifications SET lu = 1 WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Notification lue' });
  });
});

router.delete('/:id', (req, res) => {
  db.query('DELETE FROM notifications WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Notification supprimée' });
  });
});

module.exports = router;