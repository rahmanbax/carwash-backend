import { Router } from "express";
import {
  addVehicle,
  getMyVehicles,
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
 *       '409':
 *         description: Nomor plat sudah terdaftar.
 */
router.get("/", authMiddleware, getMyVehicles);
router.post("/", authMiddleware, addVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
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
 *       '404':
 *         description: Kendaraan tidak ditemukan atau bukan milik user.
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
 *       '404':
 *         description: Kendaraan tidak ditemukan atau bukan milik user.
 */
router.put("/:id", authMiddleware, updateVehicle);
router.delete("/:id", authMiddleware, deleteVehicle);

export default router;
