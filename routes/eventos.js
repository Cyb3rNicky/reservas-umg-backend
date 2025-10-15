const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

// GET /api/eventos - listado de eventos activos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM eventos WHERE estado = 1 ORDER BY inicia_en ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

// GET /api/eventos/:id - detalle del evento
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM eventos WHERE id = ?', [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el evento' });
  }
});

// POST /api/eventos - crear evento (cualquier usuario autenticado)
router.post('/', authRequired, async (req, res) => {
  const { titulo, descripcion, inicia_en, termina_en, lugar, aforo } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO eventos (titulo, descripcion, inicia_en, termina_en, lugar, aforo, estado, creado_por) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
      [titulo, descripcion, inicia_en, termina_en, lugar, aforo, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear evento', detalle: err.message, sql: err.sqlMessage });
  }
});

// PUT /api/eventos/:id - editar evento (cualquier usuario autenticado)
router.put('/:id', authRequired, async (req, res) => {
  const { titulo, descripcion, inicia_en, termina_en, lugar, aforo, estado } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE eventos SET titulo=?, descripcion=?, inicia_en=?, termina_en=?, lugar=?, aforo=?, estado=? WHERE id=?',
      [titulo, descripcion, inicia_en, termina_en, lugar, aforo, estado, req.params.id]
    );
    res.json({ updated: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar evento' });
  }
});

// DELETE /api/eventos/:id - eliminar evento (cualquier usuario autenticado)
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM eventos WHERE id=?', [req.params.id]);
    res.json({ deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
});

module.exports = router;