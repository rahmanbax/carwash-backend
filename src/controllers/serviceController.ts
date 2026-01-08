import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { VehicleType } from "@prisma/client";

export const getAllServices = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    // Validasi query parameter type
    if (type && type !== "MOBIL" && type !== "MOTOR") {
      return res.status(400).json({
        status: "error",
        message: "Parameter 'type' harus bernilai 'MOBIL' atau 'MOTOR'.",
      });
    }

    // Build filter berdasarkan vehicleType
    const whereClause = type
      ? {
          OR: [
            { vehicleType: type as VehicleType },
            { vehicleType: null },
          ],
        }
      : {};

    const services = await prisma.service.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        vehicleType: true,
      },
      orderBy: {
        price: "asc",
      },
    });

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data layanan.",
      data: services,
    });
  } catch (error) {
    console.error("Error saat mengambil data layanan:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};