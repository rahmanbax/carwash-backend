import { Router } from "express";
import { getTransactionList, createTransaction, getTransactionHistory, updateTransactionStatus, getUserByPhone } from "../controllers/transactionController";
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
 *         description: "Jumlah transaksi per halaman."
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
 *                       example: "2026-01-20"
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bookingNumber:
 *                             type: string
 *                             example: "TNX001"
 *                           vehiclePlate:
 *                             type: string
 *                             example: "B 1234 ABC"
 *                           vehicleType:
 *                             type: string
 *                             example: "mobil"
 *                           cc:
 *                             type: integer
 *                             nullable: true
 *                             example: 1500
 *                           customerName:
 *                             type: string
 *                             example: "John Doe"
 *                           customerPhone:
 *                             type: string
 *                             example: "081234567890"
 *                           serviceName:
 *                             type: string
 *                             example: "Cuci Express"
 *                           servicePrice:
 *                             type: number
 *                             example: 50000
 *                           bookingTime:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-01-20T08:00:00.000Z"
 *                           estimateFinish:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-01-20T08:45:00.000Z"
 *                           status:
 *                             type: string
 *                             example: "BOOKED"
 *                           bookingMethod:
 *                             type: string
 *                             example: "APP"
 *                           paymentMethod:
 *                             type: string
 *                             nullable: true
 *                             example: "TUNAI"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     totalItems:
 *                       type: integer
 *                       example: 25
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 10
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
 *               paymentMethod:
 *                 type: string
 *                 description: (Opsional) Metode pembayaran seperti tunai / qris
 *                 example: "TUNAI"
 *               bookingTime:
 *                 type: string
 *                 format: date-time
 *                 description: (Opsional) Waktu booking jika ingin ditentukan, jika kosong akan menggunakan waktu sekarang. Format ISO 8601 (UTC).
 *                 example: "2026-01-20T10:30:00.000Z"
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
 *                     paymentMethod:
 *                       type: string
 *                       nullable: true
 *                       example: "TUNAI"
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: "Nama, nomor telepon, plat nomor, jenis kendaraan, dan layanan wajib diisi."
 *       '401':
 *         description: Tidak terautentikasi atau bukan admin.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: "Akses ditolak. Hanya ADMIN yang dapat membuat transaksi ini."
 *       '409':
 *         description: Maaf, slot waktu ini sudah penuh. Silakan pilih waktu lain.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: "Maaf, slot waktu ini sudah penuh. Silakan pilih waktu lain."
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: "Pencarian berdasarkan nomor booking atau plat nomor (case-insensitive)."
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
 *         description: "Jumlah transaksi per halaman."
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
 *                           format: date-time
 *                           example: "2026-01-01T00:00:00.000Z"
 *                         end:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-31T23:59:59.999Z"
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           bookingNumber:
 *                             type: string
 *                             example: "TNX001"
 *                           date:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-01-20T15:00:00.000Z"
 *                           vehiclePlate:
 *                             type: string
 *                             example: "B 1234 ABC"
 *                           vehicleType:
 *                             type: string
 *                             example: "MOBIL"
 *                           cc:
 *                             type: integer
 *                             nullable: true
 *                             example: 1500
 *                           customerName:
 *                             type: string
 *                             example: "John Doe"
 *                           customerPhone:
 *                             type: string
 *                             example: "081234567890"
 *                           serviceName:
 *                             type: string
 *                             example: "Cuci Express"
 *                           servicePrice:
 *                             type: number
 *                             example: 50000
 *                           status:
 *                             type: string
 *                             example: "SELESAI"
 *                           paymentMethod:
 *                             type: string
 *                             nullable: true
 *                             example: "TUNAI"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     totalItems:
 *                       type: integer
 *                       example: 25
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 10
 *       '401':
 *         description: Tidak terautentikasi.
 *       '403':
 *         description: Akses ditolak atau lokasi tidak ditemukan.
 */
router.get("/history", authMiddleware, getTransactionHistory);

/**
 * @swagger
 * /api/transactions/user-by-phone:
 *   get:
 *     summary: Mencari user berdasarkan nomor telepon (Hanya ADMIN)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Nomor telepon user yang ingin dicari.
 *         example: "081112223333"
 *     description: Endpoint ini digunakan oleh admin untuk mengecek apakah pelanggan sudah terdaftar di sistem. Jika ada, akan mengembalikan username, nama, dan daftar kendaraan pelanggan beserta kapasitas CC.
 *     responses:
 *       '200':
 *         description: User ditemukan.
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
 *                   example: User ditemukan.
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     username:
 *                       type: string
 *                       example: "budisantoso"
 *                     name:
 *                       type: string
 *                       example: "Budi Santoso"
 *                     vehicles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           plate:
 *                             type: string
 *                             example: "B 1234 ABC"
 *                           type:
 *                             type: string
 *                             enum: [MOBIL, MOTOR]
 *                             example: "MOBIL"
 *                           model:
 *                             type: string
 *                             nullable: true
 *                             example: "Toyota Avanza"
 *                           cc:
 *                             type: integer
 *                             example: 1500
 *       '400':
 *         description: Nomor telepon tidak diisi.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Nomor telepon wajib diisi.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '404':
 *         description: User tidak ditemukan.
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
 *                   example: User tidak ditemukan.
 *                 data:
 *                   type: null
 *                   example: null
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.get("/user-by-phone", authMiddleware, getUserByPhone);

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
 *                   example: "Status transaksi TNX001 berhasil diubah menjadi DICUCI."
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
