const cron = require('node-cron');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const TicketType = require('../models/TicketType');

const startPaymentCron = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Find pending payments older than 15 minutes
      const abandonedPayments = await Payment.find({
        status: 'created',
        createdAt: { $lt: fifteenMinutesAgo },
      }).populate('tickets');

      for (const payment of abandonedPayments) {
        payment.status = 'failed';
        await payment.save();

        const tickets = payment.tickets;
        if (!tickets || tickets.length === 0) continue;

        const ticketTypeMap = {};
        for (const t of tickets) {
          if (t.status === 'reserved') {
            t.status = 'cancelled';
            await t.save();

            ticketTypeMap[t.ticketType] = (ticketTypeMap[t.ticketType] || 0) + 1;
            
            // Release promo code if used
            if (t.promoCodeUsed) {
               await TicketType.updateOne(
                { _id: t.ticketType, 'promoCodes.code': t.promoCodeUsed },
                { $inc: { 'promoCodes.$.usedCount': -1 } }
              ).catch(() => {});
            }
          }
        }

        // Release inventory
        for (const [ticketTypeId, qty] of Object.entries(ticketTypeMap)) {
          await TicketType.updateOne(
            { _id: ticketTypeId },
            { $inc: { quantitySold: -qty } }
          );
        }
      }
      
      if (abandonedPayments.length > 0) {
        console.log(`🧹 Cleaned up ${abandonedPayments.length} abandoned checkouts`);
      }
    } catch (error) {
      console.error('Payment cron failed:', error);
    }
  });
};

module.exports = { startPaymentCron };
