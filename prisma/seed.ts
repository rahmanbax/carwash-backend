import * as bcrypt from "bcrypt";
import prisma from '../src/lib/prisma';

async function main() {
  console.log("Seeding dimulai...");

  console.log("Menghapus data lama...");
  await prisma.notification.deleteMany();
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.service.deleteMany();
  await prisma.location.deleteMany();
  console.log("Data lama berhasil dihapus.");

  // Reset auto-increment sequences
  console.log("Reset auto-increment sequences...");
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Notification_id_seq" RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "BookingStatusHistory_id_seq" RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Booking_id_seq" RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Vehicle_id_seq" RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "User_id_seq" RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Service_id_seq" RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Location_id_seq" RESTART WITH 1');
  console.log("Sequences berhasil di-reset.");

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

  console.log("Membuat Locations...");
  const locationCentral = await prisma.location.create({
    data: {
      name: "Cuci Mobil Central Jakarta",
      address: "Jl. Thamrin No. 45, Jakarta Pusat",
      phone: "021-12345678",
      latitude: -6.1944,
      longitude: 106.8229,
      photoUrl: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800",
    },
  });

  const locationSouth = await prisma.location.create({
    data: {
      name: "Cuci Mobil Pondok Indah",
      address: "Jl. Metro Pondok Indah No. 88, Jakarta Selatan",
      phone: "021-87654321",
      latitude: -6.2615,
      longitude: 106.7837,
      photoUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800",
    },
  });

  const locationWest = await prisma.location.create({
    data: {
      name: "Cuci Mobil Kebon Jeruk",
      address: "Jl. Panjang No. 123, Jakarta Barat",
      phone: "021-55556666",
      latitude: -6.1867,
      longitude: 106.7674,
      photoUrl: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800",
    },
  });
  console.log("Locations telah dibuat.");

  console.log("Membuat Users...");
  const saltRounds = 10;
  const allAdminPassword = await bcrypt.hash("supersecret123", saltRounds);
  const customerPassword = await bcrypt.hash("customer123", saltRounds);

  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@carwash.com",
      username: "superadmin",
      name: "Super Admin",
      password: allAdminPassword,
      role: "SUPERADMIN",
      phone: "081234567890",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@carwash.com",
      username: "admin",
      name: "Admin",
      password: allAdminPassword,
      role: "ADMIN",
      phone: "081234567891",
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

  console.log("Membuat Bookings dengan slot kelipatan 30 menit (08:00-18:00 UTC)...");

  // Helper function untuk membuat booking date di kelipatan 30 menit
  const createBookingDate = (daysOffset: number, hour: number, minute: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setUTCHours(hour, minute, 0, 0);
    return date;
  };

  // Array untuk menyimpan semua booking yang dibuat
  const bookings = [];

  // === BOOKING KEMARIN (SELESAI) ===
  // Booking 1: Kemarin jam 08:00 UTC - SELESAI
  const booking1Date = createBookingDate(-1, 8, 0);
  const booking1 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking1Date).toISOString().slice(0, 10).replace(/-/g, '')}-01`,
      queueNumber: 1,
      bookingDate: booking1Date,
      totalPrice: cuciCepatMobil.price,
      status: "SELESAI",
      paymentStatus: "PAID_CASH",
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciCepatMobil.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking1);

  // Booking 2: Kemarin jam 10:30 UTC - SELESAI
  const booking2Date = createBookingDate(-1, 10, 30);
  const booking2 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking2Date).toISOString().slice(0, 10).replace(/-/g, '')}-02`,
      queueNumber: 2,
      bookingDate: booking2Date,
      totalPrice: cuciLengkapMobil.price,
      status: "SELESAI",
      paymentStatus: "PAID_CASH",
      userId: budi.id,
      vehicleId: vario.id,
      serviceId: cuciLengkapMobil.id,
      locationId: locationSouth.id,
    },
  });
  bookings.push(booking2);

  // Booking 3: Kemarin jam 14:00 UTC - SELESAI
  const booking3Date = createBookingDate(-1, 14, 0);
  const booking3 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking3Date).toISOString().slice(0, 10).replace(/-/g, '')}-03`,
      queueNumber: 1,
      bookingDate: booking3Date,
      totalPrice: cuciMotor.price,
      status: "SELESAI",
      paymentStatus: "PAID_CASH",
      userId: budi.id,
      vehicleId: vario.id,
      serviceId: cuciMotor.id,
      locationId: locationWest.id,
    },
  });
  bookings.push(booking3);

  // === BOOKING HARI INI ===
  // Booking 4: Hari ini jam 08:30 UTC - SELESAI
  const booking4Date = createBookingDate(0, 8, 30);
  const booking4 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking4Date).toISOString().slice(0, 10).replace(/-/g, '')}-04`,
      queueNumber: 1,
      bookingDate: booking4Date,
      totalPrice: cuciCepatMobil.price,
      status: "SELESAI",
      paymentStatus: "PAID_CASH",
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciCepatMobil.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking4);

  // Booking 5: Hari ini jam 11:00 UTC - SIAP_DIAMBIL
  const booking5Date = createBookingDate(0, 11, 0);
  const booking5 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking5Date).toISOString().slice(0, 10).replace(/-/g, '')}-05`,
      queueNumber: 2,
      bookingDate: booking5Date,
      totalPrice: cuciLengkapMobil.price,
      status: "SIAP_DIAMBIL",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciLengkapMobil.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking5);

  // Booking 6: Hari ini jam 13:30 UTC - DICUCI
  const booking6Date = createBookingDate(0, 13, 30);
  const booking6 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking6Date).toISOString().slice(0, 10).replace(/-/g, '')}-06`,
      queueNumber: 1,
      bookingDate: booking6Date,
      totalPrice: cuciMotor.price,
      status: "DICUCI",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: vario.id,
      serviceId: cuciMotor.id,
      locationId: locationSouth.id,
    },
  });
  bookings.push(booking6);

  // Booking 7: Hari ini jam 15:00 UTC - DITERIMA
  const booking7Date = createBookingDate(0, 15, 0);
  const booking7 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking7Date).toISOString().slice(0, 10).replace(/-/g, '')}-07`,
      queueNumber: 2,
      bookingDate: booking7Date,
      totalPrice: cuciCepatMobil.price,
      status: "DITERIMA",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciCepatMobil.id,
      locationId: locationSouth.id,
    },
  });
  bookings.push(booking7);

  // Booking 8: Hari ini jam 16:30 UTC - BOOKED
  const booking8Date = createBookingDate(0, 16, 30);
  const booking8 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking8Date).toISOString().slice(0, 10).replace(/-/g, '')}-08`,
      queueNumber: 1,
      bookingDate: booking8Date,
      totalPrice: cuciLengkapMobil.price,
      status: "BOOKED",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciLengkapMobil.id,
      locationId: locationWest.id,
    },
  });
  bookings.push(booking8);

  // === BOOKING BESOK ===
  // Booking 9: Besok jam 09:00 UTC - BOOKED
  const booking9Date = createBookingDate(1, 9, 0);
  const booking9 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking9Date).toISOString().slice(0, 10).replace(/-/g, '')}-09`,
      queueNumber: 1,
      bookingDate: booking9Date,
      totalPrice: cuciCepatMobil.price,
      status: "BOOKED",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciCepatMobil.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking9);

  // Booking 10: Besok jam 12:00 UTC - BOOKED
  const booking10Date = createBookingDate(1, 12, 0);
  const booking10 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking10Date).toISOString().slice(0, 10).replace(/-/g, '')}-10`,
      queueNumber: 2,
      bookingDate: booking10Date,
      totalPrice: cuciMotor.price,
      status: "BOOKED",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: vario.id,
      serviceId: cuciMotor.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking10);

  // Booking 11: Besok jam 17:30 UTC - BOOKED (slot terakhir)
  const booking11Date = createBookingDate(1, 17, 30);
  const booking11 = await prisma.booking.create({
    data: {
      bookingNumber: `TC-${new Date(booking11Date).toISOString().slice(0, 10).replace(/-/g, '')}-11`,
      queueNumber: 3,
      bookingDate: booking11Date,
      totalPrice: cuciLengkapMobil.price,
      status: "BOOKED",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciLengkapMobil.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking11);

  console.log(`${bookings.length} Bookings telah dibuat.`);

  // === MEMBUAT BOOKING STATUS HISTORY ===
  console.log("Membuat Booking Status History...");

  // Helper function untuk membuat timestamp dengan offset menit
  const addMinutes = (date: Date, minutes: number) => {
    return new Date(date.getTime() + minutes * 60000);
  };

  // Booking 1 (Kemarin, SELESAI) - Full progression
  await prisma.bookingStatusHistory.createMany({
    data: [
      { bookingId: booking1.id, status: "BOOKED", notes: "Pesanan berhasil dibuat", createdAt: booking1Date },
      { bookingId: booking1.id, status: "DITERIMA", notes: "Kendaraan telah diterima oleh petugas", createdAt: addMinutes(booking1Date, 15) },
      { bookingId: booking1.id, status: "DICUCI", notes: "Kendaraan sedang dalam proses pencucian", createdAt: addMinutes(booking1Date, 30) },
      { bookingId: booking1.id, status: "SIAP_DIAMBIL", notes: "Kendaraan sudah selesai dicuci dan siap diambil", createdAt: addMinutes(booking1Date, 60) },
      { bookingId: booking1.id, status: "SELESAI", notes: "Kendaraan telah diambil oleh pelanggan", createdAt: addMinutes(booking1Date, 90) },
    ],
  });

  // Booking 2 (Kemarin, SELESAI) - Full progression
  await prisma.bookingStatusHistory.createMany({
    data: [
      { bookingId: booking2.id, status: "BOOKED", notes: "Pesanan berhasil dibuat", createdAt: booking2Date },
      { bookingId: booking2.id, status: "DITERIMA", notes: "Kendaraan telah diterima oleh petugas", createdAt: addMinutes(booking2Date, 10) },
      { bookingId: booking2.id, status: "DICUCI", notes: "Kendaraan sedang dalam proses pencucian", createdAt: addMinutes(booking2Date, 25) },
      { bookingId: booking2.id, status: "SIAP_DIAMBIL", notes: "Kendaraan sudah selesai dicuci dan siap diambil", createdAt: addMinutes(booking2Date, 70) },
      { bookingId: booking2.id, status: "SELESAI", notes: "Kendaraan telah diambil oleh pelanggan", createdAt: addMinutes(booking2Date, 100) },
    ],
  });

  // Booking 3 (Kemarin, SELESAI) - Full progression
  await prisma.bookingStatusHistory.createMany({
    data: [
      { bookingId: booking3.id, status: "BOOKED", notes: "Pesanan berhasil dibuat", createdAt: booking3Date },
      { bookingId: booking3.id, status: "DITERIMA", notes: "Kendaraan telah diterima oleh petugas", createdAt: addMinutes(booking3Date, 5) },
      { bookingId: booking3.id, status: "DICUCI", notes: "Kendaraan sedang dalam proses pencucian", createdAt: addMinutes(booking3Date, 20) },
      { bookingId: booking3.id, status: "SIAP_DIAMBIL", notes: "Kendaraan sudah selesai dicuci dan siap diambil", createdAt: addMinutes(booking3Date, 45) },
      { bookingId: booking3.id, status: "SELESAI", notes: "Kendaraan telah diambil oleh pelanggan", createdAt: addMinutes(booking3Date, 75) },
    ],
  });

  // Booking 4 (Hari ini, SELESAI) - Full progression
  await prisma.bookingStatusHistory.createMany({
    data: [
      { bookingId: booking4.id, status: "BOOKED", notes: "Pesanan berhasil dibuat", createdAt: booking4Date },
      { bookingId: booking4.id, status: "DITERIMA", notes: "Kendaraan telah diterima oleh petugas", createdAt: addMinutes(booking4Date, 12) },
      { bookingId: booking4.id, status: "DICUCI", notes: "Kendaraan sedang dalam proses pencucian", createdAt: addMinutes(booking4Date, 28) },
      { bookingId: booking4.id, status: "SIAP_DIAMBIL", notes: "Kendaraan sudah selesai dicuci dan siap diambil", createdAt: addMinutes(booking4Date, 55) },
      { bookingId: booking4.id, status: "SELESAI", notes: "Kendaraan telah diambil oleh pelanggan", createdAt: addMinutes(booking4Date, 85) },
    ],
  });

  // Booking 5 (Hari ini, SIAP_DIAMBIL) - Sampai siap diambil
  await prisma.bookingStatusHistory.createMany({
    data: [
      { bookingId: booking5.id, status: "BOOKED", notes: "Pesanan berhasil dibuat", createdAt: booking5Date },
      { bookingId: booking5.id, status: "DITERIMA", notes: "Kendaraan telah diterima oleh petugas", createdAt: addMinutes(booking5Date, 10) },
      { bookingId: booking5.id, status: "DICUCI", notes: "Kendaraan sedang dalam proses pencucian", createdAt: addMinutes(booking5Date, 25) },
      { bookingId: booking5.id, status: "SIAP_DIAMBIL", notes: "Kendaraan sudah selesai dicuci dan siap diambil", createdAt: addMinutes(booking5Date, 65) },
    ],
  });

  // Booking 6 (Hari ini, DICUCI) - Sampai dicuci
  await prisma.bookingStatusHistory.createMany({
    data: [
      { bookingId: booking6.id, status: "BOOKED", notes: "Pesanan berhasil dibuat", createdAt: booking6Date },
      { bookingId: booking6.id, status: "DITERIMA", notes: "Kendaraan telah diterima oleh petugas", createdAt: addMinutes(booking6Date, 8) },
      { bookingId: booking6.id, status: "DICUCI", notes: "Kendaraan sedang dalam proses pencucian", createdAt: addMinutes(booking6Date, 22) },
    ],
  });

  // Booking 7 (Hari ini, DITERIMA) - Sampai diterima
  await prisma.bookingStatusHistory.createMany({
    data: [
      { bookingId: booking7.id, status: "BOOKED", notes: "Pesanan berhasil dibuat", createdAt: booking7Date },
      { bookingId: booking7.id, status: "DITERIMA", notes: "Kendaraan telah diterima oleh petugas", createdAt: addMinutes(booking7Date, 15) },
    ],
  });

  // Booking 8 (Hari ini, BOOKED) - Hanya booked
  await prisma.bookingStatusHistory.create({
    data: {
      bookingId: booking8.id,
      status: "BOOKED",
      notes: "Pesanan berhasil dibuat",
      createdAt: booking8Date,
    },
  });

  // Booking 9 (Besok, BOOKED) - Hanya booked
  await prisma.bookingStatusHistory.create({
    data: {
      bookingId: booking9.id,
      status: "BOOKED",
      notes: "Pesanan berhasil dibuat",
      createdAt: booking9Date,
    },
  });

  // Booking 10 (Besok, BOOKED) - Hanya booked
  await prisma.bookingStatusHistory.create({
    data: {
      bookingId: booking10.id,
      status: "BOOKED",
      notes: "Pesanan berhasil dibuat",
      createdAt: booking10Date,
    },
  });

  // Booking 11 (Besok, BOOKED) - Hanya booked
  await prisma.bookingStatusHistory.create({
    data: {
      bookingId: booking11.id,
      status: "BOOKED",
      notes: "Pesanan berhasil dibuat",
      createdAt: booking11Date,
    },
  });

  console.log("Booking Status History telah dibuat.");


  // Buat beberapa notifikasi untuk booking yang aktif
  await prisma.notification.createMany({
    data: [
      {
        title: "Booking Berhasil",
        message: `Booking #${booking5.bookingNumber} siap untuk diambil!`,
        type: "STATUS_UPDATE",
        userId: budi.id,
        bookingId: booking5.id,
        isRead: false,
      },
      {
        title: "Kendaraan Sedang Dicuci",
        message: `Booking #${booking6.bookingNumber} sedang dalam proses pencucian.`,
        type: "STATUS_UPDATE",
        userId: budi.id,
        bookingId: booking6.id,
        isRead: false,
      },
      {
        title: "Pengingat Booking Besok",
        message: `Jangan lupa booking Anda besok jam 09:00. Booking #${booking9.bookingNumber}`,
        type: "REMINDER",
        userId: budi.id,
        bookingId: booking9.id,
        isRead: false,
      },
    ],
  });

  console.log("Notifikasi telah dibuat.");
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
