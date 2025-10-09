require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// 1) Middlewares
app.use(cors());
app.use(express.json());

// 2) Rutas de tu API
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// 3) Healthchecks (NO tocan DB)
app.get('/healthz', (_req, res) => res.status(200).send('ok')); // <- para Render
app.get('/', (_req, res) => res.send('API OK'));
app.get('/__whoami', (_req, res) => res.json({ app: 'reservas-umg-backend', pid: process.pid }));

// 4) 404 JSON
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// 5) Levantar servidor: usar el PORT de Render y bind a 0.0.0.0
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});

// (Opcional, mejora wake-up/keep-alive en Render)
server.keepAliveTimeout = 65000;  // 65s
server.headersTimeout   = 66000;  // 66s
