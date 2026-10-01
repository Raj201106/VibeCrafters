import api from '../api/axios';

/**
 * Downloads the branded check-in report PDF for an event (VibeCrafters header, event
 * details, and the full list of checked-in attendees). Uses a blob fetch — same
 * pattern as downloadTicketPdf.js — so the auth cookie is attached and it works
 * whether the API is same-origin (local dev) or a different origin (production).
 */
export async function downloadCheckInReport(eventId, eventSlugOrTitle) {
  const res = await api.get(`/events/${eventId}/check-in-report`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  const safeName = (eventSlugOrTitle || eventId).toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.download = `vibecrafters-checkin-${safeName}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
