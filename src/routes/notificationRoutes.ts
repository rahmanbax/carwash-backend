import { Router } from "express";
import {
  getMyNotifications,
  markNotificationAsRead,
} from "../controllers/notificationController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Endpoint untuk manajemen notifikasi pengguna
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Mendapatkan semua notifikasi milik user yang sedang login
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Berhasil mengambil daftar notifikasi, diurutkan dari yang terbaru.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Berhasil mengambil notifikasi.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Status Berubah"
 *                       message:
 *                         type: string
 *                         example: "No. Booking #TC-TODAY-01 sedang dalam proses pencucian."
 *                       isRead:
 *                         type: boolean
 *                         example: false
 *                       type:
 *                         type: string
 *                         enum: [STATUS_UPDATE, REMINDER, PROMO]
 *                         example: STATUS_UPDATE
 *                       bookingId:
 *                         type: integer
 *                         nullable: true
 *                         example: 5
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       '401':
 *         description: Tidak terautentikasi.
 */
router.get("/", authMiddleware, getMyNotifications);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Menandai notifikasi spesifik sebagai sudah dibaca
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID unik dari notifikasi yang akan ditandai.
 *     responses:
 *       '200':
 *         description: Notifikasi berhasil ditandai sebagai sudah dibaca.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Notifikasi ditandai sebagai sudah dibaca.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '404':
 *         description: Notifikasi tidak ditemukan atau bukan milik user.
 */
router.patch("/:id/read", authMiddleware, markNotificationAsRead);

export default router;
