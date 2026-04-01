بimport express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { handleOrderCreated } from './webhooks/shopify';

const app = express();
app.use(express.json());

app.post('/webhooks/orders/fulfilled', handleOrderCreated);

app.post('/webhooks/whatsapp', (req, res) => {
  const body = req.body;
  console.log('📱 WA incoming:', JSON.stringify(body, null, 2));
  res.sendStatus(200);
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mensupps running on port ${PORT}`);
});
