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
 *                       invoiceNumber:
 *                         type: string
 *                       totalAmount:
 *                         type: number
 *                       adminId:
 *                         type: integer
 *                       admin:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                       _count:
 *                         type: object
 *                         properties:
 *                           bookings:
 *                             type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *             example:
 *               status: "success"
 *               message: "Berhasil mengambil riwayat invoice."
 *               data:
 *                 - id: 1
 *                   invoiceNumber: "INV-202601-0001"
 *                   totalAmount: 250000
 *                   adminId: 2
 *                   admin:
 *                     name: "Admin"
 *                   _count:
 *                     bookings: 3
 *                   createdAt: "2026-01-20T08:00:00.000Z"
 *                   updatedAt: "2026-01-20T08:00:00.000Z"
 *       401:
 *         description: Tidak terautentikasi
 */
router.get("/", authMiddleware, getInvoiceHistory);

export default router;
