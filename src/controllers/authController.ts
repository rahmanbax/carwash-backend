import { Request, Response } from "express";
import prisma from "../lib/prisma";
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
      expiresIn: "10m",
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
          photoUrl: user.photoUrl,
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
    const { email, username, password, name, phone, role } = req.body;

    // 1. Validasi Input Dasar
    if (!email || !username || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email, username, dan password wajib diisi.",
      });
    }

    // 2. Validasi Role - Hanya boleh CUSTOMER
    if (role && role !== "CUSTOMER") {
      return res.status(403).json({
        status: "error",
        message: "Registrasi hanya diperbolehkan untuk role CUSTOMER. Pembuatan admin dilakukan oleh superadmin.",
      });
    }

    // 3. Cek Apakah User Sudah Ada
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
        role: "CUSTOMER", // Force role to CUSTOMER
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

export const refreshToken = async (req: Request, res: Response) => {
  try {
    // 1. Dapatkan token dari header Authorization
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Token tidak disediakan.",
      });
    }

    // 2. Verifikasi token (dengan mengabaikan waktu kadaluwarsa sementara untuk mengecek Grace Period)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET tidak ditemukan di .env");
    }

    jwt.verify(token, secret, { ignoreExpiration: true }, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          status: "error",
          message: "Token tidak valid.",
        });
      }

      // 3. Ambil data user dari decoded token
      const payload = decoded as { userId: number; username: string; role: string; exp: number };

      // 4. Implementasi Grace Period 60 second
      const GRACE_PERIOD_SECONDS = 60;
      const currentTime = Math.floor(Date.now() / 1000);

      if (payload.exp + GRACE_PERIOD_SECONDS < currentTime) {
        return res.status(403).json({
          status: "error",
          message: "Token sudah melewati masa tenggang dan tidak dapat di-refresh. Silakan login kembali.",
        });
      }

      // 5. Verifikasi user masih ada di database
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User tidak ditemukan.",
        });
      }

      // 6. Generate token baru
      const newPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
      };

      const newToken = jwt.sign(newPayload, secret, {
        expiresIn: "30d",
      });

      // 7. Kirim token baru
      res.status(200).json({
        status: "success",
        message: "Token berhasil di-refresh!",
        data: {
          token: newToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role,
            photoUrl: user.photoUrl,
          },
        },
      });
    });
  } catch (error) {
    console.error("Error saat refresh token:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // Karena JWT bersifat stateless, logout dilakukan di sisi client
    // dengan menghapus token dari storage (localStorage/sessionStorage)
    // Server hanya mengembalikan response sukses

    res.status(200).json({
      status: "success",
      message: "Logout berhasil.",
    });
  } catch (error) {
    console.error("Error saat logout:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};
