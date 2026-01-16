import { Router } from "express";
import { login, register, refreshToken, logout, heartbeat } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoint untuk otentikasi
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrasi user baru (hanya untuk customer)
 *     tags: [Auth]
 *     description: Endpoint ini hanya dapat membuat user dengan role CUSTOMER. Pembuatan admin/superadmin dilakukan manual oleh superadmin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "siti.customer@example.com"
 *               username:
 *                 type: string
 *                 example: "siti_customer"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *               name:
 *                 type: string
 *                 example: "Siti Aminah"
 *               phone:
 *                 type: string
 *                 example: "089876543210"
 *     responses:
 *       '201':
 *         description: Registrasi berhasil.
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
 *                   example: Registrasi berhasil!
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 3
 *                         username:
 *                           type: string
 *                           example: "siti_customer"
 *                         email:
 *                           type: string
 *                           example: "siti.customer@example.com"
 *                         name:
 *                           type: string
 *                           example: "Siti Aminah"
 *                         role:
 *                           type: string
 *                           example: CUSTOMER
 *       '400':
 *         description: Input tidak valid.
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
 *                   example: Email, username, dan password wajib diisi.
 *       '403':
 *         description: Mencoba registrasi dengan role selain CUSTOMER.
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
 *                   example: Registrasi hanya diperbolehkan untuk role CUSTOMER. Pembuatan admin dilakukan oleh superadmin.
 *       '409':
 *         description: Email, username, atau nomor telepon sudah digunakan.
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
 *                   example: User dengan email tersebut sudah ada.
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login untuk mendapatkan token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "budisantoso"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "customer123"
 *     responses:
 *       '200':
 *         description: Login berhasil, mengembalikan token dan data user.
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
 *                   example: Login berhasil!
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT token untuk autentikasi
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInVzZXJuYW1lIjoiYnVkaXNhbnRvc28iLCJyb2xlIjoiQ1VTVE9NRVIiLCJpYXQiOjE3MDQ3MDgwMDAsImV4cCI6MTcwNDc5NDQwMH0.example"
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 2
 *                         username:
 *                           type: string
 *                           example: "budisantoso"
 *                         email:
 *                           type: string
 *                           example: "budi.customer@example.com"
 *                         name:
 *                           type: string
 *                           example: "Budi Santoso"
 *                         role:
 *                           type: string
 *                           enum: [CUSTOMER, ADMIN, SUPERADMIN]
 *                           example: CUSTOMER
 *       '400':
 *         description: Input tidak valid.
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
 *                   example: Username dan password wajib diisi.
 *       '401':
 *         description: Username atau password salah.
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
 *                   example: Username atau password salah.
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh token JWT yang sudah ada
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: Menggunakan token lama untuk mendapatkan token baru dengan masa berlaku yang diperpanjang.
 *     responses:
 *       '200':
 *         description: Token berhasil di-refresh.
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
 *                   example: Token berhasil di-refresh!
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: Token JWT baru
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 2
 *                         username:
 *                           type: string
 *                           example: "budisantoso"
 *                         email:
 *                           type: string
 *                           example: "budi.customer@example.com"
 *                         name:
 *                           type: string
 *                           example: "Budi Santoso"
 *                         role:
 *                           type: string
 *                           example: CUSTOMER
 *       '401':
 *         description: Token tidak disediakan.
 *       '403':
 *         description: Token tidak valid atau sudah kadaluwarsa.
 *       '404':
 *         description: User tidak ditemukan.
 */
router.post("/refresh", refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (menghapus token di sisi client)
 *     tags: [Auth]
 *     description: Karena JWT bersifat stateless, logout dilakukan dengan menghapus token di client. Endpoint ini hanya mengembalikan konfirmasi.
 *     responses:
 *       '200':
 *         description: Logout berhasil.
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
 *                   example: Logout berhasil.
 */
router.post("/logout", authMiddleware, logout);

/**
 * @swagger
 * /api/auth/heartbeat:
 *   post:
 *     summary: Update status online (Heartbeat)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Status updated.
 */
router.post("/heartbeat", authMiddleware, heartbeat);

export default router;
