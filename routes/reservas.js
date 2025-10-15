const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

// GET /api/reservas - reservas del usuario autenticado
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
  // Genera un código de confirmación sencillo
  const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
  try {
    const [result] = await pool.query(
      'INSERT INTO reservas (usuario_id, evento_id, cantidad, codigo_confirmacion, estado) VALUES (?, ?, ?, ?, 1)',
      [req.user.sub, evento_id, cantidad, codigo]
    );
    res.status(201).json({ id: result.insertId, codigo_confirmacion: codigo });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear reserva' });
  }
});

// GET /api/reservas/:id - ver reserva (solo propietario)
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

// DELETE /api/reservas/:id - cancelar reserva (solo propietario)
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