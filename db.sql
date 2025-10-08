/* =========================================================
   Base de datos: reservas_umg
   ========================================================= */
DROP DATABASE IF EXISTS reservas_umg;
CREATE DATABASE reservas_umg
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE reservas_umg;

/* =========================================================
   Tabla: usuarios
   ========================================================= */
CREATE TABLE usuarios (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(120)              NOT NULL,
  email           VARCHAR(190)              NOT NULL,
  telefono        VARCHAR(30)               NULL,
  contrasena      VARCHAR(255)              NOT NULL,    -- hash
  rol             VARCHAR(30)               NOT NULL,    -- admin|staff|usuario (libre para el demo)
  creado_en       DATETIME                  NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME                  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuarios_email UNIQUE (email)
) ENGINE=InnoDB;

/* =========================================================
   Tabla: eventos
   Relaciones:
   - creado_por -> usuarios.id
   ========================================================= */
CREATE TABLE eventos (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo          VARCHAR(160)              NOT NULL,
  descripcion     TEXT                      NULL,
  inicia_en       DATETIME                  NOT NULL,
  termina_en      DATETIME                  NULL,
  lugar           VARCHAR(200)              NULL,
  aforo           INT UNSIGNED              NOT NULL DEFAULT 0,
  estado          TINYINT(1)                NOT NULL DEFAULT 0,  -- 0=false(borrador/cerrado), 1=true(publicado/activo)
  creado_por      BIGINT UNSIGNED           NOT NULL,
  creado_en       DATETIME                  NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME                  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_eventos_creado_por
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_eventos_estado    ON eventos (estado);
CREATE INDEX idx_eventos_inicia_en ON eventos (inicia_en);

/* =========================================================
   Tabla: reservas
   Relaciones:
   - usuario_id -> usuarios.id
   - evento_id  -> eventos.id
   ========================================================= */
CREATE TABLE reservas (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id           BIGINT UNSIGNED           NOT NULL,
  evento_id            BIGINT UNSIGNED           NOT NULL,
  cantidad             INT UNSIGNED              NOT NULL,
  codigo_confirmacion  VARCHAR(32)               NOT NULL,
  estado               TINYINT(1)                NOT NULL DEFAULT 0,  -- 0=false(pendiente/cancelada), 1=true(confirmada)
  creado_en            DATETIME                  NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en       DATETIME                  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
  CONSTRAINT fk_reservas_evento
    FOREIGN KEY (evento_id) REFERENCES eventos(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  CONSTRAINT uq_reservas_codigo UNIQUE (codigo_confirmacion)
) ENGINE=InnoDB;

CREATE INDEX idx_reservas_evento   ON reservas (evento_id);
CREATE INDEX idx_reservas_usuario  ON reservas (usuario_id);
CREATE INDEX idx_reservas_estado   ON reservas (estado);

/* =========================================================
   Tabla: boletos
   Relaciones:
   - reserva_id -> reservas.id
   - evento_id  -> eventos.id
   ========================================================= */
CREATE TABLE boletos (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reserva_id      BIGINT UNSIGNED           NOT NULL,
  evento_id       BIGINT UNSIGNED           NOT NULL,
  codigo          VARCHAR(64)               NOT NULL,   -- p.ej. UUID
  qr_payload      VARCHAR(255)              NOT NULL,   -- texto/URL para el QR
  usado           TINYINT(1)                NOT NULL DEFAULT 0,
  usado_en        DATETIME                  NULL,
  creado_en       DATETIME                  NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME                  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_boletos_reserva
    FOREIGN KEY (reserva_id) REFERENCES reservas(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  CONSTRAINT fk_boletos_evento
    FOREIGN KEY (evento_id) REFERENCES eventos(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  CONSTRAINT uq_boletos_codigo UNIQUE (codigo)
) ENGINE=InnoDB;

CREATE INDEX idx_boletos_evento_usado ON boletos (evento_id, usado);
CREATE INDEX idx_boletos_reserva      ON boletos (reserva_id);

/* =========================================================
   Tabla: bitacora_colas
   (no FK estricta por simplicidad del demo;
    ref_id apunta a id de reserva o boleto)0
   ========================================================= */
CREATE TABLE bitacora_colas (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo            VARCHAR(10)               NOT NULL,     -- 'email' | 'pdf'
  ref_id          BIGINT UNSIGNED           NOT NULL,     -- id de reserva o boleto
  intentos        INT UNSIGNED              NOT NULL DEFAULT 0,
  payload_json    JSON                      NULL,
  error_mensaje   TEXT                      NULL,
  creado_en       DATETIME                  NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME                  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_bitacora_tipo     ON bitacora_colas (tipo);
CREATE INDEX idx_bitacora_ref      ON bitacora_colas (ref_id);