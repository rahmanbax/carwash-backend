import { Request, Response } from "express";
import prisma from "../lib/prisma"; // Impor instance Prisma Anda
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // 1. Validasi Input
    if (!username || !password) {
      return res.status(400).json({
        status: "error",
        message: "Username dan password wajib diisi.",
      });
    }

    // 2. Cari User di Database Berdasarkan Username
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    // Jika user tidak ditemukan, kirim error.
    if (!user) {
      return res
        .status(401)
        .json({ status: "error", message: "Username atau password salah." });
    }

    // 3. Bandingkan Password yang Dikirim dengan Hash di Database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Jika password tidak cocok, kirim error.
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ status: "error", message: "Username atau password salah." });
    }

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET tidak ditemukan di .env");
    }

    const token = jwt.sign(payload, secret, {
      expiresIn: "1d",
    });

    res.status(200).json({
      status: "success",
      message: "Login berhasil!",
      data: {
        token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Error saat login:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password, name, phone } = req.body;

    // 1. Validasi Input Dasar
    if (!email || !username || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email, username, dan password wajib diisi.",
      });
    }

    // 2. Cek Apakah User Sudah Ada
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { username: username }, { phone: phone }],
      },
    });

    if (existingUser) {
      // Memberikan pesan error yang spesifik
      let message = "";
        if (existingUser.email === email) {
          message = "User dengan email tersebut sudah ada.";
        } else if (existingUser.username === username) {
          message = "User dengan username tersebut sudah ada.";
        } else if (phone && existingUser.phone === phone) {
          message = "User dengan nomor telepon tersebut sudah ada.";
        }
      return res.status(409).json({ status: "error", message }); // 409 Conflict
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name,
        phone,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Registrasi berhasil!",
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
    });
  } catch (error) {
    console.error("Error saat registrasi:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};
