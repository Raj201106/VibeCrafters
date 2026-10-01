const twilio = require('twilio');

const sendSMS = async (to, message) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
      console.log('📱 [DEV MODE] SMS to ' + to + ': ' + message);
      return;
    }

    let fromNum = process.env.TWILIO_FROM_NUMBER;
    if (!fromNum.startsWith('+')) fromNum = fromNum.length === 10 ? `+91${fromNum}` : `+${fromNum}`;
    
    let toNum = to;
    if (!toNum.startsWith('+')) toNum = toNum.length === 10 ? `+91${toNum}` : `+${toNum}`;

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: message,
      from: fromNum,
      to: toNum,
    });
    console.log(`📱 SMS sent to ${to}`);
  } catch (error) {
    console.error('Twilio SMS error:', error);
  }
};

module.exports = { sendSMS };
