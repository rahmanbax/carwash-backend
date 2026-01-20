import { Router } from "express";
import { getTransactionList, createTransaction, getTransactionHistory, updateTransactionStatus } from "../controllers/transactionController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Endpoint untuk manajemen transaksi (Booking)
 */

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Mendapatkan daftar transaksi (Hanya ADMIN)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: "Filter transaksi berdasarkan tanggal (YYYY-MM-DD). Jika kosong, menampilkan data hari ini."
 *         example: "DYNAMIC_CURRENT_DATE"
 *     description: Endpoint ini menampilkan daftar transaksi lengkap. Untuk ADMIN, hanya akan tampil transaksi di lokasi yang dikelolanya.
 *     responses:
 *       '200':
 *         description: Berhasil mengambil daftar transaksi.
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
 *                   example: Berhasil mengambil daftar transaksi.
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       example: "DYNAMIC_CURRENT_DATE"
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bookingNumber:
 *                             type: string
 *                             example: "TNX001"
 *                           vehicle:
 *                             type: object
 *                             properties:
 *                               plate:
 *                                 type: string
 *                                 example: "B 1234 ABC"
 *                               type:
 *                                 type: string
 *                                 example: "mobil"
 *                           customer:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "John Doe"
 *                               phone:
 *                                 type: string
 *                                 example: "081234567890"
 *                           service:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "Cuci Express"
 *                               price:
 *                                 type: number
 *                                 example: 50000
 *                           time:
 *                             type: object
 *                             properties:
 *                               bookingTime:
 *                                 type: string
 *                                 example: "15:00"
 *                               estimateFinish:
 *                                 type: string
 *                                 example: "15:30"
 *                           status:
 *                             type: string
 *                             example: "BOOKED"
 *                           bookingMethod:
 *                             type: string
 *                             example: "APP"
 *   post:
 *     summary: Membuat transaksi Walk-in (Hanya ADMIN)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     description: Endpoint ini digunakan oleh admin loket untuk membuat transaksi bagi pelanggan walk-in. Data tamu (guest) akan disimpan dan otomatis terhubung jika user mendaftar dengan nomor telepon yang sama.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - plate
 *               - vehicleType
 *               - serviceId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Budi Santoso"
 *               phone:
 *                 type: string
 *                 example: "081234567890"
 *               plate:
 *                 type: string
 *                 example: "D 1234 ABC"
 *               vehicleType:
 *                 type: string
 *                 enum: [MOBIL, MOTOR]
 *                 example: "MOBIL"
 *               serviceId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       '201':
 *         description: Transaksi berhasil dibuat.
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
 *                   example: Transaksi berhasil dibuat.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 42
 *                     bookingNumber:
 *                       type: string
 *                       example: "TNX005"
 *                     queueNumber:
 *                       type: integer
 *                       example: 5
 *                     totalPrice:
 *                       type: number
 *                       example: 50000
 *                     status:
 *                       type: string
 *                       example: "BOOKED"
 *                     guestName:
 *                       type: string
 *                       example: "Budi Santoso"
 *                     guestPhone:
 *                       type: string
 *                       example: "081234567890"
 *                     guestPlate:
 *                       type: string
 *                       example: "D 1234 ABC"
 *                     guestVehicleType:
 *                       type: string
 *                       example: "MOBIL"
 *                     bookingMethod:
 *                       type: string
 *                       example: "MANUAL"
 *       '400':
 *         description: Input tidak valid.
 *       '401':
 *         description: Tidak terautentikasi atau bukan admin.
 */
router.get("/", authMiddleware, getTransactionList);
router.post("/", authMiddleware, createTransaction);

/**
 * @swagger
 * /api/transactions/history:
 *   get:
 *     summary: Mendapatkan riwayat transaksi bulanan (Hanya ADMIN)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Tanggal awal (YYYY-MM-DD). Jika kosong, default ke tanggal 1 bulan ini."
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Tanggal akhir (YYYY-MM-DD). Jika kosong, default ke akhir bulan ini."
 *     description: Endpoint ini mengembalikan data transaksi selama 1 bulan berjalan atau berdasarkan range tanggal yang dipilih.
 *     responses:
 *       '200':
 *         description: Berhasil mengambil riwayat transaksi.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     range:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           example: "2026-01-01"
 *                         end:
 *                           type: string
 *                           example: "2026-01-31"
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bookingNumber:
 *                             type: string
 *                             example: "TNX001"
 *                           date:
 *                             type: string
 *                             example: "DYNAMIC_CURRENT_DATE"
 *                           vehicle:
 *                             type: object
 *                             properties:
 *                               plate:
 *                                 type: string
 *                                 example: "B 1234 ABC"
 *                               type:
 *                                 type: string
 *                                 example: "MOBIL"
 *                           customer:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "John Doe"
 *                               phone:
 *                                 type: string
 *                                 example: "081234567890"
 *                           service:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "Cuci Express"
 *                               price:
 *                                 type: number
 *                                 example: 50000
 *                           status:
 *                             type: string
 *                             example: "SELESAI"
 *       '401':
 *         description: Tidak terautentikasi.
 *       '403':
 *         description: Akses ditolak atau lokasi tidak ditemukan.
 */
router.get("/history", authMiddleware, getTransactionHistory);

/**
 * @swagger
 * /api/transactions/{id}/status:
 *   patch:
 *     summary: Memperbarui status transaksi (Hanya ADMIN)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID unik dari booking/transaksi.
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
 *                 example: "DICUCI"
 *     responses:
 *       '200':
 *         description: Status transaksi berhasil diperbarui.
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
 *                   example: "Status transaksi #TNX001 berhasil diubah menjadi DICUCI."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     bookingNumber:
 *                       type: string
 *                       example: "TNX001"
 *                     status:
 *                       type: string
 *                       example: "DICUCI"
 *       '403':
 *         description: Akses ditolak.
 *       '404':
 *         description: Transaksi tidak ditemukan.
 */
router.patch("/:id/status", authMiddleware, updateTransactionStatus);

export default router;
