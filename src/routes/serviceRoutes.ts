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
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.get("/", getAllServices);

export default router;
