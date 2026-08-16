# 🚗 Carwash Backend API

Backend API untuk aplikasi manajemen cuci mobil dengan fitur booking, slot management, manajemen paket layanan berdasarkan kapasitas mesin (CC) & lokasi, pembayaran, dan tracking status kendaraan.

---

## ✨ Fitur Utama

- 🔐 **Authentication & Authorization** - JWT-based auth dengan role (`CUSTOMER`, `ADMIN`, `SUPERADMIN`)
- 📅 **Booking System** - Sistem booking dengan slot 30 menit (08:00 - 18:00 WIB)
- 📍 **Multi-Location** - Dukungan multi-cabang lokasi cuci mobil
- 🚗 **Vehicle & CC Management** - Manajemen kendaraan customer dengan kapasitas mesin (CC)
- 🧼 **Service Packages (CRUD)** - Paket layanan fleksibel berdasarkan tipe kendaraan (`MOBIL`/`MOTOR`), rentang CC, dan lokasi
- 💳 **Payment & Manual Transaction** - Pencatatan transaksi langsung di tempat (walk-in) dan metode pembayaran (`Tunai`/`QRIS`)
- 📊 **Statistics Dashboard** - Statistik pendapatan, antrian, dan performa per lokasi maupun global superadmin
- 🔔 **Notifications & Timeline** - Notifikasi riwayat perubahan status booking
- 📸 **File Upload** - Upload foto profil user dan lokasi
- 🎫 **QR Code** - Generate QR code otomatis untuk setiap booking

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v22+
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Containerization**: Docker & Docker Compose
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **File Upload**: Multer
- **API Documentation**: Swagger / OpenAPI
- **Notification**: Firebase Admin SDK (FCM)
- **QR Code**: qrcode

---

## 📦 Prasyarat

Pilih salah satu metode yang ingin digunakan:

### Opsi 1: Menggunakan Docker (Direkomendasikan)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (sudah termasuk Docker Compose)
- [Git](https://git-scm.com/)

### Opsi 2: Menggunakan Node.js Lokal
- [Node.js](https://nodejs.org/) v22 atau lebih tinggi
- [PostgreSQL](https://www.postgresql.org/) v14 atau lebih tinggi
- [Git](https://git-scm.com/)

---

## 🐳 Panduan Setup Cepat dengan Docker (Direkomendasikan)

### 1️⃣ Clone Repository

```bash
git clone <repo-url>
cd carwash-backend
```

### 2️⃣ Konfigurasi Environment Variables

Salin atau buat file `.env` di root project:

```env
# ==========================================
# Database Configuration (Docker)
# ==========================================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=carwash_db

# Digunakan untuk koneksi lokal di luar container jika diperlukan
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/carwash_db?schema=public"

# ==========================================
# Application Configuration
# ==========================================
PORT=8000
NODE_ENV=development
JWT_SECRET="your-super-secret-jwt-key-change-this"

# CORS Origin (pisahkan dengan koma jika lebih dari satu)
CORS_ORIGIN="http://localhost:3000,http://localhost:5173"
```

> [!NOTE]
> Pastikan file `src/config/firebase-service-account.json` tersedia (atau gunakan file dummy / valid credentials) karena di-mount ke container backend.

### 3️⃣ Jalankan Container dengan Docker Compose

Jalankan container backend (`carwash-backend`) dan database (`carwash-db`):

```bash
docker compose up -d --build
```

Cek apakah semua container sudah berjalan normal:

```bash
docker compose ps
```

### 4️⃣ Sinkronisasi Schema Database & Generate Prisma

Jalankan migrasi / push schema database ke dalam container:

```bash
docker compose exec app npx prisma db push
```

*(Opsional)* Generate Prisma client jika diperlukan:

```bash
docker compose exec app npx prisma generate
```

### 5️⃣ Seed Database dengan Data Awal

Jalankan seeder untuk mengisi data dummy awal:

```bash
docker compose exec app npx prisma db seed
```

**Data yang di-seed:**
- **Users**: 1 Superadmin, 1 Admin (Cabang Central), 1 Customer
- **Locations**: Central Jakarta, Pondok Indah, Kebon Jeruk
- **Services**: Paket Cuci Mobil & Motor dengan variasi CC dan lokasi
- **Vehicles**: Toyota Avanza (1500 CC), Honda Vario (150 CC)
- **Bookings & History**: Riwayat booking dan timeline status
- **Notifications**: Notifikasi awal pelanggan

### 6️⃣ Akses Backend & Dokumentasi API

- **API Base URL**: `http://localhost:8000/api`
- **Swagger Documentation**: `http://localhost:8000/api-docs`

---

## 🛠️ Perintah Docker yang Sering Digunakan

```bash
# Melihat log aplikasi backend secara real-time
docker compose logs -f app

# Melihat log database PostgreSQL
docker compose logs -f db

# Menjalankan Prisma Studio (GUI Database) pada port 5555
docker compose --profile studio up -d prisma-studio

# Masuk ke shell container backend
docker compose exec app sh

# Masuk ke CLI PostgreSQL
docker compose exec db psql -U postgres -d carwash_db

# Menghentikan semua container
docker compose down

# Menghentikan container dan menghapus volume database (Reset total)
docker compose down -v
```

---

## 💻 Panduan Setup Manual (Tanpa Docker)

Jika ingin menjalankan tanpa Docker di mesin lokal:

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Setup Database PostgreSQL Lokal

Buat database di PostgreSQL:

```sql
CREATE DATABASE carwash_db;
```

Sesuaikan `DATABASE_URL` di file `.env`:

```env
DATABASE_URL="postgresql://postgres:password_anda@localhost:5432/carwash_db?schema=public"
PORT=8000
JWT_SECRET="your-super-secret-jwt-key-change-this"
```

### 3️⃣ Setup Prisma & Seed

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 4️⃣ Jalankan Server

```bash
npm run dev
```

---

## 🔄 Panduan Update Project (Git Pull)

Saat ada pembaruan kode dari branch utama:

### Jika Menggunakan Docker:

```bash
git pull origin main
docker compose up -d --build
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed   # Jika perlu reset/update seed
```

### Jika Manual / Lokal:

```bash
git pull origin main
npm install
npx prisma generate
npx prisma db push
npm run dev
```

---

## 🗄️ Struktur Database

### Models Utama:
- **User** - Data pengguna (`CUSTOMER`, `ADMIN`, `SUPERADMIN`)
- **Vehicle** - Kendaraan customer beserta kapasitas mesin (`cc`)
- **Service** - Paket layanan cuci dengan atribut `minCc`, `maxCc`, `vehicleType`, dan `locationId`
- **Location** - Data cabang cuci mobil
- **Booking** - Data pesanan cuci, slot waktu, `paymentStatus`, dan `paymentMethod`
- **Review** - Ulasan dan rating (1-5) dari customer untuk booking selesai
- **BookingStatusHistory** - Timeline riwayat perubahan status booking
- **Notification** - Notifikasi sistem untuk pengguna

### Enums:
- **Role**: `CUSTOMER`, `ADMIN`, `SUPERADMIN`
- **VehicleType**: `MOBIL`, `MOTOR`
- **BookingStatus**: `BOOKED`, `DITERIMA`, `DICUCI`, `SIAP_DIAMBIL`, `SELESAI`, `DIBATALKAN`, `EXPIRED`
- **PaymentStatus**: `UNPAID`, `PAID`
- **NotificationType**: `STATUS_UPDATE`, `REMINDER`

---

## 📚 Ringkasan Endpoint API

Dokumentasi interaktif dapat diakses di `http://localhost:8000/api-docs`.

| Method | Endpoint | Deskripsi | Role / Auth |
|---|---|---|---|
| **Auth** | | | |
| POST | `/api/auth/register` | Registrasi customer baru | Publik |
| POST | `/api/auth/login` | Login dan peroleh token JWT & `locationId` | Publik |
| POST | `/api/auth/refresh` | Refresh token JWT | Authenticated |
| POST | `/api/auth/logout` | Logout | Authenticated |
| **Reviews (Ulasan)** | | | |
| GET | `/api/reviews` | Daftar ulasan & statistik rating (filter `serviceId`, `locationId`, `rating`) | Publik |
| GET | `/api/reviews/:id` | Detail satu ulasan | Publik |
| GET | `/api/reviews/booking/:bookingId` | Cek ulasan berdasarkan ID Booking | Publik |
| POST | `/api/reviews` | Buat ulasan baru untuk pesanan `SELESAI` | `CUSTOMER` |
| PUT | `/api/reviews/:id` | Update ulasan (rating & komentar) | `CUSTOMER` |
| DELETE | `/api/reviews/:id` | Hapus ulasan | `CUSTOMER`, `SUPERADMIN` |
| **Services (Layanan)** | | | |
| GET | `/api/services` | Ambil daftar layanan (filter `type`, `locationId`, `cc`, `vehicleId`) | Publik |
| GET | `/api/services/:id` | Detail paket layanan | Publik |
| POST | `/api/services` | Tambah paket layanan baru | `ADMIN`, `SUPERADMIN` |
| PUT | `/api/services/:id` | Update paket layanan | `ADMIN`, `SUPERADMIN` |
| DELETE | `/api/services/:id` | Hapus paket layanan | `ADMIN`, `SUPERADMIN` |
| **Bookings & Transactions** | | | |
| GET | `/api/bookings` | Riwayat booking user | `CUSTOMER` |
| POST | `/api/bookings` | Buat booking baru | `CUSTOMER` |
| GET | `/api/bookings/:id` | Detail booking & timeline | Authenticated |
| POST | `/api/transactions` | Buat transaksi manual walk-in | `ADMIN` |
| GET | `/api/transactions/list` | Daftar transaksi aktif di lokasi | `ADMIN` |
| GET | `/api/transactions/history` | Riwayat transaksi di lokasi | `ADMIN` |
| GET | `/api/transactions/user-by-phone` | Cari pelanggan via nomor HP | `ADMIN` |
| PATCH | `/api/transactions/:id/status` | Update status & bayar transaksi | `ADMIN` |
| **Vehicles** | | | |
| GET | `/api/vehicles` | Daftar kendaraan user | `CUSTOMER` |
| POST | `/api/vehicles` | Tambah kendaraan (wajib input `cc`) | `CUSTOMER` |
| PUT | `/api/vehicles/:id` | Update kendaraan | `CUSTOMER` |
| DELETE | `/api/vehicles/:id` | Hapus kendaraan (soft delete) | `CUSTOMER` |
| **Locations** | | | |
| GET | `/api/locations` | Daftar lokasi aktif | Publik |
| GET | `/api/locations/:id` | Detail lokasi | Publik |
| POST | `/api/locations` | Tambah lokasi cabang baru | `SUPERADMIN` |
| PUT | `/api/locations/:id` | Update lokasi cabang | `SUPERADMIN` |
| DELETE | `/api/locations/:id` | Hapus lokasi cabang | `SUPERADMIN` |
| **Statistics** | | | |
| GET | `/api/statistics/admin` | Statistik dashboard admin per lokasi | `ADMIN` |
| GET | `/api/statistics/superadmin` | Statistik dashboard global | `SUPERADMIN` |
| **Slots & Notifications** | | | |
| GET | `/api/slots/availability` | Cek ketersediaan slot waktu | Publik |
| GET | `/api/notifications` | Daftar notifikasi user | Authenticated |
| PATCH | `/api/notifications/:id/read` | Tandai notifikasi telah dibaca | Authenticated |

---

## 👥 Akun Default (Testing)

Gunakan akun default berikut setelah menjalankan `prisma db seed`:

### 👑 Superadmin
- **Username**: `superadmin`
- **Password**: `supersecret123`
- **Role**: `SUPERADMIN`

### 🏢 Admin Lokasi (Cabang Central)
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `ADMIN`
- **Location ID**: `1` (Central Jakarta)

### 👤 Customer
- **Username**: `budisantoso`
- **Password**: `customer123`
- **Phone**: `081234567890`
- **Role**: `CUSTOMER`
