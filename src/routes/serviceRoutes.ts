// File: src/routes/serviceRoutes.ts

import { Router } from "express";
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../controllers/serviceController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Endpoint untuk manajemen dan daftar paket layanan cuci
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Mendapatkan daftar paket layanan
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [MOBIL, MOTOR]
 *         required: false
 *         description: Filter layanan berdasarkan jenis kendaraan (MOBIL atau MOTOR).
 *         example: MOBIL
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter layanan yang tersedia di lokasi/cabang tertentu (termasuk layanan global).
 *         example: 1
 *       - in: query
 *         name: cc
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter layanan berdasarkan kapasitas mesin (CC) kendaraan.
 *         example: 1500
 *       - in: query
 *         name: vehicleId
 *         schema:
 *           type: integer
 *         required: false
 *         description: ID kendaraan user. Jika diisi, sistem akan otomatis memfilter jenis kendaraan dan CC yang sesuai dengan kendaraan tersebut.
 *         example: 1
 *     responses:
 *       '200':
 *         description: Berhasil mengambil daftar layanan.
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
 *                   example: Berhasil mengambil data layanan.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Cuci Cepat Mobil"
 *                       description:
 *                         type: string
 *                         example: "Cuci bodi eksterior dan pengeringan untuk mobil kecil/sedang."
 *                       price:
 *                         type: number
 *                         example: 45000
 *                       vehicleType:
 *                         type: string
 *                         enum: [MOBIL, MOTOR, null]
 *                         example: MOBIL
 *                         description: Jenis kendaraan untuk layanan ini. Null berarti berlaku untuk mobil dan motor.
 *                       minCc:
 *                         type: integer
 *                         nullable: true
 *                         example: 0
 *                         description: Batas minimum CC kendaraan.
 *                       maxCc:
 *                         type: integer
 *                         nullable: true
 *                         example: 1500
 *                         description: Batas maksimum CC kendaraan.
 *                       location:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "TelU Carwash Bandung"
 *       '400':
 *         description: Parameter query tidak valid.
 *       '404':
 *         description: Kendaraan tidak ditemukan (jika menggunakan query vehicleId).
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.get("/", getAllServices);

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Mendapatkan detail paket layanan berdasarkan ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID layanan yang ingin dilihat.
 *         example: 1
 *     responses:
 *       '200':
 *         description: Berhasil mengambil data detail layanan.
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
 *                   example: Berhasil mengambil data layanan.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Cuci Cepat Mobil"
 *                     description:
 *                       type: string
 *                       example: "Cuci bodi eksterior dan pengeringan untuk mobil kecil/sedang."
 *                     price:
 *                       type: number
 *                       example: 45000
 *                     vehicleType:
 *                       type: string
 *                       example: MOBIL
 *                     minCc:
 *                       type: integer
 *                       nullable: true
 *                       example: 0
 *                     maxCc:
 *                       type: integer
 *                       nullable: true
 *                       example: 1500
 *                     location:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "TelU Carwash Bandung"
 *                         address:
 *                           type: string
 *                           example: "Jl. Telekomunikasi No. 1, Bandung"
 *       '400':
 *         description: ID Layanan tidak valid.
 *       '404':
 *         description: Layanan tidak ditemukan.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.get("/:id", getServiceById);

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Membuat paket layanan baru (Hanya ADMIN dan SUPERADMIN)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Cuci Salju Spesial"
 *               description:
 *                 type: string
 *                 example: "Pencucian bodi salju dengan wax premium."
 *               price:
 *                 type: number
 *                 example: 50000
 *               vehicleType:
 *                 type: string
 *                 enum: [MOBIL, MOTOR]
 *                 nullable: true
 *                 example: MOBIL
 *               minCC:
 *                 type: integer
 *                 nullable: true
 *                 example: 0
 *               maxCC:
 *                 type: integer
 *                 nullable: true
 *                 example: 1500
 *               locationId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *                 description: ID lokasi cabang (khusus SUPERADMIN. Untuk ADMIN otomatis diisi sesuai lokasinya).
 *     responses:
 *       '201':
 *         description: Layanan berhasil dibuat.
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
 *                   example: Layanan berhasil dibuat.
 *                 data:
 *                   type: object
 *       '400':
 *         description: Input tidak valid.
 *       '403':
 *         description: Akses ditolak.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.post("/", authMiddleware, createService);

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Memperbarui paket layanan (Hanya ADMIN dan SUPERADMIN)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID layanan yang ingin diperbarui.
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Cuci Salju Spesial Extra Wax"
 *               description:
 *                 type: string
 *                 example: "Pencucian bodi salju dengan double wax premium."
 *               price:
 *                 type: number
 *                 example: 55000
 *               vehicleType:
 *                 type: string
 *                 enum: [MOBIL, MOTOR]
 *                 nullable: true
 *                 example: MOBIL
 *               minCC:
 *                 type: integer
 *                 nullable: true
 *                 example: 0
 *               maxCC:
 *                 type: integer
 *                 nullable: true
 *                 example: 2000
 *               locationId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *     responses:
 *       '200':
 *         description: Layanan berhasil diperbarui.
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
 *                   example: Layanan berhasil diperbarui.
 *                 data:
 *                   type: object
 *       '400':
 *         description: Input tidak valid.
 *       '403':
 *         description: Akses ditolak.
 *       '404':
 *         description: Layanan tidak ditemukan.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.put("/:id", authMiddleware, updateService);

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Menghapus paket layanan (Hanya ADMIN dan SUPERADMIN)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID layanan yang ingin dihapus.
 *         example: 1
 *     responses:
 *       '200':
 *         description: Layanan berhasil dihapus.
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
 *                   example: Layanan berhasil dihapus.
 *       '400':
 *         description: Layanan tidak dapat dihapus karena sedang digunakan pada pesanan aktif.
 *       '403':
 *         description: Akses ditolak.
 *       '404':
 *         description: Layanan tidak ditemukan.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.delete("/:id", authMiddleware, deleteService);

export default router;

