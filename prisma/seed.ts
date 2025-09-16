// File: prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

// Inisialisasi Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding dimulai...");

  // --- HASHING PASSWORD ---
  const saltRounds = 10;
  const superAdminPassword = await bcrypt.hash("supersecret123", saltRounds);
  const customerPassword = await bcrypt.hash("customer123", saltRounds);

  // --- MEMBUAT SERVICES ---
  const service1 = await prisma.service.upsert({
    where: { name: "Cuci Cepat" },
    update: {},
    create: {
      name: "Cuci Cepat",
      description: "Cuci bodi eksterior dan pengeringan.",
      price: 50000,
    },
  });

  const service2 = await prisma.service.upsert({
    where: { name: "Cuci Lengkap Interior & Eksterior" },
    update: {},
    create: {
      name: "Cuci Lengkap Interior & Eksterior",
      description: "Cuci eksterior, vakum interior, dan pembersihan dasbor.",
      price: 100000,
    },
  });

  const service3 = await prisma.service.upsert({
    where: { name: "Premium Wax Protection" },
    update: {},
    create: {
      name: "Premium Wax Protection",
      description:
        "Memberikan lapisan wax premium untuk kilau dan proteksi cat.",
      price: 150000,
    },
  });

  console.log("Services telah dibuat.");

  // --- MEMBUAT USERS ---
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@carwash.com" },
    update: {},
    create: {
      email: "superadmin@carwash.com",
      username: "superadmin",
      name: "Super Admin",
      password: superAdminPassword,
      role: "SUPERADMIN",
      phone: "081234567890",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "budi.customer@example.com" },
    update: {},
    create: {
      email: "budi.customer@example.com",
      username: "budi",
      name: "Budi Santoso",
      password: customerPassword,
      role: "CUSTOMER",
      phone: "081112223333",
    },
  });

  console.log("Users telah dibuat.");

  // --- MEMBUAT VEHICLE MILIK CUSTOMER ---
  const vehicle = await prisma.vehicle.upsert({
    where: { plate: "B 1234 ABC" },
    update: {},
    create: {
      plate: "B 1234 ABC",
      type: "MOBIL",
      model: "Toyota Avanza",
      // Menghubungkan vehicle ini ke user 'budi' yang sudah dibuat
      owner: {
        connect: {
          id: customer.id,
        },
      },
    },
  });

  console.log("Vehicle telah dibuat.");

  console.log("Seeding selesai.");
}

// Menjalankan fungsi main dan memastikan koneksi ditutup
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
