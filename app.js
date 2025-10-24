require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getChannel } = require('./queue');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const eventosRouter = require('./routes/eventos');
app.use('/api/eventos', eventosRouter);

const reservasRouter = require('./routes/reservas');
app.use('/api/reservas', reservasRouter);

const boletosRouter = require('./routes/boletos');
app.use('/api/boletos', boletosRouter);

// Health
app.get('/', (req, res) => res.send('API OK'));
app.get('/__whoami', (req, res) => res.json({ app: 'reservas-umg-backend', pid: process.pid }));
app.get('/__queue', async (req, res) => {
  try { await getChannel(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// 404 JSON
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.originalUrl }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
