import { Request, Response } from "express";
import prisma from "../lib/prisma";

const OPENING_HOUR = 8; // 08:00 WIB
const CLOSING_HOUR = 18; // 18:00 WIB
const SLOT_LIMIT = 3;

const toWIB = (date: Date) => {
  const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wibTime.toISOString().replace("Z", "+07:00");
};

export const getSlotAvailability = async (req: Request, res: Response) => {
  try {
    const { date: dateQuery, locationId: locationIdQuery } = req.query;

    if (!dateQuery || typeof dateQuery !== "string") {
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

    // Range pencarian: 08:00 WIB s/d 18:00 WIB pada tanggal tersebut
    const startDate = new Date(`${dateQuery}T08:00:00.000+07:00`);
    const endDate = new Date(`${dateQuery}T18:00:00.000+07:00`);

    const bookingsOnDate = await prisma.booking.findMany({
      where: {
        locationId: locationId,
        bookingDate: {
          gte: startDate,
          lte: endDate,
        },
        NOT: { status: "DIBATALKAN" },
      },
      select: {
        bookingDate: true,
      },
    });

    // Hitung jumlah booking untuk setiap slot waktu (Key menggunakan ISOString UTC)
    const bookingCounts = new Map<string, number>();
    for (const booking of bookingsOnDate) {
      const slotTime = booking.bookingDate.toISOString();
      bookingCounts.set(slotTime, (bookingCounts.get(slotTime) || 0) + 1);
    }

    const simplifiedSlots = [];
    let continuousQueueNumber = 1;

    // Loop dari jam 08:00 sampai 17:30 (interval 30 menit)
    for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
      for (const minute of [0, 30]) {
        // Buat objek date untuk slot ini dalam WIB
        const slotDate = new Date(`${dateQuery}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000+07:00`);
        const slotISO = slotDate.toISOString(); // Gunakan UTC ISO untuk mapping pencarian data

        const bookedCount = bookingCounts.get(slotISO) || 0;

        for (let i = 1; i <= SLOT_LIMIT; i++) {
          simplifiedSlots.push({
            time: toWIB(slotDate),
            queueNumber: continuousQueueNumber,
            status: i <= bookedCount ? "BOOKED" : "AVAILABLE",
          });
          continuousQueueNumber++;
        }
      }
    }

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data ketersediaan slot di lokasi " + locationId,
      data: simplifiedSlots,
    });
  } catch (error) {
    console.error("Error saat mengambil ketersediaan slot:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
  }
};
