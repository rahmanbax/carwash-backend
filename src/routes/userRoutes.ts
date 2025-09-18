import { Router } from 'express';
import { getMyProfile, updateMyProfile } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.get('/profile', authMiddleware, getMyProfile);
router.put('/profile', authMiddleware, upload.single('profilePhoto'), updateMyProfile);

export default router;