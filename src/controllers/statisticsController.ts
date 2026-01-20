import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";

const formatLocalTime = (date: Date) => {
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const formatLocalDate = (date: Date) => {
    // Menggunakan Date.UTC agar searah dengan slotController (ISO String)
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
};

const getLocalHour = (date: Date) => {
    return date.getUTCHours();
};

export const getSuperadminStatistics = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res.status(401).json({
                status: "error",
                message: "User tidak terautentikasi.",
            });
        }

        if (userRole !== "SUPERADMIN") {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak. Hanya SUPERADMIN yang dapat mengakses statistik.",
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        // 1. Total Tenant dan Admin
        const totalTenants = await prisma.location.count();
        const totalAdmins = await prisma.user.count({
            where: { role: "ADMIN" },
        });

        // 2. Pendapatan 1 Minggu Terakhir
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 6);

        const bookingsLastWeek = await prisma.booking.findMany({
            where: {
                bookingDate: {
                    gte: oneWeekAgo,
                    lte: endOfToday,
                },
                status: "SELESAI",
                paymentStatus: "PAID_CASH",
            },
            select: {
                bookingDate: true,
                totalPrice: true,
            },
        });

        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const revenueByDay: { [key: string]: number } = {};

        for (let i = 0; i < 7; i++) {
            const date = new Date(oneWeekAgo);
            date.setDate(oneWeekAgo.getDate() + i);
            const dayName = dayNames[date.getDay()];
            revenueByDay[dayName] = 0;
        }

        bookingsLastWeek.forEach((booking) => {
            const dayName = dayNames[booking.bookingDate.getDay()];
            revenueByDay[dayName] += booking.totalPrice;
        });

        const weeklyRevenue = {
            range: {
                start: formatLocalDate(oneWeekAgo),
                end: formatLocalDate(today),
            },
            data: Object.entries(revenueByDay).map(([day, revenue]) => ({
                day,
                revenue,
            })),
        };

        // 3. Statistik Pencucian Hari Ini (per 2 jam)
        const bookingsTodayChart = await prisma.booking.findMany({
            where: {
                bookingDate: {
                    gte: today,
                    lte: endOfToday,
                },
            },
            select: {
                bookingDate: true,
            },
        });

        const timeSlots = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
        const todayWashingStatistics = timeSlots.map((time) => {
            const hour = parseInt(time.split(":")[0]);
            const count = bookingsTodayChart.filter((booking) => {
                const bookingHour = getLocalHour(booking.bookingDate);
                return bookingHour >= hour && bookingHour < hour + 2;
            }).length;

            return { time, value: count };
        });

        // 4. Antrian Kendaraan Hari Ini
        const todayQueueItems = await prisma.booking.findMany({
            where: {
                bookingDate: {
                    gte: today,
                    lte: endOfToday,
                },
                status: {
                    in: ["BOOKED", "DITERIMA", "DICUCI", "SIAP_DIAMBIL"],
                },
            },
            select: {
                bookingNumber: true,
                bookingDate: true,
                status: true,
                guestPlate: true,
                guestVehicleType: true,
                vehicle: {
                    select: {
                        plate: true,
                        type: true,
                    },
                },
            },
            orderBy: {
                bookingDate: "asc",
            },
        });

        const antrianFormatted = todayQueueItems.map((booking) => {
            return {
                bookingNumber: booking.bookingNumber,
                plate: booking.vehicle ? booking.vehicle.plate : booking.guestPlate,
                type: booking.vehicle ? booking.vehicle.type.toLowerCase() : (booking.guestVehicleType?.toLowerCase() || ""),
                queue_time: formatLocalTime(booking.bookingDate),
                status: booking.status,
            };
        });

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil statistik.",
            data: {
                date: formatLocalDate(today),
                totalTenant: totalTenants,
                totalAdmin: totalAdmins,
                weeklyRevenue,
                todayWashingStatistics,
                todayQueue: antrianFormatted,
            },
        });
    } catch (error) {
        console.error("Error saat mengambil statistik:", error);
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan pada server.",
        });
    }
};

export const getAdminStatistics = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res.status(401).json({
                status: "error",
                message: "User tidak terautentikasi.",
            });
        }

        if (userRole !== "ADMIN") {
            return res.status(403).json({
                status: "error",
                message: "Akses ditolak. Hanya ADMIN yang dapat mengakses statistik ini.",
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { locationId: true }
        });

        if (!user || user.locationId === null) {
            return res.status(404).json({
                status: "error",
                message: "Lokasi tidak ditemukan untuk admin ini.",
            });
        }

        const locationId = user.locationId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        // 1. Pendapatan Hari Ini
        const todayBookingsFinished = await prisma.booking.findMany({
            where: {
                locationId,
                bookingDate: {
                    gte: today,
                    lte: endOfToday,
                },
                status: {
                    in: ["SELESAI", "SIAP_DIAMBIL"]
                },
                paymentStatus: "PAID_CASH",
            },
            select: {
                totalPrice: true,
            },
        });

        const todayRevenue = todayBookingsFinished.reduce((sum, b) => sum + b.totalPrice, 0);

        // 2. Total Cuci Hari Ini
        const totalWashedTodayCount = await prisma.booking.count({
            where: {
                locationId,
                bookingDate: {
                    gte: today,
                    lte: endOfToday,
                },
                status: {
                    in: ["SELESAI", "SIAP_DIAMBIL"]
                }
            }
        });

        // 3. Antrian Aktif
        const activeQueueCount = await prisma.booking.count({
            where: {
                locationId,
                bookingDate: {
                    gte: today,
                    lte: endOfToday,
                },
                status: {
                    in: ["BOOKED", "DITERIMA"]
                }
            }
        });

        // 4. Pendapatan 1 Minggu Terakhir
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 6);

        const bookingsLastWeek = await prisma.booking.findMany({
            where: {
                locationId,
                bookingDate: {
                    gte: oneWeekAgo,
                    lte: endOfToday,
                },
                status: {
                    in: ["SELESAI", "SIAP_DIAMBIL"]
                },
                paymentStatus: "PAID_CASH",
            },
            select: {
                bookingDate: true,
                totalPrice: true,
            },
        });

        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const revenueByDay: { [key: string]: number } = {};

        for (let i = 0; i < 7; i++) {
            const date = new Date(oneWeekAgo);
            date.setDate(oneWeekAgo.getDate() + i);
            const dayName = dayNames[date.getDay()];
            revenueByDay[dayName] = 0;
        }

        bookingsLastWeek.forEach((booking) => {
            const dayName = dayNames[booking.bookingDate.getDay()];
            revenueByDay[dayName] += booking.totalPrice;
        });

        const weeklyRevenue = {
            range: {
                start: formatLocalDate(oneWeekAgo),
                end: formatLocalDate(today),
            },
            data: Object.entries(revenueByDay).map(([day, revenue]) => ({
                day,
                revenue,
            })),
        };

        // 5. Statistik Pencucian Hari Ini (per 2 jam)
        const bookingsTodayChart = await prisma.booking.findMany({
            where: {
                locationId,
                bookingDate: {
                    gte: today,
                    lte: endOfToday,
                },
            },
            select: {
                bookingDate: true,
            },
        });

        const timeSlots = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
        const todayWashingStatistics = timeSlots.map((time) => {
            const hour = parseInt(time.split(":")[0]);
            const count = bookingsTodayChart.filter((booking) => {
                const bookingHour = getLocalHour(booking.bookingDate);
                return bookingHour >= hour && bookingHour < hour + 2;
            }).length;

            return { time, value: count };
        });

        // 6. Detail Antrian Hari Ini
        const todayQueueItems = await prisma.booking.findMany({
            where: {
                locationId,
                bookingDate: {
                    gte: today,
                    lte: endOfToday,
                },
                status: {
                    in: ["BOOKED", "DITERIMA"],
                },
            },
            select: {
                bookingNumber: true,
                bookingDate: true,
                status: true,
                guestPlate: true,
                guestVehicleType: true,
                vehicle: {
                    select: {
                        plate: true,
                        type: true,
                    },
                },
            },
            orderBy: {
                bookingDate: "asc",
            },
        });

        const antrianFormatted = todayQueueItems.map((booking) => {
            return {
                bookingNumber: booking.bookingNumber,
                plate: booking.vehicle ? booking.vehicle.plate : booking.guestPlate,
                type: booking.vehicle ? booking.vehicle.type.toLowerCase() : (booking.guestVehicleType?.toLowerCase() || ""),
                queue_time: formatLocalTime(booking.bookingDate),
                status: booking.status,
            };
        });

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil statistik admin.",
            data: {
                date: formatLocalDate(today),
                todayRevenue,
                totalWashedToday: totalWashedTodayCount,
                activeQueue: activeQueueCount,
                weeklyRevenue,
                todayWashingStatistics,
                todayQueue: antrianFormatted,
            },
        });
    } catch (error) {
        console.error("Error saat mengambil statistik admin:", error);
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan pada server.",
        });
    }
};
