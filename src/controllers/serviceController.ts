import { Request, Response } from "express";
import prisma from "../lib/prisma";

export const getAllServices = async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
      },
      orderBy: {
        price: 'asc',
      }
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