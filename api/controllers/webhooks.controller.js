import crypto from 'crypto';

/**
 * Verify webhook signature
 */
function verifySignature(payload, signature, secret) {
  if (!secret || !signature) return true;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEquals(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Receive x402 payment notifications
 */
export function handlePaymentWebhook(req, res) {
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];
  const webhookId = req.headers['x-webhook-id'];
  
  const secret = process.env.WEBHOOK_RECEIVE_SECRET;
  if (secret && !verifySignature(req.body, signature, secret)) {
    console.error('❌ Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const payload = req.body;
  
  console.log('\n' + '='.repeat(60));
  console.log('💰 PAYMENT WEBHOOK RECEIVED');
  console.log('='.repeat(60));
  console.log(`Event: ${event || payload.event}`);
  console.log(`ID: ${webhookId || payload.id}`);
  console.log(`Time: ${payload.timestamp}`);
  
  if (payload.data) {
    console.log(`Amount: ${payload.data.amount}`);
    console.log(`Operation: ${payload.data.operation}`);
    console.log(`Network: ${payload.data.networkName || payload.data.network}`);
    console.log(`Payer: ${payload.data.payer}`);
    if (payload.data.transactionHash) {
      console.log(`TX: ${payload.data.transactionHash}`);
    }
    if (payload.data.explorerUrl) {
      console.log(`Explorer: ${payload.data.explorerUrl}`);
    }
  }
  console.log('='.repeat(60) + '\n');
  
  res.status(200).json({ 
    received: true,
    id: webhookId || payload.id
  });
}

/**
 * Health check for webhook receiver
 */
export function getWebhookHealth(req, res) {
  res.json({ 
    status: 'ok',
    endpoint: '/webhooks/payments',
    timestamp: new Date().toISOString()
  });
}
