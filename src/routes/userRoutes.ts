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
 *       '401':
 *         description: Tidak terautentikasi (token tidak ada atau tidak valid).
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
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Minimal 6 karakter.
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: File gambar (jpg, jpeg, png).
 *     responses:
 *       '200':
 *         description: Profil berhasil diperbarui.
 *       '400':
 *         description: Input tidak valid atau tidak ada data yang dikirim.
 *       '409':
 *         description: Username/email/telepon sudah digunakan.
 */
router.get("/profile", authMiddleware, getMyProfile);
router.put(
  "/profile",
  authMiddleware,
  upload.single("profilePhoto"),
  updateMyProfile
);

export default router;
