import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";
import { VehicleType } from "@prisma/client";
import { sendBookingStatusNotification } from "../services/fcmService";

const SLOT_LIMIT = 3;
const OPENING_HOUR = 8; // 08:00 WIB
const CLOSING_HOUR = 18; // 18:00 WIB

/**
 * Mendapatkan daftar transaksi (Booking) untuk Admin
 * Difilter berdasarkan lokasi yang dikelola admin
 */
export const getTransactionList = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res.status(401).json({
                status: "error",
                message: "User tidak terautentikasi.",
            });
        }

        // Ambil data admin untuk mendapatkan locationId
        const admin = await prisma.user.findUnique({
            where: { id: userId },
            select: { locationId: true }
        });

        if (!admin || (userRole === "ADMIN" && admin.locationId === null)) {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak atau lokasi tidak ditemukan.",
            });
        }

        const { date, page = "1", limit = "10" } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        // Mendapatkan tanggal dalam format YYYY-MM-DD di Asia/Jakarta
        const getJakartaDateStr = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);

        const filterDate = date ? new Date(date as string) : new Date();
        const dateStr = getJakartaDateStr(filterDate);

        // Setup start dan end of day eksplisit WIB (akan dikonversi otomatis ke UTC oleh Prisma)
        const startOfDay = new Date(`${dateStr}T00:00:00.000+07:00`);
        const endOfDay = new Date(`${dateStr}T23:59:59.999+07:00`);

        const whereCondition: any = {
            bookingDate: {
                gte: startOfDay,
                lte: endOfDay,
            }
        };

        if (userRole === "ADMIN") {
            whereCondition.locationId = admin.locationId;
        }

        const [bookings, totalCount] = await Promise.all([
            prisma.booking.findMany({
                where: whereCondition,
                include: {
                    user: {
                        select: {
                            name: true,
                            phone: true,
                        }
                    },
                    vehicle: {
                        select: {
                            plate: true,
                            type: true,
                            cc: true,
                        }
                    },
                    service: {
                        select: {
                            name: true,
                            price: true,
                        }
                    }
                },
                orderBy: {
                    bookingDate: "desc",
                },
                skip,
                take: limitNum,
            }),
            prisma.booking.count({ where: whereCondition }),
        ]);

        const toWIB = (date: Date) => {
            const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
            return wibTime.toISOString().replace("Z", "+07:00");
        };

        const formattedTransactions = bookings.map((booking) => {
            const bookingTime = new Date(booking.bookingDate);
            const estimateFinish = new Date(bookingTime.getTime() + 30 * 60000); // +30 menit

            return {
                id: booking.id,
                bookingNumber: booking.bookingNumber,
                vehiclePlate: booking.vehicle ? booking.vehicle.plate : booking.guestPlate,
                vehicleType: booking.vehicle ? booking.vehicle.type.toLowerCase() : (booking.guestVehicleType?.toLowerCase() || ""),
                cc: booking.vehicle ? booking.vehicle.cc : null,
                customerName: booking.guestName || (booking.user ? booking.user.name : "-"),
                customerPhone: booking.guestPhone || (booking.user ? booking.user.phone : "-"),
                serviceName: booking.service.name,
                servicePrice: booking.service.price,
                bookingTime: toWIB(bookingTime),
                estimateFinish: toWIB(estimateFinish),
                status: booking.status,
                bookingMethod: booking.bookingMethod,
                paymentMethod: booking.paymentMethod || null,
            };
        });

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil daftar transaksi.",
            data: {
                date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(filterDate),
                transactions: formattedTransactions,
            },
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(totalCount / limitNum),
                totalItems: totalCount,
                itemsPerPage: limitNum,
            },
        });
    } catch (error) {
        console.error("Error saat mengambil daftar transaksi:", error);
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan pada server.",
        });
    }
};

/**
 * Membuat transaksi baru (Booking) oleh Admin (Walk-in)
 */
export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || userRole !== "ADMIN") {
            return res.status(401).json({
                status: "error",
                message: "Akses ditolak. Hanya ADMIN yang dapat membuat transaksi ini.",
            });
        }

        const { name, phone, plate, vehicleType, serviceId, bookingTime, paymentMethod } = req.body;

        // 1. Validasi Input
        if (!name || !phone || !plate || !vehicleType || !serviceId) {
            return res.status(400).json({
                status: "error",
                message: "Nama, nomor telepon, plat nomor, jenis kendaraan, dan layanan wajib diisi.",
            });
        }

        // 2. Ambil data admin untuk mendapatkan locationId
        const admin = await prisma.user.findUnique({
            where: { id: userId },
            select: { locationId: true }
        });

        if (!admin || admin.locationId === null) {
            return res.status(404).json({
                status: "error",
                message: "Lokasi admin tidak ditemukan.",
            });
        }

        const locationId = admin.locationId;

        // 3. Ambil data layanan
        const service = await prisma.service.findUnique({
            where: { id: serviceId }
        });

        if (!service) {
            return res.status(404).json({
                status: "error",
                message: "Layanan tidak ditemukan.",
            });
        }

        // Validasi kesesuaian lokasi layanan
        if (service.locationId !== null && service.locationId !== locationId) {
            return res.status(400).json({
                status: "error",
                message: "Layanan ini tidak tersedia di lokasi Anda.",
            });
        }

        // Validasi kesesuaian tipe kendaraan
        if (service.vehicleType && service.vehicleType !== vehicleType) {
            return res.status(400).json({
                status: "error",
                message: `Layanan ini hanya untuk kendaraan tipe ${service.vehicleType}.`,
            });
        }

        // 4. Cek apakah nomor telepon sudah terdaftar sebagai user
        const existingUser = await prisma.user.findUnique({
            where: { phone: phone }
        });

        let transactionDate = new Date();
        if (bookingTime) {
            transactionDate = new Date(bookingTime);
            if (isNaN(transactionDate.getTime())) {
                return res.status(400).json({
                    status: "error",
                    message: "Format bookingTime tidak valid.",
                });
            }
        }

        // Helper untuk mendapatkan jam & menit dalam format WIB (UTC+7)
        const getWIBTime = (date: Date) => {
            const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
            return {
                hour: wib.getUTCHours(),
                minute: wib.getUTCMinutes()
            };
        };

        const { hour: hourWIB, minute: minuteWIB } = getWIBTime(transactionDate);

        // Validasi Jam Operasional (08:00 - 18:00 WIB)
        if (hourWIB < OPENING_HOUR || hourWIB >= CLOSING_HOUR) {
            return res.status(400).json({
                status: "error",
                message: `Layanan hanya tersedia pada jam operasional (08:00 - 18:00 WIB). Saat ini: ${String(hourWIB).padStart(2, '0')}:${String(minuteWIB).padStart(2, '0')} WIB.`,
            });
        }

        // Validasi Slot 30 Menit (Hanya jika bookingTime diisi manual)
        if (bookingTime && (minuteWIB !== 0 && minuteWIB !== 30)) {
            return res.status(400).json({
                status: "error",
                message: "Slot booking manual hanya tersedia setiap 30 menit (XX:00 atau XX:30).",
            });
        }

        // 5. Database Transaction untuk Create Booking
        const result = await prisma.$transaction(async (tx) => {
            // Fungsi helper untuk mendapatkan tanggal lokal Jakarta dalam format YYYY-MM-DD
            const getLocalDateStr = (date: Date) => {
                return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
            };

            const bookingDateStr = getLocalDateStr(transactionDate);
            const startOfDay = new Date(`${bookingDateStr}T00:00:00.000+07:00`);
            const endOfDay = new Date(`${bookingDateStr}T23:59:59.999+07:00`);

            // Cek ketersediaan slot (Spesifik per lokasi)
            const existingBookingsCountInSlot = await tx.booking.count({
                where: {
                    locationId: locationId,
                    bookingDate: transactionDate,
                    NOT: { status: "DIBATALKAN" },
                },
            });

            if (existingBookingsCountInSlot >= SLOT_LIMIT) {
                throw new Error("SLOT_FULL");
            }

            const bookingsTodayCount = await tx.booking.count({
                where: {
                    createdAt: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
            });

            const queueNumber = bookingsTodayCount + 1;

            // 1. Buat booking dengan placeholder
            const booking = await tx.booking.create({
                data: {
                    bookingNumber: `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    queueNumber,
                    bookingDate: transactionDate,
                    totalPrice: service.price,
                    status: "BOOKED",
                    paymentMethod: paymentMethod || null,
                    locationId,
                    serviceId,
                    userId: existingUser ? existingUser.id : null,
                    bookingMethod: "MANUAL",
                    // Simpan guest info jika user belum terdaftar atau simpan saja sebagai backup
                    guestName: name,
                    guestPhone: phone,
                    guestPlate: plate,
                    guestVehicleType: vehicleType as VehicleType,
                }
            });

            // 2. Generate bookingNumber final menggunakan ID dari database
            const finalBookingNumber = `TNX${String(booking.id).padStart(3, "0")}`;

            // 3. Update booking dengan nomor final
            const updatedBooking = await tx.booking.update({
                where: { id: booking.id },
                data: { bookingNumber: finalBookingNumber }
            });

            // Buat History
            await tx.bookingStatusHistory.create({
                data: {
                    bookingId: updatedBooking.id,
                    status: "BOOKED",
                    notes: "Transaksi dibuat oleh admin (Walk-in).",
                }
            });

            return updatedBooking;
        });

        const toWIB = (date: Date) => {
            const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
            return wibTime.toISOString().replace("Z", "+07:00");
        };

        res.status(201).json({
            status: "success",
            message: "Transaksi berhasil dibuat.",
            data: {
                ...result,
                bookingDate: toWIB(result.bookingDate),
            },
        });

    } catch (error) {
        if (error instanceof Error && error.message === "SLOT_FULL") {
            return res.status(409).json({
                status: "error",
                message: "Maaf, slot waktu ini sudah penuh. Silakan pilih waktu lain.",
            });
        }

        console.error("Error saat membuat transaksi:", error);
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan pada server.",
        });
    }
};

/**
 * Mendapatkan riwayat transaksi selama 1 bulan (tanggal 1 sampai akhir bulan saat ini)
 */
export const getTransactionHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res.status(401).json({
                status: "error",
                message: "User tidak terautentikasi.",
            });
        }

        const admin = await prisma.user.findUnique({
            where: { id: userId },
            select: { locationId: true }
        });

        if (!admin || (userRole === "ADMIN" && admin.locationId === null)) {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak atau lokasi tidak ditemukan.",
            });
        }

        const { startDate, endDate, search, page = "1", limit = "10" } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        let startRange: Date;
        let endRange: Date;

        if (startDate && endDate) {
            // Jika ada filter range tanggal dari user
            startRange = new Date(`${startDate}T00:00:00.000+07:00`);
            endRange = new Date(`${endDate}T23:59:59.999+07:00`);
        } else {
            // Default: Tanggal 1 sampai akhir bulan ini (WIB)
            const now = new Date();
            const year = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", year: "numeric" });
            const month = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", month: "2-digit" });

            startRange = new Date(`${year}-${month}-01T00:00:00.000+07:00`);

            const nextMonth = parseInt(month, 10) === 12 ? 1 : parseInt(month, 10) + 1;
            const nextYear = parseInt(month, 10) === 12 ? parseInt(year, 10) + 1 : year;
            const startOfNextMonth = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000+07:00`);
            endRange = new Date(startOfNextMonth.getTime() - 1);
        }

        const whereCondition: any = {
            bookingDate: {
                gte: startRange,
                lte: endRange,
            },
            status: "SELESAI"
        };

        if (search) {
            whereCondition.OR = [
                { bookingNumber: { contains: search as string, mode: 'insensitive' } },
                { vehicle: { plate: { contains: search as string, mode: 'insensitive' } } },
                { guestPlate: { contains: search as string, mode: 'insensitive' } }
            ];
        }

        if (userRole === "ADMIN") {
            whereCondition.locationId = admin.locationId;
        }

        const [bookings, totalCount] = await Promise.all([
            prisma.booking.findMany({
                where: whereCondition,
                include: {
                    user: { select: { name: true, phone: true } },
                    vehicle: { select: { plate: true, type: true, cc: true } },
                    service: { select: { name: true, price: true } }
                },
                orderBy: {
                    bookingDate: "desc",
                },
                skip,
                take: limitNum,
            }),
            prisma.booking.count({ where: whereCondition }),
        ]);

        const toWIB = (date: Date) => {
            const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
            return wibTime.toISOString().replace("Z", "+07:00");
        };

        const formattedHistory = bookings.map((booking) => ({
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            date: toWIB(booking.bookingDate),
            vehiclePlate: booking.vehicle ? booking.vehicle.plate : (booking.guestPlate || "-"),
            vehicleType: booking.vehicle ? booking.vehicle.type : (booking.guestVehicleType || ""),
            cc: booking.vehicle ? booking.vehicle.cc : null,
            customerName: booking.guestName || (booking.user ? booking.user.name : "-"),
            customerPhone: booking.guestPhone || (booking.user ? booking.user.phone : "-"),
            serviceName: booking.service.name,
            servicePrice: booking.service.price,
            status: booking.status,
            paymentMethod: booking.paymentMethod || null,
        }));

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil riwayat transaksi.",
            data: {
                range: {
                    start: toWIB(startRange),
                    end: toWIB(endRange),
                },
                transactions: formattedHistory,
            },
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(totalCount / limitNum),
                totalItems: totalCount,
                itemsPerPage: limitNum,
            },
        });
    } catch (error) {
        console.error("Error saat mengambil riwayat transaksi:", error);
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan pada server.",
        });
    }
};


/**
 * Mencari user berdasarkan nomor telepon (Untuk membantu Admin saat Walk-in)
 * Mengembalikan username dan daftar kendaraan yang terdaftar
 */
export const getUserByPhone = async (req: AuthRequest, res: Response) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({
                status: "error",
                message: "Nomor telepon wajib diisi.",
            });
        }

        const user = await prisma.user.findUnique({
            where: { phone: phone as string },
            select: {
                username: true,
                name: true,
                vehicles: {
                    where: { isDeleted: false },
                    select: {
                        id: true,
                        plate: true,
                        type: true,
                        model: true,
                        cc: true,
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                status: "success",
                message: "User tidak ditemukan.",
                data: null
            });
        }

        res.status(200).json({
            status: "success",
            message: "User ditemukan.",
            data: user
        });
    } catch (error) {
        console.error("Error saat mencari user berdasarkan nomor telepon:", error);
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan pada server.",
        });
    }
};

/**
 * Memperbarui status transaksi (Booking)
 */
export const updateTransactionStatus = async (req: AuthRequest, res: Response) => {
    try {
        const bookingId = parseInt(req.params.id, 10);
        const { status } = req.body;
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res.status(401).json({
                status: "error",
                message: "User tidak terautentikasi.",
            });
        }

        // 1. Ambil data booking untuk cek lokasinya
        const bookingToUpdate = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: { id: true, status: true, locationId: true, bookingNumber: true, userId: true },
        });

        if (!bookingToUpdate) {
            return res.status(404).json({
                status: "error",
                message: "Transaksi tidak ditemukan.",
            });
        }

        // Jika transaksi sudah selesai, tidak bisa diubah lagi statusnya
        if (bookingToUpdate.status === "SELESAI") {
            return res.status(400).json({
                status: "error",
                message: "Transaksi sudah selesai dan tidak dapat diubah statusnya lagi.",
            });
        }

        // 2. Cek Otorisasi: Hanya ADMIN yang dapat mengupdate status
        if (userRole !== "ADMIN") {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak. Hanya ADMIN yang dapat mengubah status transaksi.",
            });
        }

        const admin = await prisma.user.findUnique({
            where: { id: userId },
            select: { locationId: true },
        });

        if (!admin || admin.locationId !== bookingToUpdate.locationId) {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak. Anda hanya dapat mengubah status transaksi di lokasi Anda.",
            });
        }

        // 3. Update Status dan Simpan History
        const updatedBooking = await prisma.$transaction(async (tx) => {
            const updateData: any = { status };

            // Jika status diubah menjadi SELESAI, otomatis set paymentStatus menjadi PAID
            if (status === "SELESAI") {
                updateData.paymentStatus = "PAID";
            }

            const booking = await tx.booking.update({
                where: { id: bookingId },
                data: updateData,
            });

            await tx.bookingStatusHistory.create({
                data: {
                    bookingId,
                    status,
                    notes: `Status diperbarui menjadi ${status}.`,
                    createdAt: new Date(), // Explicitly set to application time
                },
            });

            return booking;
        });

        // 4. Kirim Notifikasi jika booking terhubung ke User (Aplikasi)
        if (updatedBooking.userId) {
            let statusMessage = "";
            switch (status) {
                case "DITERIMA": statusMessage = "telah diterima."; break;
                case "DICUCI": statusMessage = "sedang dicuci."; break;
                case "SIAP_DIAMBIL": statusMessage = "siap diambil."; break;
                case "SELESAI": statusMessage = "telah selesai."; break;
                case "DIBATALKAN": statusMessage = "telah dibatalkan."; break;
            }

            if (statusMessage) {
                await prisma.notification.create({
                    data: {
                        userId: updatedBooking.userId,
                        title: "Update Status Booking",
                        message: `No. Booking #${updatedBooking.bookingNumber} ${statusMessage}`,
                        type: "STATUS_UPDATE",
                        bookingId: updatedBooking.id,
                    },
                });

                // Send FCM push notification to user's device
                await sendBookingStatusNotification(
                    updatedBooking.userId,
                    updatedBooking.bookingNumber,
                    status,
                    `No. Booking #${updatedBooking.bookingNumber} ${statusMessage}`
                );
            }
        }

        res.status(200).json({
            status: "success",
            message: `Status transaksi ${updatedBooking.bookingNumber} berhasil diubah menjadi ${status}.`,
            data: {
                id: updatedBooking.id,
                bookingNumber: updatedBooking.bookingNumber,
                status: updatedBooking.status
            }
        });

    } catch (error) {
        console.error("Error saat update status transaksi:", error);
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan pada server.",
        });
    }
};

