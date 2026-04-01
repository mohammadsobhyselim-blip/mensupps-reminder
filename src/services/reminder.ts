import { PrismaClient } from '../../generated/prisma';
import { sendDailyStack, sendReorderAlert, sendCreatineReminder } from './whatsapp';
import { getSendTimeToday, subtractMinutes, msUntil } from '../utils/timeHelper';

const prisma = new PrismaClient();

type TimingCategory = 'MORNING' | 'WITH_MEALS' | 'PRE_WORKOUT' | 'POST_WORKOUT' | 'BEFORE_SLEEP' | 'ANYTIME';

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + minutes) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getSendTime(
  category: TimingCategory,
  user: { wakeTime: string; sleepTime: string; workoutTime: string | null }
): Date | null {
  switch (category) {
    case 'MORNING':
    case 'ANYTIME':
      return getSendTimeToday(user.wakeTime);
    case 'WITH_MEALS':
      return getSendTimeToday(addMinutes(user.wakeTime, 120));
    case 'PRE_WORKOUT':
      if (!user.workoutTime) return null;
      return getSendTimeToday(subtractMinutes(user.workoutTime, 30));
    case 'POST_WORKOUT':
      if (!user.workoutTime) return null;
      return getSendTimeToday(user.workoutTime);
    case 'BEFORE_SLEEP':
      return getSendTimeToday(subtractMinutes(user.sleepTime, 30));
    default:
      return getSendTimeToday(user.wakeTime);
  }
}

function scheduleAt(sendTime: Date, fn: () => Promise<void>): void {
  const delay = msUntil(sendTime);
  if (delay === 0 && sendTime.getTime() < Date.now()) {
    console.log(`⏭️  Skipping past send time ${sendTime.toISOString()}`);
    return;
  }
  setTimeout(() => fn().catch(err => console.error('❌ Scheduled send failed:', err)), delay);
}

export async function runReminderEngine(): Promise<void> {
  console.log('🔔 Running reminder engine...');

  const users = await prisma.user.findMany({
    where: { optedIn: true, isActive: true },
    include: {
      products: {
        include: { product: true },
      },
    },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  for (const user of users) {
    const activeProducts = user.products.filter(
      up => up.estimatedEndDate >= todayStart
    );

    // Creatine products get a dedicated reminder
    const creatineProducts = activeProducts.filter(up => up.product.isCreatine);
    if (creatineProducts.length > 0) {
      const sendTime = getSendTimeToday(user.wakeTime);
      scheduleAt(sendTime, () => sendCreatineReminder(user.phone, user.name));
    }

    // Group non-creatine products by timingCategory
    const grouped: Record<string, string[]> = {};
    for (const up of activeProducts.filter(up => !up.product.isCreatine)) {
      const cat = up.product.timingCategory;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(up.product.name);
    }

    for (const [category, products] of Object.entries(grouped)) {
      const sendTime = getSendTime(category as TimingCategory, user);
      if (!sendTime) {
        console.log(`⚠️  Skipping ${category} for ${user.phone} — no workoutTime set`);
        continue;
      }
      scheduleAt(sendTime, () =>
        sendDailyStack(user.phone, user.name, category, products)
      );
    }

    // Reorder alerts for today
    for (const up of activeProducts) {
      if (up.reorderSent) continue;

      const triggerDate = new Date(up.reorderTriggerDate);
      triggerDate.setHours(0, 0, 0, 0);
      if (triggerDate < todayStart || triggerDate >= todayEnd) continue;

      const daysLeft = Math.ceil(
        (up.estimatedEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const discountCode = process.env.REORDER_DISCOUNT_CODE || 'REORDER10';

      try {
        await sendReorderAlert(user.phone, user.name, up.product.name, daysLeft, discountCode);
        await prisma.userProduct.update({
          where: { id: up.id },
          data: { reorderSent: true },
        });
      } catch (err) {
        console.error(`❌ Reorder alert failed for ${user.phone}:`, err);
      }
    }
  }

  console.log(`✅ Reminder engine scheduled for ${users.length} users`);
}
