require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { getChannel, QUEUES } = require('../queue');
const pool = require('../db');
const { logJob } = require('../bitacora');

const STORAGE = path.join(__dirname, '..', 'storage', 'boletos');

const transport = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
  port: Number(process.env.MAILTRAP_PORT || 2525),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

async function main() {
  const ch = await getChannel();
  ch.consume(QUEUES.EMAIL, async (msg) => {
    if (!msg) return;
    const payload = JSON.parse(msg.content.toString());
    const { reserva_id, to, codigo_confirmacion } = payload;

    try {
      const pdfPath = path.join(STORAGE, `reserva_${reserva_id}.pdf`);
      const attachments = fs.existsSync(pdfPath) ? [{ filename: `boletos_reserva_${reserva_id}.pdf`, path: pdfPath }] : [];

      await transport.sendMail({
        from: '"Reservas UMG" <no-reply@umg.local>',
        to,
        subject: `Confirmación de reserva #${reserva_id}`,
        text: `Tu reserva fue creada. Código de confirmación: ${codigo_confirmacion}`,
        html: `<p>Tu reserva fue creada.</p>
               <p><b>Código de confirmación:</b> ${codigo_confirmacion}</p>
               <p>Adjuntamos tus boletos en PDF con códigos QR.</p>`,
        attachments,
      });

      await pool.query(`UPDATE reservas SET actualizado_en = NOW() WHERE id=?`, [reserva_id]);
      await logJob({ tipo: 'email', ref_id: reserva_id, payload_json: payload, incIntentos: true });
      ch.ack(msg);
    } catch (err) {
      console.error('Email job failed:', err.message);
      await logJob({ tipo: 'email', ref_id: reserva_id, payload_json: payload, error_mensaje: err.message, incIntentos: true });
      ch.nack(msg, false, false); // descartar para no ciclar
    }
  }, { noAck: false });
}

main().catch(console.error);
