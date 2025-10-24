require('dotenv').config();
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { getChannel, QUEUES } = require('../queue');
const pool = require('../db');
const { logJob } = require('../bitacora');

const STORAGE = path.join(__dirname, '..', 'storage', 'boletos');
fs.mkdirSync(STORAGE, { recursive: true });

async function generatePDF({ reserva_id, codigos, eventoTitulo }) {
  const filename = path.join(STORAGE, `reserva_${reserva_id}.pdf`);
  const doc = new PDFDocument({ autoFirstPage: false });

  const stream = fs.createWriteStream(filename);
  doc.pipe(stream);

  for (const { codigo, qr_payload } of codigos) {
    doc.addPage({ size: 'A4', margin: 50 });
    doc.fontSize(22).text(`Boleto - ${eventoTitulo}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Código: ${codigo}`, { align: 'center' });
    doc.moveDown();

    const dataUrl = await QRCode.toDataURL(qr_payload, { margin: 1, scale: 6 });
    const base64 = dataUrl.split(',')[1];
    const imgBuffer = Buffer.from(base64, 'base64');

    const imgSize = 200;
    const x = (doc.page.width - imgSize) / 2;
    doc.image(imgBuffer, x, doc.y, { width: imgSize, height: imgSize });
    doc.moveDown(2);
    doc.fontSize(10).text(qr_payload, { align: 'center', width: doc.page.width - 100 });
  }

  doc.end();
  await new Promise((r) => stream.on('finish', r));
  return filename;
}

async function main() {
  const ch = await getChannel();
  ch.consume(QUEUES.PDF, async (msg) => {
    if (!msg) return;
    const payload = JSON.parse(msg.content.toString());
    const { reserva_id } = payload;

    try {
      const pdfPath = await generatePDF(payload);
      // guardar ruta de PDF (opcional)
      await pool.query(`UPDATE reservas SET actualizado_en = NOW() WHERE id=?`, [reserva_id]);
      await logJob({ tipo: 'pdf', ref_id: reserva_id, payload_json: { ...payload, pdfPath }, incIntentos: true });
      ch.ack(msg);
    } catch (err) {
      console.error('PDF job failed:', err.message);
      await logJob({ tipo: 'pdf', ref_id: reserva_id, payload_json: payload, error_mensaje: err.message, incIntentos: true });
      // requeue simple:
      ch.nack(msg, false, false); // descártalo para evitar bucle infinito
    }
  }, { noAck: false });
}

main().catch(console.error);
