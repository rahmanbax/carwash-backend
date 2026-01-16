import { Router } from "express";
import { getSuperadminStatistics } from "../controllers/statisticsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Endpoint untuk statistik (hanya SUPERADMIN)
 */

/**
 * @swagger
 * /api/statistics/superadmin:
 *   get:
 *     summary: Mendapatkan statistik dashboard untuk SUPERADMIN
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     description: Endpoint ini hanya dapat diakses oleh user dengan role SUPERADMIN. Menampilkan data statistik termasuk total tenant (lokasi), jumlah admin, pendapatan mingguan, statistik pencucian, dan antrian kendaraan.
 *     responses:
 *       '200':
 *         description: Berhasil mengambil statistik.
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
 *                   example: Berhasil mengambil statistik.
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2026-01-14"
 *                     totalTenant:
 *                       type: integer
 *                       example: 12
 *                     totalAdmin:
 *                       type: integer
 *                       example: 3
 *                     weeklyRevenue:
 *                       type: object
 *                       properties:
 *                         range:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               format: date
 *                               example: "2026-01-08"
 *                             end:
 *                               type: string
 *                               format: date
 *                               example: "2026-01-14"
 *                         data:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               day:
 *                                 type: string
 *                                 example: "Senin"
 *                               revenue:
 *                                 type: number
 *                                 example: 500000
 *                     todayWashingStatistics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           time:
 *                             type: string
 *                             example: "08:00"
 *                           value:
 *                             type: integer
 *                             example: 14
 *                     todayQueue:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bookingNumber:
 *                             type: string
 *                             example: "TC-0114202601"
 *                           plate:
 *                             type: string
 *                             example: "D 1234 ABC"
 *                           type:
 *                             type: string
 *                             enum: [mobil, motor]
 *                             example: "mobil"
 *                           queue_time:
 *                             type: string
 *                             example: "09:00"
 *                           status:
 *                             type: string
 *                             enum: [BOOKED, DITERIMA, DICUCI, SIAP_DIAMBIL]
 *                             example: "BOOKED"
 *       '401':
 *         description: Tidak terautentikasi.
 *       '403':
 *         description: Akses ditolak. Hanya SUPERADMIN yang dapat mengakses.
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
 *                   example: Akses ditolak. Hanya SUPERADMIN yang dapat mengakses statistik.
 */
router.get("/superadmin", authMiddleware, getSuperadminStatistics);

export default router;
