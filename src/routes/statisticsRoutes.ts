import { Router } from "express";
import { getSuperadminStatistics, getAdminStatistics } from "../controllers/statisticsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Endpoint untuk statistik dashboard
 */

/**
 * @swagger
 * /api/statistics/superadmin:
 *   get:
 *     summary: Mendapatkan statistik dashboard untuk SUPERADMIN
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     description: Endpoint ini hanya dapat diakses oleh user dengan role SUPERADMIN. Menampilkan data statistik global termasuk total tenant, jumlah admin, pendapatan mingguan, dan lainnya.
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
 *                       example: "2026-01-14"
 *                     totalTenant:
 *                       type: integer
 *                       example: 5
 *                     totalAdmin:
 *                       type: integer
 *                       example: 12
 *                     weeklyRevenue:
 *                       type: object
 *                       properties:
 *                         range:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               example: "2026-01-08"
 *                             end:
 *                               type: string
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
 *                                 example: 1250000
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
 *                             example: "mobil"
 *                           queue_time:
 *                             type: string
 *                             example: "09:00"
 *                           status:
 *                             type: string
 *                             example: "BOOKED"
 * /api/statistics/admin:
 *   get:
 *     summary: Mendapatkan statistik dashboard untuk ADMIN Lokasi
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     description: Endpoint ini digunakan oleh ADMIN loket untuk melihat statistik harian dan mingguan khusus untuk lokasi yang mereka kelola.
 *     responses:
 *       '200':
 *         description: Berhasil mengambil statistik admin.
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
 *                   example: Berhasil mengambil statistik admin.
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2026-01-17"
 *                     todayRevenue:
 *                       type: integer
 *                       example: 1500000
 *                       description: Total pendapatan dari pencucian selesai hari ini.
 *                     totalWashedToday:
 *                       type: integer
 *                       example: 12
 *                       description: Total kendaraan yang sudah selesai dicuci hari ini.
 *                     activeQueue:
 *                       type: integer
 *                       example: 5
 *                       description: Jumlah antrian aktif (status BOOKED atau DITERIMA).
 *                     weeklyRevenue:
 *                       type: object
 *                       properties:
 *                         range:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               example: "2026-01-11"
 *                             end:
 *                               type: string
 *                               example: "2026-01-17"
 *                         data:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               day:
 *                                 type: string
 *                               revenue:
 *                                 type: number
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
 *                             example: 5
 *                     todayQueue:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bookingNumber:
 *                             type: string
 *                             example: "TC-1701202601"
 *                           plate:
 *                             type: string
 *                             example: "B 1234 ABC"
 *                           type:
 *                             type: string
 *                             example: "mobil"
 *                           queue_time:
 *                             type: string
 *                             example: "09:15"
 *                           status:
 *                             type: string
 *                             example: "BOOKED"
 */
router.get("/superadmin", authMiddleware, getSuperadminStatistics);
router.get("/admin", authMiddleware, getAdminStatistics);

export default router;
