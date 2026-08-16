import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Membuat ulasan baru untuk pesanan (Booking) yang telah berstatus SELESAI
 */
export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Tidak terautentikasi.",
      });
    }

    const { bookingId, rating, comment } = req.body;

    // 1. Validasi Input Wajib
    if (!bookingId || rating === undefined || rating === null) {
      return res.status(400).json({
        status: "error",
        message: "bookingId dan rating wajib diisi.",
      });
    }

    const parsedBookingId = parseInt(String(bookingId), 10);
    const parsedRating = parseInt(String(rating), 10);

    if (isNaN(parsedBookingId)) {
      return res.status(400).json({
        status: "error",
        message: "bookingId harus berupa angka.",
      });
    }

    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        status: "error",
        message: "Rating harus berupa angka bulat antara 1 sampai 5.",
      });
    }

    // 2. Cari data booking
    const booking = await prisma.booking.findUnique({
      where: { id: parsedBookingId },
    });

    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Pesanan (booking) tidak ditemukan.",
      });
    }

    // 3. Validasi kepemilikan booking
    if (booking.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Anda hanya dapat memberikan ulasan untuk pesanan Anda sendiri.",
      });
    }

    // 4. Validasi status booking harus SELESAI
    if (booking.status !== "SELESAI") {
      return res.status(400).json({
        status: "error",
        message: "Ulasan hanya dapat diberikan untuk pesanan yang telah selesai (status SELESAI).",
      });
    }

    // 5. Cek apakah sudah pernah diulas
    const existingReview = await prisma.review.findUnique({
      where: { bookingId: parsedBookingId },
    });

    if (existingReview) {
      return res.status(400).json({
        status: "error",
        message: "Anda sudah memberikan ulasan untuk pesanan ini.",
      });
    }

    // 6. Buat Review
    const newReview = await prisma.review.create({
      data: {
        userId,
        bookingId: parsedBookingId,
        serviceId: booking.serviceId,
        locationId: booking.locationId,
        rating: parsedRating,
        comment: comment ? String(comment).trim() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      status: "success",
      message: "Ulasan berhasil dikirim!",
      data: newReview,
    });
  } catch (error) {
    console.error("Error saat membuat review:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server.",
    });
  }
};

/**
 * Mendapatkan daftar ulasan dengan ringkasan rating dan opsi filter
 */
export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const { serviceId, locationId, rating, page = "1", limit = "10" } = req.query;

    const whereClause: Prisma.ReviewWhereInput = {};

    if (serviceId) {
      const parsedServiceId = parseInt(serviceId as string, 10);
      if (!isNaN(parsedServiceId)) {
        whereClause.serviceId = parsedServiceId;
      }
    }

    if (locationId) {
      const parsedLocationId = parseInt(locationId as string, 10);
      if (!isNaN(parsedLocationId)) {
        whereClause.locationId = parsedLocationId;
      }
    }

    if (rating) {
      const parsedRating = parseInt(rating as string, 10);
      if (!isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
        whereClause.rating = parsedRating;
      }
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Ambil data ulasan dengan pagination
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              photoUrl: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limitNum,
      }),
      prisma.review.count({ where: whereClause }),
    ]);

    // Hitung rata-rata rating dan statistik distribusi bintang
    const statsWhereClause: Prisma.ReviewWhereInput = { ...whereClause };
    delete statsWhereClause.rating; // Distribusi bintang dihitung dari konteks service/location tanpa filter bintang tertentu

    const [aggregate, starGroups] = await Promise.all([
      prisma.review.aggregate({
        where: statsWhereClause,
        _avg: { rating: true },
        _count: { id: true },
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: statsWhereClause,
        _count: { rating: true },
      }),
    ]);

    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    starGroups.forEach((g) => {
      distribution[g.rating] = g._count.rating;
    });

    const averageRating = aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(1)) : 0;
    const totalReviews = aggregate._count.id;

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data ulasan.",
      data: {
        reviews,
        summary: {
          averageRating,
          totalReviews,
          distribution,
        },
      },
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalItems: totalCount,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Error saat mengambil data ulasan:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server.",
    });
  }
};

/**
 * Mendapatkan ulasan untuk booking tertentu
 */
export const getReviewByBookingId = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        status: "error",
        message: "bookingId tidak valid.",
      });
    }

    const review = await prisma.review.findUnique({
      where: { bookingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil ulasan pesanan.",
      data: review,
    });
  } catch (error) {
    console.error("Error saat mengambil ulasan booking:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server.",
    });
  }
};

/**
 * Mendapatkan detail ulasan berdasarkan ID
 */
export const getReviewById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "ID ulasan tidak valid.",
      });
    }

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Ulasan tidak ditemukan.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil detail ulasan.",
      data: review,
    });
  } catch (error) {
    console.error("Error saat mengambil detail ulasan:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server.",
    });
  }
};

/**
 * Memperbarui ulasan (Hanya pemilik ulasan)
 */
export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const reviewId = parseInt(req.params.id, 10);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Tidak terautentikasi.",
      });
    }

    if (isNaN(reviewId)) {
      return res.status(400).json({
        status: "error",
        message: "ID ulasan tidak valid.",
      });
    }

    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      return res.status(404).json({
        status: "error",
        message: "Ulasan tidak ditemukan.",
      });
    }

    if (existingReview.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Anda hanya dapat mengubah ulasan Anda sendiri.",
      });
    }

    const { rating, comment } = req.body;
    const updateData: Prisma.ReviewUpdateInput = {};

    if (rating !== undefined) {
      const parsedRating = parseInt(String(rating), 10);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({
          status: "error",
          message: "Rating harus berupa angka bulat antara 1 sampai 5.",
        });
      }
      updateData.rating = parsedRating;
    }

    if (comment !== undefined) {
      updateData.comment = comment ? String(comment).trim() : null;
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      status: "success",
      message: "Ulasan berhasil diperbarui!",
      data: updatedReview,
    });
  } catch (error) {
    console.error("Error saat memperbarui ulasan:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server.",
    });
  }
};

/**
 * Menghapus ulasan (Pemilik ulasan atau SUPERADMIN)
 */
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const reviewId = parseInt(req.params.id, 10);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Tidak terautentikasi.",
      });
    }

    if (isNaN(reviewId)) {
      return res.status(400).json({
        status: "error",
        message: "ID ulasan tidak valid.",
      });
    }

    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      return res.status(404).json({
        status: "error",
        message: "Ulasan tidak ditemukan.",
      });
    }

    if (existingReview.userId !== userId && userRole !== "SUPERADMIN") {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Anda hanya dapat menghapus ulasan Anda sendiri.",
      });
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    res.status(200).json({
      status: "success",
      message: "Ulasan berhasil dihapus.",
    });
  } catch (error) {
    console.error("Error saat menghapus ulasan:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server.",
    });
  }
};
