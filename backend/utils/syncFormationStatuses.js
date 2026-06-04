const db = require('../db');

const syncFormationStatuses = async () => {
  await db.query(`
    UPDATE formations SET status = 'en_cours'
    WHERE status = 'published'
      AND date_debut IS NOT NULL
      AND date_debut <= CURDATE()
      AND (date_fin IS NULL OR date_fin >= CURDATE())
  `);
  await db.query(`
    UPDATE formations SET status = 'terminée'
    WHERE status IN ('published', 'en_cours')
      AND (
        (date_fin IS NOT NULL AND date_fin < CURDATE())
        OR (date_fin IS NULL AND date_debut < CURDATE())
      )
  `);
};

module.exports = syncFormationStatuses;
