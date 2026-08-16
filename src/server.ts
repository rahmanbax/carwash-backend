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
import adminRoutes from './routes/adminRoutes';
import transactionRoutes from './routes/transactionRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import reviewRoutes from './routes/reviewRoutes';

import cron from "node-cron";
import cors from 'cors';

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "";
const allowedOrigins = corsOrigin
  .split(',')
  .map((url) => url.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, ''))
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (seperti mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("TelU Carwash Backend is running!");
});

app.get("/api-docs.json", (req, res) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const specString = JSON.stringify(swaggerSpec).replace(/DYNAMIC_CURRENT_DATE/g, today);
  res.json(JSON.parse(specString));
});

app.use("/api-docs", swaggerUi.serve, (req: any, res: any, next: any) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const specString = JSON.stringify(swaggerSpec).replace(/DYNAMIC_CURRENT_DATE/g, today);
  const dynamicSpec = JSON.parse(specString);
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

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
app.use('/api/admins', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/reviews", reviewRoutes);

app.use("/public", express.static(path.join(__dirname, "../public")));
// app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

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
        userId: { not: null }, // Tambahkan ini: Hanya untuk user yang terdaftar
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
            userId: booking.userId!,
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

// Cron untuk otomatis mengubah status Offline (setiap 5 menit)
cron.schedule("*/5 * * * *", async () => {
  console.log(`Menjalankan cron job untuk pengecekan online user...`);
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);

    const result = await prisma.user.updateMany({
      where: {
        isActive: true,
        lastLogin: {
          lt: fiveMinutesAgo,
        },
      },
      data: {
        isActive: false,
      },
    });

    if (result.count > 0) {
      console.log(`${result.count} pengguna diubah ke Offline.`);
    }
  } catch (error) {
    console.error("Error saat menjalankan cron job pengecekan online user:", error);
  }
});

export default app;
