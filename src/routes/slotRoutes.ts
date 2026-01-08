import { Router } from "express";
import { getSlotAvailability } from "../controllers/slotController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Slots
 *   description: Endpoint untuk mengecek ketersediaan slot booking
 */

/**
 * @swagger
 * /api/slots/availability:
 *   get:
 *     summary: Mendapatkan ketersediaan slot untuk tanggal dan lokasi tertentu
 *     tags: [Slots]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal yang ingin dicek dalam format YYYY-MM-DD.
 *         example: "2025-11-29"
 *       - in: query
 *         name: locationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dari lokasi yang ingin dicek.
 *         example: 1
 *     responses:
 *       '200':
 *         description: Berhasil mengambil data ketersediaan slot.
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
 *                   example: Berhasil mengambil data ketersediaan slot di lokasi 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       time:
 *                         type: string
 *                         format: date-time
 *                         description: Waktu slot dalam format ISO 8601 (UTC).
 *                         example: "2026-01-08T08:00:00.000Z"
 *                       queueNumber:
 *                         type: integer
 *                         description: Nomor antrian dalam slot (1-3).
 *                         example: 1
 *                       status:
 *                         type: string
 *                         enum: [AVAILABLE, BOOKED]
 *                         description: Status ketersediaan slot.
 *                         example: AVAILABLE
 *       '400':
 *         description: Parameter tidak ada atau formatnya salah.
 *       '404':
 *         description: Lokasi tidak ditemukan.
 */
router.get("/availability", getSlotAvailability);

export default router;
