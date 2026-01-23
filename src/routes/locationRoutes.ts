import { Router } from 'express';
import {
    getAllLocations,
    getLocationById,
    getSuperadminLocations,
    createLocation,
    updateLocation,
    deleteLocation
} from '../controllers/locationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload, validateFileSignature } from "../middleware/uploadMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Endpoint untuk manajemen lokasi cuci mobil
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
 *                         example: "021-12345678"
 *                       latitude:
 *                         type: number
 *                         example: -6.1944
 *                       longitude:
 *                         type: number
 *                         example: 106.8229
 *                       photoUrl:
 *                         type: string
 *                         example: "http://localhost:8000/uploads/location-1.jpg"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *   post:
 *     summary: Membuat lokasi baru (Hanya SUPERADMIN)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, address, latitude, longitude]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Cuci Mobil Kelapa Gading"
 *               address:
 *                 type: string
 *                 example: "Jl. Boulevard Raya No. 10, Jakarta Utara"
 *               phone:
 *                 type: string
 *                 example: "021-99988877"
 *               latitude:
 *                 type: number
 *                 example: -6.155
 *               longitude:
 *                 type: number
 *                 example: 106.902
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: File gambar lokasi (jpg, jpeg, png)
 *     responses:
 *       '201':
 *         description: Lokasi berhasil dibuat.
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
 *                   example: Lokasi berhasil dibuat.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 4
 *                     name:
 *                       type: string
 *                       example: "Cuci Mobil Kelapa Gading"
 *                     address:
 *                       type: string
 *                       example: "Jl. Boulevard Raya No. 10, Jakarta Utara"
 *                     phone:
 *                       type: string
 *                       example: "021-99988877"
 *                     latitude:
 *                       type: number
 *                       example: -6.155
 *                     longitude:
 *                       type: number
 *                       example: 106.902
 *                     photoUrl:
 *                       type: string
 *                       example: "https://example.com/photo.jpg"
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *       '403':
 *         description: Akses ditolak.
 */
router.get('/', getAllLocations);
router.post('/', authMiddleware, upload.single('photo'), validateFileSignature, createLocation);

/**
 * @swagger
 * /api/locations/superadmin:
 *   get:
 *     summary: Mendapatkan daftar lokasi dengan jumlah admin (Hanya SUPERADMIN)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Berhasil mengambil data lokasi untuk superadmin.
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
 *                   example: Berhasil mengambil data lokasi untuk superadmin.
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalLocation:
 *                       type: integer
 *                       example: 5
 *                     totalActiveLocation:
 *                       type: integer
 *                       example: 3
 *                     totalAdmin:
 *                       type: integer
 *                       example: 10
 *                     totalNewTenantsThisMonth:
 *                       type: integer
 *                       example: 2
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Cuci Mobil Central Jakarta"
 *                           address:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           latitude:
 *                             type: number
 *                             example: -6.1944
 *                           longitude:
 *                             type: number
 *                             example: 106.8229
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *                           totalAdmin:
 *                             type: integer
 *                             example: 2
 *       '403':
 *         description: Akses ditolak.
 */
router.get('/superadmin', authMiddleware, getSuperadminLocations);

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
 *         example: 1
 *     responses:
 *       '200':
 *         description: Berhasil mengambil data lokasi.
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
 *                       example: "021-12345678"
 *                     latitude:
 *                       type: number
 *                       example: -6.1944
 *                     longitude:
 *                       type: number
 *                       example: 106.8229
 *                     photoUrl:
 *                       type: string
 *                       example: "http://localhost:8000/uploads/location-1.jpg"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *   put:
 *     summary: Memperbarui lokasi (Hanya SUPERADMIN)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       description: "Data lokasi yang ingin diperbarui. Gunakan multipart/form-data jika ingin mengunggah foto."
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Cuci Mobil Central Jakarta (Updated)"
 *               address:
 *                 type: string
 *                 example: "Jl. Thamrin No. 45, Jakarta Pusat"
 *               phone:
 *                 type: string
 *                 example: "021-11122233"
 *               latitude:
 *                 type: number
 *                 example: -6.1944
 *               longitude:
 *                 type: number
 *                 example: 106.8229
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: File gambar lokasi baru
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       '200':
 *         description: Lokasi berhasil diperbarui.
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
 *                   example: Lokasi berhasil diperbarui.
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
 *                     phone:
 *                       type: string
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     photoUrl:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *       '403':
 *         description: Akses ditolak.
 *   delete:
 *     summary: Menghapus lokasi (Hanya SUPERADMIN)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Lokasi berhasil dihapus.
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
 *                   example: Lokasi berhasil dihapus.
 *       '403':
 *         description: Akses ditolak.
 */
router.get('/:id', getLocationById);
router.put('/:id', authMiddleware, upload.single('photo'), validateFileSignature, updateLocation);
router.delete('/:id', authMiddleware, deleteLocation);

export default router;