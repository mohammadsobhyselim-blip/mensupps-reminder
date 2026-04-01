import axios from 'axios';

const WATI_BASE = process.env.WATI_BASE_URL!;
const WATI_TOKEN = process.env.WATI_API_TOKEN!;

const headers = () => ({
  'Authorization': `Bearer ${WATI_TOKEN}`,
  'Content-Type': 'application/json',
});

async function sendTemplateMessage(
  phone: string,
  templateName: string,
  parameters: { name: string; value: string }[]
) {
  const cleanPhone = phone.replace(/^\+/, '');
  try {
    await axios.post(
      `${WATI_BASE}/api/v1/sendTemplateMessage?whatsappNumber=${cleanPhone}`,
      { template_name: templateName, broadcast_name: templateName, parameters },
      { headers: headers() }
    );
    console.log(`✅ Sent ${templateName} to ${phone}`);
  } catch (err: any) {
    console.error(`❌ Failed ${templateName} to ${phone}:`, err.response?.data || err.message);
  }
}

export async function sendWelcome(phone: string, name: string) {
  await sendTemplateMessage(phone, 'mensupps_welcome', [
    { name: '1', value: name }
  ]);
}

export async function sendDailyStack(
  phone: string, name: string,
  timing: string, products: string[]
) {
  const timingAr: Record<string, string> = {
    MORNING:      '☀️ مكملاتك الصباحية',
    WITH_MEALS:   '🍽️ مكملاتك مع الوجبة',
    PRE_WORKOUT:  '🏋️ مكملاتك قبل التمرين',
    POST_WORKOUT: '💪 مكملاتك بعد التمرين',
    BEFORE_SLEEP: '🌙 مكملاتك قبل النوم',
    ANYTIME:      '⏰ تذكير مكملاتك',
  };
  const list = products.map(p => `• ${p}`).join('\n');
  await sendTemplateMessage(phone, 'mensupps_daily_reminder', [
    { name: '1', value: name },
    { name: '2', value: timingAr[timing] || timing },
    { name: '3', value: list }
  ]);
}

export async function sendReorderAlert(
  phone: string, name: string,
  productName: string, daysLeft: number,
  discountCode: string
) {
  await sendTemplateMessage(phone, 'mensupps_reorder', [
    { name: '1', value: name },
    { name: '2', value: productName },
    { name: '3', value: String(daysLeft) },
    { name: '4', value: discountCode }
  ]);
}

export async function sendCreatineReminder(phone: string, name: string) {
  await sendTemplateMessage(phone, 'mensupps_daily_reminder', [
    { name: '1', value: name },
    { name: '2', value: '💪 وقت الكرياتين' },
    { name: '3', value: '• الكرياتين\n💧 اشرب 3-4 لتر ماء اليوم' }
  ]);
}

export async function sendTextMessage(phone: string, message: string) {
  const cleanPhone = phone.replace(/^\+/, '');
  try {
    await axios.post(
      `${WATI_BASE}/api/v1/sendSessionMessage/${cleanPhone}`,
      { messageText: message },
      { headers: headers() }
    );
    console.log(`✅ Sent text message to ${phone}`);
  } catch (err: any) {
    console.error(`❌ Failed to send text to ${phone}:`, err.response?.data || err.message);
  }
}
