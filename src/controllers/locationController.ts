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
                isActive: true,
            },
            where: {
                isActive: true
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
                isActive: true,
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
        const totalActiveLocation = await prisma.location.count({
            where: { isActive: true }
        });
        const totalAdmin = await prisma.user.count({
            where: { role: 'ADMIN' }
        });

        // Hitung tenant baru bulan ini (WIB)
        const now = new Date();
        const year = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", year: "numeric" });
        const month = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", month: "2-digit" });

        const startOfMonth = new Date(`${year}-${month}-01T00:00:00.000+07:00`);
        // End of month: set to day 0 of NEXT month
        const nextMonth = parseInt(month, 10) === 12 ? 1 : parseInt(month, 10) + 1;
        const nextYear = parseInt(month, 10) === 12 ? parseInt(year, 10) + 1 : year;
        const startOfNextMonth = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000+07:00`);

        const totalNewTenantsThisMonth = await prisma.location.count({
            where: {
                createdAt: {
                    gte: startOfMonth,
                    lt: startOfNextMonth
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
            latitude: loc.latitude,
            longitude: loc.longitude,
            isActive: loc.isActive,
            photoUrl: loc.photoUrl,
            totalAdmin: loc._count.users
        }));

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil data lokasi untuk superadmin.",
            data: {
                totalLocation,
                totalActiveLocation,
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

        let { name, address, phone, latitude, longitude, photoUrl } = req.body;

        // Validasi input wajib
        if (!name || !address || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                status: "error",
                message: "Nama, alamat, latitude, dan longitude wajib diisi.",
            });
        }

        // Konversi tipe data jika dikirim via form-data (string)
        const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
        const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

        // Penanganan upload foto
        if (req.file) {
            photoUrl = `${req.protocol}://${req.get("host")}/public/uploads/${req.file.filename}`;
        }

        const newLocation = await prisma.location.create({
            data: {
                name,
                address,
                phone,
                latitude: lat,
                longitude: lng,
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

        const { name, address, phone, latitude, longitude, photoUrl, isActive } = req.body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (phone) updateData.phone = phone;

        // Konversi dan validasi latitude/longitude
        if (latitude !== undefined) {
            updateData.latitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
        }
        if (longitude !== undefined) {
            updateData.longitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
        }

        // Penanganan upload foto baru
        if (req.file) {
            updateData.photoUrl = `${req.protocol}://${req.get("host")}/public/uploads/${req.file.filename}`;
        } else if (photoUrl !== undefined) {
            updateData.photoUrl = photoUrl;
        }

        // Penanganan isActive (mungkin string "true"/"false" dari form-data)
        if (isActive !== undefined) {
            updateData.isActive = isActive === 'true' || isActive === true;
        }

        const updatedLocation = await prisma.location.update({
            where: { id: locationId },
            data: updateData
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

        // Cari lokasi terlebih dahulu untuk mengecek status isActive
        const location = await prisma.location.findUnique({
            where: { id: locationId }
        });

        if (!location) {
            return res.status(404).json({ status: "error", message: "Lokasi tidak ditemukan." });
        }

        if (location.isActive) {
            return res.status(400).json({
                status: "error",
                message: "Lokasi tidak dapat dihapus karena masih aktif. Nonaktifkan terlebih dahulu.",
            });
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
