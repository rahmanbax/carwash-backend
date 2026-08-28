import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";
import PDFDocument from "pdfkit-table";
import { format } from "date-fns";
import path from "path";

const toWIB = (date: Date) => {
    const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return wibTime.toISOString().replace("Z", "+07:00");
};

/**
 * Membuat Invoice baru dari daftar booking yang dipilih
 */
export const createInvoice = async (req: AuthRequest, res: Response) => {
    try {
        const { bookingIds } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ status: "error", message: "User tidak terautentikasi." });
        }

        if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
            return res.status(400).json({ status: "error", message: "Daftar booking dipelukan untuk membuat invoice." });
        }

        // 1. Ambil data admin dan lokasi
        const admin = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, locationId: true, location: true }
        });

        if (!admin || !admin.locationId) {
            return res.status(403).json({ status: "error", message: "Akses ditolak. Lokasi admin tidak ditemukan." });
        }

        // 2. Ambil data booking yang dipilih
        const bookings = await prisma.booking.findMany({
            where: {
                id: { in: bookingIds },
                locationId: admin.locationId,
                status: "SELESAI" // Hanya yang selesai yang bisa di invoice
            },
            include: {
                user: true,
                service: true,
                vehicle: true
            },
            orderBy: { bookingDate: "desc" }
        });

        if (bookings.length === 0) {
            return res.status(404).json({ status: "error", message: "Tidak ada transaksi valid yang ditemukan untuk di-invoice." });
        }

        // 3. Generate Invoice Number & Create Invoice in DB
        const totalAmount = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
        const dateNow = new Date();
        const dateStr = format(dateNow, "yyyyMM");

        // Generate nomor invoice unik
        const invoiceCount = await prisma.invoice.count();
        const invoiceNumber = `INV-${dateStr}-${String(invoiceCount + 1).padStart(4, "0")}`;

        const invoice = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    totalAmount,
                    adminId: userId,
                }
            });

            // Update bookings to link with this invoice
            await tx.booking.updateMany({
                where: { id: { in: bookings.map(b => b.id) } },
                data: { invoiceId: newInvoice.id }
            });

            return newInvoice;
        });

        // 4. Generate PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Stream PDF to Response
        const filename = `Invoice-${invoiceNumber}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Logo (Kotak merah dengan huruf T)
        // Logo dari public/logo.png
        const logoPath = path.join(process.cwd(), "public", "logo.png");
        doc.image(logoPath, 50, 40, { width: 96 });

        // Nama Wash
        // doc.font("Helvetica-Bold").fontSize(16).fillColor("black").text("Car Wash", 90, 42);

        // Alamat dan Telepon
        doc.font("Helvetica").fontSize(9).fillColor("#555555");
        doc.text(admin.location?.address || "Jl. Telekomunikasi No. 1, Bandung", 50, 75);
        doc.text(`Telp: ${admin.location?.phone || "(022) 7564108"}`, 50, 87);

        // Sisi Kanan: Judul Invoice & Info Detail
        doc.font("Helvetica-Bold").fillColor("black").fontSize(20).text("INVOICE", 400, 42, { align: 'right' });
        doc.font("Helvetica").fontSize(9).fillColor("#777777");
        doc.text(`No: ${invoiceNumber}`, 400, 68, { align: 'right' });
        doc.text(`Tanggal: ${format(dateNow, "dd/MM/yyyy")}`, 400, 80, { align: 'right' });

        // ============== TABLE SECTION ==============
        const tableTop = 120;
        const tableLeft = 50;
        const tableWidth = 495; // Total width
        const colWidths = [75, 85, 85, 105, 70, 75]; // Lebar kolom total = 495
        const rowHeight = 32;
        const headerHeight = 28;
        const totalTableHeight = headerHeight + (bookings.length * rowHeight);

        // --- 1. BACKGROUND LAYER ---
        // Header Background
        doc.rect(tableLeft, tableTop, tableWidth, headerHeight).fill('#F3F4F6');

        // Row Backgrounds (Zebra striping)
        bookings.forEach((_, index) => {
            const rowY = tableTop + headerHeight + (index * rowHeight);
            const bgColor = index % 2 === 1 ? '#F9FAFB' : '#FFFFFF';
            doc.rect(tableLeft, rowY, tableWidth, rowHeight).fill(bgColor);
        });

        // --- 2. TEXT LAYER ---
        // Header Text
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#374151");
        let xPos = tableLeft;
        const headers = [
            { label: "TANGGAL", align: "left" },
            { label: "CUSTOMER", align: "left" },
            { label: "KENDARAAN", align: "left" },
            { label: "LAYANAN", align: "left" },
            { label: "PEMBAYARAN", align: "center" },
            { label: "HARGA", align: "right" }
        ];

        headers.forEach((h, i) => {
            const padX = h.align === 'right' ? xPos : (h.align === 'center' ? xPos : xPos + 8);
            const textWidth = h.align === 'right' ? colWidths[i] - 8 : (h.align === 'center' ? colWidths[i] : colWidths[i] - 8);
            doc.text(h.label, padX, tableTop + 9, { width: textWidth, align: h.align as any });
            xPos += colWidths[i];
        });

        // Row Text
        const formatVehicleType = (type?: string | null) => {
            if (!type) return "-";
            return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        };

        bookings.forEach((b, index) => {
            const rowY = tableTop + headerHeight + (index * rowHeight);
            const bookingWIB = new Date(b.bookingDate.getTime() + 7 * 60 * 60 * 1000);
            const dateStr = format(bookingWIB, "dd/MM/yyyy");
            const timeStr = format(bookingWIB, "HH.mm");
            const customerName = b.user ? b.user.name : (b.guestName || "Guest");
            const plateStr = b.vehicle ? b.vehicle.plate : (b.guestPlate || "-");
            const vehicleTypeStr = formatVehicleType(b.vehicle ? b.vehicle.type : b.guestVehicleType);
            const serviceName = b.service.name;
            const paymentMethodStr = b.paymentMethod ? b.paymentMethod.toUpperCase() : "-";
            const priceStr = `Rp ${b.totalPrice.toLocaleString("id-ID")}`;

            let curX = tableLeft;

            // 1. TANGGAL (Date + Time - 2 baris terpusat simetris)
            doc.font("Helvetica").fontSize(8).fillColor("#111827");
            doc.text(dateStr, curX + 8, rowY + 6.5, { width: colWidths[0] - 8 });
            doc.font("Helvetica").fontSize(7).fillColor("#6B7280");
            doc.text(timeStr, curX + 8, rowY + 17, { width: colWidths[0] - 8 });
            curX += colWidths[0];

            // 2. CUSTOMER (1 baris terpusat simetris)
            doc.font("Helvetica").fontSize(8).fillColor("#111827");
            doc.text(customerName, curX + 8, rowY + 11.2, { width: colWidths[1] - 8, lineBreak: false, ellipsis: true });
            curX += colWidths[1];

            // 3. KENDARAAN (Plate + Type - 2 baris terpusat simetris)
            doc.font("Helvetica").fontSize(8).fillColor("#111827");
            doc.text(plateStr, curX + 8, rowY + 6.5, { width: colWidths[2] - 8 });
            doc.font("Helvetica").fontSize(7).fillColor("#6B7280");
            doc.text(vehicleTypeStr, curX + 8, rowY + 17, { width: colWidths[2] - 8 });
            curX += colWidths[2];

            // 4. LAYANAN (Dihitung dinamis agar terpusat simetris baik 1 baris maupun 2 baris)
            doc.font("Helvetica").fontSize(8).fillColor("#111827");
            const serviceTextHeight = doc.heightOfString(serviceName, { width: colWidths[3] - 8 });
            const serviceY = rowY + ((rowHeight - serviceTextHeight) / 2);
            doc.text(serviceName, curX + 8, serviceY, { width: colWidths[3] - 8, height: rowHeight - 8 });
            curX += colWidths[3];

            // 5. PEMBAYARAN (1 baris terpusat simetris)
            doc.font("Helvetica").fontSize(8).fillColor("#111827");
            doc.text(paymentMethodStr, curX, rowY + 11.2, { width: colWidths[4], align: 'center' });
            curX += colWidths[4];

            // 6. HARGA (1 baris terpusat simetris)
            doc.font("Helvetica").fontSize(8).fillColor("#111827");
            doc.text(priceStr, curX, rowY + 11.2, { width: colWidths[5] - 8, align: 'right' });
        });

        // --- 3. BORDER LAYER (Ditarik paling akhir di atas layer background) ---
        doc.lineWidth(0.5);

        // Garis pemisah bawah Header
        doc.moveTo(tableLeft, tableTop + headerHeight)
            .lineTo(tableLeft + tableWidth, tableTop + headerHeight)
            .stroke('#D1D5DB');

        // Garis pemisah antar baris tabel
        for (let i = 1; i < bookings.length; i++) {
            const lineY = tableTop + headerHeight + (i * rowHeight);
            doc.moveTo(tableLeft, lineY)
                .lineTo(tableLeft + tableWidth, lineY)
                .stroke('#D1D5DB');
        }

        // Outer Border (Keliling Tabel)
        doc.rect(tableLeft, tableTop, tableWidth, totalTableHeight).stroke('#D1D5DB');

        // ============== FOOTER SECTION ==============
        const footerY = tableTop + totalTableHeight + 20;
        const labelX = 350;
        const valueX = 425;

        // Total
        doc.font("Helvetica-Bold").fontSize(11).fillColor("black");
        doc.text("Total:", labelX, footerY, { width: 70 });
        doc.text(`Rp ${totalAmount.toLocaleString("id-ID")}`, valueX, footerY, { align: 'right', width: 120 });

        doc.end();

    } catch (error) {
        console.error("Error saat membuat invoice:", error);
        if (!res.headersSent) {
            res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server saat membuat PDF." });
        }
    }
};

/**
 * Mendapatkan daftar riwayat invoice yang pernah dibuat oleh Admin
 */
export const getInvoiceHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId) {
            return res.status(401).json({ status: "error", message: "User tidak terautentikasi." });
        }

        const { page = "1", limit = "10", search } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        const whereCondition: any = {};
        if (userRole === "ADMIN") {
            whereCondition.adminId = userId;
        }

        if (search) {
            whereCondition.invoiceNumber = {
                contains: search as string,
                mode: "insensitive",
            };
        }

        const [invoices, totalCount] = await Promise.all([
            prisma.invoice.findMany({
                where: whereCondition,
                include: {
                    admin: { select: { name: true } },
                    _count: { select: { bookings: true } }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limitNum,
            }),
            prisma.invoice.count({ where: whereCondition }),
        ]);

        const formattedInvoices = invoices.map(inv => ({
            ...inv,
            createdAt: toWIB(inv.createdAt)
        }));

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil riwayat invoice.",
            data: formattedInvoices,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(totalCount / limitNum),
                totalItems: totalCount,
                itemsPerPage: limitNum,
            },
        });
    } catch (error) {
        console.error("Error saat mengambil riwayat invoice:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};
