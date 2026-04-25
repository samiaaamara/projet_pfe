const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|ppt|pptx|png|jpg|jpeg|mp4|zip/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    allowed.test(ext) ? cb(null, true) : cb(new Error('Type de fichier non autorisé'));
  }
});

// 🔹 Formations du formateur
router.get('/mes-formations/:formateurId', (req, res) => {
  const formateurId = parseInt(req.params.formateurId);
  if (isNaN(formateurId)) {
    return res.status(400).json({ error: 'Formateur ID invalide' });
  }

  const sql = 'SELECT * FROM formations WHERE formateur_id = ?';
  db.query(sql, [formateurId], (err, results) => {
    if (err) {
      console.error('Erreur SQL /mes-formations:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results); // renvoie un tableau même vide
  });
});

// 🔹 Profil formateur
router.get('/profil/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'User ID invalide' });
  }

  const sql = `
    SELECT f.id, f.specialite, f.user_id, u.nom, u.email, u.role
    FROM formateurs f
    JOIN users u ON f.user_id = u.id
    WHERE f.user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Erreur SQL /profil:', err);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      // Vérifier si l'utilisateur existe et a un rôle formateur
      db.query('SELECT id, role FROM users WHERE id = ?', [userId], (err2, userResults) => {
        if (err2 || userResults.length === 0) {
          return res.status(404).json({ error: 'Utilisateur non trouvé', userId });
        }
        const user = userResults[0];
        if (user.role !== 'formateur') {
          return res.status(403).json({ error: 'Utilisateur n\'est pas un formateur', role: user.role });
        }
        return res.status(404).json({ error: 'Profil formateur non trouvé mais rôle est formateur', userId });
      });
    } else {
      res.json(results[0]);
    }
  });
});

// 🔹 Support pédagogique d'une formation
router.get('/supports/:formationId', (req, res) => {
  const formationId = parseInt(req.params.formationId);
  if (isNaN(formationId)) {
    return res.status(400).json({ error: 'Formation ID invalide' });
  }

  const sql = 'SELECT * FROM supports WHERE formation_id = ?';
  db.query(sql, [formationId], (err, results) => {
    if (err) {
      console.error('Erreur SQL /supports:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 🔹 Étudiants inscrits à une formation
router.get('/inscriptions/:formationId', (req, res) => {
  const formationId = parseInt(req.params.formationId);
  if (isNaN(formationId)) {
    return res.status(400).json({ error: 'Formation ID invalide' });
  }

  const sql = `
    SELECT i.id, u.nom, u.email, i.date_inscription, i.statut
    FROM inscriptions i
    JOIN etudiants e ON i.etudiant_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE i.formation_id = ?
  `;

  db.query(sql, [formationId], (err, results) => {
    if (err) {
      console.error('Erreur SQL /inscriptions:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 🔹 Statistiques formateur
router.get('/stats/:formateurId', (req, res) => {
  const formateurId = parseInt(req.params.formateurId);
  if (isNaN(formateurId)) {
    return res.status(400).json({ error: 'Formateur ID invalide' });
  }

  const formationsSql = 'SELECT COUNT(*) AS totalFormations FROM formations WHERE formateur_id = ?';
  const etudiantsSql = `
    SELECT COUNT(*) AS totalEtudiants
    FROM inscriptions i
    JOIN formations f ON i.formation_id = f.id
    WHERE f.formateur_id = ?
  `;

  db.query(formationsSql, [formateurId], (err1, formationsResult) => {
    if (err1) {
      console.error('Erreur SQL /stats formations:', err1);
      return res.status(500).json({ error: err1.message });
    }
    db.query(etudiantsSql, [formateurId], (err2, etudiantsResult) => {
      if (err2) {
        console.error('Erreur SQL /stats étudiants:', err2);
        return res.status(500).json({ error: err2.message });
      }
      res.json({
        formations: formationsResult[0].totalFormations || 0,
        etudiants: etudiantsResult[0].totalEtudiants || 0
      });
    });
  });
});

// 🔹 Créer une formation
router.post('/creer-formation', (req, res) => {
  const { titre, description, date_debut, date_fin, duree, niveau, departement, nb_places, formateur_id } = req.body;

  if (!titre || !description || !date_debut || !formateur_id) {
    return res.status(400).json({ error: 'Tous les champs obligatoires sont requis' });
  }

  const sql = `
    INSERT INTO formations (titre, description, date_debut, date_fin, duree, niveau, departement, nb_places, formateur_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
  `;

  db.query(sql, [titre, description, date_debut, date_fin || null, duree || null, niveau || null, departement || null, nb_places || null, formateur_id], (err, results) => {
    if (err) {
      console.error('Erreur SQL /creer-formation:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Formation créée avec succès', id: results.insertId });
  });
});

// 🔹 Ajouter un support à une formation
router.post('/supports', upload.single('fichier'), (req, res) => {
  const { formation_id, type } = req.body;

  if (!formation_id || !type)
    return res.status(400).json({ error: 'formation_id et type sont obligatoires' });

  const fichier = req.file ? `/uploads/${req.file.filename}` : req.body.fichier;

  if (!fichier)
    return res.status(400).json({ error: 'Un fichier ou une URL est obligatoire' });

  db.query('INSERT INTO supports (formation_id, type, fichier) VALUES (?, ?, ?)',
    [formation_id, type, fichier], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Support ajouté ✅', id: results.insertId, fichier });
    });
});


// 🔹 Modifier une formation du formateur
router.put('/formations/:id', (req, res) => {
  const formationId = parseInt(req.params.id);
  const { titre, description, date_debut, date_fin, duree, niveau, departement, nb_places, formateur_id } = req.body;

  if (isNaN(formationId)) {
    return res.status(400).json({ error: 'Formation ID invalide' });
  }

  if (!titre || !description || !date_debut || !formateur_id) {
    return res.status(400).json({ error: 'Tous les champs obligatoires sont requis' });
  }

  const sql = `
    UPDATE formations
    SET titre = ?, description = ?, date_debut = ?, date_fin = ?, duree = ?, niveau = ?, departement = ?, nb_places = ?
    WHERE id = ? AND formateur_id = ?
  `;

  db.query(sql, [titre, description, date_debut, date_fin || null, duree || null, niveau || null, departement || null, nb_places || null, formationId, formateur_id], (err, result) => {
    if (err) {
      console.error('Erreur SQL /formations/:id PUT:', err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Formation non trouvée ou accès refusé' });
    }
    res.json({ message: 'Formation mise à jour ✅' });
  });
});

// 🔹 Soumettre une formation pour approbation (formateur)
router.put('/formations/:id/submit-for-approval', (req, res) => {
  const formationId = parseInt(req.params.id);
  const { formateur_id } = req.body;

  if (isNaN(formationId)) {
    return res.status(400).json({ error: 'Formation ID invalide' });
  }

  if (!formateur_id) {
    return res.status(400).json({ error: 'Formateur ID obligatoire' });
  }

  // Vérifier d'abord le statut actuel de la formation
  const checkSql = 'SELECT id, status, formateur_id, titre FROM formations WHERE id = ?';
  db.query(checkSql, [formationId], (checkErr, checkResult) => {
    if (checkErr) {
      console.error('Erreur vérification formation:', checkErr);
      return res.status(500).json({ error: checkErr.message });
    }

    if (checkResult.length === 0) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    const formation = checkResult[0];

    if (formation.formateur_id !== formateur_id) {
      return res.status(403).json({ error: 'Accès refusé - vous n\'êtes pas le formateur de cette formation' });
    }

    if (formation.status !== 'draft') {
      return res.status(400).json({ error: `Formation déjà ${formation.status}` });
    }

    const sql = `
      UPDATE formations
      SET status = 'pending_approval'
      WHERE id = ? AND formateur_id = ? AND status = 'draft'
    `;

    db.query(sql, [formationId, formateur_id], (err, result) => {
      if (err) {
        console.error('Erreur SQL /formations/:id/submit-for-approval:', err);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Formation non trouvée ou déjà soumise' });
      }
      res.json({ message: 'Formation soumise à l\'admin pour approbation ✉️' });

      // Notifier tous les admins
      db.query('SELECT id FROM users WHERE role = "admin"', (ae, admins) => {
        if (!ae) {
          admins.forEach(admin => {
            db.query(
              'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
              [admin.id, `🔔 Nouvelle formation en attente d'approbation : « ${formation.titre} »`, 'approbation'],
              () => {}
            );
          });
        }
      });
    });
  });
});

// 🔹 Supprimer une formation du formateur
router.delete('/formations/:id', (req, res) => {
  const formationId = parseInt(req.params.id);
  const { formateur_id } = req.body;

  if (isNaN(formationId)) {
    return res.status(400).json({ error: 'Formation ID invalide' });
  }

  if (!formateur_id) {
    return res.status(400).json({ error: 'Formateur ID obligatoire' });
  }

  const sql = 'DELETE FROM formations WHERE id = ? AND formateur_id = ?';
  db.query(sql, [formationId, formateur_id], (err, result) => {
    if (err) {
      console.error('Erreur SQL DELETE formation:', err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Formation non trouvée ou accès refusé' });
    }
    res.json({ message: 'Formation supprimée ❌' });
  });
});

// 🔹 Valider la présence d'un étudiant
router.put('/inscriptions/:inscriptionId/status', (req, res) => {
  const inscriptionId = parseInt(req.params.inscriptionId);
  const { statut } = req.body;

  if (isNaN(inscriptionId)) {
    return res.status(400).json({ error: 'Inscription ID invalide' });
  }

  if (!statut || typeof statut !== 'string') {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  const sql = 'UPDATE inscriptions SET statut = ? WHERE id = ?';
  db.query(sql, [statut, inscriptionId], (err, result) => {
    if (err) {
      console.error('Erreur SQL PUT inscription statut:', err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }
   res.json({ message: 'Statut mis à jour ✅' });

    // Notifier l'étudiant
    if (statut === 'présent' || statut === 'absent') {
      db.query(
        `SELECT f.titre, e.user_id AS etudiant_user_id
         FROM inscriptions i
         JOIN formations f ON i.formation_id = f.id
         JOIN etudiants e ON i.etudiant_id = e.id
         WHERE i.id = ?`,
        [inscriptionId],
        (ne, nr) => {
          if (!ne && nr.length > 0) {
            const msg = statut === 'présent'
              ? `🏆 Votre présence à la formation « ${nr[0].titre} » a été validée !`
              : `📋 Votre absence à la formation « ${nr[0].titre} » a été enregistrée.`;
            db.query(
              'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
              [nr[0].etudiant_user_id, msg, 'presence'],
              () => {}
            );
          }
        }
      );
    }
  });
});

module.exports = router;
