import { Router } from 'express';
import { getSlotAvailability } from '../controllers/slotController';

const router = Router();

router.get('/availability', getSlotAvailability);

export default router;