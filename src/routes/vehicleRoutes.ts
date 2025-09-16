import { Router } from 'express';
import { addVehicle, getMyVehicles, updateVehicle, deleteVehicle } from '../controllers/vehicleController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addVehicle);
router.get('/', authMiddleware, getMyVehicles);
router.put('/:id', authMiddleware, updateVehicle);
router.delete('/:id', authMiddleware, deleteVehicle);

export default router;