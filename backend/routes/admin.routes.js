const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { verifyAdmin } = require('../middleware/auth.middleware');
const allowedStatuses = ['draft', 'published', 'accepted'];
const isValidDate = (value) => {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
};

const validateFormationPayload = ({ titre, date_debut, date_fin, duree, niveau, departement, nb_places, formateur_id, status }) => {
  if (!titre || typeof titre !== 'string' || titre.trim().length === 0) {
    return 'Le titre est obligatoire.';
  }

  if (!date_debut || !isValidDate(date_debut)) {
    return 'La date de début est invalide.';
  }

  if (date_fin && !isValidDate(date_fin)) {
    return 'La date de fin est invalide.';
  }

  if (date_fin && new Date(date_fin) < new Date(date_debut)) {
    return 'La date de fin doit être postérieure ou égale à la date de début.';
  }

  if (!duree || Number(duree) <= 0) {
    return 'La durée doit être un nombre positif.';
  }

  if (!nb_places || Number(nb_places) <= 0) {
    return 'Le nombre de places doit être un nombre positif.';
  }

 if (!specialite || typeof specialite !== 'string' || specialite.trim().length === 0) {
    return 'Le spécialité est obligatoire.';
  }

  if (!formateur_id || Number(formateur_id) <= 0) {
    return 'Le formateur est obligatoire.';
  }

  if (status && !allowedStatuses.includes(status)) {
    return 'Le statut est invalide.';
  }

  return null;
};

router.use(verifyAdmin);

/* =========================
   👥 USERS
========================= */
router.get('/users', (req, res) => {
  const sql = `
    SELECT
      u.id, u.nom, u.email, u.role,
      COALESCE(e.specialite, f.specialite, ex.specialite) AS specialite
    FROM users u
    LEFT JOIN etudiants e  ON u.role = 'etudiant'  AND e.user_id = u.id
    LEFT JOIN formateurs f ON u.role = 'formateur' AND f.user_id = u.id
    LEFT JOIN externes ex  ON u.role = 'externe'   AND ex.user_id = u.id
    ORDER BY u.id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

/* =========================
   📚 FORMATIONS (ADMIN VIEW)
========================= */
router.get('/formations', (req, res) => {

  const sql = `
    SELECT 
      f.id,
      f.titre,
      f.description,
      f.date_debut,
      f.date_fin,
      f.duree,
      f.specialite,
      f.nb_places,
      f.status,
      f.formateur_id,
      u.nom AS formateur
    FROM formations f
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    ORDER BY f.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

/* =========================
   ➕ CREATE FORMATION
========================= */
router.post('/formations', (req, res) => {
  const payload = req.body;
  const validationError = validateFormationPayload(payload);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const {
    titre,
    description,
    date_debut,
    date_fin,
    duree,
    specialite,
    nb_places,
    formateur_id
  } = payload;

  db.query('SELECT id FROM formateurs WHERE id = ?', [formateur_id], (err, formateurs) => {
    if (err) return res.status(500).json({ error: err });
    if (formateurs.length === 0) {
      return res.status(400).json({ message: 'Formateur introuvable.' });
    }

    const sql = `
      INSERT INTO formations 
      (titre, description, date_debut, date_fin, duree,.specialite, nb_places, formateur_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `;

    db.query(sql,
      [titre, description, date_debut, date_fin, duree, specialite, nb_places, formateur_id],
      (insertErr, result) => {
        if (insertErr) return res.status(500).json({ error: insertErr });
        res.json({
          message: 'Formation créée (draft) ✅',
          id: result.insertId
        });
      }
    );
  });
});

/* =========================
   ✏️ UPDATE FORMATION
========================= */
router.put('/formations/:id', (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const validationError = validateFormationPayload(payload);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const {
    titre,
    description,
    date_debut,
    date_fin,
    duree,
   specialite,
    nb_places,
    formateur_id,
    status
  } = payload;

  db.query('SELECT id FROM formateurs WHERE id = ?', [formateur_id], (err, formateurs) => {
    if (err) return res.status(500).json({ error: err });
    if (formateurs.length === 0) {
      return res.status(400).json({ message: 'Formateur introuvable.' });
    }

    const sql = `
      UPDATE formations
      SET 
        titre=?,
        description=?,
        date_debut=?,
        date_fin=?,
        duree=?,
        specialite=?,
        nb_places=?,
        formateur_id=?,
        status=?
      WHERE id=?
    `;

    db.query(sql,
      [
        titre,
        description,
        date_debut,
        date_fin,
        duree,
        specialite,
        nb_places,
        formateur_id,
        status,
        id
      ],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr });
        res.json({ message: 'Formation modifiée ✅' });
      }
    );
  });
});

/* =========================
   🚀 PUBLISH FORMATION
========================= */
router.put('/formations/:id/publish', (req, res) => {

  db.query(
    "UPDATE formations SET status='published' WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Formation publiée 🚀' });
    }
  );
});

/* =========================
   ❌ DELETE FORMATION
========================= */
router.delete('/formations/:id', (req, res) => {

  db.query(
    'DELETE FROM formations WHERE id=?',
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Formation supprimée ❌' });
    }
  );
});

/* =========================
   👨‍🏫 FORMATEURS
========================= */
router.get('/formateurs', (req, res) => {

  const sql = `
    SELECT 
      f.id,
      u.nom,
      u.email,
      f.specialite
    FROM formateurs f
    JOIN users u ON f.user_id = u.id
    ORDER BY u.nom ASC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

/* =========================
   ➕ CREATE FORMATEUR
========================= */
router.post('/formateurs', async (req, res) => {
  const { nom, email, mot_de_passe, specialite } = req.body;

  if (!nom || !email || !mot_de_passe) {
    return res.status(400).json({ message: 'Nom, email et mot de passe sont obligatoires.' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, users) => {
    if (err) return res.status(500).json({ error: err });
    if (users.length > 0) {
      return res.status(400).json({ message: 'Email déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    db.query(
      'INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
      [nom, email, hashedPassword, 'formateur'],
      (insertErr, result) => {
        if (insertErr) return res.status(500).json({ error: insertErr });

        const userId = result.insertId;
        db.query(
          'INSERT INTO formateurs (user_id, specialite) VALUES (?, ?)',
          [userId, specialite || null],
          (formateurErr) => {
            if (formateurErr) return res.status(500).json({ error: formateurErr });
            res.status(201).json({ message: 'Formateur créé avec succès.' });
          }
        );
      }
    );
  });
});

/* =========================
   ✏️ UPDATE FORMATEUR
========================= */
router.put('/formateurs/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, email, mot_de_passe, specialite } = req.body;

  if (!nom || !email) {
    return res.status(400).json({ message: 'Nom et email sont obligatoires.' });
  }

  db.query('SELECT user_id FROM formateurs WHERE id = ?', [id], async (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) {
      return res.status(404).json({ message: 'Formateur introuvable.' });
    }

    const userId = results[0].user_id;

    db.query('SELECT * FROM users WHERE email = ? AND id <> ?', [email, userId], (emailErr, existing) => {
      if (emailErr) return res.status(500).json({ error: emailErr });
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Email déjà utilisé par un autre compte.' });
      }

      const updateFormateurUser = (hashedPassword) => {
        const userSql = mot_de_passe
          ? 'UPDATE users SET nom = ?, email = ?, mot_de_passe = ? WHERE id = ?'
          : 'UPDATE users SET nom = ?, email = ? WHERE id = ?';
        const params = mot_de_passe
          ? [nom, email, hashedPassword, userId]
          : [nom, email, userId];

        db.query(userSql, params, (userErr) => {
          if (userErr) return res.status(500).json({ error: userErr });

          db.query(
            'UPDATE formateurs SET specialite = ? WHERE id = ?',
            [specialite || null, id],
            (formateurErr) => {
              if (formateurErr) return res.status(500).json({ error: formateurErr });
              res.json({ message: 'Formateur mis à jour avec succès.' });
            }
          );
        });
      };

      if (mot_de_passe) {
        bcrypt.hash(mot_de_passe, 10, (hashErr, hashedPassword) => {
          if (hashErr) return res.status(500).json({ error: hashErr });
          updateFormateurUser(hashedPassword);
        });
      } else {
        updateFormateurUser(null);
      }
    });
  });
});

/* =========================
   ❌ DELETE FORMATEUR
========================= */
router.delete('/formateurs/:id', (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM formations WHERE formateur_id = ?', [id], (err, formations) => {
    if (err) return res.status(500).json({ error: err });
    if (formations.length > 0) {
      return res.status(400).json({ message: 'Impossible de supprimer un formateur lié à des formations.' });
    }

    db.query('SELECT user_id FROM formateurs WHERE id = ?', [id], (formateurErr, results) => {
      if (formateurErr) return res.status(500).json({ error: formateurErr });
      if (results.length === 0) {
        return res.status(404).json({ message: 'Formateur introuvable.' });
      }

      const userId = results[0].user_id;

      db.query('DELETE FROM formateurs WHERE id = ?', [id], (deleteFormateurErr) => {
        if (deleteFormateurErr) return res.status(500).json({ error: deleteFormateurErr });

        db.query('DELETE FROM users WHERE id = ?', [userId], (deleteUserErr) => {
          if (deleteUserErr) return res.status(500).json({ error: deleteUserErr });
          res.json({ message: 'Formateur supprimé avec succès.' });
        });
      });
    });
  });
});

/* =========================
   📊 STATS
========================= */
router.get('/stats', (req, res) => {

  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role='etudiant') AS etudiants,
      (SELECT COUNT(*) FROM formateurs) AS formateurs,
      (SELECT COUNT(*) FROM formations) AS formations,
      (SELECT COUNT(*) FROM formations WHERE status='published') AS published
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results[0]);
  });
});

/* =========================
   🔔 FORMATIONS EN ATTENTE D'APPROBATION
========================= */
router.get('/formations-pending', (req, res) => {
  const sql = `
    SELECT 
      f.id,
      f.titre,
      f.description,
      f.date_debut,
      f.date_fin,
      f.duree,
      f.specialite,
      f.nb_places,
      f.status,
      f.formateur_id,
      u.nom AS formateur,
      u.email AS formateur_email
    FROM formations f
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    WHERE f.status = 'pending_approval'
    ORDER BY f.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

/* ✅ ACCEPTER (pending_approval → accepted) */
router.put('/formations/:id/accept', (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });

  db.query(
    "UPDATE formations SET status = 'accepted' WHERE id = ? AND status = 'pending_approval'",
    [formationId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation introuvable ou déjà traitée' });

      res.json({ message: 'Formation acceptée ✅' });

      db.query(
        `SELECT f.titre, u.id AS formateur_user_id
         FROM formations f
         JOIN formateurs fo ON f.formateur_id = fo.id
         JOIN users u ON fo.user_id = u.id
         WHERE f.id = ?`,
        [formationId],
        (ne, nr) => {
          if (!ne && nr.length > 0) {
            db.query(
              'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
              [nr[0].formateur_user_id, `✅ Votre formation « ${nr[0].titre} » a été acceptée par l'administrateur. Elle sera publiée prochainement.`, 'approbation'],
              () => {}
            );
          }
        }
      );
    }
  );
});

/* 🚀 PUBLIER (accepted → published) */
router.put('/formations/:id/publish-accepted', (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });

  db.query(
    "UPDATE formations SET status = 'published' WHERE id = ? AND status = 'accepted'",
    [formationId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation introuvable ou non encore acceptée' });

      res.json({ message: 'Formation publiée dans le catalogue 🚀' });

      db.query(
        `SELECT f.titre, u.id AS formateur_user_id
         FROM formations f
         JOIN formateurs fo ON f.formateur_id = fo.id
         JOIN users u ON fo.user_id = u.id
         WHERE f.id = ?`,
        [formationId],
        (ne, nr) => {
          if (!ne && nr.length > 0) {
            db.query(
              'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
              [nr[0].formateur_user_id, `🚀 Votre formation « ${nr[0].titre} » est maintenant publiée dans le catalogue !`, 'publication'],
              () => {}
            );
          }
        }
      );
    }
  );
});

/* 📋 FORMATIONS ACCEPTÉES */
router.get('/formations-accepted', (req, res) => {
  const sql = `
    SELECT
      f.id, f.titre, f.description, f.date_debut, f.date_fin,
      f.duree, f.specialite, f.nb_places, f.status, f.formateur_id,
      u.nom AS formateur, u.email AS formateur_email
    FROM formations f
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    WHERE f.status = 'accepted'
    ORDER BY f.id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});
   
    // Notifier le formateur
    db.query(
      `SELECT f.titre, u.id AS formateur_user_id
       FROM formations f
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN users u ON fo.user_id = u.id
       WHERE f.id = ?`,
      [formationId],
      (ne, nr) => {
        if (!ne && nr.length > 0) {
          db.query(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [nr[0].formateur_user_id, `❌ Votre formation « ${nr[0].titre} » a été rejetée. Raison : ${reason || 'Non spécifiée'}`, 'rejet'],
            () => {}
          );
        }
      }
    );

/* =========================
   ❌ REJETER UNE FORMATION
========================= */
router.put('/formations/:id/reject', (req, res) => {
  const formationId = parseInt(req.params.id);
  const { reason } = req.body;

  if (isNaN(formationId)) {
    return res.status(400).json({ error: 'Formation ID invalide' });
  }

  const sql = `
    UPDATE formations
    SET status = 'draft'
    WHERE id = ? AND status = 'pending_approval'
  `;

  db.query(sql, [formationId], (err, result) => {
    if (err) {
      console.error('Erreur SQL /formations/:id/reject:', err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Formation non trouvée ou déjà approuvée' });
    }
   res.json({ message: `Formation rejetée et remise en draft 🔙 Raison: ${reason || 'Non spécifiée'}` });

    // Notifier le formateur
    db.query(
      `SELECT f.titre, u.id AS formateur_user_id
       FROM formations f
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN users u ON fo.user_id = u.id
       WHERE f.id = ?`,
      [formationId],
      (ne, nr) => {
        if (!ne && nr.length > 0) {
          db.query(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [nr[0].formateur_user_id, `❌ Votre formation « ${nr[0].titre} » a été rejetée. Raison : ${reason || 'Non spécifiée'}`, 'rejet'],
            () => {}
          );
        }
      }
    );
  });
});

module.exports = router;