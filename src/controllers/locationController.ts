import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";

export const getAllLocations = async (req: Request, res: Response) => {
    try {
        const locations = await prisma.location.findMany({
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                latitude: true,
                longitude: true,
                photoUrl: true,
            },
            orderBy: {
                name: 'asc',
            }
        });

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil data lokasi.",
            data: locations,
        });

    } catch (error) {
        console.error("Error saat mengambil data lokasi:", error);
        res
            .status(500)
            .json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};

export const getLocationById = async (req: Request, res: Response) => {
    try {
        const locationId = parseInt(req.params.id, 10);

        if (isNaN(locationId)) {
            return res.status(400).json({ status: "error", message: "ID Lokasi tidak valid." });
        }

        const location = await prisma.location.findUnique({
            where: {
                id: locationId,
            },
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                latitude: true,
                longitude: true,
                photoUrl: true,
            }
        });

        if (!location) {
            return res.status(404).json({ status: "error", message: "Lokasi tidak ditemukan." });
        }

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil data lokasi.",
            data: location,
        });

    } catch (error) {
        console.error("Error saat mengambil data lokasi:", error);
        res
            .status(500)
            .json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};

// --- SUPERADMIN ONLY FUNCTIONS ---

export const getSuperadminLocations = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;

        if (userRole !== "SUPERADMIN") {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak. Hanya SUPERADMIN yang dapat mengakses data ini.",
            });
        }

        const totalLocation = await prisma.location.count();
        const totalAdmin = await prisma.user.count({
            where: { role: 'ADMIN' }
        });

        // Hitung tenant baru bulan ini
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const totalNewTenantsThisMonth = await prisma.location.count({
            where: {
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        const locations = await prisma.location.findMany({
            include: {
                _count: {
                    select: { users: { where: { role: 'ADMIN' } } }
                }
            },
            orderBy: {
                name: 'asc',
            }
        });

        const formattedLocations = locations.map(loc => ({
            id: loc.id,
            name: loc.name,
            address: loc.address,
            phone: loc.phone,
            totalAdmin: loc._count.users
        }));

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil data lokasi untuk superadmin.",
            data: {
                totalLocation,
                totalAdmin,
                totalNewTenantsThisMonth,
                locations: formattedLocations
            },
        });

    } catch (error) {
        console.error("Error saat mengambil data lokasi superadmin:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};

export const createLocation = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;
        if (userRole !== "SUPERADMIN") {
            return res.status(403).json({ status: "error", message: "Akses ditolak." });
        }

        const { name, address, phone, latitude, longitude, photoUrl } = req.body;

        if (!name || !address || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                status: "error",
                message: "Nama, alamat, latitude, dan longitude wajib diisi.",
            });
        }

        const newLocation = await prisma.location.create({
            data: {
                name,
                address,
                phone,
                latitude,
                longitude,
                photoUrl
            }
        });

        res.status(201).json({
            status: "success",
            message: "Lokasi berhasil dibuat.",
            data: newLocation
        });

    } catch (error) {
        console.error("Error saat membuat lokasi:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};

export const updateLocation = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;
        const locationId = parseInt(req.params.id, 10);

        if (userRole !== "SUPERADMIN") {
            return res.status(403).json({ status: "error", message: "Akses ditolak." });
        }

        if (isNaN(locationId)) {
            return res.status(400).json({ status: "error", message: "ID Lokasi tidak valid." });
        }

        const { name, address, phone, latitude, longitude, photoUrl } = req.body;

        const updatedLocation = await prisma.location.update({
            where: { id: locationId },
            data: {
                name,
                address,
                phone,
                latitude,
                longitude,
                photoUrl
            }
        });

        res.status(200).json({
            status: "success",
            message: "Lokasi berhasil diperbarui.",
            data: updatedLocation
        });

    } catch (error) {
        console.error("Error saat update lokasi:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};

export const deleteLocation = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;
        const locationId = parseInt(req.params.id, 10);

        if (userRole !== "SUPERADMIN") {
            return res.status(403).json({ status: "error", message: "Akses ditolak." });
        }

        if (isNaN(locationId)) {
            return res.status(400).json({ status: "error", message: "ID Lokasi tidak valid." });
        }

        await prisma.location.delete({
            where: { id: locationId }
        });

        res.status(200).json({
            status: "success",
            message: "Lokasi berhasil dihapus."
        });

    } catch (error) {
        console.error("Error saat hapus lokasi:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};
