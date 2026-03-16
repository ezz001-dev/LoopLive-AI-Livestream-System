import { MidtransClient } from 'midtrans-client';

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

// Check for required environment variables
if (!process.env.MIDTRANS_SERVER_KEY) {
  console.warn('WARNING: MIDTRANS_SERVER_KEY is missing in .env');
}

export const midtransSnap = new MidtransClient.Snap({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

export const midtransCore = new MidtransClient.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

/**
 * Generate a unique Order ID for Midtrans
 */
export function generateOrderId(tenantId: string) {
  return `LL-${tenantId.substring(0, 8)}-${Date.now()}`;
}

/**
 * Validates a Midtrans notification using the Core API verify function
 */
export async function verifyMidtransNotification(notificationBody: any) {
  try {
    const statusResponse = await midtransCore.transaction.notification(notificationBody);
    return statusResponse;
  } catch (error) {
    console.error('Midtrans Notification Verification Failed:', error);
    throw error;
  }
}
