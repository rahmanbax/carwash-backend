import { Request, Response } from "express";
import prisma from "../lib/prisma";

// Ambil konstanta dari controller booking agar konsisten
// INGAT: Ini adalah jam dalam UTC
const OPENING_HOUR_UTC = 8;
const CLOSING_HOUR_UTC = 18;
const SLOT_LIMIT = 3;

export const getSlotAvailability = async (req: Request, res: Response) => {
  try {
    // 1. Ambil dan validasi input tanggal dari query parameter
    const dateQuery = req.query.date as string;
    if (!dateQuery) {
      return res.status(400).json({
        status: "error",
        message: 'Query parameter "date" (format YYYY-MM-DD) wajib diisi.',
      });
    }

    const requestedDate = new Date(dateQuery);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Format tanggal tidak valid. Gunakan YYYY-MM-DD.",
      });
    }

    // 2. Tentukan rentang waktu (mulai dan selesai) dalam UTC untuk query database
    const startOfDayUTC = new Date(dateQuery);
    startOfDayUTC.setUTCHours(OPENING_HOUR_UTC, 0, 0, 0);

    const endOfDayUTC = new Date(dateQuery);
    endOfDayUTC.setUTCHours(CLOSING_HOUR_UTC, 0, 0, 0);

    // 3. Ambil semua booking yang relevan dalam satu query efisien
    const bookingsOnDate = await prisma.booking.findMany({
      where: {
        bookingDate: {
          gte: startOfDayUTC, // gte = greater than or equal to
          lte: endOfDayUTC, // lte = less than or equal to
        },
        NOT: { status: "DIBATALKAN" },
      },
      select: {
        bookingDate: true,
      },
    });

    // 4. Proses data: Hitung jumlah booking untuk setiap slot waktu
    const bookingCounts = new Map<string, number>();
    for (const booking of bookingsOnDate) {
      const slotTime = booking.bookingDate.toISOString();
      bookingCounts.set(slotTime, (bookingCounts.get(slotTime) || 0) + 1);
    }

    // 5. Buat respons akhir dengan semua slot dari jam buka hingga tutup
    const simplifiedSlots = [];
    let currentSlotTime = new Date(startOfDayUTC);

    let continuousQueueNumber = 1;

    while (currentSlotTime <= endOfDayUTC) {
      const slotTimeString = currentSlotTime.toISOString();
      const bookedCount = bookingCounts.get(slotTimeString) || 0;

      // Buat detail antrian seperti sebelumnya
      for (let i = 1; i <= SLOT_LIMIT; i++) {
        simplifiedSlots.push({
          time: slotTimeString,
          queueNumber: continuousQueueNumber,
          status: i <= bookedCount ? "BOOKED" : "AVAILABLE",
        });

        continuousQueueNumber++;
      }

      // Pindah ke slot 30 menit berikutnya
      currentSlotTime.setUTCMinutes(currentSlotTime.getUTCMinutes() + 30);
    }

    // Kirim respons sukses
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data ketersediaan slot.",
      data: simplifiedSlots,
    });
  } catch (error) {
    console.error("Error saat mengambil ketersediaan slot:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};
