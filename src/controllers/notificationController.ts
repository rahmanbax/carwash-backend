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

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil notifikasi.",
      data: notifications,
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
