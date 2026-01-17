import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Carwash API Documentation',
      version: '1.0.0',
      description: 'Dokumentasi API lengkap untuk aplikasi Carwash backend yang dibuat dengan Express, Prisma, dan TypeScript.',
    },
    tags: [
      { name: 'Auth', description: 'Endpoint untuk otentikasi' },
      { name: 'Statistics', description: 'Endpoint untuk statistik dashboard superadmin' },
      { name: 'Admin', description: 'Endpoint untuk manajemen Admin oleh Superadmin' },
      { name: 'Transactions', description: 'Endpoint untuk manajemen transaksi (Booking)' },
      { name: 'Locations', description: 'Endpoint untuk manajemen lokasi cuci mobil' },
      { name: 'Vehicles', description: 'Endpoint untuk manajemen kendaraan' },
      { name: 'Bookings', description: 'Endpoint untuk manajemen booking' },
      { name: 'Users', description: 'Endpoint untuk manajemen profil user' },
      { name: 'Services', description: 'Endpoint untuk daftar layanan' },
      { name: 'Slots', description: 'Endpoint untuk informasi slot/waktu' },
      { name: 'Notifications', description: 'Endpoint untuk notifikasi' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;