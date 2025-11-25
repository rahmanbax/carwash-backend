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
 *     summary: Mendapatkan ketersediaan slot untuk tanggal tertentu
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
 *     responses:
 *       '200':
 *         description: Berhasil mengambil data ketersediaan slot.
 *       '400':
 *         description: Parameter tanggal tidak ada atau formatnya salah.
 */
router.get("/availability", getSlotAvailability);

export default router;
