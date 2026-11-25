/**
 * Builds a free wa.me "click to chat" link. No API, no account, no cost —
 * it just opens WhatsApp with the message pre-filled; a human still taps Send.
 *
 * @param {string} phone - digits only, with country code, e.g. "919876543210"
 * @param {string} message - plain text message
 */
export function buildWhatsAppLink(phone, message) {
  const cleanPhone = (phone || "").replace(/[^\d]/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// `garment` is always the plain-text garment description (e.g. "Blouse,
// Chudidhar") — never raw measurement values, so these never leak size data.
export const messageTemplates = {
  welcome: ({ name, shopName = "Sree Designer" }) =>
    `Hi ${name}, welcome to ${shopName}! Thank you for choosing us for your tailoring needs. We'll send you updates about your orders right here on WhatsApp.`,
  statusUpdate: ({ name, garment, status, shopName = "Sree Designer" }) =>
    `Hi ${name}, this is ${shopName}. Your ${garment} order is now: ${status}.`,
  orderReady: ({ name, garment, shopName = "Sree Designer" }) =>
    `Hi ${name}, this is ${shopName}. Your ${garment} is ready for pickup! Please collect it at your convenience.`,
  orderCompleted: ({ name, garment, shopName = "Sree Designer" }) =>
    `Hi ${name}, thank you for choosing ${shopName}! Your ${garment} has been delivered. We hope you love it — thank you for trusting us with your tailoring.`,
  paymentReceived: ({ name, amount, balance, shopName = "Sree Designer" }) =>
    `Hi ${name}, this is ${shopName}. We've received your payment of ₹${amount}. Balance due: ₹${balance}.`,
};
