import axios from 'axios';

const BASE = 'https://waba.360dialog.io/v1';
const headers = () => ({
  'D360-API-KEY': process.env.WHATSAPP_API_KEY!,
  'Content-Type': 'application/json',
});

export async function sendTextMessage(phone: string, text: string): Promise<void> {
  try {
    await axios.post(`${BASE}/messages`, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: text }
    }, { headers: headers() });
    console.log(`✅ Message sent to ${phone}`);
  } catch (err: any) {
    console.error(`❌ Failed to send to ${phone}:`, err.response?.data || err.message);
  }
}

export async function sendWelcome(phone: string, name: string): Promise<void> {
  const text = `مرحباً ${name}! 💪\n\nشكراً لطلبك من Mensupps!\n\nهل تريد تفعيل نظام تذكيرات المكملات الذكي؟\nسيذكرك بكل مكمل في وقته المناسب ويحذرك قبل نفاده.\n\nرد بـ *نعم* للتفعيل أو *لا* للإلغاء.`;
  await sendTextMessage(phone, text);
}

export async function sendDailyStack(
  phone: string, name: string,
  timing: string, products: string[]
): Promise<void> {
  const timingAr: Record<string, string> = {
    MORNING:       '☀️ مكملاتك الصباحية',
    WITH_MEALS:    '🍽️ مكملاتك مع الوجبة',
    PRE_WORKOUT:   '🏋️ مكملاتك قبل التمرين',
    POST_WORKOUT:  '💪 مكملاتك بعد التمرين',
    BEFORE_SLEEP:  '🌙 مكملاتك قبل النوم',
    ANYTIME:       '⏰ تذكير مكملاتك',
  };
  const list = products.map(p => `• ${p}`).join('\n');
  const text = `${name}، حان الوقت! 👋\n\n${timingAr[timing] || timing}:\n${list}\n\nهل أخذتها؟\nرد بـ *نعم* ✅ أو *لاحقاً* ⏰`;
  await sendTextMessage(phone, text);
}

export async function sendReorderAlert(
  phone: string, name: string,
  productName: string, daysLeft: number,
  discountCode: string
): Promise<void> {
  const text = `${name}! ⚠️\n\n*${productName}* على وشك ينتهي!\nباقي تقريباً: ${daysLeft} يوم\n\n🎁 اطلب الآن واستخدم كود الخصم:\n*${discountCode}*\n\n👇 اطلب الآن:\nhttps://mensupps.com`;
  await sendTextMessage(phone, text);
}

export async function sendCreatineReminder(phone: string, name: string): Promise<void> {
  const text = `${name} 💪\n\nوقت الكرياتين!\n\n💧 لا تنسَ تشرب 3-4 لتر ماء اليوم.\nالماء ضروري لتفعيل الكرياتين بشكل صحيح.\n\nرد بـ *تم* عند الأخذ`;
  await sendTextMessage(phone, text);
}
