import api from "./axios";

export const raiseTicket = async (title, description, screenshotUrl) => {
  return api.post("/support/ticket", { title, description, screenshotUrl });
};

export const getUserTickets = async () => {
  return api.get("/support/tickets");
};

export const uploadScreenshot = async (file) => {
  const formData = new FormData();
  formData.append("screenshot", file);
  return api.post("/support/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

export const addTicketComment = async (ticketId, message, imageUrl) => {
  return api.post(`/support/ticket/${ticketId}/comment`, { message, imageUrl });
};

export const uploadCommentImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return api.post("/support/comment-image/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};
