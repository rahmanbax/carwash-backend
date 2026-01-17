import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";

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

            // Format menjadi jam:menit (HH:mm)
            const formatTime = (date: Date) => {
                return date.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: "Asia/Jakarta",
                });
            };

            return {
                bookingNumber: booking.bookingNumber,
                vehicle: {
                    plate: booking.vehicle.plate,
                    type: booking.vehicle.type.toLowerCase(),
                },
                customer: {
                    name: booking.user.name,
                    phone: booking.user.phone,
                },
                service: {
                    name: booking.service.name,
                    price: booking.service.price,
                },
                time: {
                    bookingTime: formatTime(bookingTime),
                    estimateFinish: formatTime(estimateFinish),
                },
                status: booking.status,
            };
        });

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil daftar transaksi.",
            data: {
                date: filterDate.toISOString().split("T")[0],
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
