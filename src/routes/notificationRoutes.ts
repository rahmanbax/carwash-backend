import { Router } from "express";
import {
  getMyNotifications,
  markNotificationAsRead,
  registerFcmToken,
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
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: "Filter berdasarkan status baca (true/false)."
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [STATUS_UPDATE, REMINDER]
 *         description: "Filter berdasarkan tipe notifikasi."
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: "Nomor halaman."
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: "Jumlah notifikasi per halaman."
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
 *                         enum: [STATUS_UPDATE, REMINDER]
 *                         example: STATUS_UPDATE
 *                       bookingId:
 *                         type: integer
 *                         nullable: true
 *                         example: 5
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 unreadCount:
 *                   type: integer
 *                   example: 2
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     totalItems:
 *                       type: integer
 *                       example: 3
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 10
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

/**
 * @swagger
 * /api/notifications/register-token:
 *   post:
 *     summary: Mendaftarkan atau memperbarui FCM token untuk push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fcmToken]
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token dari perangkat mobile
 *                 example: "dsfj23kf9sd8f7sd9f8sd7f9sd8f7s..."
 *     responses:
 *       '200':
 *         description: FCM token berhasil disimpan.
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
 *                   example: FCM token berhasil disimpan.
 *       '400':
 *         description: FCM token tidak valid atau tidak dikirim.
 *       '401':
 *         description: Tidak terautentikasi.
 */
router.post("/register-token", authMiddleware, registerFcmToken);

export default router;
