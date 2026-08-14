# 🚗 Carwash Backend API

Backend API untuk aplikasi manajemen cuci mobil dengan fitur booking, slot management, dan tracking status kendaraan.

---

## ✨ Fitur Utama

- 🔐 **Authentication & Authorization** - JWT-based auth dengan role (Customer, Admin, Superadmin)
- 📅 **Booking System** - Sistem booking dengan slot 30 menit (08:00-18:00 WIB)
- 📍 **Multi-Location** - Support multiple lokasi cuci mobil
- 🚗 **Vehicle Management** - Manajemen kendaraan customer (Mobil & Motor)
- 📊 **Status Tracking** - Real-time tracking status booking dengan timeline
- 🔔 **Notifications** - Sistem notifikasi untuk update status
- 📸 **File Upload** - Upload foto profil user dan lokasi
- 🎫 **QR Code** - Generate QR code untuk setiap booking

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v22+
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Password Hashing**: bcrypt
- **API Documentation**: Swagger/OpenAPI
- **QR Code**: qrcode

---

## 📦 Prasyarat

Pastikan sudah terinstall:

- [Node.js](https://nodejs.org/) v22 atau lebih tinggi
- [PostgreSQL](https://www.postgresql.org/) v14 atau lebih tinggi
- [Git](https://git-scm.com/)
- npm atau yarn (sudah include dengan Node.js)

---

## 🚀 Instalasi untuk Pengguna Baru

### 1️⃣ Clone Repository

```bash
git clone <repo-url>
cd carwash-backend
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Setup Database PostgreSQL

Buat database baru di PostgreSQL:

```sql
CREATE DATABASE carwash_db;
```

### 4️⃣ Konfigurasi Environment Variables

Buat file `.env` di root project:

```env
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/carwash_db?schema=public"

# JWT Secret (ganti dengan random string yang aman)
JWT_SECRET="your-super-secret-jwt-key-change-this"

# Server Port
PORT=8000
```

**⚠️ Penting:**
- Ganti `username` dan `password` dengan kredensial PostgreSQL Anda
- Ganti `JWT_SECRET` dengan string random yang aman

### 5️⃣ Generate Prisma Client

```bash
npx prisma generate
```

### 6️⃣ Run Database Migrations

```bash
npx prisma migrate deploy
```

Atau untuk development dengan reset database:

```bash
npx prisma migrate reset
```

### 7️⃣ Seed Database dengan Data Awal

```bash
npx prisma db seed
```

**Data yang di-seed:**
- 2 Users (1 Superadmin, 1 Customer)
- 3 Services (Cuci Cepat, Cuci Lengkap, Paket Motor)
- 3 Locations (Central Jakarta, Pondok Indah, Kebon Jeruk)
- 2 Vehicles
- 11 Bookings dengan berbagai status
- Booking Status History
- Notifications

### 8️⃣ Jalankan Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:8000`

### 9️⃣ Akses API Documentation

Buka browser dan akses:

```
http://localhost:8000/api-docs
```

---

## 🔄 Panduan Update Project

Ikuti langkah-langkah ini saat ada update dari repository:

### 1️⃣ Pull Perubahan Terbaru

```bash
git pull origin main
```

### 2️⃣ Install Dependencies Baru (jika ada)

```bash
npm install
```

### 3️⃣ Regenerate Prisma Client

```bash
npx prisma generate
```

### 4️⃣ Apply Database Migrations

**Opsi A: Migrate tanpa reset (preserve data)**

```bash
npx prisma migrate deploy
```

**Opsi B: Reset database (hapus semua data)**

```bash
npx prisma migrate reset
```

### 5️⃣ Seed Database Ulang (jika reset)

```bash
npx prisma db seed
```

### 6️⃣ Restart Development Server

```bash
npm run dev
```

---

## 🗄️ Struktur Database

### Models Utama:

- **User** - Data pengguna (Customer, Admin, Superadmin)
- **Vehicle** - Kendaraan milik customer
- **Service** - Paket layanan cuci
- **Location** - Lokasi cuci mobil
- **Booking** - Data booking customer
- **BookingStatusHistory** - Timeline status booking
- **Notification** - Notifikasi untuk user

### Enums:

- **Role**: `CUSTOMER`, `ADMIN`, `SUPERADMIN`
- **VehicleType**: `MOBIL`, `MOTOR`
- **BookingStatus**: `BOOKED`, `DITERIMA`, `DICUCI`, `SIAP_DIAMBIL`, `SELESAI`, `DIBATALKAN`, `EXPIRED`
- **PaymentStatus**: `UNPAID`, `PAID`
- **NotificationType**: `STATUS_UPDATE`, `REMINDER`

---

## 📚 API Documentation

### Base URL

```
http://localhost:8000/api
```

### Authentication

Semua endpoint yang memerlukan autentikasi harus menyertakan header:

```
Authorization: Bearer <your-jwt-token>
```

### Main Endpoints:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **Auth** |
| POST | `/auth/register` | Registrasi customer baru | ❌ |
| POST | `/auth/login` | Login dan dapatkan JWT token | ❌ |
| POST | `/auth/refresh` | Refresh JWT token | ✅ |
| POST | `/auth/logout` | Logout user | ❌ |
| **Users** |
| GET | `/users/profile` | Get profil user | ✅ |
| PUT | `/users/profile` | Update profil user | ✅ |
| **Vehicles** |
| GET | `/vehicles` | Get semua kendaraan user | ✅ |
| GET | `/vehicles/:id` | Get detail kendaraan | ✅ |
| POST | `/vehicles` | Tambah kendaraan baru | ✅ |
| PUT | `/vehicles/:id` | Update kendaraan | ✅ |
| DELETE | `/vehicles/:id` | Hapus kendaraan | ✅ |
| **Services** |
| GET | `/services` | Get semua layanan | ❌ |
| GET | `/services?type=MOBIL` | Filter layanan by type | ❌ |
| **Locations** |
| GET | `/locations` | Get semua lokasi | ❌ |
| GET | `/locations/:id` | Get detail lokasi | ❌ |
| **Bookings** |
| GET | `/bookings` | Get riwayat booking user | ✅ |
| GET | `/bookings/:id` | Get detail booking | ✅ |
| GET | `/bookings/:id/timeline` | Get timeline status booking | ✅ |
| POST | `/bookings` | Buat booking baru | ✅ |
| PATCH | `/bookings/:id/status` | Update status booking | ✅ |
| **Slots** |
| GET | `/slots/availability` | Cek ketersediaan slot | ❌ |
| **Notifications** |
| GET | `/notifications` | Get notifikasi user | ✅ |
| PATCH | `/notifications/:id/read` | Tandai notifikasi dibaca | ✅ |

### Swagger Documentation

Dokumentasi lengkap dengan contoh request/response tersedia di:

```
http://localhost:3000/api-docs
```

---

## 🧪 Testing

### Prisma Studio

Untuk melihat dan mengedit data secara visual:

```bash
npx prisma studio
```

Akses di `http://localhost:5555`

---

## 🔧 Troubleshooting

### Error: "Port 8000 already in use"

Ganti port di `.env`:

```env
PORT=8001
```

### Error: "Database connection failed"

1. Pastikan PostgreSQL sudah running
2. Cek kredensial di `DATABASE_URL` di `.env`
3. Pastikan database `carwash_db` sudah dibuat

### Error: "Column does not exist"

Schema tidak sinkron dengan database. Jalankan:

```bash
npx prisma migrate reset
npx prisma db seed
```

### Error: "JWT_SECRET not found"

Pastikan file `.env` ada dan berisi `JWT_SECRET`

### Seed Error: "Table does not exist"

Jalankan migrasi terlebih dahulu:

```bash
npx prisma migrate deploy
```

### ID tidak reset dari 1 saat seed

Sudah ditangani dengan auto-reset sequence di seed file.

---

## 📝 Scripts Available

```bash
# Development
npm run dev          # Jalankan server dengan nodemon (auto-reload)

# Build
npm run build        # Compile TypeScript ke JavaScript

# Production
npm start            # Jalankan compiled JavaScript

# Database
npx prisma generate  # Generate Prisma Client
npx prisma migrate dev --name <name>  # Buat migrasi baru
npx prisma migrate deploy  # Apply migrasi
npx prisma migrate reset   # Reset database
npx prisma db seed   # Seed database
npx prisma studio    # Buka Prisma Studio
```

---

## 👥 Default Users

Setelah seed, gunakan kredensial berikut untuk testing:

### Superadmin
- **Username**: `superadmin`
- **Password**: `supersecret123`
- **Role**: `SUPERADMIN`

### Customer
- **Username**: `budisantoso`
- **Password**: `customer123`
- **Role**: `CUSTOMER`

---

