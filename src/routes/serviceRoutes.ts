// File: src/routes/serviceRoutes.ts

import { Router } from "express";
import { getAllServices } from "../controllers/serviceController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Endpoint untuk melihat paket layanan yang tersedia
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Mendapatkan daftar semua paket layanan
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [MOBIL, MOTOR]
 *         required: false
 *         description: Filter layanan berdasarkan jenis kendaraan (MOBIL atau MOTOR). Jika tidak diisi, akan menampilkan semua layanan.
 *         example: MOBIL
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
 *                         example: "Cuci Cepat"
 *                       description:
 *                         type: string
 *                         example: "Cuci bodi eksterior dan pengeringan."
 *                       price:
 *                         type: number
 *                         example: 50000
 *                       vehicleType:
 *                         type: string
 *                         enum: [MOBIL, MOTOR, null]
 *                         example: MOBIL
 *                         description: Jenis kendaraan untuk layanan ini. Null berarti berlaku untuk mobil dan motor.
 *       '400':
 *         description: Parameter type tidak valid.
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
 *                   example: "Parameter 'type' harus bernilai 'MOBIL' atau 'MOTOR'."
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.get("/", getAllServices);

export default router;
