import { Router } from "express";
import { login, register } from "../controllers/authController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoint untuk otentikasi (registrasi dan login)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrasi user baru (customer)
 *     tags: [Auth]
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
 *       '400':
 *         description: Input tidak valid.
 *       '409':
 *         description: Email, username, atau nomor telepon sudah digunakan.
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
 *       '401':
 *         description: Username atau password salah.
 */
router.post("/login", login);

export default router;
