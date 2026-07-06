import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import api from "../api/axios";
import { captureFeatureError } from "../observability/sentry";

let listenerHandles = [];

const clearPushNotificationListeners = async () => {
  await Promise.all(
    listenerHandles.map((handle) =>
      handle?.remove ? handle.remove().catch(() => {}) : Promise.resolve(),
    ),
  );
  listenerHandles = [];
};

export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await clearPushNotificationListeners();

    // Request permission
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== "granted") {
      console.log("Push notification permission denied");
      return;
    }

    // Handle registration
    const registrationHandle = await PushNotifications.addListener(
      "registration",
      async (token) => {
        // Store token in backend
        try {
          await api.post("/user/fcm-token", { fcmToken: token.value });
        } catch (err) {
          console.error("Failed to save FCM token:", err);
        }
      },
    );

    // Handle notification tap
    const actionHandle = await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      async (action) => {
        console.log("Notification tapped:", action);
        await handleNotificationOpen(action.notification);

        const deepLink = action.notification.data?.deepLink;
        const isExternal = action.notification.data?.isExternal === "true";

        if (deepLink) {
          if (
            isExternal ||
            deepLink.startsWith("http://") ||
            deepLink.startsWith("https://")
          ) {
            // Open external links in browser
            try {
              await Browser.open({ url: deepLink });
            } catch (err) {
              console.error("Failed to open browser:", err);
              // Fallback to in-app navigation
              window.location.href = deepLink;
            }
          } else {
            // In-app navigation
            window.location.href = deepLink;
          }
        }
      },
    );

    listenerHandles = [registrationHandle, actionHandle];

    // Register after listeners are attached so the registration event cannot be missed.
    await PushNotifications.register();
  } catch (error) {
    captureFeatureError(error, {
      featureArea: "push_notifications",
      tags: { action: "bootstrap_failed" },
    });
  }
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
    captureFeatureError(error, {
      featureArea: "push_notifications",
      tags: { action: "open_track_failed" },
    });
  }
};
