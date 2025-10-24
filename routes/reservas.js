const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { publishSafe, QUEUES } = require('../queue'); // <-- SOLO esta importación
const { logJob } = require('../bitacora');
const crypto = require('crypto');

// GET /api/reservas
router.get('/', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT r.*, e.titulo, e.lugar FROM reservas r JOIN eventos e ON r.evento_id = e.id WHERE r.usuario_id = ?',
      [req.user.sub]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

// POST /api/reservas - crear reserva
router.post('/', authRequired, async (req, res) => {
  const { evento_id, cantidad } = req.body;
  const cant = Math.max(1, Math.min(Number(cantidad || 1), 10));
  const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Crear reserva
    const [r] = await conn.query(
      'INSERT INTO reservas (usuario_id, evento_id, cantidad, codigo_confirmacion, estado) VALUES (?, ?, ?, ?, 1)',
      [req.user.sub, evento_id, cant, codigo]
    );
    const reservaId = r.insertId;

    // Crear boletos
    const [evRows] = await conn.query('SELECT titulo FROM eventos WHERE id=?', [evento_id]);
    const eventoTitulo = evRows[0]?.titulo || '';

    const codigos = [];
    for (let i = 0; i < cant; i++) {
      const code = crypto.randomUUID();
      const qr_payload = `https://miapp.local/boletos/${code}`;
      await conn.query(
        'INSERT INTO boletos (reserva_id, evento_id, codigo, qr_payload, usado) VALUES (?, ?, ?, ?, 0)',
        [reservaId, evento_id, code, qr_payload]
      );
      codigos.push({ codigo: code, qr_payload });
    }

    await conn.commit();

    // Publicar trabajos en colas
    const [uRows] = await pool.query('SELECT email, nombre FROM usuarios WHERE id=?', [req.user.sub]);
    const destinatario = uRows[0]?.email;

    const pdfMsg = { reserva_id: reservaId, evento_id, usuario_id: req.user.sub, codigos, eventoTitulo };
    const emailMsg = { reserva_id: reservaId, to: destinatario, codigo_confirmacion: codigo };

    // bitácora "en cola"
    await logJob({ tipo: 'pdf', ref_id: reservaId, payload_json: pdfMsg });
    await logJob({ tipo: 'email', ref_id: reservaId, payload_json: emailMsg });

    // publicar (no rompe request si falla)
    const okPdf   = await publishSafe(QUEUES.PDF, pdfMsg);
    const okEmail = destinatario ? await publishSafe(QUEUES.EMAIL, emailMsg) : true;

    if (!okPdf)
      await logJob({ tipo: 'pdf', ref_id: reservaId, payload_json: pdfMsg, error_mensaje: 'Fallo al publicar en cola', incIntentos: true });
    if (!okEmail)
      await logJob({ tipo: 'email', ref_id: reservaId, payload_json: emailMsg, error_mensaje: 'Fallo al publicar en cola', incIntentos: true });

    return res.status(201).json({ id: reservaId, codigo_confirmacion: codigo });

  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error('Error en POST /api/reservas:', err);
    res.status(500).json({ error: 'Error al crear reserva' });
  } finally {
    conn.release();
  }
});

// GET /api/reservas/:id
router.get('/:id', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM reservas WHERE id = ? AND usuario_id = ?', [req.params.id, req.user.sub]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reserva' });
  }
});

// DELETE /api/reservas/:id
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM reservas WHERE id=? AND usuario_id=?', [req.params.id, req.user.sub]
    );
    res.json({ deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar reserva' });
  }
});

module.exports = router;
