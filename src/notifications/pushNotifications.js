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
    console.log("FCM Token:", token.value);

    // Store token in backend
    try {
      await api.post("/user/fcm-token", { fcmToken: token.value });
    } catch (err) {
      console.error("Failed to save FCM token:", err);
    }
  });

  // Handle foreground notifications
  PushNotifications.addListener(
    "pushNotificationReceived",
    async (notification) => {
      console.log("Push received:", notification);
      // Show local notification when app is in foreground
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 100000),
            title: notification.title || "SkillCase",
            body: notification.body || "",
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      });
    }
  );

  // Handle notification tap
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("Notification tapped:", action);
    // Handle navigation based on action.notification.data
  });
};
