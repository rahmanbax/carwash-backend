import firebase, { admin } from "../config/firebase";
import prisma from "../lib/prisma";

/**
 * Send push notification to a specific device token
 */
export const sendPushNotification = async (
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<string | null> => {
    try {
        const message: admin.messaging.Message = {
            token,
            notification: {
                title,
                body,
            },
            data: data || {},
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    channelId: "carwash_notifications",
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                    },
                },
            },
        };

        const response = await admin.messaging().send(message);
        console.log(`Push notification sent successfully: ${response}`);
        return response;
    } catch (error: any) {
        // Handle invalid token errors gracefully
        if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
        ) {
            console.warn(`Invalid FCM token, skipping notification`);
            return null;
        }
        console.error("Error sending push notification:", error);
        throw error;
    }
};

/**
 * Send push notification to a user by their user ID
 * Looks up the user's FCM token from database
 */
export const sendPushToUser = async (
    userId: number,
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<string | null> => {
    try {
        // Get user's FCM token from database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { fcmToken: true },
        });

        if (!user?.fcmToken) {
            console.log(`User ${userId} has no FCM token, skipping push notification`);
            return null;
        }

        return await sendPushNotification(user.fcmToken, title, body, data);
    } catch (error) {
        console.error(`Error sending push to user ${userId}:`, error);
        return null;
    }
};

/**
 * Send push notification for booking status update
 */
export const sendBookingStatusNotification = async (
    userId: number,
    bookingNumber: string,
    newStatus: string,
    statusMessage: string
): Promise<void> => {
    const title = `Status Booking ${bookingNumber}`;
    const body = statusMessage;
    const data = {
        type: "BOOKING_STATUS_UPDATE",
        bookingNumber,
        status: newStatus,
    };

    await sendPushToUser(userId, title, body, data);
};
