import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";
import * as qrcode from "qrcode";

// Konstanta untuk konfigurasi bisnis (pastikan ini sesuai dengan setup UTC Anda)
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
    const { vehicleId, serviceId, bookingDate } = req.body;

    // 1. Validasi Input Awal
    if (!vehicleId || !serviceId || !bookingDate) {
      return res.status(400).json({
        status: "error",
        message: "vehicleId, serviceId, dan bookingDate wajib diisi.",
      });
    }

    // 2. Validasi Waktu Booking
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

    // 3. Otorisasi Kendaraan
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, ownerId: userId },
    });
    if (!vehicle) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Kendaraan ini bukan milik Anda.",
      });
    }

    // 4. Kalkulasi Harga
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      return res
        .status(400)
        .json({ status: "error", message: "ID layanan tidak valid." });
    }
    const totalPrice = service.price;

    // 5. Transaksi Database
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
        },
      });

      return booking;
    });

    // 6. Ambil kembali data booking yang lengkap beserta relasinya
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

    // 7. Buat QR Code dari nomor booking
    const qrCodeDataURL = await qrcode.toDataURL(bookingDetails.bookingNumber);

    // 8. Susun objek respons akhir sesuai format yang diinginkan
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

    // 9. Kirim Respons Sukses
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
    // 1. Ambil SEMUA booking milik user yang sedang login
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

    // 2. Format ulang data agar sesuai dengan kebutuhan frontend
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
    // 2. Cari booking spesifik di database
    // Klausa 'where' ini memastikan kita hanya menemukan booking yang ID-nya cocok
    // DAN dimiliki oleh user yang sedang login. Ini adalah kunci keamanannya.
    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
        userId: userId, // <-- Kunci Otorisasi
      },
      include: {
        vehicle: true,
        service: true,
      },
    });

    // 3. Jika booking tidak ditemukan (atau bukan milik user ini), kirim 404
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

    // 5. Kirim respons sukses
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
