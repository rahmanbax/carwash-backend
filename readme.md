# Carwash Backend

## 1. Prasyarat
- Node.js sesuai v22+
- PostgreSQL
- Git

## 2. Instalasi untuk Pengguna Baru
git clone <repo-url>
cd carwash-backend
npm install

## 3. Konfigurasi Environment
# Buat file .env di root:
DATABASE_URL="postgresql://user:pass@localhost:5432/carwash_db?schema=public"
JWT_SECRET="secretnumber"

## 4. Generate Prisma Client
npx prisma generate

## 5. Setup Database
# Migrasi:
npx prisma migrate deploy

## 6. Seed Database
npx prisma db seed

## 7. Menjalankan Server
npm run dev

# ---------------------------------------------------------------

# Panduan Update Proyek

## 1. Pull perubahan terbaru
git pull

## 2. Install dependensi baru
npm install

## 3. Regenerate Prisma Client
npx prisma generate

## 4. Reset migrasi
npx prisma migrate reset

## 5. Jalankan seed ulang
npx prisma db seed

## 6. Jalankan server
npm run dev
