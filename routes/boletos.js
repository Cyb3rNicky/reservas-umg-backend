const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

// GET /api/boletos → Listar boletos del usuario (o todos si es admin)
router.get('/', authRequired, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      [rows] = await pool.query(
        `SELECT b.*, r.usuario_id, e.titulo 
         FROM boletos b
         JOIN reservas r ON b.reserva_id = r.id
         JOIN eventos e ON b.evento_id = e.id
         ORDER BY b.creado_en DESC`
      );
    } else {
      [rows] = await pool.query(
        `SELECT b.*, e.titulo 
         FROM boletos b
         JOIN reservas r ON b.reserva_id = r.id
         JOIN eventos e ON b.evento_id = e.id
         WHERE r.usuario_id = ?
         ORDER BY b.creado_en DESC`, [req.user.id]
      );
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener boletos' });
  }
});

// GET /api/boletos/:codigo → obtener información de un boleto (para validar QR)
router.get('/:codigo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, e.titulo, r.usuario_id 
       FROM boletos b
       JOIN reservas r ON b.reserva_id = r.id
       JOIN eventos e ON b.evento_id = e.id
       WHERE b.codigo = ?`, [req.params.codigo]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Boleto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar boleto' });
  }
});

// POST /api/boletos/verificar → endpoint para escanear/verificar QR en eventos
router.post('/verificar', async (req, res) => {
  const { codigo } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM boletos WHERE codigo = ?', [codigo]
    );
    if (rows.length === 0) return res.status(404).json({ valido: false, error: 'Boleto no encontrado' });

    const boleto = rows[0];

    if (boleto.usado) {
      return res.json({ valido: false, error: 'Boleto ya usado', usado_en: boleto.usado_en });
    }

    return res.json({ valido: true, boleto });
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar boleto' });
  }
});

// PUT /api/boletos/:id/usar → marcar boleto como usado (por staff en entrada)
router.put('/:id/usar', authRequired, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE boletos SET usado = 1, usado_en = NOW() WHERE id = ? AND usado = 0',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Boleto no encontrado o ya usado' });
    }
    res.json({ usado: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar boleto como usado' });
  }
});

module.exports = router;