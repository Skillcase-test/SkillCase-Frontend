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

export const adminAddTicketComment = async (ticketId, message, imageUrl) => {
  return api.post(`/admin/support/ticket/${ticketId}/comment`, { message, imageUrl });
};

export const adminUploadCommentImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return api.post("/admin/support/comment-image/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};
