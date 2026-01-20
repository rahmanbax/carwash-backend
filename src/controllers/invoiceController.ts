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
        const colWidths = [85, 105, 115, 105, 85]; // Lebar kolom
        const rowHeight = 28;
        const headerHeight = 30;

        // Atur ketebalan garis seragam
        doc.lineWidth(0.7);

        // Table Header Background
        doc.rect(tableLeft, tableTop, tableWidth, headerHeight).fill('#F5F5F5');

        // Table Header Text
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#333333");
        let xPos = tableLeft + 10;
        const headers = ["TANGGAL", "CUSTOMER", "KENDARAAN", "LAYANAN", "HARGA"];
        headers.forEach((header, i) => {
            const align = i === 4 ? 'right' : 'left';
            const textX = i === 4 ? xPos - 15 : xPos;
            doc.text(header, textX, tableTop + 10, { width: colWidths[i] - 15, align });
            xPos += colWidths[i];
        });

        // Table Rows
        doc.font("Helvetica").fontSize(9).fillColor("#333333");
        let yPos = tableTop + headerHeight;

        bookings.forEach((b, index) => {
            // Alternating row background
            if (index % 2 === 1) {
                doc.rect(tableLeft, yPos, tableWidth, rowHeight).fill('#FAFAFA');
            }

            // Row border bottom (Hanya gambar jika bukan baris terakhir untuk menghindari tumpukan)
            if (index < bookings.length - 1) {
                doc.moveTo(tableLeft, yPos + rowHeight)
                    .lineTo(tableLeft + tableWidth, yPos + rowHeight)
                    .stroke('#CCCCCC');
            }

            // Row data
            doc.fillColor("#333333");
            xPos = tableLeft + 10;
            const toWIB = (date: Date) => new Date(date.getTime() + 7 * 60 * 60 * 1000);
            const rowData = [
                format(toWIB(new Date(b.bookingDate)), "dd/MM/yyyy"),
                b.user ? b.user.name : (b.guestName || "Guest"),
                `${b.vehicle ? b.vehicle.plate : (b.guestPlate || "-")} (${b.vehicle ? b.vehicle.type : (b.guestVehicleType || "-")})`,
                b.service.name,
                `Rp. ${b.totalPrice.toLocaleString("id-ID")}`
            ];

            rowData.forEach((data, i) => {
                const align = i === 4 ? 'right' : 'left';
                const textX = i === 4 ? xPos - 15 : xPos;
                doc.text(data, textX, yPos + 9, { width: colWidths[i] - 15, align });
                xPos += colWidths[i];
            });

            yPos += rowHeight;
        });

        // Table outer border
        doc.rect(tableLeft, tableTop, tableWidth, headerHeight + (bookings.length * rowHeight)).stroke('#CCCCCC');

        // ============== FOOTER SECTION ==============
        const footerY = yPos + 30;
        const labelX = 380;
        const valueX = 480;

        // Upper Divider line
        doc.moveTo(labelX, footerY - 10)
            .lineTo(valueX + 65, footerY - 10)
            .lineWidth(0.5)
            .stroke('#CCCCCC');

        // Subtotal
        doc.font("Helvetica").fontSize(10).fillColor("#777777");
        doc.text("Subtotal:", labelX, footerY, { width: 60 });
        doc.font("Helvetica").fillColor("#777777");
        doc.text(`Rp. ${totalAmount.toLocaleString("id-ID")}`, valueX, footerY, { align: 'right', width: 65 });

        // Divider line
        doc.moveTo(labelX, footerY + 15)
            .lineTo(valueX + 65, footerY + 15)
            .lineWidth(0.5)
            .stroke('#CCCCCC');

        // Total
        doc.font("Helvetica-Bold").fontSize(11).fillColor("black");
        doc.text("Total:", labelX, footerY + 25, { width: 60 });
        doc.text(`Rp. ${totalAmount.toLocaleString("id-ID")}`, valueX, footerY + 25, { align: 'right', width: 65 });

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

        const whereCondition: any = {};
        if (userRole === "ADMIN") {
            whereCondition.adminId = userId;
        }

        const invoices = await prisma.invoice.findMany({
            where: whereCondition,
            include: {
                admin: { select: { name: true } },
                _count: { select: { bookings: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        const formattedInvoices = invoices.map(inv => ({
            ...inv,
            createdAt: toWIB(inv.createdAt)
        }));

        res.status(200).json({
            status: "success",
            message: "Berhasil mengambil riwayat invoice.",
            data: formattedInvoices
        });
    } catch (error) {
        console.error("Error saat mengambil riwayat invoice:", error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server." });
    }
};
