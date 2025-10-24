const amqp = require('amqplib');

let conn, channel, connecting = null;
const QUEUES = { PDF: 'pdf_jobs', EMAIL: 'email_jobs' };

async function _connect() {
  const url = process.env.RABBIT_URL;
  if (!url) throw new Error('RABBIT_URL no configurado');
  const c = await amqp.connect(url, {
    clientProperties: { connection_name: 'reservas-umg-backend' },
    heartbeat: 30,
  });
  c.on('error', (e) => console.error('RabbitMQ conn error:', e.message));
  c.on('close', () => {
    console.warn('RabbitMQ conn closed, resetting channel');
    channel = undefined; conn = undefined; connecting = null;
  });
  return c;
}

async function getChannel() {
  if (channel) return channel;
  if (connecting) return connecting;

  connecting = (async () => {
    conn = await _connect();
    const ch = await conn.createChannel();
    await ch.assertQueue(QUEUES.PDF, { durable: true });
    await ch.assertQueue(QUEUES.EMAIL, { durable: true });

    ch.on('error', (e) => console.error('RabbitMQ channel error:', e.message));
    ch.on('close', () => {
      console.warn('RabbitMQ channel closed');
      channel = undefined; connecting = null;
    });

    channel = ch;
    return channel;
  })();

  return connecting;
}

async function publish(queue, payload) {
  const ch = await getChannel();
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
  return true;
}

// No rompe el request si Rabbit falla
async function publishSafe(queue, payload) {
  try {
    return await publish(queue, payload);
  } catch (err) {
    console.error('RabbitMQ publish error:', err.message);
    return false;
  }
}

module.exports = { getChannel, publish, publishSafe, QUEUES };
