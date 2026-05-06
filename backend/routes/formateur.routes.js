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
    SELECT i.id, u.nom, u.email, i.date_inscription, i.statut, e.id AS etudiant_id
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

  const statsSql = `
    SELECT
      (SELECT COUNT(*) FROM formations WHERE formateur_id = ?) AS totalFormations,
      (SELECT COUNT(*) FROM inscriptions i JOIN formations f ON i.formation_id = f.id WHERE f.formateur_id = ?) AS totalEtudiants,
      (SELECT COUNT(*) FROM seances s JOIN formations f ON s.formation_id = f.id WHERE f.formateur_id = ?) AS totalSeances
  `;

  db.query(statsSql, [formateurId, formateurId, formateurId], (err, result) => {
    if (err) {
      console.error('Erreur SQL /stats:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      formations: result[0].totalFormations || 0,
      etudiants: result[0].totalEtudiants || 0,
      seances: result[0].totalSeances || 0
    });
  });
});

// 🔹 Créer une formation
router.post('/creer-formation', (req, res) => {
  const { 
    titre, 
    description, 
    date_debut, 
    date_fin, 
    duree, 
    specialite, 
    nb_places, 
    formateur_id 
  } = req.body;
 if (!titre || !titre.trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  if (!description || !description.trim()) return res.status(400).json({ error: 'La description est obligatoire.' });
  if (!date_debut) return res.status(400).json({ error: 'La date de début est obligatoire.' });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(date_debut) < today) return res.status(400).json({ error: 'La date de début doit être aujourd\'hui ou dans le futur.' });
  if (date_fin && new Date(date_fin) < new Date(date_debut)) return res.status(400).json({ error: 'La date de fin doit être après la date de début.' });
  if (duree !== undefined && duree !== null && duree !== '' && Number(duree) <= 0) return res.status(400).json({ error: 'La durée doit être > 0.' });
  if (nb_places !== undefined && nb_places !== null && nb_places !== '' && Number(nb_places) <= 0) return res.status(400).json({ error: 'Le nombre de places doit être > 0.' });
  if (!specialite || !specialite.trim()) return res.status(400).json({ error: 'La spécialité est obligatoire.' });
  if (!formateur_id) return res.status(400).json({ error: 'Le formateur est obligatoire.' });

  const sql = `
    INSERT INTO formations 
    (titre, description, date_debut, date_fin, duree, specialite, nb_places, formateur_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    titre,
    description,
    date_debut,
    date_fin || null,
    duree || null,
    specialite || null,
    nb_places || null,
    formateur_id,
    'draft'
  ], (err, results) => {
    if (err) {
      console.error('Erreur SQL /creer-formation:', err);
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: 'Formation créée avec succès ✅', id: results.insertId });
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
  const { titre, description, date_debut, date_fin, duree, specialite, nb_places, formateur_id } = req.body;

  if (isNaN(formationId)) {
    return res.status(400).json({ error: 'Formation ID invalide' });
  }

  if (!titre || !titre.trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  if (!description || !description.trim()) return res.status(400).json({ error: 'La description est obligatoire.' });
  if (!date_debut) return res.status(400).json({ error: 'La date de début est obligatoire.' });
  if (date_fin && new Date(date_fin) < new Date(date_debut)) return res.status(400).json({ error: 'La date de fin doit être après la date de début.' });
  if (duree !== undefined && duree !== null && duree !== '' && Number(duree) <= 0) return res.status(400).json({ error: 'La durée doit être > 0.' });
  if (nb_places !== undefined && nb_places !== null && nb_places !== '' && Number(nb_places) <= 0) return res.status(400).json({ error: 'Le nombre de places doit être > 0.' });
  if (!specialite || !specialite.trim()) return res.status(400).json({ error: 'La spécialité est obligatoire.' });
  if (!formateur_id) return res.status(400).json({ error: 'Le formateur est obligatoire.' });
  

  const sql = `
    UPDATE formations
    SET titre = ?, description = ?, date_debut = ?, date_fin = ?, duree = ?, specialite = ?, nb_places = ?
    WHERE id = ? AND formateur_id = ?
  `;

  db.query(sql, [titre, description, date_debut, date_fin || null, duree || null, specialite || null, nb_places || null, formationId, formateur_id], (err, result) => {
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

/* ========================= PROGRESSION PAR MODULE ========================= */

// 🔹 Lire la progression d'un étudiant dans une formation
router.get('/progression/:formationId/:etudiantId', (req, res) => {
  const { formationId, etudiantId } = req.params;
  const sql = `
    SELECT m.id, m.titre, m.ordre, m.duree_heures,
           COALESCE(p.statut, 'non_commence') AS statut
    FROM modules_formation m
    LEFT JOIN progression_etudiants p
           ON p.module_id = m.id AND p.etudiant_id = ? AND p.formation_id = ?
    WHERE m.formation_id = ?
    ORDER BY m.ordre ASC, m.id ASC
  `;
  db.query(sql, [etudiantId, formationId, formationId], (err, modules) => {
    if (err) return res.status(500).json({ error: err });
    const total = modules.length;
    const termines = modules.filter(m => m.statut === 'termine').length;
    const pourcentage = total > 0 ? Math.round((termines / total) * 100) : 0;
    res.json({ modules, pourcentage, total, termines });
  });
});

// 🔹 Mettre à jour le statut d'un module pour un étudiant
router.put('/progression/:formationId/:etudiantId/:moduleId', (req, res) => {
  const { formationId, etudiantId, moduleId } = req.params;
  const { statut } = req.body;
  const validStatuts = ['non_commence', 'en_cours', 'termine'];
  if (!validStatuts.includes(statut)) return res.status(400).json({ message: 'Statut invalide.' });

  const sql = `
    INSERT INTO progression_etudiants (etudiant_id, formation_id, module_id, statut)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE statut = VALUES(statut), date_maj = NOW()
  `;
  db.query(sql, [etudiantId, formationId, moduleId, statut], (err) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ message: 'Progression mise à jour.' });

    // Vérifier si 100% atteint → notifier l'étudiant
    if (statut === 'termine') {
      db.query(
        `SELECT
           (SELECT COUNT(*) FROM modules_formation WHERE formation_id = ?) AS total,
           (SELECT COUNT(*) FROM progression_etudiants WHERE etudiant_id = ? AND formation_id = ? AND statut = 'termine') AS termines`,
        [formationId, etudiantId, formationId],
        (err2, rows) => {
          if (!err2 && rows[0] && rows[0].total > 0 && rows[0].total === rows[0].termines) {
            db.query('SELECT user_id FROM etudiants WHERE id = ?', [etudiantId], (err3, etRows) => {
              if (!err3 && etRows.length > 0) {
                db.query('SELECT titre FROM formations WHERE id = ?', [formationId], (err4, fRows) => {
                  if (!err4 && fRows.length > 0) {
                    db.query(
                      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
                      [etRows[0].user_id, `🎓 Félicitations ! Vous avez complété 100% de la formation "${fRows[0].titre}" !`, 'approbation'],
                      () => {}
                    );
                  }
                });
              }
            });
          }
        }
      );
    }
  });
});

/* ========================= SÉANCES ========================= */

// 🔹 Lister les séances d'une formation
router.get('/seances/:formationId', (req, res) => {
  const formationId = parseInt(req.params.formationId);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  db.query(
    'SELECT * FROM seances WHERE formation_id = ? ORDER BY date_seance ASC, heure_debut ASC',
    [formationId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 🔹 Créer une séance
router.post('/seances', (req, res) => {
  const { formation_id, date_seance, heure_debut, heure_fin, salle } = req.body;
  if (!formation_id || !date_seance || !heure_debut || !heure_fin)
    return res.status(400).json({ error: 'formation_id, date_seance, heure_debut et heure_fin sont obligatoires' });
  db.query(
    'INSERT INTO seances (formation_id, date_seance, heure_debut, heure_fin, salle) VALUES (?, ?, ?, ?, ?)',
    [formation_id, date_seance, heure_debut, heure_fin, salle || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Séance créée ✅', id: result.insertId });
    }
  );
});

// 🔹 Modifier une séance
router.put('/seances/:id', (req, res) => {
  const seanceId = parseInt(req.params.id);
  const { date_seance, heure_debut, heure_fin, salle, statut } = req.body;
  if (isNaN(seanceId)) return res.status(400).json({ error: 'Séance ID invalide' });
  db.query(
    'UPDATE seances SET date_seance = ?, heure_debut = ?, heure_fin = ?, salle = ?, statut = ? WHERE id = ?',
    [date_seance, heure_debut, heure_fin, salle || null, statut || 'planifiée', seanceId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Séance non trouvée' });
      res.json({ message: 'Séance mise à jour ✅' });
    }
  );
});

// 🔹 Supprimer une séance
router.delete('/seances/:id', (req, res) => {
  const seanceId = parseInt(req.params.id);
  if (isNaN(seanceId)) return res.status(400).json({ error: 'Séance ID invalide' });
  db.query('DELETE FROM seances WHERE id = ?', [seanceId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Séance non trouvée' });
    res.json({ message: 'Séance supprimée ✅' });
  });
});

/* ========================= PRÉSENCES ========================= */

// 🔹 Feuille de présence d'une séance (tous les inscrits + leur statut)
router.get('/presences/:seanceId', (req, res) => {
  const seanceId = parseInt(req.params.seanceId);
  if (isNaN(seanceId)) return res.status(400).json({ error: 'Séance ID invalide' });

  // Récupérer la formation_id de la séance
  db.query('SELECT formation_id FROM seances WHERE id = ?', [seanceId], (err, seanceRows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (seanceRows.length === 0) return res.status(404).json({ error: 'Séance non trouvée' });

    const formationId = seanceRows[0].formation_id;
    const sql = `
      SELECT e.id AS etudiant_id, u.nom, u.email,
             COALESCE(p.statut, 'absent') AS statut
      FROM inscriptions i
      JOIN etudiants e ON i.etudiant_id = e.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN presences p ON p.seance_id = ? AND p.etudiant_id = e.id
      WHERE i.formation_id = ?
      ORDER BY u.nom ASC
    `;
    db.query(sql, [seanceId, formationId], (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(rows);
    });
  });
});

// 🔹 Enregistrer / mettre à jour le statut de présence
router.put('/presences/:seanceId/:etudiantId', (req, res) => {
  const seanceId = parseInt(req.params.seanceId);
  const etudiantId = parseInt(req.params.etudiantId);
  const { statut } = req.body;
  const validStatuts = ['présent', 'absent', 'retard', 'excusé'];
  if (isNaN(seanceId) || isNaN(etudiantId)) return res.status(400).json({ error: 'IDs invalides' });
  if (!validStatuts.includes(statut)) return res.status(400).json({ error: 'Statut invalide' });

  db.query(
    `INSERT INTO presences (seance_id, etudiant_id, statut)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE statut = VALUES(statut)`,
    [seanceId, etudiantId, statut],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Présence enregistrée ✅' });

      // Vérifier si le taux de présence est passé sous 75% → notifier l'étudiant
      db.query('SELECT formation_id FROM seances WHERE id = ?', [seanceId], (e1, sr) => {
        if (e1 || !sr.length) return;
        const formationId = sr[0].formation_id;
        const tauxSql = `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN p.statut IN ('présent','retard') THEN 1 ELSE 0 END) AS presents
          FROM seances s
          LEFT JOIN presences p ON p.seance_id = s.id AND p.etudiant_id = ?
          WHERE s.formation_id = ?
        `;
        db.query(tauxSql, [etudiantId, formationId], (e2, tr) => {
          if (e2 || !tr.length || tr[0].total === 0) return;
          const taux = Math.round((tr[0].presents / tr[0].total) * 100);
          if (taux < 75) {
            db.query('SELECT user_id FROM etudiants WHERE id = ?', [etudiantId], (e3, er) => {
              if (e3 || !er.length) return;
              db.query('SELECT titre FROM formations WHERE id = ?', [formationId], (e4, fr) => {
                if (e4 || !fr.length) return;
                db.query(
                  'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
                  [er[0].user_id, `⚠️ Votre taux de présence pour « ${fr[0].titre} » est de ${taux}%. Un taux minimum de 75% est requis.`, 'presence'],
                  () => {}
                );
              });
            });
          }
        });
      });
    }
  );
});

/* ========================= JUSTIFICATIFS ========================= */

// 🔹 Justificatifs en attente pour une formation
router.get('/justificatifs/:formationId', (req, res) => {
  const formationId = parseInt(req.params.formationId);
  if (isNaN(formationId)) return res.status(400).json({ error: 'ID invalide' });
  const sql = `
    SELECT j.id, j.motif, j.statut, j.date_soumission,
           s.date_seance, s.heure_debut, s.id AS seance_id,
           u.nom AS etudiant_nom, e.id AS etudiant_id
    FROM justificatifs j
    JOIN seances s ON j.seance_id = s.id
    JOIN etudiants e ON j.etudiant_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE s.formation_id = ?
    ORDER BY j.date_soumission DESC
  `;
  db.query(sql, [formationId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 🔹 Accepter ou refuser un justificatif
router.put('/justificatifs/:id', (req, res) => {
  const justifId = parseInt(req.params.id);
  const { statut } = req.body;
  if (!['accepté', 'refusé'].includes(statut)) return res.status(400).json({ error: 'Statut invalide' });

  db.query('UPDATE justificatifs SET statut = ? WHERE id = ?', [statut, justifId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Justificatif ${statut} ✅` });

    // Si accepté → mettre la présence à 'excusé'
    if (statut === 'accepté') {
      db.query('SELECT etudiant_id, seance_id FROM justificatifs WHERE id = ?', [justifId], (e2, jr) => {
        if (e2 || !jr.length) return;
        const { etudiant_id, seance_id } = jr[0];
        db.query(
          `INSERT INTO presences (seance_id, etudiant_id, statut) VALUES (?, ?, 'excusé')
           ON DUPLICATE KEY UPDATE statut = 'excusé'`,
          [seance_id, etudiant_id], () => {}
        );
        // Notifier l'étudiant
        db.query('SELECT user_id FROM etudiants WHERE id = ?', [etudiant_id], (e3, er) => {
          if (e3 || !er.length) return;
          db.query(
            'SELECT date_seance FROM seances WHERE id = ?', [seance_id], (e4, sr) => {
              if (e4 || !sr.length) return;
              const d = new Date(sr[0].date_seance).toLocaleDateString('fr-FR');
              db.query(
                'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
                [er[0].user_id, `✅ Votre justificatif d'absence pour la séance du ${d} a été accepté.`, 'presence'],
                () => {}
              );
            }
          );
        });
      });
    } else {
      // Notifier l'étudiant du refus
      db.query('SELECT etudiant_id, seance_id FROM justificatifs WHERE id = ?', [justifId], (e2, jr) => {
        if (e2 || !jr.length) return;
        db.query('SELECT user_id FROM etudiants WHERE id = ?', [jr[0].etudiant_id], (e3, er) => {
          if (e3 || !er.length) return;
          db.query('SELECT date_seance FROM seances WHERE id = ?', [jr[0].seance_id], (e4, sr) => {
            if (e4 || !sr.length) return;
            const d = new Date(sr[0].date_seance).toLocaleDateString('fr-FR');
            db.query(
              'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
              [er[0].user_id, `❌ Votre justificatif d'absence pour la séance du ${d} a été refusé.`, 'presence'],
              () => {}
            );
          });
        });
      });
    }
  });
});

module.exports = router;
