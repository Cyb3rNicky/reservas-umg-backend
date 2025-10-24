const pool = require('./db');

async function logJob({ tipo, ref_id, payload_json, error_mensaje = null, incIntentos = false }) {
  if (incIntentos) {
    await pool.query(
      `UPDATE bitacora_colas SET intentos = intentos + 1, error_mensaje = ? WHERE tipo = ? AND ref_id = ?`,
      [error_mensaje, tipo, ref_id]
    );
  } else {
    await pool.query(
      `INSERT INTO bitacora_colas (tipo, ref_id, payload_json, intentos, error_mensaje)
       VALUES (?, ?, ?, 0, ?)`,
      [tipo, ref_id, JSON.stringify(payload_json || null), error_mensaje]
    );
  }
}

module.exports = { logJob };
