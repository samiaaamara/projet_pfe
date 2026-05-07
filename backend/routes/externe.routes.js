const express = require('express');
const router = express.Router();
const https = require('https');
const crypto = require('crypto');
const db = require('../db');

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

/* ─── GET /formations ─────────────────────────────────────────────────────── */
router.get('/formations', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  const externeId = parseInt(req.query.externeId) || null;

  const buildQuery = (specialite) => {
    const specFilter = specialite
      ? `AND f.specialite = '${specialite.replace(/'/g, "''")}'`
      : '';

    const countSql = `
      SELECT COUNT(*) AS total FROM formations f
      WHERE f.status = 'published' AND f.date_debut >= CURDATE() ${specFilter}
    `;
    const dataSql = `
      SELECT f.*,
        u.nom AS formateur_nom,
        (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) +
        (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_paiement = 'payé') AS inscrits
      FROM formations f
      JOIN formateurs fo ON f.formateur_id = fo.id
      JOIN users u ON fo.user_id = u.id
      WHERE f.status = 'published' AND f.date_debut >= CURDATE() ${specFilter}
      ORDER BY f.date_debut ASC
      LIMIT ? OFFSET ?
    `;

    db.query(countSql, (err, countResult) => {
      if (err) return res.status(500).json(err);
      const total = countResult[0].total;
      db.query(dataSql, [limit, offset], (err2, results) => {
        if (err2) return res.status(500).json(err2);
        res.json({
          data: results,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          filtre_specialite: specialite || null
        });
      });
    });
  };

  if (externeId) {
    db.query('SELECT specialite FROM externes WHERE id = ?', [externeId], (err, rows) => {
      if (err) return res.status(500).json(err);
      const specialite = rows[0]?.specialite || null;
      buildQuery(specialite);
    });
  } else {
    buildQuery(null);
  }
});

/* ─── GET /mes-inscriptions/:externeId ───────────────────────────────────── */
router.get('/mes-inscriptions/:externeId', (req, res) => {
  const { externeId } = req.params;
  const sql = `
    SELECT ie.*, f.titre, f.description, f.date_debut, f.date_fin, f.duree, f.niveau, f.prix,
           u.nom AS formateur_nom
    FROM inscriptions_externes ie
    JOIN formations f ON ie.formation_id = f.id
    JOIN formateurs fo ON f.formateur_id = fo.id
    JOIN users u ON fo.user_id = u.id
    WHERE ie.externe_id = ?
    ORDER BY ie.date_inscription DESC
  `;
  db.query(sql, [externeId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* ─── POST /initier-paiement ─────────────────────────────────────────────── */
router.post('/initier-paiement', async (req, res) => {
  const { externe_id, formation_id } = req.body;
  if (!externe_id || !formation_id) {
    return res.status(400).json({ message: 'externe_id et formation_id sont obligatoires' });
  }

  db.query(
    'SELECT id, statut_paiement, payment_ref FROM inscriptions_externes WHERE externe_id = ? AND formation_id = ?',
    [externe_id, formation_id],
    async (err, existing) => {
      if (err) return res.status(500).json(err);

      const deja = existing.find(r => r.statut_paiement === 'payé');
      if (deja) return res.status(400).json({ message: 'Vous êtes déjà inscrit à cette formation.' });

      db.query(
        `SELECT f.prix, f.nb_places, f.titre,
           (SELECT COUNT(*) FROM inscriptions WHERE formation_id = f.id) +
           (SELECT COUNT(*) FROM inscriptions_externes WHERE formation_id = f.id AND statut_paiement = 'payé') AS inscrits
         FROM formations f WHERE f.id = ? AND f.status = 'published'`,
        [formation_id],
        async (err2, rows) => {
          if (err2) return res.status(500).json(err2);
          if (rows.length === 0) return res.status(404).json({ message: 'Formation introuvable ou non publiée.' });

          const { prix, nb_places, inscrits, titre } = rows[0];
          if (nb_places !== null && inscrits >= nb_places) {
            return res.status(400).json({ message: 'Cette formation est complète.' });
          }

          const montant = parseFloat(prix) || 0;

          /* ── Formation GRATUITE ── */
          if (montant === 0) {
            const pendingRow = existing.find(r => r.statut_paiement === 'en_attente');
            const insertOrUpdate = (cb) => {
              if (pendingRow) {
                db.query(
                  "UPDATE inscriptions_externes SET statut_paiement='payé', statut_inscription='confirmé', date_paiement=NOW() WHERE id=?",
                  [pendingRow.id], cb
                );
              } else {
                db.query(
                  "INSERT INTO inscriptions_externes (externe_id, formation_id, montant, statut_paiement, statut_inscription, date_paiement) VALUES (?, ?, 0, 'payé', 'confirmé', NOW())",
                  [externe_id, formation_id], cb
                );
              }
            };
            insertOrUpdate((err3) => {
              if (err3) return res.status(500).json(err3);
              envoyerNotif(externe_id, `Inscription confirmée pour la formation "${titre}" ✅`);
              return res.json({ gratuit: true, message: 'Inscription confirmée ✅' });
            });
            return;
          }

          /* ── Formation PAYANTE : Stripe Checkout ── */
          const appUrl = process.env.APP_URL || 'http://localhost:4200';
          const currency = (process.env.STRIPE_CURRENCY || 'eur').toLowerCase();

          try {
            const sessionPayload = {
              payment_method_types: ['card'],
              line_items: [{
                price_data: {
                  currency,
                  unit_amount: Math.round(montant * 100), // centimes
                  product_data: { name: `Inscription : ${titre}` },
                },
                quantity: 1,
              }],
              mode: 'payment',
              // Stripe injecte {CHECKOUT_SESSION_ID} automatiquement
              success_url: `${appUrl}/paiement-retour?session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${appUrl}/paiement-retour?status=echec`,
              metadata: {
                externe_id: String(externe_id),
                formation_id: String(formation_id),
              },
            };

            const stripeRes = await stripeRequest('POST', '/checkout/sessions', sessionPayload);

            if (stripeRes.status !== 200 || !stripeRes.data.url) {
              console.error('Stripe session error:', stripeRes.data);
              return res.status(502).json({ message: 'Erreur initialisation paiement Stripe.', detail: stripeRes.data });
            }

            const sessionId = stripeRes.data.id;
            const payUrl = stripeRes.data.url;

            const pendingRow = existing.find(r => r.statut_paiement === 'en_attente');
            const saveRef = (cb) => {
              if (pendingRow) {
                db.query('UPDATE inscriptions_externes SET payment_ref=?, montant=? WHERE id=?',
                  [sessionId, montant, pendingRow.id], cb);
              } else {
                db.query(
                  "INSERT INTO inscriptions_externes (externe_id, formation_id, montant, statut_paiement, payment_ref) VALUES (?, ?, ?, 'en_attente', ?)",
                  [externe_id, formation_id, montant, sessionId], cb
                );
              }
            };

            saveRef((saveErr) => {
              if (saveErr) return res.status(500).json(saveErr);
              res.json({ payUrl, paymentRef: sessionId });
            });

          } catch (stripeErr) {
            console.error('Stripe connexion error:', stripeErr.message);
            res.status(502).json({ message: 'Impossible de joindre Stripe.', detail: stripeErr.message });
          }
        }
      );
    }
  );
});

/* ─── GET /confirmer-paiement?payment_ref=cs_test_XXX ────────────────────── */
/* Stripe redirige vers : /paiement-retour?session_id=cs_test_XXX            */
/* Le frontend lit session_id et l'envoie ici comme payment_ref              */
router.get('/confirmer-paiement', async (req, res) => {
  const { payment_ref } = req.query;
  if (!payment_ref) return res.status(400).json({ message: 'payment_ref manquant.' });

  try {
    const stripeRes = await stripeRequest('GET', `/checkout/sessions/${payment_ref}`, null);

    if (stripeRes.status !== 200) {
      return res.json({ success: false, message: 'Session Stripe introuvable.', detail: stripeRes.data });
    }

    const session = stripeRes.data;
    if (session.payment_status !== 'paid') {
      return res.json({ success: false, status: session.payment_status, message: 'Paiement non complété.' });
    }

    /* Mettre à jour la DB */
    db.query(
      "UPDATE inscriptions_externes SET statut_paiement='payé', statut_inscription='confirmé', date_paiement=NOW() WHERE payment_ref=?",
      [payment_ref],
      (updateErr) => {
        if (updateErr) return res.status(500).json(updateErr);

        db.query(
          `SELECT ie.externe_id, ie.montant, f.titre
           FROM inscriptions_externes ie JOIN formations f ON ie.formation_id = f.id
           WHERE ie.payment_ref = ?`,
          [payment_ref],
          (ne, nr) => {
            if (!ne && nr.length > 0) {
              envoyerNotif(nr[0].externe_id, `Paiement de ${nr[0].montant} EUR confirmé pour "${nr[0].titre}" ✅`);
            }
          }
        );

        res.json({ success: true, message: 'Paiement confirmé ✅' });
      }
    );
  } catch (err) {
    console.error('Stripe confirm error:', err.message);
    res.status(500).json({ message: 'Erreur vérification paiement.', detail: err.message });
  }
});

/* ─── POST /webhook-stripe ───────────────────────────────────────────────── */
/* Webhook Stripe — utilise express.raw() pour la vérification de signature  */
router.post('/webhook-stripe', express.raw({ type: 'application/json' }), (req, res) => {
  res.sendStatus(200); // Répondre immédiatement à Stripe

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
    [sessionId],
    (err, result) => {
      if (err || result.affectedRows === 0) return;
      db.query(
        `SELECT ie.externe_id, ie.montant, f.titre
         FROM inscriptions_externes ie JOIN formations f ON ie.formation_id = f.id
         WHERE ie.payment_ref = ?`,
        [sessionId],
        (ne, nr) => {
          if (!ne && nr.length > 0) {
            envoyerNotif(nr[0].externe_id, `Paiement de ${nr[0].montant} EUR confirmé pour "${nr[0].titre}" ✅`);
          }
        }
      );
    }
  );
});

/* ─── GET /supports/:externeId/:formationId ──────────────────────────────── */
router.get('/supports/:externeId/:formationId', (req, res) => {
  const { externeId, formationId } = req.params;
  db.query(
    "SELECT * FROM inscriptions_externes WHERE externe_id = ? AND formation_id = ? AND statut_paiement = 'payé'",
    [externeId, formationId],
    (err, access) => {
      if (err) return res.status(500).json(err);
      if (access.length === 0) return res.status(403).json({ message: 'Accès refusé : paiement requis.' });
      db.query('SELECT * FROM supports WHERE formation_id = ?', [formationId], (err2, supports) => {
        if (err2) return res.status(500).json(err2);
        res.json(supports);
      });
    }
  );
});

/* ─── GET /profil/:userId ─────────────────────────────────────────────────── */
router.get('/profil/:userId', (req, res) => {
  const sql = `
    SELECT u.id, u.nom, u.email, u.role, ex.id AS externeId, ex.telephone, ex.entreprise
    FROM users u JOIN externes ex ON ex.user_id = u.id WHERE u.id = ?
  `;
  db.query(sql, [req.params.userId], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(404).json({ message: 'Introuvable.' });
    res.json(results[0]);
  });
});

/* ─── Utilitaire : notification ─────────────────────────────────────────── */
function envoyerNotif(externeId, message) {
  db.query('SELECT user_id FROM externes WHERE id = ?', [externeId], (err, rows) => {
    if (err || rows.length === 0) return;
    db.query(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [rows[0].user_id, message, 'approbation'],
      () => {}
    );
  });
}

/* ─── GET /formations/:id/programme (public) ─────────────────────────────── */
router.get('/formations/:id/programme', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM programme_formations WHERE formation_id = ?', [id], (err, progRows) => {
    if (err) return res.status(500).json(err);
    db.query('SELECT * FROM modules_formation WHERE formation_id = ? ORDER BY ordre ASC, id ASC', [id], (err2, modules) => {
      if (err2) return res.status(500).json(err2);
      res.json({ programme: progRows[0] || null, modules });
    });
  });
});

module.exports = router;
