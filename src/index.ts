import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../generated/prisma';
import { handleOrderCreated } from './webhooks/shopify';
import { startReminderWorker } from './workers/reminderWorker';
import { sendTextMessage } from './services/whatsapp';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.post('/webhooks/orders/fulfilled', handleOrderCreated);

app.post('/webhooks/whatsapp', async (req, res) => {
  const body = req.body;
  console.log('📱 WA incoming:', JSON.stringify(body, null, 2));

  try {
    const message = body?.messages?.[0];
    const contact = body?.contacts?.[0];

    if (
      message?.type === 'interactive' &&
      message?.interactive?.button_reply?.title === 'نعم للتفعيل' &&
      contact?.wa_id
    ) {
      const phone = contact.wa_id;

      await prisma.user.update({
        where: { phone },
        data: { optedIn: true },
      });

      await sendTextMessage(phone, 'تم التفعيل! ✅ ستصلك تذكيرات مكملاتك يومياً في وقتها المناسب 💪');
      console.log(`✅ Opted in user ${phone}`);
    }
  } catch (err: any) {
    console.error('❌ WhatsApp webhook error:', err.message);
  }

  res.sendStatus(200);
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mensupps running on port ${PORT}`);
  startReminderWorker();
});
