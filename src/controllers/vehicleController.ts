import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware"; // Impor tipe AuthRequest
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

export const addVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const { plate, type, model } = req.body;

    // Ambil ID user yang sedang login dari middleware
    const userId = req.user?.userId;

    // 1. Validasi Input
    if (!plate || !type) {
      return res.status(400).json({
        status: "error",
        message: "Nomor plat dan jenis kendaraan wajib diisi.",
      });
    }

    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "User tidak terautentikasi." });
    }

    // 2. Buat data vehicle baru di database
    const newVehicle = await prisma.vehicle.create({
      data: {
        plate,
        type, // Seharusnya 'MOBIL' atau 'MOTOR', sesuai enum Anda
        model,
        // Ini adalah bagian penting yang menghubungkan kendaraan ke user yang sedang login
        owner: {
          connect: {
            id: userId,
          },
        },
      },
    });

    // 3. Kirim respons sukses
    res.status(201).json({
      status: "success",
      message: "Kendaraan berhasil ditambahkan!",
      data: newVehicle,
    });
  } catch (error) {
    // Menangani error jika nomor plat sudah ada (unique constraint)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ status: "error", message: "Nomor plat sudah terdaftar." }); // 409 Conflict
    }

    console.error("Error saat menambah kendaraan:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

export const getMyVehicles = async (req: AuthRequest, res: Response) => {
  try {
    // Ambil ID user yang sedang login dari payload token JWT di middleware
    const userId = req.user?.userId;

    // Validasi sederhana, meskipun middleware seharusnya sudah menangani ini
    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "User tidak terautentikasi." });
    }

    // Cari SEMUA kendaraan di database yang 'ownerId'-nya cocok dengan ID user yang sedang login
    const vehicles = await prisma.vehicle.findMany({
      where: {
        ownerId: userId,
      },
      // Urutkan hasilnya agar konsisten, misalnya berdasarkan yang terbaru
      orderBy: {
        createdAt: "desc",
      },
    });

    // Kirim respons sukses dengan daftar kendaraan
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data kendaraan.",
      data: vehicles,
    });
  } catch (error) {
    console.error("Error saat mengambil data kendaraan:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

export const updateVehicle = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Ambil ID dari URL parameter dan data dari body
    const vehicleId = parseInt(req.params.id, 10);
    const { plate, type, model } = req.body;
    const userId = req.user?.userId;

    // Validasi dasar
    if (isNaN(vehicleId)) {
      return res
        .status(400)
        .json({ status: "error", message: "ID Kendaraan tidak valid." });
    }

    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "User tidak terautentikasi." });
    }

    // 2. Lakukan update HANYA jika ID kendaraan DAN ID pemiliknya cocok
    // Ini adalah langkah keamanan krusial untuk mencegah user mengedit kendaraan orang lain.
    const updatedVehicle = await prisma.vehicle.update({
      where: {
        id: vehicleId,
        ownerId: userId, // <-- Kunci Otorisasi: hanya update jika ownerId cocok
      },
      data: {
        plate,
        type,
        model,
      },
    });

    // 3. Kirim respons sukses
    res.status(200).json({
      status: "success",
      message: "Kendaraan berhasil diperbarui!",
      data: updatedVehicle,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error P2025: Record to update not found.
      // Ini terjadi jika vehicleId tidak ada ATAU ownerId tidak cocok.
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({
            status: "error",
            message:
              "Kendaraan tidak ditemukan atau Anda tidak memiliki hak akses.",
          });
      }
      // Error P2002: Unique constraint failed (nomor plat sudah ada)
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ status: "error", message: "Nomor plat sudah terdaftar." });
      }
    }
    console.error("Error saat memperbarui kendaraan:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

export const deleteVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = parseInt(req.params.id, 10);
    const userId = req.user?.userId;

    if (isNaN(vehicleId)) {
      return res
        .status(400)
        .json({ status: "error", message: "ID Kendaraan tidak valid." });
    }

    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "User tidak terautentikasi." });
    }

    // Lakukan delete HANYA jika ID kendaraan DAN ID pemiliknya cocok.
    // Ini adalah langkah keamanan yang sama seperti di fungsi update.
    await prisma.vehicle.delete({
      where: {
        id: vehicleId,
        ownerId: userId, // <-- Kunci Otorisasi
      },
    });

    // Kirim respons sukses. Standar REST untuk DELETE adalah status 204 (No Content)
    // tapi 200 dengan pesan juga sangat umum dan lebih informatif.
    res.status(200).json({
      status: "success",
      message: "Kendaraan berhasil dihapus.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error P2025: Record to delete not found.
      // Terjadi jika vehicleId tidak ada ATAU ownerId tidak cocok.
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({
            status: "error",
            message:
              "Kendaraan tidak ditemukan atau Anda tidak memiliki hak akses.",
          });
      }
    }
    console.error("Error saat menghapus kendaraan:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};
