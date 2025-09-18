import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";
import * as bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  // 1. Ambil ID user dari payload token yang sudah diverifikasi oleh authMiddleware
  const userId = req.user?.userId;

  if (!userId) {
    // Baris ini sebenarnya hanya sebagai pengaman, karena authMiddleware seharusnya sudah menanganinya
    return res
      .status(401)
      .json({ status: "error", message: "User tidak terautentikasi." });
  }

  try {
    // 2. Cari data user di database menggunakan ID tersebut
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    // Jika karena alasan aneh user tidak ditemukan (misal: sudah dihapus tapi token masih ada)
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User tidak ditemukan." });
    }

    // 3. Hapus properti password dari objek sebelum mengirimkannya ke frontend
    const { password, ...userWithoutPassword } = user;

    // 4. Kirim respons sukses dengan data profil
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data profil.",
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error saat mengambil profil:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res
      .status(401)
      .json({ status: "error", message: "User tidak terautentikasi." });
  }

  try {
    const { username, name, email, phone, password } = req.body;

    // 1. Buat objek untuk menampung data yang akan di-update secara dinamis
    const updateData: Prisma.UserUpdateInput = {};

    // 2. Cek setiap field teks dan tambahkan ke objek update jika ada
    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    // 3. Penanganan khusus untuk password: HASH sebelum disimpan
    if (password) {
      if (password.length < 6) {
        // Contoh validasi sederhana
        return res.status(400).json({
          status: "error",
          message: "Password minimal harus 6 karakter.",
        });
      }
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    // 4. Penanganan khusus untuk file foto profil
    if (req.file) {
      const photoUrl = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;
      updateData.photoUrl = photoUrl;
    }

    // 5. Cek apakah ada data yang akan di-update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Tidak ada data yang dikirim untuk diperbarui.",
      });
    }

    // 6. Lakukan update di database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 7. Hapus password dari objek respons untuk keamanan
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      status: "success",
      message: "Profil berhasil diperbarui.",
      data: userWithoutPassword,
    });
  } catch (error) {
    // Menangani error jika username/email/phone sudah ada (unique constraint)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const field = (error.meta?.target as string[])[0]; // Mendapatkan nama field yang error
      return res.status(409).json({
        status: "error",
        message: `Data untuk '${field}' sudah digunakan.`,
      });
    }

    console.error("Error saat update profil:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};
