import { Request, Response } from "express";
import prisma from "../lib/prisma";

const OPENING_HOUR = 8; // 08:00 WIB
const CLOSING_HOUR = 18; // 18:00 WIB
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

    // Parsing dateQuery (YYYY-MM-DD)
    // Kita buat objek Date dengan jam 00:00 di Asia/Jakarta
    const [year, month, day] = (dateQuery as string).split('-').map(Number);

    // Buat range pencarian di database (Literal UTC)
    const startDate = new Date(Date.UTC(year, month - 1, day, OPENING_HOUR, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, CLOSING_HOUR, 0, 0, 0));

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

    // Hitung jumlah booking untuk setiap slot waktu
    const bookingCounts = new Map<string, number>();
    for (const booking of bookingsOnDate) {
      const slotTime = booking.bookingDate.toISOString();
      bookingCounts.set(slotTime, (bookingCounts.get(slotTime) || 0) + 1);
    }

    const simplifiedSlots = [];
    let continuousQueueNumber = 1;

    // Loop dari jam 08:00 sampai 18:00
    for (let hour = OPENING_HOUR; hour <= CLOSING_HOUR; hour++) {
      // Slot XX:00 dan XX:30
      const minutes = [0, 30];

      for (const minute of minutes) {
        // Jangan lewatkan jam tutup tepat (biasanya slot terakhir jam 17:30)
        if (hour === CLOSING_HOUR) break;

        const currentSlotISO = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0)).toISOString();

        const bookedCount = bookingCounts.get(currentSlotISO) || 0;

        for (let i = 1; i <= SLOT_LIMIT; i++) {
          simplifiedSlots.push({
            time: currentSlotISO,
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
