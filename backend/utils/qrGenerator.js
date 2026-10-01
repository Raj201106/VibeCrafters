const QRCode = require('qrcode');

/**
 * Generates a base64 PNG data URL encoding the ticket verification payload.
 * The payload is a signed-looking compact string: ticketId|eventId|code
 * In production, sign this with an HMAC so check-in scanners can verify authenticity offline.
 */
const generateTicketQR = async (ticketId, eventId, code) => {
  const payload = JSON.stringify({ t: ticketId, e: eventId, c: code });
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 320,
    color: { dark: '#0F2A3D', light: '#FFFFFF' },
  });
  return dataUrl;
};

module.exports = { generateTicketQR };
