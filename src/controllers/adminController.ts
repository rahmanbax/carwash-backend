import { Request, Response } from "express";
import prisma from "../lib/prisma";
import * as bcrypt from "bcrypt";
import { AuthRequest } from "../middleware/authMiddleware";
import { Prisma } from "@prisma/client";

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

        const { page = "1", limit = "10", search, locationId, isActive } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        const whereCondition: Prisma.UserWhereInput = {
            role: "ADMIN",
            isDeleted: false,
        };

        if (search) {
            whereCondition.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { username: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } },
                { phone: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        if (locationId) {
            const parsedLocationId = parseInt(locationId as string, 10);
            if (!isNaN(parsedLocationId)) {
                whereCondition.locationId = parsedLocationId;
            }
        }

        if (isActive !== undefined) {
            whereCondition.isActive = String(isActive).toLowerCase() === "true";
        }

        const totalAdmin = await prisma.user.count({ where: { role: "ADMIN", isDeleted: false } });
        const activeAdmin = await prisma.user.count({ where: { role: "ADMIN", isActive: true, isDeleted: false } });
        const inactiveAdmin = await prisma.user.count({ where: { role: "ADMIN", isActive: false, isDeleted: false } });

        // Hitung admin yang login hari ini (WIB)
        const formatLocalDate = (date: Date) => {
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
        };

        const todayStr = formatLocalDate(new Date());
        const startOfToday = new Date(`${todayStr}T00:00:00.000+07:00`);
        const endOfToday = new Date(`${todayStr}T23:59:59.999+07:00`);

        const loginToday = await prisma.user.count({
            where: {
                role: "ADMIN",
                isDeleted: false,
                lastLogin: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            }
        });

        const [admins, totalFilteredCount] = await Promise.all([
            prisma.user.findMany({
                where: whereCondition,
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
                skip,
                take: limitNum,
            }),
            prisma.user.count({ where: whereCondition }),
        ]);

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
                admins: formattedAdmins,
            },
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(totalFilteredCount / limitNum),
                totalItems: totalFilteredCount,
                itemsPerPage: limitNum,
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

        const { name, username, email, password, phone, locationId } = req.body;

        // Data yang akan di-update
        const updateData: any = {
            name,
            username,
            email,
            phone,
            locationId,
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
                phone: updatedAdmin.phone,
                location: updatedAdmin.location?.name,
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

        // Pastikan yang dihapus memang role ADMIN dan belum dihapus
        const adminToDelete = await prisma.user.findFirst({
            where: { id: adminId, isDeleted: false }
        });

        if (!adminToDelete || adminToDelete.role !== "ADMIN") {
            return res.status(404).json({
                status: "error",
                message: "Admin tidak ditemukan.",
            });
        }

        // Soft Delete: Ubah isDeleted menjadi true dan nonaktifkan status aktifnya
        await prisma.user.update({
            where: { id: adminId },
            data: {
                isDeleted: true,
                isActive: false,
            },
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

/**
 * Mendapatkan detail Admin by ID
 * Hanya untuk SUPERADMIN
 */
export const getAdminById = async (req: AuthRequest, res: Response) => {
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

        const admin = await prisma.user.findFirst({
            where: { id: adminId, isDeleted: false },
            include: {
                location: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
            },
        });

        if (!admin || admin.role !== "ADMIN") {
            return res.status(404).json({
                status: "error",
                message: "Admin tidak ditemukan.",
            });
        }

        const formattedAdmin = {
            id: admin.id,
            name: admin.name,
            username: admin.username,
            phone: admin.phone,
            email: admin.email,
            location: admin.location ? admin.location.name : "Tidak ada lokasi",
            locationId: admin.locationId,
            isActive: admin.isActive,
            lastLogin: admin.lastLogin,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt,
        };

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil data admin.",
            data: formattedAdmin,
        });
    } catch (error) {
        console.error("Error saat mengambil detail admin:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};

/**
 * Memperbarui profil Admin yang sedang login
 * Digunakan oleh ADMIN untuk mengupdate data pribadinya
 */
export const updateAdminProfile = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res
            .status(401)
            .json({ status: "error", message: "User tidak terautentikasi." });
    }

    // Role validation: Only ADMIN and SUPERADMIN can access this function
    const userRole = req.user?.role;
    if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
        return res.status(403).json({
            status: "error",
            message: "Akses ditolak. Anda tidak memiliki izin untuk melakukan operasi ini.",
        });
    }

    try {
        const { username, name, email, phone } = req.body;

        // Buat objek update secara dinamis
        const updateData: Prisma.UserUpdateInput = {};

        if (username) updateData.username = username;
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;

        // Penanganan khusus untuk file foto profil
        if (req.file) {
            const photoUrl = `${req.protocol}://${req.get("host")}/public/uploads/${req.file.filename}`;
            updateData.photoUrl = photoUrl;
        }

        // Cek apakah ada data yang akan di-update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                status: "error",
                message: "Tidak ada data yang dikirim untuk diperbarui.",
            });
        }

        // Lakukan update di database
        const updatedAdmin = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: {
                location: true,
            }
        });

        // Hapus password dari objek respons untuk keamanan
        const { password, ...adminWithoutPassword } = updatedAdmin;

        res.status(200).json({
            status: "success",
            message: "Profil admin berhasil diperbarui.",
            data: {
                id: adminWithoutPassword.id,
                name: adminWithoutPassword.name,
                username: adminWithoutPassword.username,
                email: adminWithoutPassword.email,
                phone: adminWithoutPassword.phone,
                photoUrl: adminWithoutPassword.photoUrl,
                role: adminWithoutPassword.role,
                location: updatedAdmin.location?.name,
                isActive: adminWithoutPassword.isActive,
                createdAt: adminWithoutPassword.createdAt,
                updatedAt: adminWithoutPassword.updatedAt,
            },
        });
    } catch (error) {
        // Menangani error jika username/email/phone sudah ada (unique constraint)
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            const field = (error.meta?.target as string[])[0];
            return res.status(409).json({
                status: "error",
                message: `Data untuk '${field}' sudah digunakan.`,
            });
        }

        console.error("Error saat update profil admin:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};
