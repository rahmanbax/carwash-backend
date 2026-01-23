import * as bcrypt from "bcrypt";
import prisma from '../src/lib/prisma';

async function main() {
  console.log("Seeding dimulai...");

  console.log("Menghapus data lama...");
  await prisma.notification.deleteMany();
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.invoice.deleteMany();
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
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Invoice_id_seq" RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Vehicle_id_seq" RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "User_id_seq" RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Service_id_seq" RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Location_id_seq" RESTART WITH 1');
  console.log("Sequences berhasil di-reset.");

  // Helper function untuk membuat timestamp dengan offset menit
  const addMinutes = (date: Date, minutes: number) => {
    return new Date(date.getTime() + minutes * 60000);
  };

  console.log("Membuat Services...");
  const cuciCepatMobil = await prisma.service.create({
    data: {
      name: "Cuci Cepat Mobil",
      description: "Cuci bodi eksterior dan pengeringan untuk mobil.",
      price: 50000,
      vehicleType: "MOBIL",
    },
  });

  const cuciLengkapMobil = await prisma.service.create({
    data: {
      name: "Cuci Lengkap Interior & Eksterior Mobil",
      description:
        "Cuci eksterior, vakum interior, dan pembersihan dasbor mobil.",
      price: 100000,
      vehicleType: "MOBIL",
    },
  });

  const cuciMotor = await prisma.service.create({
    data: {
      name: "Paket Cuci Motor",
      description: "Cuci bersih seluruh bagian motor.",
      price: 15000,
      vehicleType: "MOTOR",
    },
  });
  console.log("Services telah dibuat.");

  console.log("Membuat Locations...");
  const locationCentral = await prisma.location.create({
    data: {
      name: "TelU Carwash Bandung",
      address: "Jl. Terusan Buah Batu No.1",
      phone: "-",
      latitude: -6.9696,
      longitude: 107.6290,
      isActive: true,
      photoUrl: "https://images.unsplash.com/photo-1605164599901-f8a1464a2c87?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  });

  // const locationSouth = await prisma.location.create({
  //   data: {
  //     name: "Cuci Mobil Pondok Indah",
  //     address: "Jl. Metro Pondok Indah No. 88, Jakarta Selatan",
  //     phone: "021-87654321",
  //     latitude: -6.2615,
  //     longitude: 106.7837,
  //     photoUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800",
  //   },
  // });

  // const locationWest = await prisma.location.create({
  //   data: {
  //     name: "Cuci Mobil Kebon Jeruk",
  //     address: "Jl. Panjang No. 123, Jakarta Barat",
  //     phone: "021-55556666",
  //     latitude: -6.1867,
  //     longitude: 106.7674,
  //     photoUrl: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800",
  //   },
  // });
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
      photoUrl: "http://localhost:8000/public/tel-u-3d.jpg",
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
      locationId: locationCentral.id,
      photoUrl: "http://localhost:8000/public/tel-u-3d.jpg",
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
      photoUrl: "http://localhost:8000/public/tel-u-3d.jpg",
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

  console.log("Membuat Bookings dengan slot kelipatan 30 menit (08:00-18:00 WIB)...");

  // Helper function untuk membuat booking date dengan jam WIB, disimpan sebagai UTC
  // Input: jam dalam WIB, Output: Date object dalam UTC
  const createBookingDateWIB = (daysOffset: number, hourWIB: number, minuteWIB: number) => {
    // Konversi WIB ke UTC: UTC = WIB - 7 jam
    const utcHour = hourWIB - 7;

    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setUTCHours(utcHour, minuteWIB, 0, 0);
    return date;
  };

  // Array untuk menyimpan semua booking yang dibuat
  const bookings = [];

  // === BOOKING KEMARIN (SELESAI) ===
  // Booking 1: Kemarin jam 08:00 WIB - SELESAI
  const booking1Date = createBookingDateWIB(-1, 8, 0);
  const booking1 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX001",
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

  // Booking 2: Kemarin jam 10:30 WIB - SELESAI
  const booking2Date = createBookingDateWIB(-1, 10, 30);
  const booking2 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX002",
      queueNumber: 2,
      bookingDate: booking2Date,
      totalPrice: cuciLengkapMobil.price,
      status: "SELESAI",
      paymentStatus: "PAID_CASH",
      userId: budi.id,
      vehicleId: vario.id,
      serviceId: cuciLengkapMobil.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking2);

  // Booking 3: Kemarin jam 14:00 WIB - SELESAI
  const booking3Date = createBookingDateWIB(-1, 14, 0);
  const booking3 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX003",
      queueNumber: 1,
      bookingDate: booking3Date,
      totalPrice: cuciMotor.price,
      status: "SELESAI",
      paymentStatus: "PAID_CASH",
      userId: budi.id,
      vehicleId: vario.id,
      serviceId: cuciMotor.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking3);

  // === BOOKING HARI INI ===
  // Booking 4: Hari ini jam 08:30 WIB - SELESAI
  const booking4Date = createBookingDateWIB(0, 8, 30);
  const booking4 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX004",
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

  // Booking 5: Hari ini jam 11:00 WIB - SIAP_DIAMBIL
  const booking5Date = createBookingDateWIB(0, 11, 0);
  const booking5 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX005",
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

  // Booking 6: Hari ini jam 13:30 WIB - DICUCI
  const booking6Date = createBookingDateWIB(0, 13, 30);
  const booking6 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX006",
      queueNumber: 1,
      bookingDate: booking6Date,
      totalPrice: cuciMotor.price,
      status: "DICUCI",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: vario.id,
      serviceId: cuciMotor.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking6);

  // Booking 7: Hari ini jam 15:00 WIB - DITERIMA
  const booking7Date = createBookingDateWIB(0, 15, 0);
  const booking7 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX007",
      queueNumber: 2,
      bookingDate: booking7Date,
      totalPrice: cuciCepatMobil.price,
      status: "DITERIMA",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciCepatMobil.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking7);

  // Booking 8: Hari ini jam 16:30 WIB - BOOKED
  const booking8Date = createBookingDateWIB(0, 16, 30);
  const booking8 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX008",
      queueNumber: 1,
      bookingDate: booking8Date,
      totalPrice: cuciLengkapMobil.price,
      status: "BOOKED",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciLengkapMobil.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking8);

  // === BOOKING BESOK ===
  // Booking 9: Besok jam 09:00 WIB - BOOKED
  const booking9Date = createBookingDateWIB(1, 9, 0);
  const booking9 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX009",
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

  // Booking 10: Besok jam 12:00 WIB - BOOKED
  const booking10Date = createBookingDateWIB(1, 12, 0);
  const booking10 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX010",
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

  // Booking 11: Besok jam 17:30 WIB - BOOKED (slot terakhir)
  const booking11Date = createBookingDateWIB(1, 17, 30);
  const booking11 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX011",
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

  // === BOOKING LAINNYA (DIBATALKAN & EXPIRED) ===
  // Booking 12: Kemarin jam 07:00 WIB - DIBATALKAN
  const booking12Date = createBookingDateWIB(-1, 7, 0);
  const booking12 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX012",
      queueNumber: 1,
      bookingDate: booking12Date,
      totalPrice: cuciCepatMobil.price,
      status: "DIBATALKAN",
      paymentStatus: "UNPAID",
      cancellationReason: "Salah pilih tipe layanan",
      cancelledAt: addMinutes(booking12Date, 30),
      userId: budi.id,
      vehicleId: avanza.id,
      serviceId: cuciCepatMobil.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking12);

  // Booking 13: 2 hari lalu jam 10:00 WIB - EXPIRED
  const booking13Date = createBookingDateWIB(-2, 10, 0);
  const booking13 = await prisma.booking.create({
    data: {
      bookingNumber: "TNX013",
      queueNumber: 1,
      bookingDate: booking13Date,
      totalPrice: cuciMotor.price,
      status: "EXPIRED",
      paymentStatus: "UNPAID",
      userId: budi.id,
      vehicleId: vario.id,
      serviceId: cuciMotor.id,
      locationId: locationCentral.id,
    },
  });
  bookings.push(booking13);

  console.log(`${bookings.length} Bookings telah dibuat.`);

  // === MEMBUAT BOOKING STATUS HISTORY ===
  console.log("Membuat Booking Status History...");

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

  // Booking 12 (DIBATALKAN)
  await prisma.bookingStatusHistory.createMany({
    data: [
      { bookingId: booking12.id, status: "BOOKED", notes: "Pesanan berhasil dibuat", createdAt: booking12Date },
      { bookingId: booking12.id, status: "DIBATALKAN", notes: "Salah pilih tipe layanan", createdAt: addMinutes(booking12Date, 30) },
    ],
  });

  // Booking 13 (EXPIRED)
  await prisma.bookingStatusHistory.createMany({
    data: [
      { bookingId: booking13.id, status: "BOOKED", notes: "Pesanan berhasil dibuat", createdAt: booking13Date },
      { bookingId: booking13.id, status: "EXPIRED", notes: "Slot waktu terlewati tanpa kedatangan", createdAt: addMinutes(booking13Date, 60) },
    ],
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
