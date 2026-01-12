import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import api from "../api/axios";

export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;

  // Request permission
  const permStatus = await PushNotifications.requestPermissions();
  if (permStatus.receive !== "granted") {
    console.log("Push notification permission denied");
    return;
  }

  // Register for push
  await PushNotifications.register();

  // Handle registration
  PushNotifications.addListener("registration", async (token) => {
    // Store token in backend
    try {
      await api.post("/user/fcm-token", { fcmToken: token.value });
    } catch (err) {
      console.error("Failed to save FCM token:", err);
    }
  });

  // Handle notification tap
  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    async (action) => {
      console.log("Notification tapped:", action);
      await handleNotificationOpen(action.notification);

      const deepLink = action.notification.data?.deepLink;
      if (deepLink) {
        window.location.href = deepLink;
      }
    }
  );
};

export const handleNotificationOpen = async (notification) => {
  try {
    const { notificationType, sentAt } = notification.data || {};

    if (notificationType && sentAt) {
      await api.post("/user/notification-opened", {
        notificationType,
        sentAt,
      });
    }
  } catch (error) {
    console.error("Error tracking notification open:", error);
  }
};
