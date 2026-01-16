import { Router } from "express";
import {
    getAllAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
} from "../controllers/adminController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Management Admin
 *   description: Endpoint untuk manajemen Admin oleh Superadmin
 */

/**
 * @swagger
 * /api/admins:
 *   get:
 *     summary: Mendapatkan daftar semua Admin (Hanya SUPERADMIN)
 *     tags: [Management Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Berhasil mengambil daftar admin.
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
 *                   example: Berhasil mengambil data admin.
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAdmin:
 *                       type: integer
 *                       example: 10
 *                     activeAdmin:
 *                       type: integer
 *                       example: 6
 *                     inactiveAdmin:
 *                       type: integer
 *                       example: 4
 *                     loginToday:
 *                       type: integer
 *                       example: 3
 *                     admins:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 2
 *                           name:
 *                             type: string
 *                             example: "Admin Pusat"
 *                           username:
 *                             type: string
 *                             example: "admincentral"
 *                           phone:
 *                             type: string
 *                             example: "081234567891"
 *                           email:
 *                             type: string
 *                             example: "admin@carwash.com"
 *                           location:
 *                             type: string
 *                             example: "Cuci Mobil Central Jakarta"
 *                           locationId:
 *                             type: integer
 *                             example: 1
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *                           lastLogin:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-01-16T21:12:24.000Z"
 *   post:
 *     summary: Membuat Admin baru (Hanya SUPERADMIN)
 *     tags: [Management Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, username, email, password, phone, locationId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Admin Baru"
 *               username:
 *                 type: string
 *                 example: "adminbaru"
 *               email:
 *                 type: string
 *                 example: "baru@carwash.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               phone:
 *                 type: string
 *                 example: "089988877766"
 *               locationId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       '201':
 *         description: Admin berhasil dibuat.
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
 *                   example: Admin berhasil dibuat.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     name:
 *                       type: string
 *                       example: "Admin Baru"
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       example: "ADMIN"
 *                     location:
 *                       type: string
 *                       example: "Cuci Mobil Pondok Indah"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *       '403':
 *         description: Akses ditolak.
 *       '409':
 *         description: Username/Email/Phone sudah terdaftar.
 */
router.get("/", authMiddleware, getAllAdmins);
router.post("/", authMiddleware, createAdmin);

/**
 * @swagger
 * /api/admins/{id}:
 *   put:
 *     summary: Memperbarui data Admin (Hanya SUPERADMIN)
 *     tags: [Management Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Admin Pusat (Updated)"
 *               username:
 *                 type: string
 *                 example: "admincentral_edit"
 *               email:
 *                 type: string
 *                 example: "admin_edit@carwash.com"
 *               password:
 *                 type: string
 *                 example: "newpassword123"
 *               phone:
 *                 type: string
 *                 example: "081234567899"
 *               locationId:
 *                 type: integer
 *                 example: 3
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       '200':
 *         description: Admin berhasil diperbarui.
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
 *                   example: Data admin berhasil diperbarui.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     name:
 *                       type: string
 *                       example: "Admin Pusat (Updated)"
 *                     username:
 *                       type: string
 *                       example: "admincentral_edit"
 *                     email:
 *                       type: string
 *                       example: "admin_edit@carwash.com"
 *                     location:
 *                       type: string
 *                       example: "Cuci Mobil Central Jakarta"
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *   delete:
 *     summary: Menghapus data Admin (Hanya SUPERADMIN)
 *     tags: [Management Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       '200':
 *         description: Admin berhasil dihapus.
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
 *                   example: Admin berhasil dihapus.
 */
router.put("/:id", authMiddleware, updateAdmin);
router.delete("/:id", authMiddleware, deleteAdmin);

export default router;
