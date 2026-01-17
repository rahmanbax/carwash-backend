import { Router } from "express";
import { getTransactionList } from "../controllers/transactionController";
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
 *         example: "2026-01-17"
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
 *                       example: "2026-01-17"
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bookingNumber:
 *                             type: string
 *                             example: "TC-1701202601"
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
 */
router.get("/", authMiddleware, getTransactionList);

export default router;
