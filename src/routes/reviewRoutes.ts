import { Router } from "express";
import {
  createReview,
  getAllReviews,
  getReviewByBookingId,
  getReviewById,
  updateReview,
  deleteReview,
} from "../controllers/reviewController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Endpoint untuk ulasan dan rating layanan oleh customer
 */

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Mendapatkan daftar ulasan dengan ringkasan rating dan opsi filter
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter ulasan berdasarkan ID layanan.
 *         example: 1
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter ulasan berdasarkan ID cabang lokasi cuci.
 *         example: 1
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         required: false
 *         description: Filter ulasan berdasarkan jumlah bintang rating (1-5).
 *         example: 5
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         required: false
 *         description: Nomor halaman.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Jumlah ulasan per halaman.
 *     responses:
 *       '200':
 *         description: Berhasil mengambil data ulasan dan statistik rating.
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
 *                   example: Berhasil mengambil data ulasan.
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           rating:
 *                             type: integer
 *                             example: 5
 *                           comment:
 *                             type: string
 *                             example: "Pelayanan sangat cepat dan mobil bersih mengkilap!"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 3
 *                               name:
 *                                 type: string
 *                                 example: "Budi Santoso"
 *                               username:
 *                                 type: string
 *                                 example: "budisantoso"
 *                               photoUrl:
 *                                 type: string
 *                                 nullable: true
 *                           service:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               name:
 *                                 type: string
 *                                 example: "Cuci Cepat Mobil"
 *                           location:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               name:
 *                                 type: string
 *                                 example: "TelU Carwash Bandung"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         averageRating:
 *                           type: number
 *                           example: 4.8
 *                         totalReviews:
 *                           type: integer
 *                           example: 24
 *                         distribution:
 *                           type: object
 *                           properties:
 *                             1:
 *                               type: integer
 *                               example: 0
 *                             2:
 *                               type: integer
 *                               example: 1
 *                             3:
 *                               type: integer
 *                               example: 2
 *                             4:
 *                               type: integer
 *                               example: 5
 *                             5:
 *                               type: integer
 *                               example: 16
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         totalItems:
 *                           type: integer
 *                           example: 24
 *                         itemsPerPage:
 *                           type: integer
 *                           example: 10
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.get("/", getAllReviews);

/**
 * @swagger
 * /api/reviews/booking/{bookingId}:
 *   get:
 *     summary: Mendapatkan ulasan untuk booking tertentu
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID booking yang ingin diperiksa ulasannya.
 *         example: 1
 *     responses:
 *       '200':
 *         description: Berhasil mengambil ulasan pesanan (data null jika belum pernah diulas).
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
 *                   example: Berhasil mengambil ulasan pesanan.
 *                 data:
 *                   type: object
 *                   nullable: true
 *       '400':
 *         description: bookingId tidak valid.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.get("/booking/:bookingId", getReviewByBookingId);

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Mendapatkan detail ulasan berdasarkan ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID ulasan.
 *         example: 1
 *     responses:
 *       '200':
 *         description: Berhasil mengambil detail ulasan.
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
 *                   example: Berhasil mengambil detail ulasan.
 *                 data:
 *                   type: object
 *       '404':
 *         description: Ulasan tidak ditemukan.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.get("/:id", getReviewById);

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Membuat ulasan baru untuk pesanan yang telah SELESAI (Customer)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - rating
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID booking yang telah berstatus SELESAI.
 *                 example: 1
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating bintang dari 1 sampai 5.
 *                 example: 5
 *               comment:
 *                 type: string
 *                 description: Ulasan teks atau feedback dari pelanggan.
 *                 example: "Pelayanan sangat memuaskan, mobil bersih luar dalam!"
 *     responses:
 *       '201':
 *         description: Ulasan berhasil dikirim.
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
 *                   example: Ulasan berhasil dikirim!
 *                 data:
 *                   type: object
 *       '400':
 *         description: Input tidak valid, booking belum selesai, atau sudah pernah diulas.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '403':
 *         description: Booking bukan milik user yang sedang login.
 *       '404':
 *         description: Booking tidak ditemukan.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.post("/", authMiddleware, createReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Memperbarui ulasan (Hanya pemilik ulasan)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID ulasan yang ingin diperbarui.
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               comment:
 *                 type: string
 *                 example: "Pencucian rapi dan tepat waktu."
 *     responses:
 *       '200':
 *         description: Ulasan berhasil diperbarui.
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
 *                   example: Ulasan berhasil diperbarui!
 *                 data:
 *                   type: object
 *       '400':
 *         description: Input rating tidak valid.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '403':
 *         description: Akses ditolak. Anda bukan pemilik ulasan ini.
 *       '404':
 *         description: Ulasan tidak ditemukan.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.put("/:id", authMiddleware, updateReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Menghapus ulasan (Pemilik ulasan atau SUPERADMIN)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID ulasan yang ingin dihapus.
 *         example: 1
 *     responses:
 *       '200':
 *         description: Ulasan berhasil dihapus.
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
 *                   example: Ulasan berhasil dihapus.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '403':
 *         description: Akses ditolak.
 *       '404':
 *         description: Ulasan tidak ditemukan.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.delete("/:id", authMiddleware, deleteReview);

export default router;
