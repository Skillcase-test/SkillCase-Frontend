import api from "../api/axios";

let heartbeatInterval = null;

export const startHeartbeat = () => {
  if (heartbeatInterval) return;

  // Send heartbeat every 2 minutes
  heartbeatInterval = setInterval(async () => {
    try {
      await api.post("/user/heartbeat");
    } catch (error) {
      console.error("Heartbeat error:", error);
    }
  }, 120000); // 2 minutes

  // Send initial heartbeat
  api.post("/user/heartbeat").catch(console.error);
};

export const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};
