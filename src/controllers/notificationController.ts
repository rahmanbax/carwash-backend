import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res
      .status(401)
      .json({ status: "error", message: "User tidak terautentikasi." });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
    });

    const toWIB = (date: Date) => {
      const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
      return wibTime.toISOString().replace("Z", "+07:00");
    };

    const formattedNotifications = notifications.map(n => ({
      ...n,
      createdAt: toWIB(n.createdAt),
    }));

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil notifikasi.",
      data: formattedNotifications,
    });
  } catch (error) {
    console.error("Error saat mengambil notifikasi:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

export const markNotificationAsRead = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const notificationId = parseInt(req.params.id, 10);

  if (!userId) {
    /* ... handle error ... */
  }
  if (isNaN(notificationId)) {
    /* ... handle error ... */
  }

  try {
    // Gunakan `updateMany` untuk keamanan, pastikan user hanya bisa update notifikasi miliknya
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: userId,
      },
      data: {
        isRead: true,
      },
    });

    res
      .status(200)
      .json({
        status: "success",
        message: "Notifikasi ditandai sebagai sudah dibaca.",
      });
  } catch (error) {
    // ...
  }
};

/**
 * Register or update FCM token for the authenticated user
 * Called by mobile app when it receives a new FCM token
 */
export const registerFcmToken = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res
      .status(401)
      .json({ status: "error", message: "User tidak terautentikasi." });
  }

  try {
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({
        status: "error",
        message: "FCM token wajib diisi.",
      });
    }

    // Update user's FCM token in database
    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });

    res.status(200).json({
      status: "success",
      message: "FCM token berhasil disimpan.",
    });
  } catch (error) {
    console.error("Error saat menyimpan FCM token:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};
