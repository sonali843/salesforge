const { prisma } = require("../config/postgres");

// Firebase Admin is initialized in config/firebase.js which is required by app.js before any routes.
// We import getMessaging and getApps here directly; they are always available since firebase-admin is a dep.
const { getMessaging } = require("firebase-admin/messaging");
const { getApps } = require("firebase-admin/app");

/**
 * Sends a push notification to all devices registered to a specific user.
 *
 * Respects the user's push preference: callers in dispatchNotification already
 * guard this call behind `pushEnabled`, so here we only handle FCM mechanics.
 *
 * @param {number} userId - The ID of the user to send the notification to.
 * @param {object} payload - The notification payload.
 * @param {string} payload.title - The title of the notification.
 * @param {string} payload.body - The body of the notification.
 * @param {string} [payload.icon] - Optional URL to an icon.
 * @returns {Promise<object>} Result containing success status and counts.
 */
const sendPushNotification = async (userId, { title, body, icon }) => {
  try {
    // Guard: Firebase Admin must be initialized (requires FIREBASE_* env vars)
    if (!getApps().length) {
      console.warn("[PushService] Firebase Admin is not initialized. Skipping push.");
      return { success: false, message: "Firebase Admin is not initialized." };
    }

    const fcmTokens = await prisma.fcmToken.findMany({
      where: { userId: Number(userId) },
    });

    if (fcmTokens.length === 0) {
      return { success: false, message: "No FCM tokens found for user" };
    }

    const tokens = fcmTokens.map((t) => t.token);

    const message = {
      notification: {
        title: title || "New Notification",
        body: body || "You have a new message.",
      },
      tokens,
    };

    if (icon) {
      message.notification.imageUrl = icon;
    }

    const response = await getMessaging().sendEachForMulticast(message);

    // Clean up invalid / expired tokens so the list stays fresh.
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        await prisma.fcmToken.deleteMany({
          where: { token: { in: failedTokens } },
        });
        console.log(`[PushService] Removed ${failedTokens.length} stale FCM token(s) for user ${userId}.`);
      }
    }

    console.log(`[PushService] Sent to ${response.successCount}/${tokens.length} device(s) for user ${userId}.`);

    return {
      success: true,
      message: `Notification sent successfully to ${response.successCount} devices`,
      successCount: response.successCount,
      failedCount: response.failureCount,
    };
  } catch (error) {
    console.error("[PushService] Error sending push notification:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification,
};
