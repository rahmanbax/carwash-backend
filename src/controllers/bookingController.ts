import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";
import * as qrcode from "qrcode";
import { BookingStatus } from "@prisma/client";

// Konfigurasi slot dan jam operasional
const SLOT_LIMIT = 3;
const OPENING_HOUR = 8; // 08:00
const CLOSING_HOUR = 18; // 18:00

const toWIB = (date: Date) => {
  const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wibTime.toISOString().replace("Z", "+07:00");
};

export const createBooking = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res
      .status(401)
      .json({ status: "error", message: "User tidak terautentikasi." });
  }

  try {
    const { vehicleId, serviceId, bookingDate, locationId } = req.body;

    if (!vehicleId || !serviceId || !bookingDate || !locationId) {
      return res.status(400).json({
        status: "error",
        message: "vehicleId, serviceId, bookingDate, dan locationId wajib diisi.",
      });
    }

    const bookingDateTime = new Date(bookingDate);
    if (isNaN(bookingDateTime.getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Format tanggal booking tidak valid.",
      });
    }
    if (bookingDateTime < new Date()) {
      return res.status(400).json({
        status: "error",
        message: "Tidak bisa membuat booking di masa lalu.",
      });
    }
    // Validasi jam operasional menggunakan waktu lokal Jakarta (WIB)
    const bookingHour = parseInt(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }).format(bookingDateTime)
    );
    const bookingMinutes = bookingDateTime.getUTCMinutes();

    const isAfterClosing = bookingHour > CLOSING_HOUR || (bookingHour === CLOSING_HOUR && bookingMinutes > 0);

    if (bookingHour < OPENING_HOUR || isAfterClosing) {
      return res.status(400).json({
        status: "error",
        message: `Jam booking harus antara ${OPENING_HOUR}:00 dan ${CLOSING_HOUR}:00 WIB.`,
      });
    }
    if (bookingMinutes !== 0 && bookingMinutes !== 30) {
      return res.status(400).json({
        status: "error",
        message:
          "Slot booking hanya tersedia setiap 30 menit (XX:00 atau XX:30).",
      });
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, ownerId: userId },
    });
    if (!vehicle) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Kendaraan ini bukan milik Anda.",
      });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      return res
        .status(400)
        .json({ status: "error", message: "ID layanan tidak valid." });
    }

    const location = await prisma.location.findFirst({
      where: { id: locationId },
    });
    if (!location || !location.isActive) {
      return res.status(400).json({
        status: "error",
        message: "Lokasi tidak aktif atau tidak ditemukan.",
      });
    }

    // Validasi kesesuaian lokasi layanan
    if (service.locationId !== null && service.locationId !== locationId) {
      return res.status(400).json({
        status: "error",
        message: "Layanan ini tidak tersedia di lokasi yang dipilih.",
      });
    }

    // Validasi kesesuaian jenis kendaraan dengan layanan jika ada batasan
    if (service.vehicleType && service.vehicleType !== vehicle.type) {
      return res.status(400).json({
        status: "error",
        message: `Layanan ini hanya untuk kendaraan tipe ${service.vehicleType}.`,
      });
    }

    // Validasi kesesuaian CC kendaraan dengan layanan jika ada batasan
    if (vehicle.cc !== null && vehicle.cc !== undefined) {
      if (service.minCc !== null && vehicle.cc < service.minCc) {
        return res.status(400).json({
          status: "error",
          message: `Layanan ini khusus untuk kendaraan minimal ${service.minCc} CC.`,
        });
      }
      if (service.maxCc !== null && vehicle.cc > service.maxCc) {
        return res.status(400).json({
          status: "error",
          message: `Layanan ini khusus untuk kendaraan maksimal ${service.maxCc} CC.`,
        });
      }
    }

    // Pengecekan apakah user sudah memiliki booking aktif di waktu yang sama
    const existingUserBooking = await prisma.booking.findFirst({
      where: {
        userId: userId,
        bookingDate: bookingDateTime,
        NOT: { status: "DIBATALKAN" },
      },
    });

    if (existingUserBooking) {
      return res.status(409).json({
        status: "error",
        message: "Anda sudah memiliki pesanan aktif pada jam ini.",
      });
    }

    const totalPrice = service.price;

    const createdBooking = await prisma.$transaction(async (tx) => {
      // Cek ketersediaan slot (Spesifik per lokasi)
      const existingBookingsCountInSlot = await tx.booking.count({
        where: {
          locationId: locationId,
          bookingDate: bookingDateTime,
          NOT: { status: "DIBATALKAN" },
        },
      });

      if (existingBookingsCountInSlot >= SLOT_LIMIT) {
        throw new Error("SLOT_FULL");
      }

      // Buat nomor booking dan nomor antrian
      // Fungsi helper untuk mendapatkan tanggal lokal Jakarta dalam format YYYY-MM-DD
      const getLocalDateStr = (date: Date) => {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
      };

      const bookingDateStr = getLocalDateStr(bookingDateTime);
      const startOfDay = new Date(`${bookingDateStr}T00:00:00.000+07:00`);
      const endOfDay = new Date(`${bookingDateStr}T23:59:59.999+07:00`);

      const bookingsTodayCount = await tx.booking.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const queueNumber = bookingsTodayCount + 1;

      // 1. Buat booking baru dengan placeholder untuk bookingNumber
      const booking = await tx.booking.create({
        data: {
          bookingNumber: `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          queueNumber,
          bookingDate: bookingDateTime,
          totalPrice,
          user: { connect: { id: userId } },
          vehicle: { connect: { id: vehicleId } },
          service: { connect: { id: serviceId } },
          location: { connect: { id: locationId } },
          bookingMethod: "APP",
        },
      });

      // 2. Generate bookingNumber final menggunakan ID dari database
      const finalBookingNumber = `TNX${String(booking.id).padStart(3, "0")}`;

      // 3. Update booking dengan nomor final
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { bookingNumber: finalBookingNumber }
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: updatedBooking.id,
          status: "BOOKED",
          notes: "Pesanan berhasil dibuat",
          createdAt: new Date(),
        },
      });

      return updatedBooking;
    });

    const bookingDetails = await prisma.booking.findUnique({
      where: {
        id: createdBooking.id,
      },
      include: {
        vehicle: true, // Sertakan data kendaraan
        service: true, // Sertakan data layanan
      },
    });

    if (!bookingDetails) {
      return res.status(404).json({
        status: "error",
        message: "Gagal mengambil detail booking setelah dibuat.",
      });
    }

    const qrCodeDataURL = await qrcode.toDataURL(bookingDetails.bookingNumber);

    const responseData = {
      nomorBooking: bookingDetails.bookingNumber,
      tanggalWaktu: toWIB(bookingDetails.bookingDate),
      nomorAntrian: bookingDetails.queueNumber,
      kendaraan: {
        platNomor: bookingDetails.vehicle!.plate,
        jenisKendaraan: bookingDetails.vehicle!.type,
        model: bookingDetails.vehicle!.model,
      },
      layanan: {
        namaPaket: bookingDetails.service.name,
        deskripsi: bookingDetails.service.description,
      },
      totalPembayaran: bookingDetails.totalPrice,
      qrCode: qrCodeDataURL,
    };

    res.status(201).json({
      status: "success",
      message: "Booking berhasil dibuat!",
      data: responseData,
    });
  } catch (error) {
    // Penanganan Error
    if (error instanceof Error && error.message === "SLOT_FULL") {
      return res.status(409).json({
        status: "error",
        message: "Maaf, slot waktu ini sudah penuh. Silakan pilih waktu lain.",
      });
    }

    console.error("Error saat membuat booking:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res
      .status(401)
      .json({ status: "error", message: "User tidak terautentikasi." });
  }

  try {
    const { page = "1", limit = "10", status, search } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const whereCondition: any = {
      userId: userId,
    };

    if (status) {
      whereCondition.status = status;
    }

    if (search) {
      whereCondition.OR = [
        { bookingNumber: { contains: search as string, mode: "insensitive" } },
        { vehicle: { plate: { contains: search as string, mode: "insensitive" } } },
        { service: { name: { contains: search as string, mode: "insensitive" } } },
      ];
    }

    // Ambil booking milik user yang sedang login dengan pagination
    const [bookings, totalCount] = await Promise.all([
      prisma.booking.findMany({
        where: whereCondition,
        include: {
          vehicle: true,
          service: true,
        },
        orderBy: {
          bookingDate: "desc",
        },
        skip,
        take: limitNum,
      }),
      prisma.booking.count({ where: whereCondition }),
    ]);

    const formattedBookings = bookings.map((booking) => {
      return {
        id: booking.id, // Selalu baik untuk menyertakan ID
        status: booking.status, // Frontend butuh ini untuk menampilkan status
        nomorBooking: booking.bookingNumber,
        tanggalWaktu: toWIB(booking.bookingDate),
        nomorAntrian: booking.queueNumber,
        kendaraan: {
          platNomor: booking.vehicle ? booking.vehicle.plate : booking.guestPlate,
          jenisKendaraan: booking.vehicle ? booking.vehicle.type : booking.guestVehicleType,
          model: booking.vehicle ? booking.vehicle.model : "Guest Vehicle",
        },
        layanan: {
          namaPaket: booking.service.name,
          deskripsi: booking.service.description,
        },
        totalPembayaran: booking.totalPrice,
      };
    });

    // Kirim respons sukses dengan daftar booking dan pagination
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil riwayat booking.",
      data: formattedBookings,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalItems: totalCount,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Error saat mengambil riwayat booking:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

export const getBookingById = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const bookingId = parseInt(req.params.id, 10);

  // 1. Validasi Input
  if (!userId) {
    return res
      .status(401)
      .json({ status: "error", message: "User tidak terautentikasi." });
  }
  if (isNaN(bookingId)) {
    return res
      .status(400)
      .json({ status: "error", message: "ID Booking tidak valid." });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
        userId: userId, // Kunci Otorisasi
      },
      include: {
        vehicle: true,
        service: true,
      },
    });

    // Jika booking tidak ditemukan (atau bukan milik user ini), kirim 404
    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking tidak ditemukan atau Anda tidak memiliki hak akses.",
      });
    }

    const qrCodeDataURL = await qrcode.toDataURL(booking.bookingNumber);

    const responseData = {
      id: booking.id,
      status: booking.status,
      nomorBooking: booking.bookingNumber,
      tanggalWaktu: toWIB(booking.bookingDate),
      nomorAntrian: booking.queueNumber,
      kendaraan: {
        platNomor: booking.vehicle ? booking.vehicle.plate : booking.guestPlate,
        jenisKendaraan: booking.vehicle ? booking.vehicle.type : booking.guestVehicleType,
        model: booking.vehicle ? booking.vehicle.model : "Guest Vehicle",
      },
      layanan: {
        namaPaket: booking.service.name,
        deskripsi: booking.service.description,
      },
      totalPembayaran: booking.totalPrice,
      qrCode: qrCodeDataURL,
    };

    // Kirim respons sukses
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil detail booking.",
      data: responseData,
    });
  } catch (error) {
    console.error("Error saat mengambil detail booking:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};

export const getBookingTimeline = async (req: Request, res: Response) => {
  const bookingId = parseInt(req.params.id, 10);

  // 1. Validasi Input
  if (isNaN(bookingId)) {
    return res
      .status(400)
      .json({ status: "error", message: "ID Booking tidak valid." });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        bookingNumber: true,
        guestPlate: true,
        vehicle: {
          select: {
            plate: true,
            model: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    // Jika booking tidak ada atau bukan milik user, tolak akses.
    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking tidak ditemukan.",
      });
    }

    // Ambil semua riwayat status untuk booking ID
    const statusHistory = await prisma.bookingStatusHistory.findMany({
      where: {
        bookingId: bookingId,
      },
      // Urutkan dari yang paling lama ke yang paling baru untuk timeline yang benar
      orderBy: {
        createdAt: "asc",
      },
    });

    const formattedTimeline = statusHistory.map((history) => ({
      status: history.status,
      waktu: toWIB(history.createdAt),
      catatan: history.notes,
    }));

    const responseData = {
      nomorBooking: booking.bookingNumber,
      namaKendaraan: booking.vehicle ? booking.vehicle.model : "Guest Vehicle",
      platNomor: booking.vehicle ? booking.vehicle.plate : (booking.guestPlate || ""),
      layanan: booking.service.name,
      timeline: formattedTimeline,
    };

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil riwayat status booking.",
      data: responseData,
    });
  } catch (error) {
    console.error("Error saat mengambil timeline booking:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};
