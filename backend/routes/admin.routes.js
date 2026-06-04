const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { formationSchema, moduleSchema, createFormateurSchema, updateFormateurSchema } = require('../validators/schemas');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /png|jpg|jpeg|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    allowed.test(ext) ? cb(null, true) : cb(new Error('Seules les images sont autorisées'));
  }
});

const uploadSupport = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const allowedStatuses = ['draft', 'published', 'accepted', 'archivée', 'en_cours', 'terminée'];
const syncFormationStatuses = require('../utils/syncFormationStatuses');

const isValidDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

const validateFormationPayload = ({ titre, date_debut, date_fin, specialite, nb_places, formateur_id, status, prix }) => {
  if (!titre || typeof titre !== 'string' || titre.trim().length === 0) return 'Le titre est obligatoire.';
  if (!date_debut || !isValidDate(date_debut)) return 'La date de début est invalide.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(date_debut) < today) return "La date de début doit être aujourd'hui ou dans le futur.";
  if (date_fin && !isValidDate(date_fin)) return 'La date de fin est invalide.';
  if (date_fin && new Date(date_fin) < new Date(date_debut)) return 'La date de fin doit être postérieure ou égale à la date de début.';
  if (!nb_places || Number(nb_places) <= 0) return 'Le nombre de places doit être un nombre positif.';
  if (!specialite || typeof specialite !== 'string' || specialite.trim().length === 0) return 'Le spécialité est obligatoire.';
  if (!formateur_id || Number(formateur_id) <= 0) return 'Le formateur est obligatoire.';
  if (prix !== undefined && prix !== null && Number(prix) < 0) return 'Le prix doit être positif ou nul.';
  if (status && !allowedStatuses.includes(status)) return 'Le statut est invalide.';
  return null;
};

router.use(verifyAdmin);

/* ========================= USERS ========================= */
router.get('/users', async (req, res) => {
  const sql = `
    SELECT u.id, u.nom, u.email, u.role,
      COALESCE(c.specialite, f.specialite, ex.specialite) AS specialite
    FROM users u
    LEFT JOIN candidats c  ON u.role = 'candidat'  AND c.user_id = u.id
    LEFT JOIN formateurs f ON u.role = 'formateur' AND f.user_id = u.id
    LEFT JOIN externes ex  ON u.role = 'externe'   AND ex.user_id = u.id
    ORDER BY u.id DESC
 `;
  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ message: 'ID invalide.' });
  try {
    const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (rows[0].role === 'admin') return res.status(403).json({ message: 'Impossible de supprimer un compte administrateur.' });

    if (rows[0].role === 'formateur') {
      const [result] = await db.query(
 `SELECT COUNT(*) AS cnt FROM formations f JOIN formateurs fo ON f.formateur_id = fo.id WHERE fo.user_id = ?`,
        [targetId]
      );
      if (result[0].cnt > 0)
        return res.status(400).json({ message: 'Impossible de supprimer ce formateur : il possède des formations actives.' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ message: 'Utilisateur supprimé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= FORMATIONS (ADMIN VIEW) ========================= */
router.get('/formations', async (req, res) => {
  const sql = `
    SELECT f.id, f.titre, f.description, f.date_debut, f.date_fin,
           f.specialite, f.nb_places, f.prix, f.status, f.formateur_id,
           f.photo, COALESCE(f.date_publication, f.date_debut) AS date_publication, u.nom AS formateur
    FROM formations f
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    ORDER BY f.status = 'archivée' ASC, f.id DESC
 `;
  try {
    await syncFormationStatuses();
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= CREATE FORMATION ========================= */
router.post('/formations', uploadImage.single('photo'), validate(formationSchema), async (req, res) => {
  const payload = req.body;
  const validationError = validateFormationPayload(payload);
  if (validationError) return res.status(400).json({ message: validationError });

  const { titre, description, date_debut, specialite, nb_places, formateur_id, prix } = payload;
  const date_fin = payload.date_fin && payload.date_fin !== '' ? payload.date_fin : null;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const [formateurs] = await db.query('SELECT id, user_id FROM formateurs WHERE id = ?', [formateur_id]);
    if (formateurs.length === 0) return res.status(400).json({ message: 'Formateur introuvable.' });
    const formateurUserId = formateurs[0].user_id;

    const [result] = await db.query(
 `INSERT INTO formations (titre, description, date_debut, date_fin, specialite, nb_places, prix, formateur_id, status, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [titre, description, date_debut, date_fin, specialite, nb_places, prix || 0, formateur_id, photo]
    );

    const dateFormatee = new Date(date_debut).toLocaleDateString('fr-FR');
    db.query(
 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [formateurUserId, `Une nouvelle formation vous a été assignée : « ${titre} » — Spécialité : ${specialite} — Début : ${dateFormatee}`, 'assignation']
    ).catch(() => {});

    res.json({ message: 'Formation créée (draft) ', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= UPDATE FORMATION ========================= */
router.put('/formations/:id', uploadImage.single('photo'), validate(formationSchema), async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const { titre, specialite, nb_places, formateur_id, status, prix, photo_existante } = payload;
  const date_debut = payload.date_debut || null;
  const date_fin = payload.date_fin && payload.date_fin !== '' ? payload.date_fin : null;
  const description = payload.description || '';
  const photo = req.file ? `/uploads/${req.file.filename}` : (photo_existante || null);

  if (!titre || !titre.trim()) return res.status(400).json({ message: 'Le titre est obligatoire.' });
  if (!date_debut) return res.status(400).json({ message: 'La date de début est obligatoire.' });
  if (!nb_places || Number(nb_places) <= 0) return res.status(400).json({ message: 'Le nombre de places doit être un nombre positif.' });
  if (!specialite || !specialite.trim()) return res.status(400).json({ message: 'La spécialité est obligatoire.' });
  if (!formateur_id || Number(formateur_id) <= 0) return res.status(400).json({ message: 'Le formateur est obligatoire.' });

  try {
    const [[formation]] = await db.query('SELECT status FROM formations WHERE id = ?', [id]);
    if (formation?.status === 'published') {
      return res.status(403).json({ message: 'Une formation publiée ne peut plus être modifiée.' });
    }
    const [rows] = await db.query(
 'SELECT f.user_id, fo.formateur_id AS ancien_formateur_id FROM formations fo JOIN formateurs f ON f.id = ? WHERE fo.id = ?',
      [formateur_id, id]
    );
    const [formateurs] = await db.query('SELECT id, user_id FROM formateurs WHERE id = ?', [formateur_id]);
    if (formateurs.length === 0) return res.status(400).json({ message: 'Formateur introuvable.' });

    const formateurUserId = formateurs[0].user_id;
    const ancienFormateurId = rows.length > 0 ? rows[0].ancien_formateur_id : null;

    await db.query(
 `UPDATE formations SET titre=?, description=?, date_debut=?, date_fin=?,
          specialite=?, nb_places=?, prix=?, formateur_id=?, status=?, photo=? WHERE id=?`,
      [titre, description, date_debut, date_fin, specialite, nb_places, prix || 0, formateur_id, status || 'draft', photo, id]
    );

    if (String(ancienFormateurId) !== String(formateur_id)) {
      const dateFormatee = new Date(date_debut).toLocaleDateString('fr-FR');
      db.query(
 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [formateurUserId, `La formation « ${titre} » vous a été assignée par l'administrateur — Début : ${dateFormatee}`, 'assignation']
      ).catch(() => {});
    }

    res.json({ message: 'Formation modifiée ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formations/:id/publish', async (req, res) => {
  try {
    await db.query("UPDATE formations SET status='published', date_publication=NOW() WHERE id=?", [req.params.id]);
    res.json({ message: 'Formation publiée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/formations/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM formations WHERE id=?', [req.params.id]);
    res.json({ message: 'Formation supprimée ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= FORMATEURS ========================= */
router.get('/formateurs', async (req, res) => {
  try {
    const [results] = await db.query(
 `SELECT f.id, u.nom, u.email, f.specialite FROM formateurs f JOIN users u ON f.user_id = u.id ORDER BY u.nom ASC`
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/formateurs/disponibilite', async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT
        f.id, u.nom, u.email, f.specialite,
        form.id         AS formation_active_id,
        form.titre      AS formation_active_titre,
        form.status     AS formation_active_status,
        form.date_debut AS formation_active_debut,
        form.date_fin   AS formation_active_fin
      FROM formateurs f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN formations form
        ON form.id = (
          SELECT id FROM formations
          WHERE formateur_id = f.id
            AND status IN ('published', 'accepted', 'en_cours')
            AND (date_debut IS NULL OR date_debut <= CURDATE())
            AND (date_fin IS NULL OR date_fin >= CURDATE())
          ORDER BY date_debut DESC
          LIMIT 1
        )
      ORDER BY u.nom ASC
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formateurs', validate(createFormateurSchema), async (req, res) => {
  const { nom, email, mot_de_passe, specialite } = req.body;
  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length > 0) return res.status(400).json({ message: 'Email déjà utilisé.' });
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const [result] = await db.query(
 'INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
      [nom, email, hashedPassword, 'formateur']
    );
    await db.query('INSERT INTO formateurs (user_id, specialite) VALUES (?, ?)', [result.insertId, specialite || null]);
    res.status(201).json({ message: 'Formateur créé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formateurs/:id', validate(updateFormateurSchema), async (req, res) => {
  const { id } = req.params;
  const { nom, email, mot_de_passe, specialite } = req.body;
  try {
    const [results] = await db.query('SELECT user_id FROM formateurs WHERE id = ?', [id]);
    if (results.length === 0) return res.status(404).json({ message: 'Formateur introuvable.' });
    const userId = results[0].user_id;

    const [existing] = await db.query('SELECT * FROM users WHERE email = ? AND id <> ?', [email, userId]);
    if (existing.length > 0) return res.status(400).json({ message: 'Email déjà utilisé par un autre compte.' });

    if (mot_de_passe) {
      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      await db.query('UPDATE users SET nom=?, email=?, mot_de_passe=? WHERE id=?', [nom, email, hashedPassword, userId]);
    } else {
      await db.query('UPDATE users SET nom=?, email=? WHERE id=?', [nom, email, userId]);
    }
    await db.query('UPDATE formateurs SET specialite=? WHERE id=?', [specialite || null, id]);
    res.json({ message: 'Formateur mis à jour avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/formateurs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [formations] = await db.query('SELECT * FROM formations WHERE formateur_id = ?', [id]);
    if (formations.length > 0) return res.status(400).json({ message: 'Impossible de supprimer un formateur lié à des formations.' });
    const [results] = await db.query('SELECT user_id FROM formateurs WHERE id = ?', [id]);
    if (results.length === 0) return res.status(404).json({ message: 'Formateur introuvable.' });
    const userId = results[0].user_id;
    await db.query('DELETE FROM formateurs WHERE id = ?', [id]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Formateur supprimé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= STATS ========================= */
router.get('/stats', async (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM users WHERE role='candidat') AS candidats,
      (SELECT COUNT(*) FROM formateurs) AS formateurs,
      (SELECT COUNT(*) FROM formations) AS formations,
      (SELECT COUNT(*) FROM formations WHERE status='published') AS published,
      (SELECT COUNT(*) FROM inscriptions WHERE statut='en_attente') AS inscriptions_pending
 `;
  try {
    const [results] = await db.query(sql);
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= INSCRIPTIONS EN ATTENTE ========================= */
router.get('/inscriptions-pending', async (req, res) => {
  const sqlCandidats = `
    SELECT i.id, i.formation_id, i.statut, i.date_inscription,
           f.titre AS formation_titre, f.date_debut, f.nb_places,
           (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id AND statut = 'Inscrit') AS inscrits_actifs,
           u.nom AS user_nom, u.email AS user_email,
 'candidat' AS type_utilisateur,
           NULL AS montant
    FROM inscriptions i
    JOIN formations f ON i.formation_id = f.id
    JOIN candidats c ON i.candidat_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE i.statut = 'en_attente'
 `;
  const sqlExternes = `
    SELECT ie.id, ie.formation_id, 'en_attente' AS statut, ie.date_inscription,
           f.titre AS formation_titre, f.date_debut, f.nb_places,
           (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id AND statut = 'Inscrit') AS inscrits_actifs,
           u.nom AS user_nom, u.email AS user_email,
 'externe' AS type_utilisateur,
           ie.montant
    FROM inscriptions_externes ie
    JOIN formations f ON ie.formation_id = f.id
    JOIN externes ex ON ie.externe_id = ex.id
    JOIN users u ON ex.user_id = u.id
    WHERE ie.statut_inscription = 'en_attente'
 `;
  try {
    const [candidats] = await db.query(sqlCandidats);
    const [externes] = await db.query(sqlExternes);
    const all = [...candidats, ...externes].sort((a, b) => new Date(a.date_inscription) - new Date(b.date_inscription));
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/inscriptions-externes/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const [[insc]] = await db.query(
 `SELECT ie.*, f.titre AS formation_titre, f.nb_places, u.id AS user_id, u.nom AS user_nom
       FROM inscriptions_externes ie
       JOIN formations f ON ie.formation_id = f.id
       JOIN externes ex ON ie.externe_id = ex.id
       JOIN users u ON ex.user_id = u.id
       WHERE ie.id = ? AND ie.statut_inscription = 'en_attente'`, [id]
    );
    if (!insc) return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });

    const [[places]] = await db.query(
 `SELECT f.nb_places,
        (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id AND statut = 'Inscrit') +
        (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_paiement = 'payé') AS inscrits_actifs
       FROM formations f WHERE f.id = ?`, [insc.formation_id]
    );
    if (places.nb_places !== null && places.inscrits_actifs >= places.nb_places)
      return res.status(400).json({ error: `La formation est complète. Impossible d'approuver.` });

    if (parseFloat(insc.montant) === 0) {
      await db.query("UPDATE inscriptions_externes SET statut_inscription='confirmé', statut_paiement='payé', date_paiement=NOW() WHERE id=?", [id]);
      db.query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [insc.user_id, `Votre inscription à la formation « ${insc.formation_titre} » a été approuvée !`, 'inscription']).catch(() => {});
    } else {
      await db.query("UPDATE inscriptions_externes SET statut_inscription='confirmé' WHERE id=?", [id]);
      db.query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [insc.user_id, `Votre demande pour « ${insc.formation_titre} » est approuvée. Vous pouvez maintenant procéder au paiement.`, 'inscription']).catch(() => {});
    }
    res.json({ message: 'Inscription externe approuvée ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/inscriptions-externes/:id/reject', async (req, res) => {
  const id = parseInt(req.params.id);
  const { raison } = req.body;
  if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const [[insc]] = await db.query(
 `SELECT ie.*, f.titre AS formation_titre, u.id AS user_id
       FROM inscriptions_externes ie
       JOIN formations f ON ie.formation_id = f.id
       JOIN externes ex ON ie.externe_id = ex.id
       JOIN users u ON ex.user_id = u.id
       WHERE ie.id = ? AND ie.statut_inscription = 'en_attente'`, [id]
    );
    if (!insc) return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });
    await db.query("UPDATE inscriptions_externes SET statut_inscription='annulé' WHERE id=?", [id]);
    const msg = raison
      ? `Votre demande d'inscription à « ${insc.formation_titre} » a été refusée. Motif : ${raison}`
      : `Votre demande d'inscription à « ${insc.formation_titre} » a été refusée.`;
    db.query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [insc.user_id, msg, 'inscription']).catch(() => {});
    res.json({ message: 'Inscription externe rejetée' });

    // Notifier la première personne dans la liste d'attente si une place s'est libérée
    db.query(
 `SELECT la.id,
              IF(la.candidat_id IS NOT NULL, c.user_id, ex.user_id) AS user_id,
              f.titre
       FROM liste_attente la
       JOIN formations f ON la.formation_id = f.id
       LEFT JOIN candidats c ON la.candidat_id = c.id
       LEFT JOIN externes ex ON la.externe_id = ex.id
       WHERE la.formation_id = ?
       ORDER BY la.date_ajout ASC LIMIT 1`,
      [insc.formation_id]
    ).then(([rows]) => {
      if (!rows.length) return;
      db.query(
 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [rows[0].user_id, ` Une place s'est libérée dans la formation « ${rows[0].titre} » ! Inscrivez-vous rapidement.`, 'inscription']
      ).catch(() => {});
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/inscriptions/:id/approve', async (req, res) => {
  const inscriptionId = parseInt(req.params.id);
  if (isNaN(inscriptionId)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const [[insc]] = await db.query(
 `SELECT i.id, i.formation_id,
              f.titre AS formation_titre,
              u.id AS user_id,
              u.nom AS user_nom,
              fo.user_id AS formateur_user_id,
              u.nom AS inscrit_nom
       FROM inscriptions i
       JOIN formations f ON i.formation_id = f.id
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN candidats c ON i.candidat_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE i.id = ? AND i.statut = 'en_attente'`,
      [inscriptionId]
    );
    if (!insc) return res.status(404).json({ error: 'Inscription introuvable ou déjà traitée' });

    const [[places]] = await db.query(
 `SELECT f.nb_places,
              (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id AND statut = 'Inscrit') AS inscrits_actifs
       FROM formations f WHERE f.id = ?`,
      [insc.formation_id]
    );
    if (places.nb_places !== null && places.inscrits_actifs >= places.nb_places) {
      return res.status(400).json({ error: `La formation est complète (${places.nb_places} place(s) maximum). Impossible d'approuver cette inscription.` });
    }

    await db.query("UPDATE inscriptions SET statut = 'Inscrit' WHERE id = ?", [inscriptionId]);
    res.json({ message: 'Inscription approuvée ' });

    db.query(
 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [insc.user_id, `Votre demande d'inscription à la formation « ${insc.formation_titre} » a été approuvée !`, 'inscription']
    ).catch(() => {});

    db.query(
 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [insc.formateur_user_id, `${insc.inscrit_nom} a été inscrit à votre formation « ${insc.formation_titre} »`, 'inscription']
    ).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/inscriptions/:id/reject', async (req, res) => {
  const inscriptionId = parseInt(req.params.id);
  const { raison } = req.body;
  if (isNaN(inscriptionId)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const [[insc]] = await db.query(
 `SELECT i.id, i.formation_id,
              f.titre AS formation_titre,
              u.id AS user_id
       FROM inscriptions i
       JOIN formations f ON i.formation_id = f.id
       JOIN candidats c ON i.candidat_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE i.id = ? AND i.statut = 'en_attente'`,
      [inscriptionId]
    );
    if (!insc) return res.status(404).json({ error: 'Inscription introuvable ou déjà traitée' });

    await db.query('DELETE FROM inscriptions WHERE id = ?', [inscriptionId]);
    res.json({ message: 'Inscription rejetée' });

    const msg = raison
      ? `Votre demande d'inscription à la formation « ${insc.formation_titre} » a été refusée. Motif : ${raison}`
      : `Votre demande d'inscription à la formation « ${insc.formation_titre} » a été refusée.`;
    db.query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [insc.user_id, msg, 'inscription']
    ).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= DÉTAILS COMPLETS D'UNE FORMATION ========================= */
router.get('/formations/:id/details', async (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [[formation]] = await db.query(
 `SELECT f.id, f.titre, f.description, f.date_debut, f.date_fin,
              f.specialite, f.nb_places, f.prix, f.status, f.photo, f.formateur_id,
              u.nom AS formateur_nom, u.email AS formateur_email, fo.specialite AS formateur_specialite
       FROM formations f
       LEFT JOIN formateurs fo ON f.formateur_id = fo.id
       LEFT JOIN users u ON fo.user_id = u.id
       WHERE f.id = ?`,
      [formationId]
    );
    if (!formation) return res.status(404).json({ error: 'Formation non trouvée' });

    const [[programme]] = await db.query(
 'SELECT description_globale, objectifs, prerequis FROM programme_formations WHERE formation_id = ?',
      [formationId]
    );
    const [modules] = await db.query(
 'SELECT id, titre, description, duree_heures, ordre FROM modules_formation WHERE formation_id = ? ORDER BY ordre ASC, id ASC',
      [formationId]
    );
    const [supports] = await db.query(
 'SELECT id, type, fichier FROM supports WHERE formation_id = ?',
      [formationId]
    );

    res.json({ formation, programme: programme || null, modules, supports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= FORMATIONS EN ATTENTE ========================= */
router.get('/formations-pending', async (req, res) => {
  const sql = `
    SELECT f.id, f.titre, f.description, f.date_debut, f.date_fin,
           f.specialite, f.nb_places, f.status, f.formateur_id,
           u.nom AS formateur, u.email AS formateur_email
    FROM formations f
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    WHERE f.status = 'pending_approval'
    ORDER BY f.id DESC
 `;
  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= ACCEPTER (pending_approval → accepted) ========================= */
router.put('/formations/:id/accept', async (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [result] = await db.query(
 "UPDATE formations SET status = 'accepted' WHERE id = ? AND status = 'pending_approval'",
      [formationId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation introuvable ou déjà traitée' });
    res.json({ message: 'Formation acceptée ' });

    db.query(
 `SELECT f.titre, u.id AS formateur_user_id FROM formations f
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN users u ON fo.user_id = u.id WHERE f.id = ?`,
      [formationId]
    ).then(([nr]) => {
      if (nr.length > 0) {
        db.query(
 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [nr[0].formateur_user_id, `Votre formation « ${nr[0].titre} » a été acceptée par l'administrateur. Elle sera publiée prochainement.`, 'approbation']
        ).catch(() => {});
      }
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= PUBLIER ACCEPTÉE (accepted → published) ========================= */
router.put('/formations/:id/publish-accepted', async (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });

  const { date_debut, date_fin, prix: prixRaw, nb_places: nbPlacesRaw } = req.body;
  if (!date_debut) return res.status(400).json({ error: 'La date de début est obligatoire pour publier.' });
  if (!nbPlacesRaw || parseInt(nbPlacesRaw) <= 0) return res.status(400).json({ error: 'Le nombre de places est obligatoire pour publier.' });

  const prix = prixRaw !== undefined && prixRaw !== null && prixRaw !== '' ? parseFloat(prixRaw) : 0;
  const nb_places = parseInt(nbPlacesRaw);

  try {
    const [result] = await db.query(
 `UPDATE formations SET status = 'published', date_publication = NOW(), date_debut = ?, date_fin = ?, prix = ?, nb_places = ?
       WHERE id = ? AND status = 'accepted'`,
      [date_debut, date_fin || null, prix, nb_places, formationId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation introuvable ou non encore acceptée' });
    res.json({ message: 'Formation publiée dans le catalogue ' });

    db.query('INSERT IGNORE INTO programme_formations (formation_id) VALUES (?)', [formationId]).catch(() => {});
    db.query(
 `SELECT f.titre, u.id AS formateur_user_id FROM formations f
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN users u ON fo.user_id = u.id WHERE f.id = ?`,
      [formationId]
    ).then(([nr]) => {
      if (nr.length > 0) {
        db.query(
 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [nr[0].formateur_user_id, `Votre formation « ${nr[0].titre} » est maintenant publiée dans le catalogue !`, 'publication']
        ).catch(() => {});
      }
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= SÉANCES (admin) ========================= */
router.get('/formations/:id/seances', async (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [seances] = await db.query(
      `SELECT * FROM seances WHERE formation_id = ? ORDER BY date_seance ASC, heure_debut ASC`,
      [formationId]
    );
    const result = seances.map(s => ({ ...s, modules: [], module_titre: '' }));
    for (const s of result) {
      const [modules] = await db.query(
        `SELECT m.id, m.titre, m.ordre FROM seance_modules sm
         JOIN modules_formation m ON sm.module_id = m.id
         WHERE sm.seance_id = ? ORDER BY m.ordre`,
        [s.id]
      );
      s.modules = modules;
      s.module_titre = modules.map(m => m.titre).join(', ');
    }
    res.json(result);
  } catch (err) {
    console.error('[GET seances]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/formations/:id/seances', async (req, res) => {
  const formationId = parseInt(req.params.id);
  const { date_seance, heure_debut, heure_fin, salle, module_ids } = req.body;
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  if (!date_seance || !heure_debut || !heure_fin)
    return res.status(400).json({ error: 'Date, heure début et heure fin sont obligatoires.' });
  try {
    const [result] = await db.query(
      'INSERT INTO seances (formation_id, date_seance, heure_debut, heure_fin, salle) VALUES (?, ?, ?, ?, ?)',
      [formationId, date_seance, heure_debut, heure_fin, salle || null]
    );
    const seanceId = result.insertId;
    if (Array.isArray(module_ids) && module_ids.length > 0) {
      for (const mid of module_ids) {
        await db.query('INSERT INTO seance_modules (seance_id, module_id) VALUES (?, ?)', [seanceId, mid]);
      }
    }
    res.json({ message: 'Séance ajoutée', id: seanceId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/seances/:id', async (req, res) => {
  const seanceId = parseInt(req.params.id);
  if (isNaN(seanceId)) return res.status(400).json({ error: 'Séance ID invalide' });
  try {
    const [result] = await db.query('DELETE FROM seances WHERE id = ?', [seanceId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Séance non trouvée' });
    res.json({ message: 'Séance supprimée ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= FORMATIONS ACCEPTÉES ========================= */
router.get('/formations-accepted', async (req, res) => {
  const sql = `
    SELECT f.id, f.titre, f.description, f.date_debut, f.date_fin,
           f.specialite, f.nb_places, f.status, f.formateur_id,
           u.nom AS formateur, u.email AS formateur_email,
           (SELECT COUNT(*) FROM modules_formation WHERE formation_id = f.id) AS module_count
    FROM formations f
    LEFT JOIN formateurs fo ON f.formateur_id = fo.id
    LEFT JOIN users u ON fo.user_id = u.id
    WHERE f.status = 'accepted'
    ORDER BY f.id DESC
 `;
  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= REJETER (pending_approval → draft) ========================= */
router.put('/formations/:id/reject', async (req, res) => {
  const formationId = parseInt(req.params.id);
  const { reason } = req.body;
  if (isNaN(formationId)) return res.status(400).json({ error: 'Formation ID invalide' });
  try {
    const [result] = await db.query(
 "UPDATE formations SET status = 'draft' WHERE id = ? AND status = 'pending_approval'",
      [formationId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formation non trouvée ou déjà approuvée' });
    res.json({ message: `Formation rejetée  Raison: ${reason || 'Non spécifiée'}` });

    db.query(
 `SELECT f.titre, u.id AS formateur_user_id FROM formations f
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN users u ON fo.user_id = u.id WHERE f.id = ?`,
      [formationId]
    ).then(([nr]) => {
      if (nr.length > 0) {
        db.query(
 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [nr[0].formateur_user_id, `Votre formation « ${nr[0].titre} » a été rejetée. Raison : ${reason || 'Non spécifiée'}`, 'rejet']
        ).catch(() => {});
      }
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= PROGRAMME DE FORMATION ========================= */
router.get('/formations/:id/programme', async (req, res) => {
  const { id } = req.params;
  try {
    const [progRows] = await db.query('SELECT * FROM programme_formations WHERE formation_id = ?', [id]);
    const [modules] = await db.query(
 'SELECT * FROM modules_formation WHERE formation_id = ? ORDER BY ordre ASC, id ASC', [id]
    );
    res.json({ programme: progRows[0] || null, modules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formations/:id/programme', async (req, res) => {
  const { id } = req.params;
  const { description_globale, objectifs, prerequis } = req.body;
  const sql = `
    INSERT INTO programme_formations (formation_id, description_globale, objectifs, prerequis)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      description_globale = VALUES(description_globale),
      objectifs           = VALUES(objectifs),
      prerequis           = VALUES(prerequis)
 `;
  try {
    await db.query(sql, [id, description_globale || null, objectifs || null, prerequis || null]);
    res.json({ message: 'Programme sauvegardé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/formations/:id/modules', validate(moduleSchema), async (req, res) => {
  const { id } = req.params;
  const { titre, description, duree_heures, ordre } = req.body;
  try {
    const [result] = await db.query(
 'INSERT INTO modules_formation (formation_id, titre, description, duree_heures, ordre) VALUES (?, ?, ?, ?, ?)',
      [id, titre.trim(), description || null, duree_heures || null, ordre ?? 0]
    );
    res.json({ id: result.insertId, message: 'Module ajouté.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/formations/:formationId/modules/:moduleId', async (req, res) => {
  const { moduleId } = req.params;
  const { titre, description, duree_heures, ordre } = req.body;
  if (!titre || !titre.trim()) return res.status(400).json({ message: 'Titre du module obligatoire.' });
  try {
    await db.query(
 'UPDATE modules_formation SET titre=?, description=?, duree_heures=?, ordre=? WHERE id=?',
      [titre.trim(), description || null, duree_heures || null, ordre ?? 0, moduleId]
    );
    res.json({ message: 'Module mis à jour.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/formations/:formationId/modules/:moduleId', async (req, res) => {
  const { moduleId } = req.params;
  try {
    await db.query('DELETE FROM modules_formation WHERE id=?', [moduleId]);
    res.json({ message: 'Module supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /liste-attente (globale — candidats + externes) ── */
router.get('/liste-attente', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT la.id, la.date_ajout, la.formation_id,
             f.titre AS formation_titre, f.nb_places,
             (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id AND statut = 'Inscrit') +
             (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_paiement = 'payé') AS inscrits_actifs,
             u.nom AS user_nom, u.email AS user_email,
             'candidat' AS type_utilisateur,
             (SELECT COUNT(*) FROM liste_attente la2 WHERE la2.formation_id = la.formation_id AND la2.date_ajout <= la.date_ajout) AS position
      FROM liste_attente la
      JOIN formations f ON la.formation_id = f.id
      JOIN candidats c ON la.candidat_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE la.candidat_id IS NOT NULL
      UNION ALL
      SELECT la.id, la.date_ajout, la.formation_id,
             f.titre AS formation_titre, f.nb_places,
             (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id AND statut = 'Inscrit') +
             (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_paiement = 'payé') AS inscrits_actifs,
             u.nom AS user_nom, u.email AS user_email,
             'externe' AS type_utilisateur,
             (SELECT COUNT(*) FROM liste_attente la2 WHERE la2.formation_id = la.formation_id AND la2.date_ajout <= la.date_ajout) AS position
      FROM liste_attente la
      JOIN formations f ON la.formation_id = f.id
      JOIN externes ex ON la.externe_id = ex.id
      JOIN users u ON ex.user_id = u.id
      WHERE la.externe_id IS NOT NULL
      ORDER BY formation_id, date_ajout ASC
 `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /liste-attente/:id — retirer une entrée (admin) ── */
router.delete('/liste-attente/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM liste_attente WHERE id = ?', [req.params.id]);
    res.json({ message: "Retiré de la liste d'attente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /liste-attente/:id/inscrire — inscrire manuellement depuis liste d'attente ── */
router.post('/liste-attente/:id/inscrire', async (req, res) => {
  const { id } = req.params;
  try {
    const [[entry]] = await db.query(
 `SELECT la.*, f.titre AS formation_titre
       FROM liste_attente la
       JOIN formations f ON la.formation_id = f.id
       WHERE la.id = ?`, [id]
    );
    if (!entry) return res.status(404).json({ error: 'Entrée introuvable' });

    if (entry.candidat_id) {
      const [[existing]] = await db.query(
 'SELECT id, statut FROM inscriptions WHERE candidat_id = ? AND formation_id = ?',
        [entry.candidat_id, entry.formation_id]
      );
      if (!existing) {
        await db.query(
 "INSERT INTO inscriptions (candidat_id, formation_id, statut, date_inscription) VALUES (?, ?, 'Inscrit', NOW())",
          [entry.candidat_id, entry.formation_id]
        );
      } else if (existing.statut !== 'Inscrit') {
        await db.query(
 "UPDATE inscriptions SET statut = 'Inscrit' WHERE id = ?",
          [existing.id]
        );
      }
      const [[cand]] = await db.query('SELECT user_id FROM candidats WHERE id = ?', [entry.candidat_id]);
      if (cand) {
        db.query(
 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [cand.user_id, `L'administrateur vous a inscrit(e) dans la formation « ${entry.formation_titre} ».`, 'inscription']
        ).catch(() => {});
      }
    } else if (entry.externe_id) {
      const [[existing]] = await db.query(
 'SELECT id, statut_inscription FROM inscriptions_externes WHERE externe_id = ? AND formation_id = ?',
        [entry.externe_id, entry.formation_id]
      );
      if (!existing) {
        await db.query(
 "INSERT INTO inscriptions_externes (externe_id, formation_id, montant, statut_paiement, statut_inscription, date_inscription) VALUES (?, ?, 0, 'payé', 'confirmé', NOW())",
          [entry.externe_id, entry.formation_id]
        );
      } else if (existing.statut_inscription !== 'confirmé') {
        await db.query(
 "UPDATE inscriptions_externes SET statut_inscription = 'confirmé', statut_paiement = 'payé', date_paiement = NOW() WHERE id = ?",
          [existing.id]
        );
      }
      const [[ext]] = await db.query('SELECT user_id FROM externes WHERE id = ?', [entry.externe_id]);
      if (ext) {
        db.query(
 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [ext.user_id, `L'administrateur vous a inscrit(e) dans la formation « ${entry.formation_titre} ».`, 'inscription']
        ).catch(() => {});
      }
    }

    await db.query('DELETE FROM liste_attente WHERE id = ?', [id]);
    res.json({ message: 'Inscrit(e) avec succès depuis la liste d\'attente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= LISTE D'ATTENTE PAR FORMATION ========================= */
router.get('/formations/:id/liste-attente', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT la.id, la.date_ajout,
             ROW_NUMBER() OVER (ORDER BY la.date_ajout ASC) AS position,
             u.nom, u.email,
             IF(la.candidat_id IS NOT NULL, 'candidat', 'externe') AS type_utilisateur
      FROM liste_attente la
      LEFT JOIN candidats c ON la.candidat_id = c.id
      LEFT JOIN externes ex ON la.externe_id = ex.id
      LEFT JOIN users u ON (c.user_id = u.id OR ex.user_id = u.id)
      WHERE la.formation_id = ?
      ORDER BY la.date_ajout ASC
 `, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= INSCRITS PAR FORMATION ========================= */
router.get('/formations/:id/inscrits', async (req, res) => {
  const formationId = parseInt(req.params.id);
  if (isNaN(formationId)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const [rows] = await db.query(`
      SELECT i.id, u.nom, u.email, i.date_inscription, i.statut,
             c.id AS candidat_id, NULL AS externe_id, 'candidat' AS type_participant
      FROM inscriptions i
      JOIN candidats c ON i.candidat_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE i.formation_id = ?

      UNION ALL

      SELECT ie.id, u.nom, u.email, ie.date_inscription, ie.statut_inscription AS statut,
             NULL AS candidat_id, ex.id AS externe_id, 'externe' AS type_participant
      FROM inscriptions_externes ie
      JOIN externes ex ON ie.externe_id = ex.id
      JOIN users u ON ex.user_id = u.id
      WHERE ie.formation_id = ? AND ie.statut_paiement = 'payé'

      ORDER BY date_inscription DESC
 `, [formationId, formationId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= QUIZ ========================= */
router.get('/formations/:id/quiz', async (req, res) => {
  const { id } = req.params;
  try {
    const [[quiz]] = await db.query('SELECT * FROM quiz WHERE formation_id = ?', [id]);
    if (!quiz) return res.json(null);
    const [questions] = await db.query(
 'SELECT * FROM questions_quiz WHERE quiz_id = ? ORDER BY ordre ASC', [quiz.id]
    );
    for (const q of questions) {
      const [reponses] = await db.query('SELECT * FROM reponses_quiz WHERE question_id = ?', [q.id]);
      q.reponses = reponses;
    }
    quiz.questions = questions;
    res.json(quiz);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/formations/:id/quiz', async (req, res) => {
  const { id } = req.params;
  const { titre = 'Quiz de validation', seuil_reussite = 70, nb_tentatives = 3, questions = [] } = req.body;
  if (!questions.length) return res.status(400).json({ error: 'Le quiz doit avoir au moins une question.' });
  try {
    await db.query('DELETE FROM quiz WHERE formation_id = ?', [id]);
    const [result] = await db.query(
 'INSERT INTO quiz (formation_id, titre, seuil_reussite, nb_tentatives) VALUES (?, ?, ?, ?)',
      [id, titre, seuil_reussite, nb_tentatives]
    );
    const quizId = result.insertId;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const [qResult] = await db.query(
 'INSERT INTO questions_quiz (quiz_id, question, ordre) VALUES (?, ?, ?)', [quizId, q.question, i]
      );
      for (const r of (q.reponses || [])) {
        await db.query(
 'INSERT INTO reponses_quiz (question_id, reponse, est_correcte) VALUES (?, ?, ?)',
          [qResult.insertId, r.reponse, r.est_correcte ? 1 : 0]
        );
      }
    }
    res.json({ message: 'Quiz sauvegardé.', quizId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/formations/:id/quiz', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM quiz WHERE formation_id = ?', [id]);
    res.json({ message: 'Quiz supprimé.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ========================= QUIZ STATS ========================= */
router.get('/quiz/stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        f.id            AS formation_id,
        f.titre         AS formation_titre,
        f.specialite,
        u.nom           AS formateur_nom,
        q.id            AS quiz_id,
        q.titre         AS quiz_titre,
        q.seuil_reussite,
        q.nb_tentatives AS max_tentatives,
        (SELECT COUNT(*) FROM questions_quiz WHERE quiz_id = q.id)      AS nb_questions,
        (SELECT COUNT(*) FROM tentatives_quiz WHERE quiz_id = q.id)     AS total_tentatives,
        (SELECT COUNT(*) FROM tentatives_quiz WHERE quiz_id = q.id AND reussi = 1) AS tentatives_reussies,
        (SELECT ROUND(AVG(score),1) FROM tentatives_quiz WHERE quiz_id = q.id)    AS score_moyen
      FROM formations f
      LEFT JOIN quiz q ON q.formation_id = f.id
      LEFT JOIN formateurs fo ON fo.id = f.formateur_id
      LEFT JOIN users u ON u.id = fo.user_id
      ORDER BY f.titre ASC
 `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ========================= SUPPORTS ========================= */
router.post('/formations/:id/supports', uploadSupport.single('fichier'), async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  if (!type) return res.status(400).json({ error: 'Le type de support est obligatoire.' });

  const fichier = req.file ? `/uploads/${req.file.filename}` : req.body.fichier;
  if (!fichier) return res.status(400).json({ error: 'Un fichier ou une URL est obligatoire.' });

  try {
    const [result] = await db.query(
 'INSERT INTO supports (formation_id, type, fichier) VALUES (?, ?, ?)',
      [id, type, fichier]
    );
    const nom = req.body.nom || req.file?.originalname || fichier;
    res.json({ id: result.insertId, type, fichier, nom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/supports/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[sup]] = await db.query('SELECT fichier FROM supports WHERE id = ?', [id]);
    if (sup && sup.fichier && sup.fichier.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', sup.fichier);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query('DELETE FROM supports WHERE id = ?', [id]);
    res.json({ message: 'Support supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= PAIEMENTS EXTERNES ========================= */
router.get('/paiements-externes', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        ie.id,
        ie.montant,
        ie.statut_paiement,
        ie.statut_inscription,
        ie.payment_ref,
        ie.date_paiement,
        ie.date_inscription,
        u.nom   AS externe_nom,
        u.email AS externe_email,
        f.titre AS formation_titre
      FROM inscriptions_externes ie
      JOIN externes ex ON ie.externe_id = ex.id
      JOIN users    u  ON ex.user_id    = u.id
      JOIN formations f ON ie.formation_id = f.id
      WHERE ie.statut_inscription != 'annulé'
      ORDER BY ie.date_inscription DESC
 `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= ATTESTATION STATS ========================= */
router.get('/attestation/stats', async (req, res) => {
  try {
    // Step 1: basic formation info
    const [formations] = await db.query(`
      SELECT f.id AS formation_id, f.titre AS formation_titre, f.specialite,
        u.nom AS formateur_nom,
        (SELECT COUNT(*) FROM modules_formation WHERE formation_id = f.id) AS total_modules,
        (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id AND statut = 'confirmé') AS candidats_inscrits,
        (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_inscription = 'confirmé') AS externes_inscrits,
        (SELECT COUNT(*) FROM quiz WHERE formation_id = f.id) AS has_quiz
      FROM formations f
      LEFT JOIN formateurs fo ON fo.id = f.formateur_id
      LEFT JOIN users u ON u.id = fo.user_id
      ORDER BY f.titre ASC
 `);

    // Step 2: eligible candidats per formation
    const [eligC] = await db.query(`
      SELECT sub.formation_id, COUNT(*) AS nb
      FROM (
        SELECT pc.formation_id, pc.candidat_id
        FROM progression_candidats pc
        INNER JOIN inscriptions i ON i.candidat_id = pc.candidat_id
          AND i.formation_id = pc.formation_id AND i.statut = 'confirmé'
        WHERE pc.candidat_id IS NOT NULL AND pc.statut = 'termine'
        GROUP BY pc.formation_id, pc.candidat_id
        HAVING COUNT(DISTINCT pc.module_id) = (
          SELECT COUNT(*) FROM modules_formation WHERE formation_id = pc.formation_id
        )
        AND (
          NOT EXISTS (SELECT 1 FROM quiz WHERE formation_id = pc.formation_id)
          OR EXISTS (
            SELECT 1 FROM tentatives_quiz tq
            INNER JOIN quiz qz ON qz.id = tq.quiz_id
            WHERE qz.formation_id = pc.formation_id AND tq.candidat_id = pc.candidat_id AND tq.reussi = 1
          )
        )
      ) AS sub
      GROUP BY sub.formation_id
 `);

    // Step 3: eligible externes per formation
    const [eligE] = await db.query(`
      SELECT sub.formation_id, COUNT(*) AS nb
      FROM (
        SELECT pc.formation_id, pc.externe_id
        FROM progression_candidats pc
        INNER JOIN inscriptions_externes ie ON ie.externe_id = pc.externe_id
          AND ie.formation_id = pc.formation_id AND ie.statut_inscription = 'confirmé'
        WHERE pc.externe_id IS NOT NULL AND pc.statut = 'termine'
        GROUP BY pc.formation_id, pc.externe_id
        HAVING COUNT(DISTINCT pc.module_id) = (
          SELECT COUNT(*) FROM modules_formation WHERE formation_id = pc.formation_id
        )
        AND (
          NOT EXISTS (SELECT 1 FROM quiz WHERE formation_id = pc.formation_id)
          OR EXISTS (
            SELECT 1 FROM tentatives_quiz tq
            INNER JOIN quiz qz ON qz.id = tq.quiz_id
            WHERE qz.formation_id = pc.formation_id AND tq.externe_id = pc.externe_id AND tq.reussi = 1
          )
        )
      ) AS sub
      GROUP BY sub.formation_id
 `);

    // Merge
    const mapC = Object.fromEntries(eligC.map(r => [r.formation_id, r.nb]));
    const mapE = Object.fromEntries(eligE.map(r => [r.formation_id, r.nb]));
    const result = formations.map(f => ({
      ...f,
      candidats_eligibles: mapC[f.formation_id] || 0,
      externes_eligibles:  mapE[f.formation_id] || 0
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
