import { Router } from "express";
import { createBooking, getMyBookings } from "../controllers/bookingController";
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
 *             required: [vehicleId, serviceId, bookingDate]
 *             properties:
 *               vehicleId:
 *                 type: integer
 *                 description: ID kendaraan milik user.
 *                 example: 1
 *               serviceId:
 *                 type: integer
 *                 description: ID layanan yang dipilih.
 *                 example: 2
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *                 description: Waktu booking yang diinginkan dalam format ISO 8601 (UTC).
 *                 example: "2025-11-29T10:30:00.000Z"
 *     responses:
 *       '201':
 *         description: Booking berhasil dibuat, mengembalikan detail lengkap dan QR code.
 *       '400':
 *         description: Input tidak valid.
 *       '403':
 *         description: Kendaraan bukan milik user.
 *       '409':
 *         description: Slot waktu yang dipilih sudah penuh.
 */
router.get("/", authMiddleware, getMyBookings);
router.post("/", authMiddleware, createBooking);

export default router;
