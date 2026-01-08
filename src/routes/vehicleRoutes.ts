import { Router } from "express";
import {
  addVehicle,
  getMyVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} from "../controllers/vehicleController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Endpoint untuk manajemen kendaraan milik user
 */

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Mendapatkan semua kendaraan milik user yang sedang login
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Daftar kendaraan berhasil diambil.
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
 *                   example: Berhasil mengambil data kendaraan.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       plate:
 *                         type: string
 *                         example: "B 1234 ABC"
 *                       type:
 *                         type: string
 *                         enum: [MOBIL, MOTOR]
 *                         example: MOBIL
 *                       model:
 *                         type: string
 *                         nullable: true
 *                         example: "Toyota Avanza"
 *                       ownerId:
 *                         type: integer
 *                         example: 1
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       '401':
 *         description: Tidak terautentikasi.
 *   post:
 *     summary: Menambahkan kendaraan baru untuk user yang sedang login
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plate, type]
 *             properties:
 *               plate:
 *                 type: string
 *                 example: "B 9876 ZYX"
 *               type:
 *                 type: string
 *                 enum: [MOBIL, MOTOR]
 *                 example: MOBIL
 *               model:
 *                 type: string
 *                 example: "Daihatsu Terios"
 *     responses:
 *       '201':
 *         description: Kendaraan berhasil ditambahkan.
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
 *                   example: Kendaraan berhasil ditambahkan!
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     plate:
 *                       type: string
 *                       example: "B 9876 ZYX"
 *                     type:
 *                       type: string
 *                       example: MOBIL
 *                     model:
 *                       type: string
 *                       example: "Daihatsu Terios"
 *                     ownerId:
 *                       type: integer
 *                       example: 1
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '400':
 *         description: Input tidak valid (nomor plat atau jenis kendaraan tidak diisi).
 *       '401':
 *         description: Tidak terautentikasi.
 *       '409':
 *         description: Nomor plat sudah terdaftar.
 */
router.get("/", authMiddleware, getMyVehicles);
router.post("/", authMiddleware, addVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Mendapatkan detail kendaraan berdasarkan ID
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID unik kendaraan.
 *     responses:
 *       '200':
 *         description: Berhasil mengambil data kendaraan.
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
 *                   example: Berhasil mengambil data kendaraan.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     plate:
 *                       type: string
 *                       example: "B 1234 ABC"
 *                     type:
 *                       type: string
 *                       enum: [MOBIL, MOTOR]
 *                       example: MOBIL
 *                     model:
 *                       type: string
 *                       nullable: true
 *                       example: "Toyota Avanza"
 *                     ownerId:
 *                       type: integer
 *                       example: 1
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '400':
 *         description: ID kendaraan tidak valid.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '404':
 *         description: Kendaraan tidak ditemukan atau bukan milik user.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 *   put:
 *     summary: Memperbarui detail kendaraan milik user
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID unik kendaraan.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plate:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [MOBIL, MOTOR]
 *               model:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Kendaraan berhasil diperbarui.
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
 *                   example: Kendaraan berhasil diperbarui!
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     plate:
 *                       type: string
 *                       example: "B 1234 XYZ"
 *                     type:
 *                       type: string
 *                       example: MOBIL
 *                     model:
 *                       type: string
 *                       example: "Toyota Avanza Veloz"
 *                     ownerId:
 *                       type: integer
 *                       example: 1
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '400':
 *         description: ID kendaraan tidak valid.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '404':
 *         description: Kendaraan tidak ditemukan atau bukan milik user.
 *       '409':
 *         description: Nomor plat sudah terdaftar (jika mengubah plat ke nomor yang sudah ada).
 *   delete:
 *     summary: Menghapus kendaraan milik user
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID unik kendaraan.
 *     responses:
 *       '200':
 *         description: Kendaraan berhasil dihapus.
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
 *                   example: Kendaraan berhasil dihapus.
 *       '400':
 *         description: ID kendaraan tidak valid.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '404':
 *         description: Kendaraan tidak ditemukan atau bukan milik user.
 */
router.get("/:id", authMiddleware, getVehicleById);
router.put("/:id", authMiddleware, updateVehicle);
router.delete("/:id", authMiddleware, deleteVehicle);

export default router;
