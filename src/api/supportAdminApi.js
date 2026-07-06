import api from "./axios";

export const adminGetTickets = async () => {
  return api.get("/admin/support/tickets");
};

export const adminUpdateTicketStatus = async (ticketId, status) => {
  return api.patch(`/admin/support/ticket/${ticketId}/status`, { status });
};

export const adminUpdateTicketPriority = async (ticketId, priority) => {
  return api.patch(`/admin/support/ticket/${ticketId}/priority`, { priority });
};
