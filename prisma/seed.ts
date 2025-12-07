import * as bcrypt from "bcrypt";
import prisma from '../src/lib/prisma';

async function main() {
  console.log("Seeding dimulai...");

  // --- LANGKAH 1: Hapus semua data lama untuk memastikan kebersihan ---
  // Urutan penghapusan penting: hapus data anak terlebih dahulu
  console.log("Menghapus data lama...");
  await prisma.notification.deleteMany(); // Hapus notifikasi
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.service.deleteMany();
  console.log("Data lama berhasil dihapus.");

  // --- LANGKAH 2: Buat data master (Services) ---
  console.log("Membuat Services...");
  const cuciCepatMobil = await prisma.service.create({
    data: {
      name: "Cuci Cepat Mobil",
      description: "Cuci bodi eksterior dan pengeringan untuk mobil.",
      price: 50000,
    },
  });

  const cuciLengkapMobil = await prisma.service.create({
    data: {
      name: "Cuci Lengkap Interior & Eksterior Mobil",
      description:
        "Cuci eksterior, vakum interior, dan pembersihan dasbor mobil.",
      price: 100000,
    },
  });

  const cuciMotor = await prisma.service.create({
    data: {
      name: "Paket Cuci Motor",
      description: "Cuci bersih seluruh bagian motor.",
      price: 15000,
    },
  });
  console.log("Services telah dibuat.");

  // --- LANGKAH 3: Buat data users ---
  console.log("Membuat Users...");
  const saltRounds = 10;
  const superAdminPassword = await bcrypt.hash("supersecret123", saltRounds);
  const customerPassword = await bcrypt.hash("customer123", saltRounds);

  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@carwash.com",
      username: "superadmin",
      name: "Super Admin",
      password: superAdminPassword,
      role: "SUPERADMIN",
      phone: "081234567890",
    },
  });

  const budi = await prisma.user.create({
    data: {
      email: "budi.customer@example.com",
      username: "budisantoso",
      name: "Budi Santoso",
      password: customerPassword,
      role: "CUSTOMER",
      phone: "081112223333",
    },
  });
  console.log("Users telah dibuat.");

  // --- LANGKAH 4: Buat data vehicles milik Budi ---
  console.log("Membuat Vehicles...");
  const avanza = await prisma.vehicle.create({
    data: {
      plate: "B 1234 ABC",
      type: "MOBIL",
      model: "Toyota Avanza",
      ownerId: budi.id,
    },
  });

  const vario = await prisma.vehicle.create({
    data: {
      plate: "B 1234 SAU",
      type: "MOTOR",
      model: "Honda Vario",
      ownerId: budi.id,
    },
  });
  console.log("Vehicles telah dibuat.");

  // --- LANGKAH 5: Buat skenario booking yang realistis ---
  console.log("Membuat Bookings, Riwayat Status, dan Notifikasi...");

  // ** Skenario 1: Booking yang sudah selesai kemarin **
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const completedBooking = await prisma.booking.create({
    data: {
      bookingNumber: "TC-07122025-01",
      queueNumber: 1,
      bookingDate: yesterday,
      totalPrice: cuciLengkapMobil.price,
      status: "SELESAI",
      paymentStatus: "PAID_CASH",
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciLengkapMobil.id,
    },
  });
  await prisma.bookingStatusHistory.createMany({
    data: [
      {
        bookingId: completedBooking.id,
        status: "BOOKED",
        notes: "Pesanan berhasil dibuat",
        createdAt: new Date(yesterday.setHours(8, 0)),
      },
      {
        bookingId: completedBooking.id,
        status: "DITERIMA",
        notes: "Kendaraan telah diterima petugas",
        createdAt: new Date(yesterday.setHours(8, 5)),
      },
      {
        bookingId: completedBooking.id,
        status: "DICUCI",
        notes: "Kendaraan sedang dalam proses pencucian",
        createdAt: new Date(yesterday.setHours(8, 15)),
      },
      {
        bookingId: completedBooking.id,
        status: "SIAP_DIAMBIL",
        notes: "Kendaraan bisa di ambil",
        createdAt: new Date(yesterday.setHours(9, 0)),
      },
      {
        bookingId: completedBooking.id,
        status: "SELESAI",
        notes: "Kendaraan sudah di ambil",
        createdAt: new Date(yesterday.setHours(9, 10)),
      },
    ],
  });
  // Buat notifikasi untuk booking yang sudah selesai (semua sudah dibaca)
  await prisma.notification.createMany({
    data: [
      {
        title: "Status Berubah",
        message: `No. Booking #${completedBooking.bookingNumber} telah dikonfirmasi.`,
        type: "STATUS_UPDATE",
        userId: budi.id,
        bookingId: completedBooking.id,
        isRead: true,
        createdAt: new Date(yesterday.setHours(8, 5)),
      },
      {
        title: "Status Berubah",
        message: `No. Booking #${completedBooking.bookingNumber} sedang dalam proses pencucian.`,
        type: "STATUS_UPDATE",
        userId: budi.id,
        bookingId: completedBooking.id,
        isRead: true,
        createdAt: new Date(yesterday.setHours(8, 15)),
      },
      {
        title: "Status Berubah",
        message: `No. Booking #${completedBooking.bookingNumber} siap untuk diambil.`,
        type: "STATUS_UPDATE",
        userId: budi.id,
        bookingId: completedBooking.id,
        isRead: true,
        createdAt: new Date(yesterday.setHours(9, 0)),
      },
      {
        title: "Status Berubah",
        message: `No. Booking #${completedBooking.bookingNumber} telah selesai.`,
        type: "STATUS_UPDATE",
        userId: budi.id,
        bookingId: completedBooking.id,
        isRead: true,
        createdAt: new Date(yesterday.setHours(9, 10)),
      },
    ],
  });

  // ** Skenario 2: Booking yang sedang dicuci hari ini **
  const today = new Date();
  const bookingTimeToday = new Date(today.setHours(10, 30)); // Set jadwal jam 10:30
  const inProgressBooking = await prisma.booking.create({
    data: {
      bookingNumber: "TC-08122025-01",
      queueNumber: 1,
      bookingDate: bookingTimeToday,
      totalPrice: cuciMotor.price,
      status: "DICUCI",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: vario.id,
      serviceId: cuciMotor.id,
    },
  });
  await prisma.bookingStatusHistory.createMany({
    data: [
      {
        bookingId: inProgressBooking.id,
        status: "BOOKED",
        notes: "Pesanan berhasil dibuat",
        createdAt: new Date(today.setHours(9, 30)),
      },
      {
        bookingId: inProgressBooking.id,
        status: "DITERIMA",
        notes: "Kendaraan telah diterima petugas",
        createdAt: new Date(today.setHours(9, 35)),
      },
      {
        bookingId: inProgressBooking.id,
        status: "DICUCI",
        notes: "Kendaraan sedang dalam proses pencucian",
        createdAt: new Date(today.setHours(9, 40)),
      },
    ],
  });
  // Buat notifikasi untuk booking yang sedang berjalan (beberapa belum dibaca)
  await prisma.notification.createMany({
    data: [
      // Notifikasi Pengingat (mensimulasikan cron job)
      {
        title: "Pengingat Setor Kendaraan",
        message:
          "Jangan lupa untuk menyetorkan kendaraan anda sebelum pukul 10:30.",
        type: "REMINDER",
        userId: budi.id,
        bookingId: inProgressBooking.id,
        isRead: true,
        createdAt: new Date(today.setHours(9, 0)),
      },
      // Notifikasi Status
      {
        title: "Status Berubah",
        message: `No. Booking #${inProgressBooking.bookingNumber} telah diterima petugas.`,
        type: "STATUS_UPDATE",
        userId: budi.id,
        bookingId: inProgressBooking.id,
        isRead: true,
        createdAt: new Date(today.setHours(9, 35)),
      },
      {
        title: "Status Berubah",
        message: `No. Booking #${inProgressBooking.bookingNumber} sedang dalam proses pencucian.`,
        type: "STATUS_UPDATE",
        userId: budi.id,
        bookingId: inProgressBooking.id,
        isRead: false,
        createdAt: new Date(today.setHours(9, 40)),
      }, // Notifikasi terakhir belum dibaca
    ],
  });

  console.log("Bookings, Riwayat Status, dan Notifikasi telah dibuat.");
  console.log("Seeding selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
