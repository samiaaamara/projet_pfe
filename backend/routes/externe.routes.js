const express = require('express');
const router = express.Router();
const https = require('https');
const crypto = require('crypto');
const db = require('../db');
const validate = require('../middleware/validate');
const { notationExterneSchema, justificatifExterneSchema } = require('../validators/schemas');
const { genererAttestationPDF } = require('../attestationPdf');
const syncFormationStatuses = require('../utils/syncFormationStatuses');

/* ─── Helper : aplatir un objet en paramètres form-encoded Stripe ─────────── */
function flattenParams(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        const arrayKey = `${fullKey}[${i}]`;
        if (typeof item === 'object' && item !== null) {
          Object.assign(result, flattenParams(item, arrayKey));
        } else {
          result[arrayKey] = String(item);
        }
      });
    } else if (typeof value === 'object') {
      Object.assign(result, flattenParams(value, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

/* ─── Helper : appel HTTPS vers l'API Stripe ─────────────────────────────── */
function stripeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const flat = data ? flattenParams(data) : null;
    const body = flat ? new URLSearchParams(flat).toString() : null;
    const options = {
      hostname: 'api.stripe.com',
      port: 443,
      path: `/v1${path}`,
      method,
      headers: {
 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
 'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch (e) { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/* ─── Helper : vérifier la signature webhook Stripe ──────────────────────── */
function verifyStripeSignature(rawBody, signature, secret) {
  try {
    const parts = {};
    signature.split(',').forEach(part => {
      const [k, v] = part.split('=');
      parts[k] = v;
    });
    const payload = `${parts.t}.${rawBody.toString()}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return expected === parts.v1;
  } catch (e) { return false; }
}

/* ─── Utilitaire : notification ──────────────────────────────────────────── */
async function envoyerNotif(externeId, message) {
  try {
    const [rows] = await db.query('SELECT user_id FROM externes WHERE id = ?', [externeId]);
    if (!rows.length) return;
    await db.query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [rows[0].user_id, message, 'approbation']);
  } catch (_) {}
}

/* ─── GET /formations ─────────────────────────────────────────────────────── */
router.get('/formations', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  const externeId = parseInt(req.query.externeId) || null;

  try {
    await syncFormationStatuses();
    const countSql = `
      SELECT COUNT(*) AS total FROM formations f
      WHERE f.status = 'published'
        AND (f.date_debut IS NULL OR f.date_debut > CURDATE())
    `;
    const dataSql = `
      SELECT f.*,
        u.nom AS formateur_nom,
        (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) +
        (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_paiement = 'payé') AS inscrits
      FROM formations f
      JOIN formateurs fo ON f.formateur_id = fo.id
      JOIN users u ON fo.user_id = u.id
      WHERE f.status = 'published'
        AND (f.date_debut IS NULL OR f.date_debut > CURDATE())
      ORDER BY f.date_debut IS NULL ASC, f.date_debut ASC
      LIMIT ? OFFSET ?
    `;

    const [countResult] = await db.query(countSql);
    const total = countResult[0].total;
    const [results] = await db.query(dataSql, [limit, offset]);
    res.json({
      data: results,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /mes-inscriptions/:externeId ───────────────────────────────────── */
router.get('/mes-inscriptions/:externeId', async (req, res) => {
  const { externeId } = req.params;
  const sql = `
    SELECT ie.id, ie.externe_id, ie.formation_id, ie.montant, ie.statut_paiement,
           ie.date_inscription, ie.date_paiement, ie.payment_ref,
           f.titre, f.description, f.date_debut, f.date_fin, f.prix,
           f.photo, f.specialite, f.status, u.nom AS formateur_nom,
           CASE
             WHEN f.status IN ('archivée', 'terminée') OR (f.date_fin IS NOT NULL AND f.date_fin < CURDATE())
             THEN 'Terminée'
             ELSE ie.statut_inscription
           END AS statut_inscription
    FROM inscriptions_externes ie
    JOIN formations f ON ie.formation_id = f.id
    JOIN formateurs fo ON f.formateur_id = fo.id
    JOIN users u ON fo.user_id = u.id
    WHERE ie.externe_id = ? AND ie.statut_inscription = 'confirmé'
    ORDER BY ie.date_inscription DESC
 `;
  try {
    const [results] = await db.query(sql, [externeId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /mes-demandes/:externeId ──────────────────────────────────────── */
router.get('/mes-demandes/:externeId', async (req, res) => {
  const { externeId } = req.params;
  const sql = `
    SELECT ie.id, ie.formation_id, ie.statut_inscription, ie.statut_paiement,
           ie.montant, ie.date_inscription, f.titre, f.date_debut, f.date_fin, f.specialite
    FROM inscriptions_externes ie
    JOIN formations f ON ie.formation_id = f.id
    WHERE ie.externe_id = ? AND ie.statut_inscription = 'en_attente'
    ORDER BY ie.date_inscription DESC
 `;
  try {
    const [results] = await db.query(sql, [externeId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /initier-paiement ─────────────────────────────────────────────── */
router.post('/initier-paiement', async (req, res) => {
  const { externe_id, formation_id } = req.body;
  if (!externe_id || !formation_id) {
    return res.status(400).json({ message: 'externe_id et formation_id sont obligatoires' });
  }

  try {
    const [existing] = await db.query(
      'SELECT id, statut_paiement, statut_inscription, payment_ref FROM inscriptions_externes WHERE externe_id = ? AND formation_id = ?',
      [externe_id, formation_id]
    );

    const active = existing.find(r => r.statut_inscription !== 'annulé');
    if (active) {
      if (active.statut_paiement === 'payé')
        return res.status(400).json({ message: 'Vous êtes déjà inscrit à cette formation.' });
      if (active.statut_inscription === 'confirmé')
        return res.status(400).json({ message: 'Votre inscription est confirmée. Procédez au paiement.' });
      return res.status(400).json({ message: "Votre demande est déjà en attente d'approbation." });
    }

    const [activeExt] = await db.query(
      `SELECT ie.id FROM inscriptions_externes ie
       JOIN formations f ON ie.formation_id = f.id
       WHERE ie.externe_id = ?
         AND ie.statut_inscription = 'confirmé'
         AND ie.statut_paiement = 'payé'
         AND f.status NOT IN ('archivée', 'terminée')
         AND (f.date_fin IS NULL OR f.date_fin >= CURDATE())`,
      [externe_id]
    );
    if (activeExt.length > 0)
      return res.status(400).json({ message: 'Vous êtes déjà inscrit à une formation en cours. Attendez sa fin pour vous inscrire à une autre.' });

    const [rows] = await db.query(
      `SELECT f.prix, f.nb_places, f.titre,
         (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) +
         (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_paiement = 'payé') AS inscrits
       FROM formations f WHERE f.id = ? AND f.status = 'published'`,
      [formation_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Formation introuvable ou non publiée.' });

    const { prix, nb_places, inscrits, titre } = rows[0];
    if (nb_places !== null && inscrits >= nb_places)
      return res.status(400).json({ message: 'Cette formation est complète.' });

    const montant = parseFloat(prix) || 0;
    const annule = existing.find(r => r.statut_inscription === 'annulé');

    if (annule) {
      await db.query(
        "UPDATE inscriptions_externes SET statut_inscription = 'en_attente', statut_paiement = 'en_attente', montant = ?, date_inscription = NOW() WHERE id = ?",
        [montant, annule.id]
      );
    } else {
      await db.query(
        "INSERT INTO inscriptions_externes (externe_id, formation_id, montant, statut_paiement, statut_inscription) VALUES (?, ?, ?, 'en_attente', 'en_attente')",
        [externe_id, formation_id, montant]
      );
    }
    return res.json({ pending: true, message: "Demande d'inscription envoyée. En attente d'approbation par l'administrateur." });
  } catch (err) {
    console.error('Erreur inscription externe:', err.message);
    res.status(500).json({ message: 'Erreur serveur.', detail: err.message });
  }
});

/* ─── POST /lancer-paiement/:id ─────────────────────────────────────────── */
router.post('/lancer-paiement/:id', async (req, res) => {
  const inscriptionId = parseInt(req.params.id);
  try {
    const [[insc]] = await db.query(
 "SELECT * FROM inscriptions_externes WHERE id = ? AND statut_inscription = 'confirmé' AND statut_paiement = 'en_attente'",
      [inscriptionId]
    );
    if (!insc) return res.status(400).json({ message: 'Inscription introuvable ou non approuvée.' });

    const [[form]] = await db.query('SELECT titre, status FROM formations WHERE id = ?', [insc.formation_id]);
    if (!form || ['en_cours', 'terminée', 'archivée'].includes(form.status))
      return res.status(400).json({ message: 'Le paiement n\'est plus possible : cette formation a déjà commencé ou est terminée.' });
    const appUrl = process.env.APP_URL || 'http://localhost:4200';
    const currency = (process.env.STRIPE_CURRENCY || 'eur').toLowerCase();

    const sessionPayload = {
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency, unit_amount: Math.round(insc.montant * 100), product_data: { name: `Inscription : ${form.titre}` } }, quantity: 1 }],
      mode: 'payment',
      success_url: `${appUrl}/paiement-retour?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/paiement-retour?status=echec`,
      metadata: { externe_id: String(insc.externe_id), formation_id: String(insc.formation_id) },
    };

    const stripeRes = await stripeRequest('POST', '/checkout/sessions', sessionPayload);
    if (stripeRes.status !== 200 || !stripeRes.data.url)
      return res.status(502).json({ message: 'Erreur paiement Stripe.', detail: stripeRes.data });

    await db.query('UPDATE inscriptions_externes SET payment_ref=? WHERE id=?', [stripeRes.data.id, inscriptionId]);
    res.json({ payUrl: stripeRes.data.url, paymentRef: stripeRes.data.id });
  } catch (err) {
    res.status(502).json({ message: 'Impossible de joindre Stripe.', detail: err.message });
  }
});

/* ─── GET /confirmer-paiement ────────────────────────────────────────────── */
router.get('/confirmer-paiement', async (req, res) => {
  const { payment_ref } = req.query;
  if (!payment_ref) return res.status(400).json({ message: 'payment_ref manquant.' });

  try {
    const stripeRes = await stripeRequest('GET', `/checkout/sessions/${payment_ref}`, null);
    if (stripeRes.status !== 200)
      return res.json({ success: false, message: 'Session Stripe introuvable.', detail: stripeRes.data });

    const session = stripeRes.data;
    if (session.payment_status !== 'paid')
      return res.json({ success: false, status: session.payment_status, message: 'Paiement non complété.' });

    await db.query(
 "UPDATE inscriptions_externes SET statut_paiement='payé', statut_inscription='confirmé', date_paiement=NOW() WHERE payment_ref=?",
      [payment_ref]
    );

    db.query(
 `SELECT ie.externe_id, ie.montant, f.titre
       FROM inscriptions_externes ie JOIN formations f ON ie.formation_id = f.id
       WHERE ie.payment_ref = ?`,
      [payment_ref]
    ).then(([nr]) => {
      if (nr.length > 0) {
        envoyerNotif(nr[0].externe_id, `Paiement de ${nr[0].montant} EUR confirmé pour "${nr[0].titre}" `);
      }
    }).catch(() => {});

    res.json({ success: true, message: 'Paiement confirmé ' });
  } catch (err) {
    console.error('Stripe confirm error:', err.message);
    res.status(500).json({ message: 'Erreur vérification paiement.', detail: err.message });
  }
});

/* ─── POST /webhook-stripe ───────────────────────────────────────────────── */
router.post('/webhook-stripe', express.raw({ type: 'application/json' }), (req, res) => {
  res.sendStatus(200);

  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret && signature && !verifyStripeSignature(req.body, signature, webhookSecret)) {
    console.error('Stripe webhook signature invalide');
    return;
  }

  let event;
  try { event = JSON.parse(req.body.toString()); }
  catch (e) { return; }

  if (event.type !== 'checkout.session.completed') return;

  const session = event.data?.object;
  if (!session || session.payment_status !== 'paid') return;

  const sessionId = session.id;
  db.query(
 "UPDATE inscriptions_externes SET statut_paiement='payé', statut_inscription='confirmé', date_paiement=NOW() WHERE payment_ref=? AND statut_paiement='en_attente'",
    [sessionId]
  ).then(([result]) => {
    if (result.affectedRows === 0) return;
    db.query(
 `SELECT ie.externe_id, ie.montant, f.titre
       FROM inscriptions_externes ie JOIN formations f ON ie.formation_id = f.id
       WHERE ie.payment_ref = ?`,
      [sessionId]
    ).then(([nr]) => {
      if (nr.length > 0) {
        envoyerNotif(nr[0].externe_id, `Paiement de ${nr[0].montant} EUR confirmé pour "${nr[0].titre}" `);
      }
    }).catch(() => {});
  }).catch(() => {});
});

/* ─── GET /supports/:externeId/:formationId ──────────────────────────────── */
router.get('/supports/:externeId/:formationId', async (req, res) => {
  const { externeId, formationId } = req.params;
  try {
    const [access] = await db.query(
 "SELECT * FROM inscriptions_externes WHERE externe_id = ? AND formation_id = ? AND statut_paiement = 'payé'",
      [externeId, formationId]
    );
    if (access.length === 0) return res.status(403).json({ message: 'Accès refusé : paiement requis.' });
    const [supports] = await db.query('SELECT * FROM supports WHERE formation_id = ?', [formationId]);
    res.json(supports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /profil/:userId ─────────────────────────────────────────────────── */
router.get('/profil/:userId', async (req, res) => {
  const sql = `
    SELECT u.id, u.nom, u.email, u.role, ex.id AS externeId, ex.telephone, ex.entreprise
    FROM users u JOIN externes ex ON ex.user_id = u.id WHERE u.id = ?
 `;
  try {
    const [results] = await db.query(sql, [req.params.userId]);
    if (results.length === 0) return res.status(404).json({ message: 'Introuvable.' });
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /formations/:id/programme (public) ─────────────────────────────── */
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

/* ─── GET /progression/:externeId ────────────────────────────────────────── */
router.get('/progression/:externeId', async (req, res) => {
  const { externeId } = req.params;
  const sql = `
    SELECT COUNT(m.id) AS total_modules,
           SUM(CASE WHEN COALESCE(p.statut,'non_commence') = 'termine' THEN 1 ELSE 0 END) AS modules_termines
    FROM inscriptions_externes ie
    JOIN formations f ON ie.formation_id = f.id
    JOIN modules_formation m ON m.formation_id = f.id
    LEFT JOIN progression_candidats p ON p.module_id = m.id AND p.externe_id = ?
    WHERE ie.externe_id = ? AND ie.statut_paiement = 'payé'
 `;
  try {
    const [rows] = await db.query(sql, [externeId, externeId]);
    const { total_modules, modules_termines } = rows[0];
    const progression = total_modules > 0 ? Math.round((modules_termines / total_modules) * 100) : 0;
    res.json({ progression });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /progression-modules/:externeId/:formationId ───────────────────── */
router.get('/progression-modules/:externeId/:formationId', async (req, res) => {
  const { externeId, formationId } = req.params;
  const sql = `
    SELECT m.id, m.titre, m.ordre, m.duree_heures,
           COALESCE(p.statut, 'non_commence') AS statut
    FROM modules_formation m
    LEFT JOIN progression_candidats p ON p.module_id = m.id AND p.externe_id = ? AND p.formation_id = ?
    WHERE m.formation_id = ?
    ORDER BY m.ordre ASC, m.id ASC
 `;
  try {
    const [modules] = await db.query(sql, [externeId, formationId, formationId]);
    const total = modules.length;
    const termines = modules.filter(m => m.statut === 'termine').length;
    const pourcentage = total > 0 ? Math.round((termines / total) * 100) : 0;
    res.json({ modules, pourcentage, total, termines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /notation ─────────────────────────────────────────────────────── */
router.post('/notation', validate(notationExterneSchema), async (req, res) => {
  const { externe_id, formation_id, note, commentaire } = req.body;
  try {
    const [existing] = await db.query(
 'SELECT id FROM notations WHERE externe_id = ? AND formation_id = ?',
      [externe_id, formation_id]
    );
    if (existing.length > 0) {
      await db.query(
 'UPDATE notations SET note = ?, commentaire = ? WHERE externe_id = ? AND formation_id = ?',
        [note, commentaire || null, externe_id, formation_id]
      );
      res.json({ message: 'Note mise à jour' });
    } else {
      await db.query(
 'INSERT INTO notations (externe_id, formation_id, note, commentaire, date_notation) VALUES (?, ?, ?, ?, NOW())',
        [externe_id, formation_id, note, commentaire || null]
      );
      res.json({ message: 'Formation notée avec succès' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /notation/:externeId/:formationId ──────────────────────────────── */
router.get('/notation/:externeId/:formationId', async (req, res) => {
  const { externeId, formationId } = req.params;
  try {
    const [results] = await db.query(
 'SELECT note, commentaire FROM notations WHERE externe_id = ? AND formation_id = ?',
      [externeId, formationId]
    );
    res.json(results[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /mes-presences/:externeId/:formationId ─────────────────────────── */
router.get('/mes-presences/:externeId/:formationId', async (req, res) => {
  const { externeId, formationId } = req.params;
  const sql = `
    SELECT s.id AS seance_id, s.date_seance, s.heure_debut, s.heure_fin, s.salle, s.statut AS statut_seance,
           COALESCE(p.statut, 'absent') AS statut_presence,
           j.statut AS justif_statut
    FROM seances s
    LEFT JOIN presences p ON p.seance_id = s.id AND p.externe_id = ?
    LEFT JOIN justificatifs j ON j.seance_id = s.id AND j.externe_id = ?
    WHERE s.formation_id = ?
    ORDER BY s.date_seance ASC, s.heure_debut ASC
 `;
  try {
    const [rows] = await db.query(sql, [externeId, externeId, formationId]);
    const total = rows.length;
    const presents = rows.filter(r => r.statut_presence === 'présent' || r.statut_presence === 'excusé').length;
    const taux = total > 0 ? Math.round((presents / total) * 100) : null;
    res.json({ seances: rows, total, presents, taux });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /justificatifs ────────────────────────────────────────────────── */
router.post('/justificatifs', validate(justificatifExterneSchema), async (req, res) => {
  const { externe_id, seance_id, motif } = req.body;
  try {
    await db.query(
 `INSERT INTO justificatifs (externe_id, seance_id, motif)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE motif = VALUES(motif), statut = 'en_attente', date_soumission = NOW()`,
      [externe_id, seance_id, motif]
    );
    res.json({ message: 'Justificatif soumis ' });

    db.query(
 `SELECT f.titre, fo.user_id AS formateur_uid, u.nom AS externe_nom, s.date_seance
       FROM seances s
       JOIN formations f ON s.formation_id = f.id
       JOIN formateurs fo ON f.formateur_id = fo.id
       JOIN externes ex ON ex.id = ?
       JOIN users u ON ex.user_id = u.id
       WHERE s.id = ?`,
      [externe_id, seance_id]
    ).then(([nr]) => {
      if (nr.length > 0) {
        const d = nr[0].date_seance ? new Date(nr[0].date_seance).toLocaleDateString('fr-FR') : '';
        db.query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [nr[0].formateur_uid, `${nr[0].externe_nom} a soumis un justificatif d'absence pour la séance du ${d} (${nr[0].titre})`, 'presence']
        ).catch(() => {});
      }
    }).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /mes-justificatifs/:externeId ──────────────────────────────────── */
router.get('/mes-justificatifs/:externeId', async (req, res) => {
  const sql = `
    SELECT j.id, j.seance_id, j.motif, j.statut, j.date_soumission,
           s.date_seance, s.heure_debut, f.titre AS formation_titre
    FROM justificatifs j
    JOIN seances s ON j.seance_id = s.id
    JOIN formations f ON s.formation_id = f.id
    WHERE j.externe_id = ?
    ORDER BY j.date_soumission DESC
 `;
  try {
    const [rows] = await db.query(sql, [req.params.externeId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /eligibilite-attestation/:externeId/:formationId ──────────────── */
router.get('/eligibilite-attestation/:externeId/:formationId', async (req, res) => {
  const { externeId, formationId } = req.params;
  const progressionSql = `
    SELECT COUNT(m.id) AS total_modules,
           SUM(CASE WHEN COALESCE(p.statut,'non_commence') = 'termine' THEN 1 ELSE 0 END) AS modules_termines
    FROM modules_formation m
    LEFT JOIN progression_candidats p ON p.module_id = m.id AND p.externe_id = ? AND p.formation_id = ?
    WHERE m.formation_id = ?
 `;
  try {
    const [progRows] = await db.query(progressionSql, [externeId, formationId, formationId]);
    const prog = progRows[0];
    const progression = prog.total_modules > 0 ? Math.round((prog.modules_termines / prog.total_modules) * 100) : 0;

    const [[quiz]] = await db.query(
 'SELECT id, seuil_reussite, nb_tentatives FROM quiz WHERE formation_id = ?', [formationId]
    );
    let has_quiz = false, quiz_ok = true, quiz_score = null, quiz_tentatives = 0;
    let nb_tentatives_max = null, seuil_reussite = null;
    if (quiz) {
      has_quiz = true;
      nb_tentatives_max = quiz.nb_tentatives;
      seuil_reussite = quiz.seuil_reussite;
      const [tentatives] = await db.query(
 'SELECT score, reussi FROM tentatives_quiz WHERE externe_id = ? AND quiz_id = ? ORDER BY score DESC',
        [externeId, quiz.id]
      );
      quiz_tentatives = tentatives.length;
      quiz_ok = tentatives.some(t => t.reussi);
      quiz_score = tentatives.length > 0 ? tentatives[0].score : null;
    }

    const eligible = progression === 100 && quiz_ok;
    res.json({
      eligible, progression,
      total_modules: prog.total_modules, modules_termines: prog.modules_termines,
      has_quiz, quiz_ok, quiz_score, quiz_tentatives, nb_tentatives_max, seuil_reussite
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /quiz/:formationId ─────────────────────────────────────────────── */
router.get('/quiz/:formationId', async (req, res) => {
  const { formationId } = req.params;
  try {
    const [[formation]] = await db.query('SELECT status FROM formations WHERE id = ?', [formationId]);
    if (!formation || formation.status !== 'terminée')
      return res.status(403).json({ message: 'Le quiz est accessible uniquement une fois la formation terminée.' });
    const [[quiz]] = await db.query(
 'SELECT id, titre, seuil_reussite, nb_tentatives FROM quiz WHERE formation_id = ?', [formationId]
    );
    if (!quiz) return res.json(null);
    const [questions] = await db.query(
 'SELECT id, question, ordre FROM questions_quiz WHERE quiz_id = ? ORDER BY ordre ASC', [quiz.id]
    );
    for (const q of questions) {
      const [reponses] = await db.query('SELECT id, reponse FROM reponses_quiz WHERE question_id = ?', [q.id]);
      q.reponses = reponses;
    }
    quiz.questions = questions;
    res.json(quiz);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── GET /quiz-score/:externeId/:formationId ────────────────────────────── */
router.get('/quiz-score/:externeId/:formationId', async (req, res) => {
  const { externeId, formationId } = req.params;
  try {
    const [[quiz]] = await db.query(
 'SELECT id, seuil_reussite, nb_tentatives FROM quiz WHERE formation_id = ?', [formationId]
    );
    if (!quiz) return res.json({ has_quiz: false });
    const [tentatives] = await db.query(
 'SELECT score, reussi FROM tentatives_quiz WHERE externe_id = ? AND quiz_id = ? ORDER BY score DESC',
      [externeId, quiz.id]
    );
    res.json({
      has_quiz: true, quiz_id: quiz.id,
      tentatives: tentatives.length, nb_tentatives_max: quiz.nb_tentatives,
      seuil_reussite: quiz.seuil_reussite,
      best_score: tentatives.length > 0 ? tentatives[0].score : null,
      reussi: tentatives.some(t => t.reussi)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── POST /quiz/soumettre ───────────────────────────────────────────────── */
router.post('/quiz/soumettre', async (req, res) => {
  const { externe_id, quiz_id, reponses } = req.body;
  if (!externe_id || !quiz_id || !Array.isArray(reponses))
    return res.status(400).json({ error: 'Données manquantes.' });
  try {
    const [[quiz]] = await db.query('SELECT id, seuil_reussite, nb_tentatives FROM quiz WHERE id = ?', [quiz_id]);
    if (!quiz) return res.status(404).json({ error: 'Quiz introuvable.' });

    const [existingTentatives] = await db.query(
 'SELECT id FROM tentatives_quiz WHERE externe_id = ? AND quiz_id = ?', [externe_id, quiz_id]
    );
    if (existingTentatives.length >= quiz.nb_tentatives)
      return res.status(400).json({ error: 'Nombre maximum de tentatives atteint.' });

    const [allQuestions] = await db.query('SELECT id FROM questions_quiz WHERE quiz_id = ?', [quiz_id]);
    let correct = 0;
    for (const rep of reponses) {
      const [[r]] = await db.query(
 'SELECT est_correcte FROM reponses_quiz WHERE id = ? AND question_id = ?',
        [rep.reponse_id, rep.question_id]
      );
      if (r && r.est_correcte) correct++;
    }
    const score = allQuestions.length > 0 ? Math.round((correct / allQuestions.length) * 100) : 0;
    const reussi = score >= quiz.seuil_reussite;
    await db.query(
 'INSERT INTO tentatives_quiz (externe_id, quiz_id, score, reussi) VALUES (?, ?, ?, ?)',
      [externe_id, quiz_id, score, reussi ? 1 : 0]
    );
    res.json({
      score, reussi, seuil_reussite: quiz.seuil_reussite, correct, total: allQuestions.length,
      tentatives_restantes: quiz.nb_tentatives - existingTentatives.length - 1
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── GET /attestation-data/:externeId/:formationId ─────────────────────── */
router.get('/attestation-data/:externeId/:formationId', async (req, res) => {
  const { externeId, formationId } = req.params;
  const sql = `
    SELECT f.titre, f.date_debut, f.date_fin, f.specialite,
           u_form.nom AS formateur_nom,
           u_ex.nom AS etudiant_nom, u_ex.email AS etudiant_email,
           ie.date_inscription,
           (SELECT COUNT(*) FROM seances WHERE formation_id = f.id) AS total_seances,
           (SELECT COUNT(*) FROM seances s
            JOIN presences p ON p.seance_id = s.id
            WHERE s.formation_id = f.id AND p.externe_id = ? AND p.statut IN ('présent','excusé')
           ) AS seances_presentes
    FROM inscriptions_externes ie
    JOIN formations f ON ie.formation_id = f.id
    JOIN formateurs fo ON f.formateur_id = fo.id
    JOIN users u_form ON fo.user_id = u_form.id
    JOIN externes ex ON ie.externe_id = ex.id
    JOIN users u_ex ON ex.user_id = u_ex.id
    WHERE ie.externe_id = ? AND ie.formation_id = ? AND ie.statut_paiement = 'payé'
 `;
  try {
    const [rows] = await db.query(sql, [externeId, externeId, formationId]);
    if (!rows.length) return res.status(404).json({ error: 'Inscription introuvable' });
    const d = rows[0];
    const taux = d.total_seances > 0 ? Math.round((d.seances_presentes / d.total_seances) * 100) : null;
    const refId = `ATT-E${externeId}-F${formationId}`;
    const dateGen = new Date().toLocaleDateString('fr-FR');
    const QRCode = require('qrcode');
    const qrContent = [
 `REF: ${refId}`,
 `Titulaire : ${d.etudiant_nom}`,
 `Formation : ${d.titre}`,
 `Taux présence : ${taux ?? 'N/A'}%`,
 `Délivré : ${dateGen}`,
    ].join('\n');
    const qr_data_url = await QRCode.toDataURL(qrContent, { width: 150, margin: 1, color: { dark: '#003366' } });
    res.json({ ...d, taux, ref_id: refId, qr_data_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /generer-attestation/:externeId/:formationId ──────────────────── */
router.get('/generer-attestation/:externeId/:formationId', async (req, res) => {
  const { externeId, formationId } = req.params;
  try {
    // 1. Vérifier l'éligibilité
    const [inscRows] = await db.query(
 "SELECT id FROM inscriptions_externes WHERE externe_id = ? AND formation_id = ? AND statut_paiement = 'payé'",
      [externeId, formationId]
    );
    if (!inscRows.length) return res.status(404).json({ error: 'Inscription introuvable' });

    const [[progRow]] = await db.query(`
      SELECT COUNT(m.id) AS total,
             SUM(CASE WHEN COALESCE(p.statut,'non_commence') = 'termine' THEN 1 ELSE 0 END) AS termines
      FROM modules_formation m
      LEFT JOIN progression_candidats p ON p.module_id = m.id AND p.externe_id = ? AND p.formation_id = ?
      WHERE m.formation_id = ?
 `, [externeId, formationId, formationId]);

    const progression = progRow.total > 0 ? Math.round((progRow.termines / progRow.total) * 100) : 0;

    const [[quizRow]] = await db.query(`
      SELECT COUNT(*) AS quiz_reussi FROM tentatives_quiz tq
      JOIN quiz q ON tq.quiz_id = q.id
      WHERE q.formation_id = ? AND tq.externe_id = ? AND tq.reussi = 1
 `, [formationId, externeId]);

    if (progression < 100) return res.status(403).json({ error: 'Progression insuffisante' });
    if (!quizRow.quiz_reussi) return res.status(403).json({ error: 'Quiz non réussi' });

    // 2. Récupérer les données
    const [rows] = await db.query(`
      SELECT f.titre, f.date_debut, f.date_fin, f.specialite,
             u_form.nom AS formateur_nom,
             u_ex.nom AS candidat_nom,
             (SELECT COUNT(*) FROM seances WHERE formation_id = f.id) AS total_seances,
             (SELECT COUNT(*) FROM seances s JOIN presences p ON p.seance_id = s.id
              WHERE s.formation_id = f.id AND p.externe_id = ? AND p.statut IN ('présent','excusé')
             ) AS seances_presentes
      FROM inscriptions_externes ie
      JOIN formations f ON ie.formation_id = f.id
      JOIN formateurs fo ON f.formateur_id = fo.id
      JOIN users u_form ON fo.user_id = u_form.id
      JOIN externes ex ON ie.externe_id = ex.id
      JOIN users u_ex ON ex.user_id = u_ex.id
      WHERE ie.externe_id = ? AND ie.formation_id = ?
 `, [externeId, externeId, formationId]);

    if (!rows.length) return res.status(404).json({ error: 'Données introuvables' });
    const d = rows[0];
    const taux = d.total_seances > 0 ? Math.round((d.seances_presentes / d.total_seances) * 100) : 100;

    // 3. Générer le PDF
    await genererAttestationPDF(res, {
      candidat_nom : d.candidat_nom,
      titre        : d.titre,
      specialite   : d.specialite,
      formateur_nom: d.formateur_nom,
      date_debut   : d.date_debut ? new Date(d.date_debut).toLocaleDateString('fr-FR') : '—',
      date_fin     : d.date_fin   ? new Date(d.date_fin).toLocaleDateString('fr-FR')   : '—',
      taux,
      dateGen      : new Date().toLocaleDateString('fr-FR'),
      refId        : `ATT-E${externeId}-F${formationId}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /liste-attente ────────────────────────────────────────────────── */
router.post('/liste-attente', async (req, res) => {
  const { externe_id, formation_id } = req.body;
  if (!externe_id || !formation_id) return res.status(400).json({ error: 'Champs manquants' });
  try {
    const [rows] = await db.query(
 `SELECT nb_places,
              (SELECT COUNT(*) FROM inscriptions WHERE formation_id = ? AND statut = 'Inscrit') +
              (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = ? AND statut_paiement = 'payé') AS inscrits,
              (SELECT COUNT(*) FROM liste_attente WHERE externe_id = ? AND formation_id = ?) AS deja
       FROM formations WHERE id = ? AND status = 'published'`,
      [formation_id, formation_id, externe_id, formation_id, formation_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Formation introuvable' });
    const { nb_places, inscrits, deja } = rows[0];
    if (deja > 0) return res.status(400).json({ error: "Vous êtes déjà en liste d'attente" });
    if (nb_places === null || inscrits < nb_places)
      return res.status(400).json({ error: 'Des places sont disponibles, inscrivez-vous directement' });
    await db.query('INSERT INTO liste_attente (externe_id, formation_id) VALUES (?, ?)', [externe_id, formation_id]);
    res.json({ message: "Vous avez rejoint la liste d'attente " });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── DELETE /liste-attente/:externeId/:formationId ──────────────────────── */
router.delete('/liste-attente/:externeId/:formationId', async (req, res) => {
  const { externeId, formationId } = req.params;
  try {
    await db.query('DELETE FROM liste_attente WHERE externe_id = ? AND formation_id = ?', [externeId, formationId]);
    res.json({ message: "Retiré de la liste d'attente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /en-attente/:externeId ─────────────────────────────────────────── */
router.get('/en-attente/:externeId', async (req, res) => {
  const { externeId } = req.params;
  const sql = `
    SELECT la.formation_id, la.date_ajout,
           f.titre, f.date_debut, f.nb_places,
           (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) +
           (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_paiement = 'payé') AS inscrits,
           (SELECT COUNT(*) FROM liste_attente la2
            WHERE la2.formation_id = la.formation_id AND la2.date_ajout <= la.date_ajout) AS position
    FROM liste_attente la
    JOIN formations f ON la.formation_id = f.id
    WHERE la.externe_id = ?
    ORDER BY la.date_ajout ASC
 `;
  try {
    const [rows] = await db.query(sql, [externeId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
