import { Router } from "express";
import { getMyProfile, updateMyProfile } from "../controllers/userController";
import { authMiddleware } from "../middleware/authMiddleware";
import { upload } from "../middleware/uploadMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Endpoint untuk manajemen profil user
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Mengambil data profil user yang sedang login
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Berhasil mengambil data profil.
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
 *                   example: Berhasil mengambil data profil.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     email:
 *                       type: string
 *                       example: "budi.customer@example.com"
 *                     username:
 *                       type: string
 *                       example: "budisantoso"
 *                     name:
 *                       type: string
 *                       example: "Budi Santoso"
 *                     phone:
 *                       type: string
 *                       example: "081234567890"
 *                     role:
 *                       type: string
 *                       example: CUSTOMER
 *                     photoUrl:
 *                       type: string
 *                       nullable: true
 *                       example: "http://localhost:3000/uploads/profile-1704708000000.jpg"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '401':
 *         description: Tidak terautentikasi (token tidak ada atau tidak valid).
 *       '404':
 *         description: User tidak ditemukan.
 *   put:
 *     summary: Memperbarui data profil user yang sedang login
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Budi Santoso Updated"
 *               username:
 *                 type: string
 *                 example: "budisantoso_new"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "budi.new@example.com"
 *               phone:
 *                 type: string
 *                 example: "089876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Minimal 6 karakter.
 *                 example: "newpassword123"
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: File gambar (jpg, jpeg, png).
 *     responses:
 *       '200':
 *         description: Profil berhasil diperbarui.
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
 *                   example: Profil berhasil diperbarui.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     email:
 *                       type: string
 *                       example: "budi.new@example.com"
 *                     username:
 *                       type: string
 *                       example: "budisantoso_new"
 *                     name:
 *                       type: string
 *                       example: "Budi Santoso Updated"
 *                     phone:
 *                       type: string
 *                       example: "089876543210"
 *                     role:
 *                       type: string
 *                       example: CUSTOMER
 *                     photoUrl:
 *                       type: string
 *                       nullable: true
 *                       example: "http://localhost:3000/uploads/profile-1704708123456.jpg"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '400':
 *         description: Input tidak valid atau tidak ada data yang dikirim.
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
 *                   example: Password minimal harus 6 karakter.
 *       '401':
 *         description: Tidak terautentikasi.
 *       '409':
 *         description: Username/email/telepon sudah digunakan.
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
 *                   example: "Data untuk 'email' sudah digunakan."
 */
router.get("/profile", authMiddleware, getMyProfile);
router.put(
  "/profile",
  authMiddleware,
  upload.single("profilePhoto"),
  updateMyProfile
);

export default router;
