const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/unread-count/:userId', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND lu = 0',
      [parseInt(req.params.userId)]
    );
    res.json({ count: results[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY date_creation DESC LIMIT 50',
      [parseInt(req.params.userId)]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/lire-tout/:userId', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET lu = 1 WHERE user_id = ?', [req.params.userId]);
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/lire', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET lu = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification lue' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
