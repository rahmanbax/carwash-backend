import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";
import { VehicleType } from "@prisma/client";

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

        const { date } = req.query;

        // Default ke hari ini jika tidak ada filter date
        const filterDate = date ? new Date(date as string) : new Date();

        // Setup start dan end of day untuk query
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(filterDate);
        endOfDay.setHours(23, 59, 59, 999);

        const whereCondition: any = {
            bookingDate: {
                gte: startOfDay,
                lte: endOfDay,
            }
        };

        if (userRole === "ADMIN") {
            whereCondition.locationId = admin.locationId;
        }

        const bookings = await prisma.booking.findMany({
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
            }
        });

        const formattedTransactions = bookings.map((booking) => {
            const bookingTime = new Date(booking.bookingDate);
            const estimateFinish = new Date(bookingTime.getTime() + 30 * 60000); // +30 menit

            return {
                bookingNumber: booking.bookingNumber,
                vehicle: {
                    plate: booking.vehicle ? booking.vehicle.plate : booking.guestPlate,
                    type: booking.vehicle ? booking.vehicle.type.toLowerCase() : (booking.guestVehicleType?.toLowerCase() || ""),
                },
                customer: {
                    name: booking.user ? booking.user.name : booking.guestName,
                    phone: booking.user ? booking.user.phone : booking.guestPhone,
                },
                service: {
                    name: booking.service.name,
                    price: booking.service.price,
                },
                time: {
                    bookingTime: bookingTime,
                    estimateFinish: estimateFinish,
                },
                status: booking.status,
                bookingMethod: booking.bookingMethod,
            };
        });

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil daftar transaksi.",
            data: {
                date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(filterDate),
                transactions: formattedTransactions,
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

        const { name, phone, plate, vehicleType, serviceId } = req.body;

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

        // 4. Cek apakah nomor telepon sudah terdaftar sebagai user
        const existingUser = await prisma.user.findUnique({
            where: { phone: phone }
        });

        const transactionDate = new Date();

        // 5. Database Transaction untuk Create Booking
        const result = await prisma.$transaction(async (tx) => {
            // Fungsi helper untuk mendapatkan tanggal lokal Jakarta dalam format YYYY-MM-DD
            const getLocalDateStr = (date: Date) => {
                return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
            };

            const bookingDateStr = getLocalDateStr(transactionDate);
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

            // Ambil komponen tanggal lokal untuk nomor booking
            const localeParts = new Intl.DateTimeFormat('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'Asia/Jakarta'
            }).formatToParts(transactionDate);

            const day = localeParts.find(p => p.type === 'day')?.value;
            const month = localeParts.find(p => p.type === 'month')?.value;
            const year = localeParts.find(p => p.type === 'year')?.value;

            const dateString = `${day}${month}${year}`;
            const queueString = String(queueNumber).padStart(3, "0");

            // 1. Buat booking dengan placeholder
            const booking = await tx.booking.create({
                data: {
                    bookingNumber: `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    queueNumber,
                    bookingDate: transactionDate,
                    totalPrice: service.price,
                    status: "BOOKED",
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

        res.status(201).json({
            status: "success",
            message: "Transaksi berhasil dibuat.",
            data: result,
        });

    } catch (error) {
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

        const { startDate, endDate } = req.query;

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

        if (userRole === "ADMIN") {
            whereCondition.locationId = admin.locationId;
        }

        const bookings = await prisma.booking.findMany({
            where: whereCondition,
            include: {
                user: { select: { name: true, phone: true } },
                vehicle: { select: { plate: true, type: true } },
                service: { select: { name: true, price: true } }
            },
            orderBy: {
                bookingDate: "desc",
            }
        });

        const formatLocalDate = (date: Date) => {
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
        };



        const formattedHistory = bookings.map((booking) => ({
            bookingNumber: booking.bookingNumber,
            date: formatLocalDate(booking.bookingDate),
            vehicle: {
                plate: booking.vehicle ? booking.vehicle.plate : booking.guestPlate,
                type: booking.vehicle ? booking.vehicle.type : (booking.guestVehicleType || ""),
            },
            customer: {
                name: booking.user ? booking.user.name : booking.guestName,
                phone: booking.user ? booking.user.phone : booking.guestPhone,
            },
            service: {
                name: booking.service.name,
                price: booking.service.price,
            },
            status: booking.status
        }));

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil riwayat transaksi.",
            data: {
                range: {
                    start: formatLocalDate(startRange),
                    end: formatLocalDate(endRange),
                },
                transactions: formattedHistory,
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
            select: { id: true, locationId: true, bookingNumber: true, userId: true },
        });

        if (!bookingToUpdate) {
            return res.status(404).json({
                status: "error",
                message: "Transaksi tidak ditemukan.",
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
            const booking = await tx.booking.update({
                where: { id: bookingId },
                data: { status },
            });

            await tx.bookingStatusHistory.create({
                data: {
                    bookingId,
                    status,
                    notes: `Status diperbarui menjadi ${status} oleh admin.`,
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
            }
        }

        res.status(200).json({
            status: "success",
            message: `Status transaksi #${updatedBooking.bookingNumber} berhasil diubah menjadi ${status}.`,
            data: updatedBooking,
        });

    } catch (error) {
        console.error("Error saat update status transaksi:", error);
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan pada server.",
        });
    }
};
