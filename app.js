require('dotenv').config();   // 1. Cargar variables de entorno (.env)
const express = require('express'); 
const cors = require('cors');

const app = express();

// 2. Middlewares
app.use(cors());
app.use(express.json());      // Para leer JSON en el body

// 3. Rutas
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);        // => /api/auth/register, /login, /me

// 4. Healthcheck y firma
app.get('/', (req, res) => res.send('API OK'));
app.get('/__whoami', (req, res) => res.json({ app: 'reservas-umg-backend', pid: process.pid }));

// 5. 404 JSON (evita el HTML por defecto)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// 6. Levantar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
