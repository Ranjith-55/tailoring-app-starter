"use client";

import { buildWhatsAppLink } from "../lib/whatsapp";

export default function WhatsAppButton({ phone, message, onSent, label = "Notify on WhatsApp" }) {
  const link = buildWhatsAppLink(phone, message);

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      onClick={() => onSent && onSent()}
      className="inline-flex items-center gap-1 rounded-xl bg-green-500 px-3 py-1.5 text-base font-medium text-white hover:bg-green-600"
    >
      {label}
    </a>
  );
}
