import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateQRCodeBase64 } from './qrCodeGenerator.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const formatCertificateDate = (value) => new Date(value).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const fitFontSize = (doc, text, maxWidth, preferred, min = 14, font = 'Helvetica-Bold') => {
  doc.font(font);
  for (let size = preferred; size >= min; size -= 1) {
    doc.fontSize(size);
    if (doc.widthOfString(String(text || '')) <= maxWidth) return size;
  }
  return min;
};

const drawSecurityPattern = (doc, x, y, w, h) => {
  doc.save();
  doc.opacity(0.055);
  doc.strokeColor('#102a5c').lineWidth(0.35);
  for (let cx = x + 8; cx < x + w; cx += 18) {
    for (let cy = y + 8; cy < y + h; cy += 18) {
      doc.circle(cx, cy, 1.1).stroke();
    }
  }
  doc.opacity(0.035);
  doc.strokeColor('#46c7b7').lineWidth(0.8);
  for (let offset = -h; offset < w; offset += 26) {
    doc.moveTo(x + offset, y + h).lineTo(x + offset + h, y).stroke();
  }
  doc.restore();
};

const drawCentered = (doc, text, x, y, width, options = {}) => {
  doc.text(String(text || ''), x, y, {
    width,
    align: 'center',
    lineBreak: options.lineBreak !== false,
    ellipsis: options.ellipsis || false,
    height: options.height,
    characterSpacing: options.characterSpacing,
    lineGap: options.lineGap,
  });
};

const drawInfoCard = (doc, x, y, w, h, label, value, iconText) => {
  doc.roundedRect(x, y, w, h, 10).fillAndStroke('#f8fbff', '#bfd0ea');
  doc.circle(x + 24, y + h / 2, 12).fill('#e7fbf7');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f766e')
    .text(iconText, x + 12, y + h / 2 - 5, { width: 24, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b')
    .text(label.toUpperCase(), x + 45, y + 10, { width: w - 55, align: 'left' });
  const valueSize = fitFontSize(doc, value, w - 55, 13, 8, 'Helvetica-Bold');
  doc.font('Helvetica-Bold').fontSize(valueSize).fillColor('#0b214a')
    .text(String(value || ''), x + 45, y + 25, { width: w - 55, align: 'left', ellipsis: true, lineBreak: false });
};

/**
 * Generate a premium one-page A4 landscape certificate PDF.
 * @param {Object} certificateData
 * @returns {Promise<string>} relative PDF path
 */
export const generateCertificatePDF = async (certificateData) => {
  try {
    const {
      certificateId,
      studentName,
      courseName,
      completionDate,
      issueDate,
      verificationUrl,
      organizationName = 'NCUI Training Center',
    } = certificateData;

    const uploadsDir = path.join(__dirname, '../../uploads/certificates');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `certificate-${certificateId}.pdf`;
    const filepath = path.join(uploadsDir, filename);
    const qrCodeBase64 = await generateQRCodeBase64(verificationUrl);

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      bufferPages: true,
      autoFirstPage: true,
    });

    let pageCount = 1;
    doc.on('pageAdded', () => { pageCount += 1; });

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const cardX = 24;
    const cardY = 24;
    const cardW = pageW - 48;
    const cardH = pageH - 48;
    const contentX = cardX + 48;
    const contentW = cardW - 96;
    const formattedDate = formatCertificateDate(completionDate);
    const issueDateFormatted = formatCertificateDate(issueDate);

    doc.rect(0, 0, pageW, pageH).fill('#eef6ff');
    doc.roundedRect(cardX, cardY, cardW, cardH, 14).fillAndStroke('#ffffff', '#d9e6f7');
    drawSecurityPattern(doc, cardX + 32, cardY + 34, cardW - 64, cardH - 68);

    doc.roundedRect(cardX + 15, cardY + 15, cardW - 30, cardH - 30, 10)
      .lineWidth(2.2)
      .strokeColor('#102a5c')
      .stroke();
    doc.roundedRect(cardX + 25, cardY + 25, cardW - 50, cardH - 50, 8)
      .lineWidth(1)
      .strokeColor('#46c7b7')
      .stroke();

    doc.lineWidth(4).strokeColor('#46c7b7');
    const cornerLen = 42;
    [
      [cardX + 15, cardY + 15, 1, 1],
      [cardX + cardW - 15, cardY + 15, -1, 1],
      [cardX + 15, cardY + cardH - 15, 1, -1],
      [cardX + cardW - 15, cardY + cardH - 15, -1, -1],
    ].forEach(([x, y, sx, sy]) => {
      doc.moveTo(x, y + sy * cornerLen).lineTo(x, y).lineTo(x + sx * cornerLen, y).stroke();
    });

    const logoY = cardY + 36;
    const logoX = pageW / 2 - 13;
    doc.circle(logoX + 13, logoY + 13, 13).fillAndStroke('#eff6ff', '#102a5c');
    doc.polygon([logoX + 13, logoY + 5], [logoX + 21, logoY + 20], [logoX + 5, logoY + 20]).fill('#46c7b7');
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#102a5c');
    drawCentered(doc, organizationName, contentX, logoY + 30, contentW, { lineBreak: false });

    doc.font('Times-Bold').fontSize(48).fillColor('#0b214a');
    drawCentered(doc, 'CERTIFICATE', contentX, cardY + 88, contentW, { characterSpacing: 4, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#6757ff');
    drawCentered(doc, 'OF COMPLETION', contentX, cardY + 140, contentW, { characterSpacing: 3, lineBreak: false });

    const dividerY = cardY + 174;
    doc.lineWidth(1.4).strokeColor('#46c7b7')
      .moveTo(pageW / 2 - 118, dividerY).lineTo(pageW / 2 - 16, dividerY).stroke()
      .moveTo(pageW / 2 + 16, dividerY).lineTo(pageW / 2 + 118, dividerY).stroke();
    doc.save().translate(pageW / 2, dividerY).rotate(45).rect(-5, -5, 10, 10).fill('#46c7b7').restore();

    doc.font('Helvetica').fontSize(12).fillColor('#64748b');
    drawCentered(doc, 'This is to certify that', contentX, cardY + 195, contentW, { lineBreak: false });

    const studentSize = fitFontSize(doc, studentName, contentW * 0.86, 38, 24, 'Times-Bold');
    doc.font('Times-Bold').fontSize(studentSize).fillColor('#0b214a');
    drawCentered(doc, studentName, contentX, cardY + 218, contentW, { lineBreak: false });

    doc.font('Helvetica').fontSize(12).fillColor('#64748b');
    drawCentered(doc, 'has successfully completed the course', contentX, cardY + 267, contentW, { lineBreak: false });

    const courseSize = fitFontSize(doc, courseName, contentW * 0.8, 24, 15, 'Helvetica-Bold');
    doc.font('Helvetica-Bold').fontSize(courseSize).fillColor('#312e81');
    drawCentered(doc, courseName || 'Course', contentX + contentW * 0.1, cardY + 290, contentW * 0.8, {
      height: 52,
      ellipsis: true,
      lineGap: 1,
    });

    const infoY = cardY + 354;
    const infoW = 235;
    const infoH = 54;
    const infoGap = 22;
    drawInfoCard(doc, pageW / 2 - infoW - infoGap / 2, infoY, infoW, infoH, 'Completion Date', formattedDate, 'D');
    drawInfoCard(doc, pageW / 2 + infoGap / 2, infoY, infoW, infoH, 'Certificate ID', certificateId, 'ID');

    const bottomY = cardY + 430;
    const leftX = contentX + 8;
    const centerX = pageW / 2 - 110;
    const rightX = contentX + contentW - 178;

    if (qrCodeBase64) {
      const qrSize = 62;
      doc.roundedRect(leftX + 24, bottomY, qrSize + 8, qrSize + 8, 5).fillAndStroke('#ffffff', '#d5deef');
      doc.image(qrCodeBase64, leftX + 28, bottomY + 4, { width: qrSize, height: qrSize });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b')
        .text('Scan to verify', leftX, bottomY + 74, { width: 120, align: 'center', lineBreak: false });
    }

    doc.font('Helvetica-Oblique').fontSize(26).fillColor('#111827')
      .text(certificateData.authorizedSignatureName || 'A. Sharma', centerX, bottomY + 10, { width: 220, align: 'center', lineBreak: false });
    doc.moveTo(centerX + 24, bottomY + 52).lineTo(centerX + 196, bottomY + 52)
      .lineWidth(1).strokeColor('#0b214a').stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155')
      .text('Authorized Signature', centerX, bottomY + 60, { width: 220, align: 'center', lineBreak: false });

    doc.font('Times-Bold').fontSize(16).fillColor('#0b214a')
      .text(issueDateFormatted, rightX, bottomY + 22, { width: 178, align: 'center', ellipsis: true, lineBreak: false });
    doc.moveTo(rightX + 15, bottomY + 52).lineTo(rightX + 163, bottomY + 52)
      .lineWidth(1).strokeColor('#0b214a').stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155')
      .text('Date Issued', rightX, bottomY + 60, { width: 178, align: 'center', lineBreak: false });

    doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
      .text(
        `This certificate is issued by ${organizationName} and can be verified using the QR code or verification link.`,
        contentX,
        cardY + cardH - 42,
        { width: contentW, align: 'center', ellipsis: true, lineBreak: false }
      );

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    if (pageCount !== 1) {
      throw new Error(`Certificate layout overflowed to ${pageCount} pages`);
    }

    console.log(`Certificate PDF generated: ${filename}`);
    return `/uploads/certificates/${filename}`;
  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    throw new Error('Failed to generate certificate PDF');
  }
};

/**
 * Delete certificate PDF file.
 * @param {string} pdfPath
 */
export const deleteCertificatePDF = async (pdfPath) => {
  try {
    if (!pdfPath) return;

    const fullPath = path.join(__dirname, '../..', pdfPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted certificate PDF: ${pdfPath}`);
    }
  } catch (error) {
    console.error('Error deleting certificate PDF:', error);
  }
};
