import cron from 'node-cron';
import { runReminderEngine } from '../services/reminder';

export function startReminderWorker(): void {
  // Runs every day at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('⏰ 6 AM cron triggered — starting reminder engine');
    try {
      await runReminderEngine();
    } catch (err) {
      console.error('❌ Reminder engine error:', err);
    }
  });

  console.log('✅ Reminder worker started — scheduled daily at 06:00');
}
