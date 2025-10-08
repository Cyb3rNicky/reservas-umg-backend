const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1h';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, rol, telefono } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }

    // ¿Existe ya?
    const [exists] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );
    if (exists.length) {
      return res.status(409).json({ error: 'Email ya registrado' });
    }

    const hash = await bcrypt.hash(password, ROUNDS);
    const rolFinal = ['admin', 'staff', 'usuario'].includes(rol) ? rol : 'usuario';

    const [result] = await pool.execute(
      'INSERT INTO usuarios (nombre, email, telefono, contrasena, rol) VALUES (?, ?, ?, ?, ?)',
      [email.split('@')[0], email, telefono || null, hash, rolFinal]
    );

    const user = { id: result.insertId, email, rol: rolFinal };
    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de registro' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      'SELECT id, email, contrasena, rol FROM usuarios WHERE email = ?',
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.contrasena);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken({ id: user.id, email: user.email, rol: user.rol });
    res.json({ token, user: { id: user.id, email: user.email, rol: user.rol } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de login' });
  }
});

// GET /api/auth/me
const { authRequired } = require('../middleware/auth');
router.get('/me', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = ?',
      [req.user.sub]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de perfil' });
  }
});

module.exports = router;
