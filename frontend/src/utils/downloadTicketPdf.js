import api from '../api/axios';

/**
 * Downloads a ticket's PDF receipt. Uses a blob fetch (not a plain <a href>) because the
 * request needs the auth cookie attached and works the same whether the API lives on the
 * same origin (local dev) or a different one (production, frontend on Vercel / backend on Render).
 */
export async function downloadTicketPdf(ticketId, code) {
  const res = await api.get(`/tickets/${ticketId}/receipt`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `vibecrafters-ticket-${code || ticketId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
