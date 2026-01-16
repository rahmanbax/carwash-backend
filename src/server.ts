import express, { Request, Response } from "express";
import path from "path";
import prisma from "./lib/prisma";
import authRoutes from "./routes/authRoutes";
import vehicleRoutes from "./routes/vehicleRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import slotRoutes from "./routes/slotRoutes";
import userRoutes from "./routes/userRoutes";
import serviceRoutes from "./routes/serviceRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import locationRoutes from './routes/locationRoutes';
import statisticsRoutes from './routes/statisticsRoutes';

import cron from "node-cron";
import cors from 'cors';

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("TelU Carwash Backend is running!");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// mobile app routes
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/statistics/', statisticsRoutes);

app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// web dashboard routes


// cron untuk notifikasi pengingat
cron.schedule("*/15 * * * *", async () => {
  console.log("Menjalankan cron job untuk pengingat booking...");

  try {
    const now = new Date();
    const reminderTimeStart = new Date(now.getTime() + 15 * 60000); // 15 menit dari sekarang
    const reminderTimeEnd = new Date(now.getTime() + 30 * 60000); // 30 menit dari sekarang

    // Cari booking yang jadwalnya antara 15-30 menit dari sekarang
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        bookingDate: {
          gte: reminderTimeStart,
          lt: reminderTimeEnd,
        },
        status: "BOOKED", // Hanya untuk yang masih status BOOKED
      },
    });

    for (const booking of upcomingBookings) {
      // Cek apakah notifikasi pengingat sudah pernah dikirim untuk booking ini
      const existingReminder = await prisma.notification.findFirst({
        where: {
          bookingId: booking.id,
          type: "REMINDER",
        },
      });

      // Jika belum ada, buat notifikasi baru
      if (!existingReminder) {
        const bookingTime = booking.bookingDate.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        });

        await prisma.notification.create({
          data: {
            title: "Pengingat Setor Kendaraan",
            message: `Jangan lupa untuk menyetorkan kendaraan anda sebelum pukul ${bookingTime}.`,
            type: "REMINDER",
            userId: booking.userId,
            bookingId: booking.id,
          },
        });
        console.log(
          `Notifikasi pengingat dikirim untuk booking #${booking.bookingNumber}`
        );
      }
    }
  } catch (error) {
    console.error("Error saat menjalankan cron job pengingat:", error);
  }
});

export default app;
