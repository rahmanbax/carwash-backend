import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";
import { VehicleType, Prisma } from "@prisma/client";

/**
 * Mendapatkan daftar semua paket layanan dengan opsi filter
 */
export const getAllServices = async (req: Request, res: Response) => {
  try {
    const { type, locationId, cc, vehicleId } = req.query;

    let filterType = type as string | undefined;
    let filterCc: number | undefined = undefined;

    // Jika user menyertakan vehicleId, ambil data type dan cc dari kendaraan tersebut
    if (vehicleId) {
      const parsedVehicleId = parseInt(vehicleId as string, 10);
      if (isNaN(parsedVehicleId)) {
        return res.status(400).json({
          status: "error",
          message: "Parameter 'vehicleId' tidak valid.",
        });
      }

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: parsedVehicleId, isDeleted: false },
      });

      if (!vehicle) {
        return res.status(404).json({
          status: "error",
          message: "Kendaraan tidak ditemukan.",
        });
      }

      filterType = vehicle.type;
      filterCc = vehicle.cc;
    }

    // Validasi query parameter type jika diisi manual
    if (filterType && filterType !== "MOBIL" && filterType !== "MOTOR") {
      return res.status(400).json({
        status: "error",
        message: "Parameter 'type' harus bernilai 'MOBIL' atau 'MOTOR'.",
      });
    }

    // Validasi parameter cc jika diisi manual dan belum di-set oleh vehicleId
    if (filterCc === undefined && cc) {
      const parsedCc = parseInt(cc as string, 10);
      if (isNaN(parsedCc) || parsedCc <= 0) {
        return res.status(400).json({
          status: "error",
          message: "Parameter 'cc' harus berupa angka positif.",
        });
      }
      filterCc = parsedCc;
    }

    // Validasi parameter locationId jika diisi
    let parsedLocationId: number | undefined = undefined;
    if (locationId) {
      parsedLocationId = parseInt(locationId as string, 10);
      if (isNaN(parsedLocationId)) {
        return res.status(400).json({
          status: "error",
          message: "Parameter 'locationId' harus berupa angka.",
        });
      }
    }

    // Susun kondisi WHERE
    const andConditions: Prisma.ServiceWhereInput[] = [
      { isDeleted: false },
    ];

    // 1. Filter Vehicle Type
    if (filterType) {
      andConditions.push({
        OR: [
          { vehicleType: filterType as VehicleType },
          { vehicleType: null },
        ],
      });
    }

    // 2. Filter Location (layanan spesifik lokasi tersebut ATAU layanan global/semua lokasi)
    if (parsedLocationId !== undefined) {
      andConditions.push({
        OR: [
          { locationId: parsedLocationId },
          { locationId: null },
        ],
      });
    }

    // 3. Filter CC Range (minCc <= cc dan maxCc >= cc, atau null jika tanpa batasan)
    if (filterCc !== undefined) {
      andConditions.push({
        AND: [
          {
            OR: [
              { minCc: null },
              { minCc: { lte: filterCc } },
            ],
          },
          {
            OR: [
              { maxCc: null },
              { maxCc: { gte: filterCc } },
            ],
          },
        ],
      });
    }

    const whereClause: Prisma.ServiceWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const services = await prisma.service.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        vehicleType: true,
        minCc: true,
        maxCc: true,
        location: {
          select: {
            id: true,
            name: true,
          },
        },
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

/**
 * Mendapatkan detail layanan berdasarkan ID
 */
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id, 10);

    if (isNaN(serviceId)) {
      return res
        .status(400)
        .json({ status: "error", message: "ID Layanan tidak valid." });
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, isDeleted: false },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        vehicleType: true,
        minCc: true,
        maxCc: true,
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!service) {
      return res
        .status(404)
        .json({ status: "error", message: "Layanan tidak ditemukan." });
    }

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data layanan.",
      data: service,
    });
  } catch (error) {
    console.error("Error saat mengambil data layanan:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

/**
 * Membuat paket layanan baru (Hanya ADMIN dan SUPERADMIN)
 */
export const createService = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || (userRole !== "ADMIN" && userRole !== "SUPERADMIN")) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Hanya ADMIN dan SUPERADMIN yang dapat membuat layanan.",
      });
    }

    const {
      name,
      description,
      minCC,
      minCc,
      maxCC,
      maxCc,
      price,
      vehicleType,
      locationId,
    } = req.body;

    // 1. Validasi Input Wajib
    if (!name || price === undefined || price === null) {
      return res.status(400).json({
        status: "error",
        message: "Nama layanan dan harga wajib diisi.",
      });
    }

    const parsedPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        status: "error",
        message: "Harga layanan harus berupa angka positif.",
      });
    }

    // 2. Validasi Vehicle Type
    if (vehicleType && vehicleType !== "MOBIL" && vehicleType !== "MOTOR") {
      return res.status(400).json({
        status: "error",
        message: "Jenis kendaraan harus 'MOBIL', 'MOTOR', atau null.",
      });
    }

    // 3. Validasi minCC & maxCC (dukung penamaan minCC/minCc & maxCC/maxCc)
    const rawMinCc = minCC !== undefined ? minCC : minCc;
    const rawMaxCc = maxCC !== undefined ? maxCC : maxCc;

    let parsedMinCc: number | null = null;
    if (rawMinCc !== undefined && rawMinCc !== null && rawMinCc !== "") {
      parsedMinCc = parseInt(String(rawMinCc), 10);
      if (isNaN(parsedMinCc) || parsedMinCc < 0) {
        return res.status(400).json({
          status: "error",
          message: "minCC harus berupa angka bulat positif.",
        });
      }
    }

    let parsedMaxCc: number | null = null;
    if (rawMaxCc !== undefined && rawMaxCc !== null && rawMaxCc !== "") {
      parsedMaxCc = parseInt(String(rawMaxCc), 10);
      if (isNaN(parsedMaxCc) || parsedMaxCc < 0) {
        return res.status(400).json({
          status: "error",
          message: "maxCC harus berupa angka bulat positif.",
        });
      }
    }

    if (
      parsedMinCc !== null &&
      parsedMaxCc !== null &&
      parsedMinCc > parsedMaxCc
    ) {
      return res.status(400).json({
        status: "error",
        message: "minCC tidak boleh lebih besar dari maxCC.",
      });
    }

    // 4. Validasi Location ID
    let finalLocationId: number | null = null;
    if (userRole === "ADMIN") {
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { locationId: true },
      });

      if (!admin || !admin.locationId) {
        return res.status(403).json({
          status: "error",
          message: "Admin belum terhubung ke lokasi manapun.",
        });
      }

      // Jika admin mencoba mengisi locationId yang berbeda dari lokasinya
      if (locationId && parseInt(String(locationId), 10) !== admin.locationId) {
        return res.status(403).json({
          status: "error",
          message: "Admin hanya dapat membuat layanan untuk lokasinya sendiri.",
        });
      }

      finalLocationId = admin.locationId;
    } else if (userRole === "SUPERADMIN") {
      if (locationId !== undefined && locationId !== null && locationId !== "") {
        finalLocationId = parseInt(String(locationId), 10);
        if (isNaN(finalLocationId)) {
          return res.status(400).json({
            status: "error",
            message: "locationId harus berupa angka.",
          });
        }

        const locationExists = await prisma.location.findUnique({
          where: { id: finalLocationId },
        });
        if (!locationExists) {
          return res.status(404).json({
            status: "error",
            message: "Lokasi tidak ditemukan.",
          });
        }
      }
    }

    const newService = await prisma.service.create({
      data: {
        name,
        description: description || null,
        price: parsedPrice,
        vehicleType: vehicleType ? (vehicleType as VehicleType) : null,
        minCc: parsedMinCc,
        maxCc: parsedMaxCc,
        locationId: finalLocationId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      status: "success",
      message: "Layanan berhasil dibuat.",
      data: newService,
    });
  } catch (error) {
    console.error("Error saat membuat layanan:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

/**
 * Memperbarui paket layanan (Hanya ADMIN dan SUPERADMIN)
 */
export const updateService = async (req: AuthRequest, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (isNaN(serviceId)) {
      return res
        .status(400)
        .json({ status: "error", message: "ID Layanan tidak valid." });
    }

    if (!userId || (userRole !== "ADMIN" && userRole !== "SUPERADMIN")) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Hanya ADMIN dan SUPERADMIN yang dapat memperbarui layanan.",
      });
    }

    const existingService = await prisma.service.findFirst({
      where: { id: serviceId, isDeleted: false },
    });

    if (!existingService) {
      return res
        .status(404)
        .json({ status: "error", message: "Layanan tidak ditemukan." });
    }

    // Jika ADMIN, pastikan layanan berada di lokasinya
    if (userRole === "ADMIN") {
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { locationId: true },
      });

      if (!admin || admin.locationId !== existingService.locationId) {
        return res.status(403).json({
          status: "error",
          message: "Akses ditolak. Anda hanya dapat mengubah layanan di lokasi Anda.",
        });
      }
    }

    const {
      name,
      description,
      minCC,
      minCc,
      maxCC,
      maxCc,
      price,
      vehicleType,
      locationId,
    } = req.body;

    const updateData: Prisma.ServiceUpdateInput = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;

    if (price !== undefined) {
      const parsedPrice = typeof price === "string" ? parseFloat(price) : price;
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          status: "error",
          message: "Harga layanan harus berupa angka positif.",
        });
      }
      updateData.price = parsedPrice;
    }

    if (vehicleType !== undefined) {
      if (vehicleType && vehicleType !== "MOBIL" && vehicleType !== "MOTOR") {
        return res.status(400).json({
          status: "error",
          message: "Jenis kendaraan harus 'MOBIL', 'MOTOR', atau null.",
        });
      }
      updateData.vehicleType = vehicleType ? (vehicleType as VehicleType) : null;
    }

    const rawMinCc = minCC !== undefined ? minCC : minCc;
    if (rawMinCc !== undefined) {
      if (rawMinCc === null || rawMinCc === "") {
        updateData.minCc = null;
      } else {
        const parsedMinCc = parseInt(String(rawMinCc), 10);
        if (isNaN(parsedMinCc) || parsedMinCc < 0) {
          return res.status(400).json({
            status: "error",
            message: "minCC harus berupa angka bulat positif.",
          });
        }
        updateData.minCc = parsedMinCc;
      }
    }

    const rawMaxCc = maxCC !== undefined ? maxCC : maxCc;
    if (rawMaxCc !== undefined) {
      if (rawMaxCc === null || rawMaxCc === "") {
        updateData.maxCc = null;
      } else {
        const parsedMaxCc = parseInt(String(rawMaxCc), 10);
        if (isNaN(parsedMaxCc) || parsedMaxCc < 0) {
          return res.status(400).json({
            status: "error",
            message: "maxCC harus berupa angka bulat positif.",
          });
        }
        updateData.maxCc = parsedMaxCc;
      }
    }

    // Validasi perbandingan minCc dan maxCc
    const effectiveMinCc =
      updateData.minCc !== undefined
        ? (updateData.minCc as number | null)
        : existingService.minCc;
    const effectiveMaxCc =
      updateData.maxCc !== undefined
        ? (updateData.maxCc as number | null)
        : existingService.maxCc;

    if (
      effectiveMinCc !== null &&
      effectiveMaxCc !== null &&
      effectiveMinCc > effectiveMaxCc
    ) {
      return res.status(400).json({
        status: "error",
        message: "minCC tidak boleh lebih besar dari maxCC.",
      });
    }

    if (userRole === "SUPERADMIN" && locationId !== undefined) {
      if (locationId === null || locationId === "") {
        updateData.location = { disconnect: true };
      } else {
        const parsedLocationId = parseInt(String(locationId), 10);
        if (isNaN(parsedLocationId)) {
          return res.status(400).json({
            status: "error",
            message: "locationId harus berupa angka.",
          });
        }

        const locationExists = await prisma.location.findUnique({
          where: { id: parsedLocationId },
        });
        if (!locationExists) {
          return res.status(404).json({
            status: "error",
            message: "Lokasi tidak ditemukan.",
          });
        }

        updateData.location = { connect: { id: parsedLocationId } };
      }
    }

    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      status: "success",
      message: "Layanan berhasil diperbarui.",
      data: updatedService,
    });
  } catch (error) {
    console.error("Error saat memperbarui layanan:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

/**
 * Menghapus paket layanan (Hanya ADMIN dan SUPERADMIN)
 */
export const deleteService = async (req: AuthRequest, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (isNaN(serviceId)) {
      return res
        .status(400)
        .json({ status: "error", message: "ID Layanan tidak valid." });
    }

    if (!userId || (userRole !== "ADMIN" && userRole !== "SUPERADMIN")) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Hanya ADMIN dan SUPERADMIN yang dapat menghapus layanan.",
      });
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, isDeleted: false },
    });

    if (!service) {
      return res
        .status(404)
        .json({ status: "error", message: "Layanan tidak ditemukan." });
    }

    // Jika ADMIN, pastikan layanan berada di lokasinya
    if (userRole === "ADMIN") {
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { locationId: true },
      });

      if (!admin || admin.locationId !== service.locationId) {
        return res.status(403).json({
          status: "error",
          message: "Akses ditolak. Anda hanya dapat menghapus layanan di lokasi Anda.",
        });
      }
    }

    // Cek apakah layanan sedang digunakan dalam pesanan aktif
    const activeBookingsCount = await prisma.booking.count({
      where: {
        serviceId,
        status: {
          in: ["BOOKED", "DITERIMA", "DICUCI", "SIAP_DIAMBIL"],
        },
      },
    });

    // if (activeBookingsCount > 0) {
    //   return res.status(400).json({
    //     status: "error",
    //     message: "Layanan tidak dapat dihapus karena sedang digunakan dalam pesanan aktif.",
    //   });
    // }

    // Lakukan soft delete
    await prisma.service.update({
      where: { id: serviceId },
      data: { isDeleted: true },
    });

    res.status(200).json({
      status: "success",
      message: "Layanan berhasil dihapus.",
    });
  } catch (error) {
    console.error("Error saat menghapus layanan:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};