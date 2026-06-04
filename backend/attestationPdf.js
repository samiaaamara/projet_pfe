const QRCode = require('qrcode');

// Couleurs
const C_BLEU_FONCE   = '#003366';
const C_BLEU_MOYEN   = '#0056b3';
const C_OR           = '#c8960c';
const C_GRIS_LIGHT   = '#f4f6f9';
const C_TEXTE        = '#1a1a2e';
const C_TEXTE_LIGHT  = '#555';

/**
 * Génère le PDF d'attestation dans `res` (stream HTTP).
 * @param {object} res      - Express response object
 * @param {object} data     - { candidat_nom, titre, specialite, formateur_nom, date_debut, date_fin, taux, dateGen, refId }
 */
async function genererAttestationPDF(res, data) {
  const { candidat_nom, titre, specialite, formateur_nom, date_debut, date_fin, taux, dateGen, refId } = data;

  // --- QR Code (PNG Buffer) ---
  const qrContent = [
    `REF: ${refId}`,
    `Titulaire : ${candidat_nom}`,
    `Formation : ${titre}`,
    `Période   : ${date_debut} → ${date_fin}`,
    `Présence  : ${taux}%`,
    `Délivré   : ${dateGen}`,
  ].join('\n');

  const qrBuffer = await QRCode.toBuffer(qrContent, {
    errorCorrectionLevel: 'M',
    type: 'png',
    width: 160,
    margin: 1,
    color: { dark: C_BLEU_FONCE, light: '#ffffff' }
  });

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 0, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="attestation_${refId}.pdf"`);
  doc.pipe(res);

  const W = 595.28;
  const H = 841.89;

  // ── 1. Bande de fond bleu en haut ──────────────────────────────────────────
  doc.rect(0, 0, W, 130).fill(C_BLEU_FONCE);

  // Bande dorée fine sous le bleu
  doc.rect(0, 130, W, 4).fill(C_OR);

  // Titre principal dans le header
  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(24)
     .text('ATTESTATION DE FORMATION', 0, 40, { align: 'center', width: W });

  doc.fillColor('rgba(255,255,255,0.75)')
     .font('Helvetica')
     .fontSize(11)
     .text('Organisme de Formation Professionnelle', 0, 74, { align: 'center', width: W });

  doc.fillColor(C_OR)
     .font('Helvetica-Bold')
     .fontSize(10)
     .text('★  DOCUMENT OFFICIEL  ★', 0, 96, { align: 'center', width: W });

  // ── 2. Fond gris clair du corps ─────────────────────────────────────────────
  doc.rect(0, 134, W, H - 134).fill(C_GRIS_LIGHT);

  // ── 3. Carte blanche centrale ───────────────────────────────────────────────
  const cardX = 45, cardY = 158, cardW = W - 90, cardH = 480;
  doc.roundedRect(cardX, cardY, cardW, cardH, 10).fill('#ffffff');
  // Ombre subtile (simulation avec rectangle légèrement décalé)
  doc.roundedRect(cardX + 2, cardY + 2, cardW, cardH, 10)
     .fillOpacity(0.06).fill('#000000').fillOpacity(1);
  doc.roundedRect(cardX, cardY, cardW, cardH, 10).fill('#ffffff');

  // Ligne colorée en haut de la carte
  doc.rect(cardX, cardY, cardW, 5).fill(C_BLEU_MOYEN);

  // ── 4. Intro ─────────────────────────────────────────────────────────────────
  const cx = cardX + 30;
  let cy = cardY + 28;

  doc.fillColor(C_TEXTE_LIGHT).font('Helvetica').fontSize(11)
     .text('Nous, soussignés, certifions par la présente que :', cx, cy);
  cy += 32;

  // ── 5. Encadré nom du candidat ───────────────────────────────────────────────
  doc.roundedRect(cx, cy, cardW - 60, 44, 8)
     .fill('#eaf2ff');
  doc.roundedRect(cx, cy, 5, 44, 2).fill(C_BLEU_MOYEN);

  doc.fillColor(C_BLEU_FONCE).font('Helvetica-Bold').fontSize(16)
     .text(candidat_nom.toUpperCase(), cx + 18, cy + 13, { width: cardW - 90 });
  cy += 62;

  // ── 6. Texte corps ───────────────────────────────────────────────────────────
  doc.fillColor(C_TEXTE_LIGHT).font('Helvetica').fontSize(11)
     .text('a suivi et validé avec succès la formation :', cx, cy);
  cy += 22;

  doc.fillColor(C_BLEU_FONCE).font('Helvetica-Bold').fontSize(14)
     .text(`« ${titre} »`, cx, cy, { width: cardW - 60 });
  cy += doc.heightOfString(`« ${titre} »`, { width: cardW - 60, fontSize: 14 }) + 20;

  // ── 7. Séparateur ───────────────────────────────────────────────────────────
  doc.moveTo(cx, cy).lineTo(cardX + cardW - 30, cy).strokeColor('#dde4f0').lineWidth(1).stroke();
  cy += 18;

  // ── 8. Tableau des informations ──────────────────────────────────────────────
  const rows = [
    ['Spécialité',      specialite || '—'],
    ['Responsable',     formateur_nom],
    ['Période',         `Du ${date_debut} au ${date_fin}`],
    ['Taux de présence',`${taux} %`],
  ];

  const col1W = 150;
  for (const [label, value] of rows) {
    doc.fillColor(C_TEXTE_LIGHT).font('Helvetica').fontSize(10.5)
       .text(label, cx, cy, { width: col1W });
    doc.fillColor(C_TEXTE).font('Helvetica-Bold').fontSize(10.5)
       .text(value, cx + col1W, cy, { width: cardW - col1W - 80 });
    cy += 22;
  }

  cy += 10;
  // ── 9. Séparateur ───────────────────────────────────────────────────────────
  doc.moveTo(cx, cy).lineTo(cardX + cardW - 30, cy).strokeColor('#dde4f0').lineWidth(1).stroke();
  cy += 18;

  // ── 10. Texte de validation ──────────────────────────────────────────────────
  doc.roundedRect(cx, cy, cardW - 60, 44, 6).fill('#f0f7e6');
  doc.fillColor('#2e7d32').font('Helvetica-Bold').fontSize(10.5)
     .text(
       '✔  L\'apprenant a satisfait à toutes les exigences : modules complétés à 100 % et quiz de validation réussi.',
       cx + 12, cy + 12,
       { width: cardW - 84 }
     );
  cy += 60;

  // ── 11. Signature + QR Code ──────────────────────────────────────────────────
  const sigX = cx;
  const qrX  = cardX + cardW - 160;
  const bottomY = cy;

  // Zone signature
  doc.fillColor(C_TEXTE_LIGHT).font('Helvetica').fontSize(10)
     .text('Fait à __________, le ' + dateGen, sigX, bottomY);
  doc.moveDown(0.3);
  doc.fillColor(C_TEXTE).font('Helvetica-Bold').fontSize(10)
     .text('Le Directeur de Formation', sigX, bottomY + 18);

  // Ligne de signature
  doc.moveTo(sigX, bottomY + 62).lineTo(sigX + 180, bottomY + 62)
     .strokeColor(C_BLEU_FONCE).lineWidth(1).stroke();

  doc.fillColor(C_TEXTE_LIGHT).font('Helvetica').fontSize(9)
     .text('Signature et cachet', sigX, bottomY + 68);

  // QR Code
  doc.image(qrBuffer, qrX, bottomY - 4, { width: 100, height: 100 });
  doc.fillColor(C_TEXTE_LIGHT).font('Helvetica').fontSize(8)
     .text('Vérification en ligne', qrX, bottomY + 100, { width: 100, align: 'center' });

  // ── 12. Footer ───────────────────────────────────────────────────────────────
  const footerY = cardY + cardH + 18;
  doc.moveTo(45, footerY).lineTo(W - 45, footerY).strokeColor('#c0c8d8').lineWidth(0.8).stroke();

  doc.fillColor(C_TEXTE_LIGHT).font('Helvetica').fontSize(8.5)
     .text(`Référence : ${refId}`, 45, footerY + 8, { width: (W - 90) / 2 });

  doc.fillColor(C_TEXTE_LIGHT).font('Helvetica').fontSize(8.5)
     .text(`Date de délivrance : ${dateGen}`, (W / 2), footerY + 8, { width: (W - 90) / 2, align: 'right' });

  // Filigrane diagonal très discret
  doc.save();
  doc.translate(W / 2, H / 2);
  doc.rotate(-45);
  doc.fillColor('#003366').fillOpacity(0.04)
     .font('Helvetica-Bold').fontSize(72)
     .text('ATTESTATION', -200, -36);
  doc.fillOpacity(1).restore();

  doc.end();
}

module.exports = { genererAttestationPDF };
