import { Request, Response } from "express";
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
