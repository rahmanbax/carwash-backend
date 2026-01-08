// File: src/routes/locationRoutes.ts

import { Router } from 'express';
import { getAllLocations, getLocationById } from '../controllers/locationController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Endpoint untuk melihat daftar lokasi cuci mobil
 */

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Mendapatkan daftar semua lokasi cuci mobil
 *     tags: [Locations]
 *     responses:
 *       '200':
 *         description: Berhasil mengambil daftar lokasi.
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
 *                   example: Berhasil mengambil data lokasi.
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
 *                         example: "Cuci Mobil Central Jakarta"
 *                       address:
 *                         type: string
 *                         example: "Jl. Thamrin No. 45, Jakarta Pusat"
 *                       phone:
 *                         type: string
 *                         nullable: true
 *                         example: "021-12345678"
 *                       latitude:
 *                         type: number
 *                         example: -6.1944
 *                       longitude:
 *                         type: number
 *                         example: 106.8229
 *                       photo:
 *                         type: string
 *                         nullable: true
 *                         example: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800"
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.get('/', getAllLocations);

/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     summary: Mendapatkan detail lokasi berdasarkan ID
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID unik dari lokasi.
 *     responses:
 *       '200':
 *         description: Berhasil mengambil detail lokasi.
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
 *                   example: Berhasil mengambil data lokasi.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Cuci Mobil Central Jakarta"
 *                     address:
 *                       type: string
 *                       example: "Jl. Thamrin No. 45, Jakarta Pusat"
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                       example: "021-12345678"
 *                     latitude:
 *                       type: number
 *                       example: -6.1944
 *                     longitude:
 *                       type: number
 *                       example: 106.8229
 *                     photo:
 *                       type: string
 *                       nullable: true
 *                       example: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800"
 *       '400':
 *         description: ID lokasi tidak valid.
 *       '404':
 *         description: Lokasi tidak ditemukan.
 *       '500':
 *         description: Terjadi kesalahan pada server.
 */
router.get('/:id', getLocationById);

export default router;