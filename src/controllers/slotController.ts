import { Request, Response } from "express";
import prisma from "../lib/prisma";

const OPENING_HOUR_UTC = 8;
const CLOSING_HOUR_UTC = 18;
const SLOT_LIMIT = 3;

export const getSlotAvailability = async (req: Request, res: Response) => {
  try {
    const { date: dateQuery, locationId: locationIdQuery } = req.query;

    if (!dateQuery) {
      return res.status(400).json({
        status: "error",
        message: 'Query parameter "date" (format YYYY-MM-DD) wajib diisi.',
      });
    }

    if (!locationIdQuery) {
      return res.status(400).json({
        status: "error",
        message: 'Query parameter "locationId" wajib diisi.',
      });
    }

    const locationId = parseInt(locationIdQuery as string, 10);
    if (isNaN(locationId)) {
      return res.status(400).json({
        status: "error",
        message: 'Query parameter "locationId" harus berupa angka.',
      });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(404).json({
        status: "error",
        message: "Lokasi tidak ditemukan.",
      });
    }


    const requestedDate = new Date(dateQuery as string);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Format tanggal tidak valid. Gunakan YYYY-MM-DD.",
      });
    }

    const startOfDayUTC = new Date(requestedDate);
    startOfDayUTC.setUTCHours(OPENING_HOUR_UTC, 0, 0, 0);
    const endOfDayUTC = new Date(requestedDate);
    endOfDayUTC.setUTCHours(CLOSING_HOUR_UTC, 0, 0, 0);

    const bookingsOnDate = await prisma.booking.findMany({
      where: {
        locationId: locationId,
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

    // Hitung jumlah booking untuk setiap slot waktu
    const bookingCounts = new Map<string, number>();
    for (const booking of bookingsOnDate) {
      const slotTime = booking.bookingDate.toISOString();
      bookingCounts.set(slotTime, (bookingCounts.get(slotTime) || 0) + 1);
    }

    // Respons akhir dengan semua slot dari jam buka hingga tutup
    const simplifiedSlots = [];
    let currentSlotTime = new Date(startOfDayUTC);

    let continuousQueueNumber = 1;

    while (currentSlotTime <= endOfDayUTC) {
      const slotTimeString = currentSlotTime.toISOString();
      const bookedCount = bookingCounts.get(slotTimeString) || 0;

      // Detail antrian seperti sebelumnya
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
      message: "Berhasil mengambil data ketersediaan slot di lokasi " + locationId,
      data: simplifiedSlots,
    });
  } catch (error) {
    console.error("Error saat mengambil ketersediaan slot:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};
