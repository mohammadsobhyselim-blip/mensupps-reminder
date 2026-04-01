import crypto from 'crypto';
import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { classifyProduct } from '../services/classifier';
import { extractServings, calcPrediction, defaultServings } from '../services/servings';
import { sendWelcome } from '../services/whatsapp';

const prisma = new PrismaClient();

export async function handleOrderCreated(req: Request, res: Response): Promise<void> {
  const hmac = req.headers['x-shopify-hmac-sha256'] as string;
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_SECRET!)
    .update(JSON.stringify(req.body))
    .digest('base64');

  if (hmac && hash !== hmac) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.status(200).json({ ok: true });

  const order = req.body;
  const rawPhone: string | undefined = order.customer?.phone;
  const phone = rawPhone ? '+' + rawPhone.replace(/\D/g, '') : null;
  const name  = order.customer?.first_name || 'صديقي';

  if (!phone) {
    console.warn(`⚠️ No phone for order ${order.id}`);
    return;
  }

  try {
    const user = await prisma.user.upsert({
      where:  { phone },
      update: { name },
      create: { phone, name },
    });

    for (const item of order.line_items) {
      const { category, isCreatine, method } = await classifyProduct({
        title:       item.title || '',
        description: item.product_description || '',
        tags:        item.tags ? item.tags.split(',') : [],
      });

      console.log(`📦 ${item.title} → ${category} (via ${method})`);

      const detected = extractServings(item.title, item.product_description || '');
      const servings  = detected ?? defaultServings(category);
      const { estimatedEndDate, reorderTriggerDate } = calcPrediction(servings);

      const product = await prisma.product.upsert({
        where:  { shopifyId: String(item.product_id) },
        update: { timingCategory: category, servings },
        create: {
          shopifyId:      String(item.product_id),
          name:           item.title,
          timingCategory: category,
          servings,
          isCreatine,
        },
      });

      await prisma.userProduct.create({
        data: {
          userId:            user.id,
          productId:         product.id,
          servings,
          estimatedEndDate,
          reorderTriggerDate,
        },
      });
    }

    if (!user.optedIn) {
      await sendWelcome(phone, name);
    }

    console.log(`✅ Order processed for ${name} (${phone})`);
  } catch (err) {
    console.error('❌ Order processing error:', err);
  }
}
