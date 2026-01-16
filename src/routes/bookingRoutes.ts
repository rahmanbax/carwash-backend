import { Router } from "express";
import {
  createBooking,
  getMyBookings,
  getBookingById,
  getBookingTimeline,
  updateBookingStatus,
} from "../controllers/bookingController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Endpoint untuk manajemen booking
 */

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Mendapatkan riwayat booking milik user yang sedang login
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Berhasil mengambil riwayat booking.
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
 *                   example: Berhasil mengambil riwayat booking.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       status:
 *                         type: string
 *                         enum: [BOOKED, DITERIMA, DICUCI, SIAP_DIAMBIL, SELESAI, DIBATALKAN, EXPIRED]
 *                         example: DICUCI
 *                       nomorBooking:
 *                         type: string
 *                         example: "TC-0801202601"
 *                       tanggalWaktu:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-08T10:30:00.000Z"
 *                       nomorAntrian:
 *                         type: integer
 *                         example: 1
 *                       kendaraan:
 *                         type: object
 *                         properties:
 *                           platNomor:
 *                             type: string
 *                             example: "B 1234 ABC"
 *                           jenisKendaraan:
 *                             type: string
 *                             example: MOBIL
 *                           model:
 *                             type: string
 *                             example: "Toyota Avanza"
 *                       layanan:
 *                         type: object
 *                         properties:
 *                           namaPaket:
 *                             type: string
 *                             example: "Cuci Lengkap Interior & Eksterior Mobil"
 *                           deskripsi:
 *                             type: string
 *                             example: "Cuci eksterior, vakum interior, dan pembersihan dasbor mobil."
 *                       totalPembayaran:
 *                         type: number
 *                         example: 100000
 *       '401':
 *         description: Tidak terautentikasi.
 *   post:
 *     summary: Membuat booking baru
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, serviceId, bookingDate, locationId]
 *             properties:
 *               vehicleId:
 *                 type: integer
 *                 description: ID kendaraan milik user.
 *                 example: 1
 *               serviceId:
 *                 type: integer
 *                 description: ID layanan yang dipilih.
 *                 example: 2
 *               locationId:
 *                 type: integer
 *                 description: ID lokasi cuci mobil yang dipilih.
 *                 example: 1
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *                 description: Waktu booking yang diinginkan dalam format ISO 8601 (UTC).
 *                 example: "2025-11-29T10:30:00.000Z"
 *     responses:
 *       '201':
 *         description: Booking berhasil dibuat, mengembalikan detail lengkap dan QR code.
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
 *                   example: Booking berhasil dibuat!
 *                 data:
 *                   type: object
 *                   properties:
 *                     nomorBooking:
 *                       type: string
 *                       example: "TC-0801202601"
 *                     tanggalWaktu:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-08T10:30:00.000Z"
 *                     nomorAntrian:
 *                       type: integer
 *                       example: 1
 *                     kendaraan:
 *                       type: object
 *                       properties:
 *                         platNomor:
 *                           type: string
 *                           example: "B 1234 ABC"
 *                         jenisKendaraan:
 *                           type: string
 *                           example: MOBIL
 *                         model:
 *                           type: string
 *                           example: "Toyota Avanza"
 *                     layanan:
 *                       type: object
 *                       properties:
 *                         namaPaket:
 *                           type: string
 *                           example: "Cuci Lengkap Interior & Eksterior Mobil"
 *                         deskripsi:
 *                           type: string
 *                           example: "Cuci eksterior, vakum interior, dan pembersihan dasbor mobil."
 *                     totalPembayaran:
 *                       type: number
 *                       example: 100000
 *                     qrCode:
 *                       type: string
 *                       description: QR code dalam format Data URL (base64).
 *                       example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *       '400':
 *         description: Input tidak valid.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '403':
 *         description: Kendaraan bukan milik user.
 *       '409':
 *         description: Slot waktu yang dipilih sudah penuh.
 */
router.get("/", authMiddleware, getMyBookings);
router.post("/", authMiddleware, createBooking);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Mendapatkan detail booking spesifik berdasarkan ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID unik dari booking.
 *     responses:
 *       '200':
 *         description: Berhasil mengambil detail booking.
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
 *                   example: Berhasil mengambil detail booking.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       example: DICUCI
 *                     nomorBooking:
 *                       type: string
 *                       example: "TC-0801202601"
 *                     tanggalWaktu:
 *                       type: string
 *                       format: date-time
 *                     nomorAntrian:
 *                       type: integer
 *                       example: 1
 *                     kendaraan:
 *                       type: object
 *                       properties:
 *                         platNomor:
 *                           type: string
 *                           example: "B 1234 ABC"
 *                         jenisKendaraan:
 *                           type: string
 *                           example: MOBIL
 *                         model:
 *                           type: string
 *                           example: "Toyota Avanza"
 *                     layanan:
 *                       type: object
 *                       properties:
 *                         namaPaket:
 *                           type: string
 *                           example: "Cuci Lengkap Interior & Eksterior Mobil"
 *                         deskripsi:
 *                           type: string
 *                           example: "Cuci eksterior, vakum interior, dan pembersihan dasbor mobil."
 *                     totalPembayaran:
 *                       type: number
 *                       example: 100000
 *                     qrCode:
 *                       type: string
 *                       example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *       '401':
 *         description: Tidak terautentikasi.
 *       '404':
 *         description: Booking tidak ditemukan atau bukan milik user.
 */
router.get("/:id", authMiddleware, getBookingById);

/**
 * @swagger
 * /api/bookings/{id}/timeline:
 *   get:
 *     summary: Mendapatkan riwayat status (timeline) untuk booking spesifik
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID unik dari booking.
 *     responses:
 *       '200':
 *         description: Berhasil mengambil data timeline.
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
 *                   example: Berhasil mengambil riwayat status booking.
 *                 data:
 *                   type: object
 *                   properties:
 *                     nomorBooking:
 *                       type: string
 *                       example: "TC-0801202601"
 *                     namaKendaraan:
 *                       type: string
 *                       example: "Toyota Avanza"
 *                     platNomor:
 *                       type: string
 *                       example: "B 1234 ABC"
 *                     layanan:
 *                       type: string
 *                       example: "Cuci Lengkap Interior & Eksterior Mobil"
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             enum: [BOOKED, DITERIMA, DICUCI, SIAP_DIAMBIL, SELESAI]
 *                             example: BOOKED
 *                           waktu:
 *                             type: string
 *                             format: date-time
 *                           catatan:
 *                             type: string
 *                             example: "Pesanan berhasil dibuat"
 *       '401':
 *         description: Tidak terautentikasi.
 *       '404':
 *         description: Booking tidak ditemukan atau bukan milik user.
 */
router.get("/:id/timeline", authMiddleware, getBookingTimeline);

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   patch:
 *     summary: Memperbarui status booking (Hanya Admin Lokasi atau Superadmin)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID unik dari booking.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DITERIMA, DICUCI, SIAP_DIAMBIL, SELESAI, DIBATALKAN]
 *                 example: DICUCI
 *               notes:
 *                 type: string
 *                 description: Catatan tambahan untuk riwayat status.
 *                 example: "Kendaraan sedang mulai disabun."
 *     responses:
 *       '200':
 *         description: Status booking berhasil diperbarui.
 *       '400':
 *         description: Input tidak valid.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '403':
 *         description: Akses ditolak. Bukan Admin dari lokasi ini atau bukan Superadmin.
 *       '404':
 *         description: Booking tidak ditemukan.
 */
router.patch("/:id/status", authMiddleware, updateBookingStatus);

export default router;
