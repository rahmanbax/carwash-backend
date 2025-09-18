import { Router } from 'express';
import { createBooking, getMyBookings } from '../controllers/bookingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, createBooking);
router.get('/', authMiddleware, getMyBookings);

// Nanti Anda bisa menambahkan rute lain di sini
// router.get('/', authMiddleware, getMyBookings);
// router.patch('/:id/cancel', authMiddleware, cancelBooking);

export default router;