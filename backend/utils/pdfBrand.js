/** Brand colors reused across generated PDFs, matching the VibeCrafters logo palette. */
const BRAND = { ink: '#0F2A3D', magenta: '#C81E6E', ember: '#F5811F', muted: '#5B6B75' };

/**
 * Draws the VibeCrafters wordmark + swoosh accent (two overlapping angled bars in
 * magenta/ember) directly with PDFKit's vector primitives — no external image asset
 * needed, so the brand mark always renders identically regardless of environment.
 * `width` lets callers draw it across a wider report page (check-in reports) or the
 * narrower 400pt ticket stub.
 */
const drawBrandHeader = (doc, { width = 400, height = 96 } = {}) => {
  doc.rect(0, 0, width, height).fill(BRAND.ink);
  doc.save();
  doc.polygon([28, 70], [50, 20], [64, 20], [42, 70]).fill(BRAND.magenta);
  doc.polygon([46, 70], [68, 20], [82, 20], [60, 70]).fill(BRAND.ember);
  doc.restore();
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(19)
    .text('VibeCrafters', 100, 30);
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica')
    .fontSize(8.5)
    .text('EVENT DESIGN & CURATION', 100, 55, { characterSpacing: 1.2 });
};

module.exports = { BRAND, drawBrandHeader };
