# 🎟️ Reservas UMG – Backend

API REST construida con **Node.js + Express + MySQL + RabbitMQ** para la gestión de eventos, reservas y boletos con códigos QR y envío de correos automáticos.

---

## 🚀 Tecnologías principales

- **Node.js + Express** – Servidor HTTP principal.
- **MySQL (TiDB Cloud)** – Base de datos transaccional.
- **RabbitMQ (CloudAMQP)** – Sistema de colas para procesar PDF y correos en background.
- **Mailtrap** – Entorno de pruebas para envío de emails.
- **PDFKit + QRCode** – Generación de boletos con QR en PDF.
- **JWT + Bcrypt** – Autenticación segura.

---

## ⚙️ Configuración inicial

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/tuusuario/reservas-umg-backend.git
   cd reservas-umg-backend
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Crear archivo `.env`**

   ```env
   PORT=3000

   DB_HOST=gateway01.us-east-1.prod.aws.tidbcloud.com
   DB_PORT=4000
   DB_USER=SUDLxRDKWDBYWhQ.root
   DB_PASSWORD=45urfSMN8ZdocaHH
   DB_NAME=reservas_umg
   DB_SSL=true

   JWT_SECRET=sara_secret_key
   JWT_EXPIRES=1h
   BCRYPT_ROUNDS=10

   # RabbitMQ CloudAMQP
   RABBIT_URL=amqps://dvocozcu:TeFNlVAyPPJErCZTwm6W1QQWulODOlhA@shrimp.rmq.cloudamqp.com/dvocozcu

   # Mailtrap
   MAILTRAP_HOST=sandbox.smtp.mailtrap.io
   MAILTRAP_PORT=2525
   MAILTRAP_USER=0104995de26f9f
   MAILTRAP_PASS=e72d100672e2a0
   ```

4. **Estructura del proyecto**

   ```
   ├─ app.js
   ├─ db.js
   ├─ queue.js
   ├─ bitacora.js
   ├─ routes/
   │  ├─ auth.js
   │  ├─ eventos.js
   │  ├─ reservas.js
   │  └─ boletos.js
   ├─ workers/
   │  ├─ pdfWorker.js
   │  └─ emailWorker.js
   └─ storage/boletos/
   ```

---

## 🧩 Comandos

| Acción | Comando |
|--------|----------|
| Ejecutar en desarrollo | `npm run dev` |
| Servidor en producción | `npm start` |
| Worker PDF (local) | `npm run worker:pdf` |
| Worker Email (local) | `npm run worker:email` |

---

## 🌐 Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Crear usuario |
| `POST` | `/api/auth/login` | Autenticarse |
| `GET`  | `/api/eventos` | Listar eventos |
| `POST` | `/api/reservas` | Crear reserva |
| `GET`  | `/api/boletos` | Listar boletos del usuario |
| `POST` | `/api/boletos/verificar` | Validar QR |

---

## 🧵 Workers (RabbitMQ)

- **PDF Worker:** genera boletos en PDF con código QR y los guarda en `storage/boletos`.
- **Email Worker:** envía correo al usuario con su PDF adjunto (via Mailtrap).

Ambos consumen colas **pdf_jobs** y **email_jobs** respectivamente desde **CloudAMQP**.

---

## ☁️ Despliegue en Render

1. Crear 3 servicios en Render:
   - **Web Service:** `node app.js`
   - **Worker PDF:** `node workers/pdfWorker.js`
   - **Worker Email:** `node workers/emailWorker.js`

2. Configurar todas las variables de entorno (.env).

O bien usar **render.yaml**:

```yaml
services:
  - type: web
    name: reservas-umg-api
    env: node
    startCommand: "node app.js"
  - type: worker
    name: reservas-umg-pdf-worker
    env: node
    startCommand: "node workers/pdfWorker.js"
  - type: worker
    name: reservas-umg-email-worker
    env: node
    startCommand: "node workers/emailWorker.js"
```

---

## 🧪 Pruebas rápidas

- Healthcheck: [http://localhost:3000/__queue](http://localhost:3000/__queue)
- Si responde `{ ok: true }`, la conexión con CloudAMQP funciona.

---

## 🧰 Licencia

MIT © 2025 Universidad Mariano Gálvez – Proyecto académico de gestión de reservas.
