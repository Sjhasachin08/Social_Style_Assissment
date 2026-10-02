// services/pdfService.js
// Generates a professional PDF report for a completed assessment using PDFKit.

const path = require('path');
const PDFDocument = require('pdfkit');

const HINDI_FONT_REGULAR = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansDevanagari-Regular.ttf');
const HINDI_FONT_BOLD = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansDevanagari-Bold.ttf');

const COLORS = {
  primary: '#1f3a5f',
  accent: '#2f6fed',
  text: '#232323',
  muted: '#6b7280',
  line: '#d9dee5',
  quadrantBg: '#f4f7fb'
};

function safeParseArray(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function drawSectionHeading(doc, title, hindiTitle) {
  doc.moveDown(0.8);
  doc.fontSize(14).fillColor(COLORS.primary).font('Helvetica-Bold').text(title);
  if (hindiTitle) {
    doc.fontSize(12).fillColor(COLORS.primary).font('Hindi-Bold').text(hindiTitle);
  }
  doc.moveTo(doc.x, doc.y + 2).lineTo(545, doc.y + 2).strokeColor(COLORS.line).lineWidth(1).stroke();
  doc.moveDown(0.5);
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(11);
}

function drawBulletList(doc, items, fontName) {
  // Anchor everything to the page's left margin instead of doc.x, and
  // compute each item's height ourselves before drawing. Relying on
  // doc.x/doc.y after an explicit-coordinate .text() call is what caused
  // the bullets to drift diagonally — PDFKit doesn't reliably reset the
  // cursor back to a fixed left column in that mode.
  const font = fontName || 'Helvetica';
  const startX = doc.page.margins.left;
  const textIndent = 14;
  const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const textWidth = availableWidth - textIndent;
  const rowGap = 6;

  doc.font(font).fontSize(11);

  items.forEach((item) => {
    const itemHeight = doc.heightOfString(item, { width: textWidth });
    const rowHeight = Math.max(itemHeight, 14);

    // Avoid a bullet/text row being split across a page break.
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    const rowY = doc.y;
    doc.circle(startX + 3, rowY + 7, 1.6).fill(COLORS.accent);
    doc.fillColor(COLORS.text).font(font).fontSize(11).text(item, startX + textIndent, rowY, { width: textWidth });

    // Explicitly pin the cursor back to the left column for the next item.
    doc.x = startX;
    doc.y = rowY + rowHeight + rowGap;
  });
}

function drawKeyValueGrid(doc, pairs) {
  // Simple two-column label/value grid, used for the "At a Glance"
  // comparative snapshot (backup style, measures success by, etc.).
  const startX = doc.page.margins.left;
  const colWidth = 247;
  const rowGap = 10;

  doc.font('Helvetica').fontSize(10);

  for (let i = 0; i < pairs.length; i += 2) {
    const rowPairs = pairs.slice(i, i + 2);
    const heights = rowPairs.map(([, value]) =>
      doc.heightOfString(value, { width: colWidth - 4 })
    );
    const rowHeight = Math.max(...heights, 14) + 18;

    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    const rowY = doc.y;
    rowPairs.forEach(([label, value], idx) => {
      const colX = startX + idx * (colWidth + 20);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.muted)
        .text(label.toUpperCase(), colX, rowY, { width: colWidth });
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.primary)
        .text(value, colX, rowY + 13, { width: colWidth });
    });

    doc.x = startX;
    doc.y = rowY + rowHeight + rowGap;
  }
}

/**
 * Draws the Social Style 2x2 matrix with the participant's point plotted.
 * Matches the reference chart exactly: horizontal axis is Low Assertive
 * "Asking" (left) -> High Assertive "Telling" (right); vertical axis is
 * Low Responsive "Controlled" (TOP) -> High Responsive "Emotional" (BOTTOM).
 * Quadrants: Analytical/Driver on top row, Amiable/Expressive on bottom row.
 */
function drawMatrix(doc, x, y, size, assertivenessAvg, responsivenessAvg) {
  const half = size / 2;

  // Quadrant backgrounds
  doc.rect(x, y, half, half).fill(COLORS.quadrantBg); // top-left: Analytical
  doc.rect(x + half, y, half, half).fill('#ffffff'); // top-right: Driver
  doc.rect(x, y + half, half, half).fill('#ffffff'); // bottom-left: Amiable
  doc.rect(x + half, y + half, half, half).fill(COLORS.quadrantBg); // bottom-right: Expressive

  // Border + cross lines
  doc.rect(x, y, size, size).strokeColor(COLORS.line).lineWidth(1).stroke();
  doc.moveTo(x + half, y).lineTo(x + half, y + size).strokeColor(COLORS.line).stroke();
  doc.moveTo(x, y + half).lineTo(x + size, y + half).strokeColor(COLORS.line).stroke();

  // Quadrant labels with MBTI-style descriptors, matching the reference chart
  doc.fontSize(9).fillColor(COLORS.muted).font('Helvetica-Bold');
  doc.text('ANALYTICAL', x + 8, y + 10, { width: half - 16, align: 'center' });
  doc.font('Helvetica-Oblique').fontSize(7.5).text('(Thinking)', x + 8, y + 21, { width: half - 16, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(9).text('DRIVER', x + half + 8, y + 10, { width: half - 16, align: 'center' });
  doc.font('Helvetica-Oblique').fontSize(7.5).text('(Sensor)', x + half + 8, y + 21, { width: half - 16, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(9).text('AMIABLE', x + 8, y + size - 30, { width: half - 16, align: 'center' });
  doc.font('Helvetica-Oblique').fontSize(7.5).text('(Feeling)', x + 8, y + size - 19, { width: half - 16, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(9).text('EXPRESSIVE', x + half + 8, y + size - 30, { width: half - 16, align: 'center' });
  doc.font('Helvetica-Oblique').fontSize(7.5).text('(Intuitive)', x + half + 8, y + size - 19, { width: half - 16, align: 'center' });

  // Axis labels — vertical axis is Low Responsive (TOP) -> High Responsive (BOTTOM), per the reference chart
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted);
  doc.text('Low Responsive "Controlled"', x, y - 16, { width: size, align: 'center' });
  doc.text('High Responsive "Emotional"', x, y + size + 6, { width: size, align: 'center' });

  // Side labels for the assertiveness axis, drawn as plain (non-rotated) text
  // to the left/right of the box for reliability.
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.muted);
  doc.text('Low', x - 92, y + half - 16, { width: 82, align: 'right' });
  doc.text('Assertive', x - 92, y + half - 5, { width: 82, align: 'right' });
  doc.font('Helvetica-Oblique').fontSize(8).text('"Asking"', x - 92, y + half + 7, { width: 82, align: 'right' });

  doc.font('Helvetica-Bold').fontSize(8.5).text('High', x + size + 10, y + half - 16, { width: 82, align: 'left' });
  doc.text('Assertive', x + size + 10, y + half - 5, { width: 82, align: 'left' });
  doc.font('Helvetica-Oblique').fontSize(8).text('"Telling"', x + size + 10, y + half + 7, { width: 82, align: 'left' });

  // Plot participant point. Horizontal: 1 (left) -> 4 (right) = Assertiveness.
  // Vertical: 1 (top) -> 4 (bottom) = Responsiveness (inverted vs. typical charts, matches reference).
  const clamp = (v) => Math.min(4, Math.max(1, v));
  const px = x + ((clamp(assertivenessAvg) - 1) / 3) * size;
  const py = y + ((clamp(responsivenessAvg) - 1) / 3) * size;

  doc.circle(px, py, 5).fill(COLORS.accent);
  doc.circle(px, py, 5).strokeColor(COLORS.primary).lineWidth(1.5).stroke();
  doc.fontSize(8).fillColor(COLORS.primary).font('Helvetica-Bold').text(
    'Your Score',
    px - 20,
    py < y + size / 2 ? py + 10 : py - 20,
    { width: 80, align: 'center' }
  );
}

/**
 * Streams a full assessment report PDF into the given writable stream (e.g. res).
 * @param {WritableStream} stream
 * @param {object} assessment - row from `assessments` table
 * @param {object} styleInfo - row from `social_styles` table
 */
function generateAssessmentPdf(stream, assessment, styleInfo) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  // Register the Devanagari font once so Hindi text renders correctly —
  // PDFKit's built-in Helvetica has no Hindi glyphs at all.
  doc.registerFont('Hindi', HINDI_FONT_REGULAR);
  doc.registerFont('Hindi-Bold', HINDI_FONT_BOLD);

  // Header
  doc.rect(0, 0, 595, 90).fill(COLORS.primary);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('SOCIAL STYLE ASSESSMENT REPORT', 50, 30);
  doc.font('Helvetica').fontSize(10).fillColor('#dbe4f5').text(
    'A confidential self-assessment of communication and interpersonal style',
    50,
    62
  );

  doc.moveDown(4);
  doc.fillColor(COLORS.text);

  // Participant details
  const createdDate = new Date(assessment.created_at).toLocaleString();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.muted).text('PARTICIPANT NAME', 50, 110);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.text).text(assessment.participant_name, 50, 124);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.muted).text('EMAIL', 320, 110);
  doc.font('Helvetica').fontSize(12).fillColor(COLORS.text).text(assessment.participant_email, 320, 124);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.muted).text('ASSESSMENT DATE', 50, 150);
  doc.font('Helvetica').fontSize(12).fillColor(COLORS.text).text(createdDate, 50, 164);

  doc.moveTo(50, 195).lineTo(545, 195).strokeColor(COLORS.line).stroke();

  // Scores summary
  doc.y = 210;
  drawSectionHeading(doc, 'Scores Summary');

  const colY = doc.y;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary).text('Assertiveness', 50, colY);
  doc.font('Helvetica').fontSize(11).fillColor(COLORS.text)
    .text(`Total Score: ${assessment.assertiveness_total} / 60`, 50, colY + 16)
    .text(`Average Score: ${assessment.assertiveness_average}`, 50, colY + 32);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary).text('Responsiveness', 320, colY);
  doc.font('Helvetica').fontSize(11).fillColor(COLORS.text)
    .text(`Total Score: ${assessment.responsiveness_total} / 60`, 320, colY + 16)
    .text(`Average Score: ${assessment.responsiveness_average}`, 320, colY + 32);

  doc.y = colY + 60;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.muted).text('YOUR SOCIAL STYLE');
  doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.accent).text(assessment.social_style.toUpperCase());

  // Matrix
  doc.moveDown(1);
  const matrixY = doc.y + 26;
  drawMatrix(doc, 190, matrixY, 220, assessment.assertiveness_average, assessment.responsiveness_average);
  doc.y = matrixY + 270;

  // New page for narrative content
  doc.addPage();

  drawSectionHeading(doc, 'Understanding Your Scores');
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(COLORS.primary).text('Assertiveness');
  doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.text).text(
    'Assertiveness shows how directly and quickly you express your opinions and make decisions. A higher ' +
      'score means you speak up, decide fast, and like to take charge. A lower score means you prefer to ' +
      'listen first, think things through, and let others lead.',
    { width: 495 }
  );
  doc.moveDown(0.25);
  doc.font('Hindi').fontSize(10.5).fillColor(COLORS.text).text(
    'Assertiveness (मुखरता) यह दिखाती है कि आप कितनी सीधी और तेज़ी से अपनी राय ज़ाहिर करते हैं और फैसले लेते ' +
      'हैं। ज्यादा स्कोर का मतलब है कि आप खुलकर बोलते हैं, जल्दी फैसला लेते हैं और कमान संभालना पसंद करते हैं। ' +
      'कम स्कोर का मतलब है कि आप पहले सुनना, सोच-समझकर काम करना और दूसरों को आगे बढ़ने देना पसंद करते हैं।',
    { width: 495 }
  );

  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(COLORS.primary).text('Responsiveness');
  doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.text).text(
    'Responsiveness shows how openly you express your feelings, and whether you focus more on people or on ' +
      'tasks. A higher score means you are warm, expressive, and people-focused. A lower score means you are ' +
      'more reserved, controlled, and task-focused.',
    { width: 495 }
  );
  doc.moveDown(0.25);
  doc.font('Hindi').fontSize(10.5).fillColor(COLORS.text).text(
    'Responsiveness (भाव-प्रवणता) यह दिखाती है कि आप अपनी भावनाएं कितनी खुलकर ज़ाहिर करते हैं, और आप लोगों पर ' +
      'ज्यादा ध्यान देते हैं या काम पर। ज्यादा स्कोर का मतलब है कि आप गर्मजोशी भरे, अभिव्यक्तिपूर्ण और लोगों पर ' +
      'केंद्रित हैं। कम स्कोर का मतलब है कि आप ज्यादा संयमित, नियंत्रित और काम पर केंद्रित हैं।',
    { width: 495 }
  );

  drawSectionHeading(doc, 'The Four Social Styles');
  doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.muted).text(
    'Everyone lands somewhere on these two scales, which gives four broad styles. Your style is marked below.',
    { width: 495 }
  );
  doc.moveDown(0.4);

  const FOUR_STYLES = [
    { name: 'Driver', en: 'High Assertiveness + Low Responsiveness. Direct, fast, and focused on results.',
      hi: 'ज्यादा Assertiveness + कम Responsiveness। सीधे, तेज़ और परिणामों पर केंद्रित।' },
    { name: 'Expressive', en: 'High Assertiveness + High Responsiveness. Energetic, sociable, and idea-driven.',
      hi: 'ज्यादा Assertiveness + ज्यादा Responsiveness। ऊर्जावान, मिलनसार और विचारों से प्रेरित।' },
    { name: 'Amiable', en: 'Low Assertiveness + High Responsiveness. Warm, supportive, and relationship-focused.',
      hi: 'कम Assertiveness + ज्यादा Responsiveness। गर्मजोशी भरे, सहयोगी और रिश्तों पर केंद्रित।' },
    { name: 'Analytical', en: 'Low Assertiveness + Low Responsiveness. Careful, logical, and detail-focused.',
      hi: 'कम Assertiveness + कम Responsiveness। सावधान, तार्किक और बारीकियों पर ध्यान देने वाले।' }
  ];

  FOUR_STYLES.forEach((s) => {
    const isYourStyle = s.name === assessment.social_style;
    const rowStartY = doc.y;

    if (isYourStyle) {
      // Highlight the participant's own style with a soft background band.
      const bandHeight =
        doc.heightOfString(s.en, { width: 480 }) + doc.heightOfString(s.hi, { width: 480 }) + 34;
      doc.rect(doc.page.margins.left - 6, rowStartY - 4, 507, bandHeight).fill('#eaf1fe');
      doc.fillColor(COLORS.text);
      doc.y = rowStartY;
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor(isYourStyle ? COLORS.accent : COLORS.primary)
      .text(s.name + (isYourStyle ? '  (Your Style)' : ''), doc.page.margins.left, doc.y, { width: 480 });
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(s.en, doc.page.margins.left, doc.y + 2, { width: 480 });
    doc.font('Hindi').fontSize(10).fillColor(COLORS.text).text(s.hi, doc.page.margins.left, doc.y + 2, { width: 480 });
    doc.x = doc.page.margins.left;
    doc.y += 12;
  });

  drawSectionHeading(doc, 'Personality Overview');
  doc.font('Helvetica').fontSize(11).fillColor(COLORS.text).text(styleInfo.description, { width: 495 });
  if (styleInfo.description_hi) {
    doc.moveDown(0.4);
    doc.font('Hindi').fontSize(11).fillColor(COLORS.text).text(styleInfo.description_hi, { width: 495 });
  }

  drawSectionHeading(doc, 'Your Strengths', 'आप किन चीज़ों में अच्छे हैं');
  drawBulletList(doc, safeParseArray(styleInfo.strengths), 'Helvetica');
  const strengthsHi = safeParseArray(styleInfo.strengths_hi);
  if (strengthsHi.length > 0) {
    doc.moveDown(0.3);
    drawBulletList(doc, strengthsHi, 'Hindi');
  }

  drawSectionHeading(doc, 'Areas to Improve', 'आपको क्या सुधारना चाहिए');
  drawBulletList(doc, safeParseArray(styleInfo.improvement_suggestions), 'Helvetica');
  const improvementsHi = safeParseArray(styleInfo.improvement_suggestions_hi);
  if (improvementsHi.length > 0) {
    doc.moveDown(0.3);
    drawBulletList(doc, improvementsHi, 'Hindi');
  }

  drawSectionHeading(doc, 'Example in Action');
  doc.font('Helvetica').fontSize(11).fillColor(COLORS.text).text(styleInfo.example_scenario, { width: 495 });
  if (styleInfo.example_scenario_hi) {
    doc.moveDown(0.4);
    doc.font('Hindi').fontSize(11).fillColor(COLORS.text).text(styleInfo.example_scenario_hi, { width: 495 });
  }

  drawSectionHeading(doc, 'Conclusion');
  doc.text(
    `Based on this self-assessment, ${assessment.participant_name} demonstrates a primary Social Style of ` +
      `${assessment.social_style}, characterized by an Assertiveness average of ${assessment.assertiveness_average} ` +
      `and a Responsiveness average of ${assessment.responsiveness_average}. Understanding this style can help ` +
      `improve communication, collaboration, and decision-making in professional and academic settings.`,
    { width: 495 }
  );

  doc.moveDown(2);
  doc.fontSize(9).fillColor(COLORS.muted).text(
    'This report is generated automatically based on self-reported questionnaire responses and is intended for ' +
      'self-reflection and developmental purposes.',
    { width: 495 }
  );

  doc.end();
}

module.exports = { generateAssessmentPdf };