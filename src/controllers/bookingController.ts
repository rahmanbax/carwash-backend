import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";
import * as qrcode from "qrcode";
import { BookingStatus } from "@prisma/client";

// Konfigurasi slot dan jam operasional
const SLOT_LIMIT = 3;
const OPENING_HOUR_UTC = 8; // 08:00 WIB
const CLOSING_HOUR_UTC = 18; // 18:00 WIB

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
    const bookingHour = bookingDateTime.getUTCHours();
    const bookingMinutes = bookingDateTime.getUTCMinutes();
    if (bookingHour < OPENING_HOUR_UTC || bookingHour >= CLOSING_HOUR_UTC) {
      return res.status(400).json({
        status: "error",
        message: `Jam booking harus antara 08:00 dan 18:00 WIB.`,
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
    const totalPrice = service.price;

    const createdBooking = await prisma.$transaction(async (tx) => {
      // Cek ketersediaan slot
      const existingBookingsCountInSlot = await tx.booking.count({
        where: {
          bookingDate: bookingDateTime,
          NOT: { status: "DIBATALKAN" },
        },
      });

      if (existingBookingsCountInSlot >= SLOT_LIMIT) {
        throw new Error("SLOT_FULL");
      }

      // Buat nomor booking dan nomor antrian
      const startOfDay = new Date(bookingDateTime);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(bookingDateTime);
      endOfDay.setHours(23, 59, 59, 999);

      const bookingsTodayCount = await tx.booking.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const queueNumber = bookingsTodayCount + 1;

      const day = String(bookingDateTime.getDate()).padStart(2, "0");
      const month = String(bookingDateTime.getMonth() + 1).padStart(2, "0");
      const year = bookingDateTime.getFullYear();
      const dateString = `${day}${month}${year}`;
      const queueString = String(queueNumber).padStart(2, "0");
      const bookingNumber = `TC-${dateString}${queueString}`;

      // Buat booking baru di database
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          queueNumber,
          bookingDate: bookingDateTime,
          totalPrice,
          user: { connect: { id: userId } },
          vehicle: { connect: { id: vehicleId } },
          service: { connect: { id: serviceId } },
          location: { connect: { id: locationId } },
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          status: "BOOKED",
          notes: "Pesanan berhasil dibuat", // Deskripsi seperti di gambar Anda
        },
      });

      return booking;
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
      tanggalWaktu: bookingDetails.bookingDate,
      nomorAntrian: bookingDetails.queueNumber,
      kendaraan: {
        platNomor: bookingDetails.vehicle.plate,
        jenisKendaraan: bookingDetails.vehicle.type,
        model: bookingDetails.vehicle.model,
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
    // Ambil SEMUA booking milik user yang sedang login
    const bookings = await prisma.booking.findMany({
      where: {
        userId: userId,
      },
      // Urutkan berdasarkan tanggal booking, yang terbaru di atas
      orderBy: {
        bookingDate: "desc",
      },
      // Sertakan data dari tabel lain yang terhubung
      include: {
        vehicle: true,
        service: true,
      },
    });

    const formattedBookings = bookings.map((booking) => {
      return {
        id: booking.id, // Selalu baik untuk menyertakan ID
        status: booking.status, // Frontend butuh ini untuk menampilkan status
        nomorBooking: booking.bookingNumber,
        tanggalWaktu: booking.bookingDate,
        nomorAntrian: booking.queueNumber,
        kendaraan: {
          platNomor: booking.vehicle.plate,
          jenisKendaraan: booking.vehicle.type,
          model: booking.vehicle.model,
        },
        layanan: {
          namaPaket: booking.service.name,
          deskripsi: booking.service.description,
        },
        totalPembayaran: booking.totalPrice,
      };
    });

    // 3. Kirim respons sukses
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil riwayat booking.",
      data: formattedBookings,
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
      tanggalWaktu: booking.bookingDate,
      nomorAntrian: booking.queueNumber,
      kendaraan: {
        platNomor: booking.vehicle.plate,
        jenisKendaraan: booking.vehicle.type,
        model: booking.vehicle.model,
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

export const getBookingTimeline = async (req: AuthRequest, res: Response) => {
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
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: userId,
      },
      select: {
        bookingNumber: true,
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
        message: "Booking tidak ditemukan atau Anda tidak memiliki hak akses.",
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
      waktu: history.createdAt,
      catatan: history.notes,
    }));

    const responseData = {
      nomorBooking: booking.bookingNumber,
      namaKendaraan: booking.vehicle.model,
      platNomor: booking.vehicle.plate,
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

export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { status, notes } = req.body;

    // Validasi input
    if (!status || !Object.values(BookingStatus).includes(status)) {
      return res
        .status(400)
        .json({ status: "error", message: "Status tidak valid." });
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: status },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: bookingId,
          status: status,
          notes: notes,
        },
      });

      return booking;
    });

    let notificationMessage = `No. Booking #${updatedBooking.bookingNumber} `;
    switch (updatedBooking.status) {
      case "DITERIMA":
        notificationMessage += "telah dikonfirmasi dan diterima oleh petugas.";
        break;
      case "DICUCI":
        notificationMessage += "sedang dalam proses pencucian.";
        break;
      case "SIAP_DIAMBIL":
        notificationMessage += "telah selesai dicuci dan siap untuk diambil.";
        break;
      case "SELESAI":
        notificationMessage += "telah selesai dan sudah diambil.";
        break;
      default:
        notificationMessage = "";
    }

    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          title: "Status Berubah",
          message: notificationMessage,
          type: "STATUS_UPDATE",
          userId: updatedBooking.userId,
          bookingId: updatedBooking.id,
        },
      });
    }

    res.status(200).json({
      status: "success",
      message: `Status booking berhasil diubah menjadi ${status}.`,
      data: updatedBooking,
    });
  } catch (error) {
    // ... (handle error, terutama jika booking tidak ditemukan)
    console.error("Error saat update status booking:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};
