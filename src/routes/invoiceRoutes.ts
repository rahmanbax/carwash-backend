import { Router } from "express";
import { createInvoice, getInvoiceHistory } from "../controllers/invoiceController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: API untuk manajemen invoice dan cetak PDF
 */

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Membuat invoice baru dari daftar booking yang dipilih dan mendownload PDF
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingIds
 *             properties:
 *               bookingIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *     responses:
 *       201:
 *         description: Berhasil membuat invoice (mengembalikan PDF download)
 *       400:
 *         description: Input tidak valid
 *       401:
 *         description: Tidak terautentikasi
 *       403:
 *         description: Akses ditolak
 */
router.post("/", authMiddleware, createInvoice);

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Mendapatkan riwayat invoice yang pernah dibuat
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: "Pencarian berdasarkan nomor invoice."
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
 *         description: "Jumlah invoice per halaman."
 *     responses:
 *       200:
 *         description: Daftar riwayat invoice
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
 *                   example: Berhasil mengambil riwayat invoice.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       invoiceNumber:
 *                         type: string
 *                         example: "INV-202601-0001"
 *                       totalAmount:
 *                         type: number
 *                         example: 250000
 *                       adminId:
 *                         type: integer
 *                         example: 2
 *                       admin:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Admin"
 *                       _count:
 *                         type: object
 *                         properties:
 *                           bookings:
 *                             type: integer
 *                             example: 3
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-20T08:00:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-20T08:00:00.000Z"
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
 *                       example: 5
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Tidak terautentikasi
 */
router.get("/", authMiddleware, getInvoiceHistory);

export default router;
