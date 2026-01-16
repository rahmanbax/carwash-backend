import { Request, Response } from "express";
import prisma from "../lib/prisma";
import * as bcrypt from "bcrypt";
import { AuthRequest } from "../middleware/authMiddleware";

/**
 * Mendapatkan daftar semua Admin
 * Hanya untuk SUPERADMIN
 */
export const getAllAdmins = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;

        if (userRole !== "SUPERADMIN") {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak. Hanya SUPERADMIN yang dapat mengakses data ini.",
            });
        }

        const totalAdmin = await prisma.user.count({ where: { role: "ADMIN" } });
        const activeAdmin = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
        const inactiveAdmin = await prisma.user.count({ where: { role: "ADMIN", isActive: false } });

        // Hitung admin yang login hari ini
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const loginToday = await prisma.user.count({
            where: {
                role: "ADMIN",
                lastLogin: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            }
        });

        const admins = await prisma.user.findMany({
            where: {
                role: "ADMIN",
            },
            include: {
                location: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        const formattedAdmins = admins.map((admin) => ({
            id: admin.id,
            name: admin.name,
            username: admin.username,
            phone: admin.phone,
            email: admin.email,
            location: admin.location ? admin.location.name : "Tidak ada lokasi",
            locationId: admin.locationId,
            isActive: admin.isActive,
            lastLogin: admin.lastLogin,
        }));

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil data admin.",
            data: {
                totalAdmin,
                activeAdmin,
                inactiveAdmin,
                loginToday,
                admins: formattedAdmins
            },
        });
    } catch (error) {
        console.error("Error saat mengambil data admin:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};

/**
 * Membuat Admin baru
 * Hanya untuk SUPERADMIN
 */
export const createAdmin = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;

        if (userRole !== "SUPERADMIN") {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak.",
            });
        }

        const { name, username, email, password, phone, locationId } = req.body;

        // 1. Validasi Input Dasar
        if (!name || !username || !email || !password || !phone || !locationId) {
            return res.status(400).json({
                status: "error",
                message: "Semua field wajib diisi.",
            });
        }

        // 2. Cek apakah username/email/phone sudah ada
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }, { phone }],
            },
        });

        if (existingUser) {
            return res.status(409).json({
                status: "error",
                message: "Username, email, atau nomor telepon sudah terdaftar.",
            });
        }

        // 3. Hash Password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Create User
        const newAdmin = await prisma.user.create({
            data: {
                name,
                username,
                email,
                password: hashedPassword,
                phone,
                role: "ADMIN",
                locationId,
            },
            include: {
                location: true,
            }
        });

        res.status(201).json({
            status: "success",
            message: "Admin berhasil dibuat.",
            data: {
                id: newAdmin.id,
                name: newAdmin.name,
                username: newAdmin.username,
                email: newAdmin.email,
                role: newAdmin.role,
                location: newAdmin.location?.name,
                isActive: newAdmin.isActive,
            },
        });
    } catch (error) {
        console.error("Error saat membuat admin:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};

/**
 * Memperbarui data Admin
 * Hanya untuk SUPERADMIN
 */
export const updateAdmin = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;
        const adminId = parseInt(req.params.id, 10);

        if (userRole !== "SUPERADMIN") {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak.",
            });
        }

        if (isNaN(adminId)) {
            return res.status(400).json({ status: "error", message: "ID Admin tidak valid." });
        }

        const { name, username, email, password, phone, locationId, isActive } = req.body;

        // Data yang akan di-update
        const updateData: any = {
            name,
            username,
            email,
            phone,
            locationId,
            isActive,
        };

        // Jika ada password baru, hash dulu
        if (password) {
            const saltRounds = 10;
            updateData.password = await bcrypt.hash(password, saltRounds);
        }

        const updatedAdmin = await prisma.user.update({
            where: { id: adminId },
            data: updateData,
            include: {
                location: true,
            }
        });

        res.status(200).json({
            status: "success",
            message: "Data admin berhasil diperbarui.",
            data: {
                id: updatedAdmin.id,
                name: updatedAdmin.name,
                username: updatedAdmin.username,
                email: updatedAdmin.email,
                location: updatedAdmin.location?.name,
                isActive: updatedAdmin.isActive,
            },
        });
    } catch (error) {
        console.error("Error saat update admin:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};

/**
 * Menghapus data Admin
 * Hanya untuk SUPERADMIN
 */
export const deleteAdmin = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;
        const adminId = parseInt(req.params.id, 10);

        if (userRole !== "SUPERADMIN") {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak.",
            });
        }

        if (isNaN(adminId)) {
            return res.status(400).json({ status: "error", message: "ID Admin tidak valid." });
        }

        // Pastikan yang dihapus memang role ADMIN
        const adminToDelete = await prisma.user.findUnique({
            where: { id: adminId }
        });

        if (!adminToDelete || adminToDelete.role !== "ADMIN") {
            return res.status(404).json({
                status: "error",
                message: "Admin tidak ditemukan.",
            });
        }

        await prisma.user.delete({
            where: { id: adminId },
        });

        res.status(200).json({
            status: "success",
            message: "Admin berhasil dihapus.",
        });
    } catch (error) {
        console.error("Error saat hapus admin:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};
