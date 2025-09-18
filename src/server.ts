import express, { Request, Response } from 'express';
import path from 'path';
import authRoutes from './routes/authRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import bookingRoutes from './routes/bookingRoutes'; 
import slotRoutes from './routes/slotRoutes';
import userRoutes from './routes/userRoutes';

const app = express();
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Your server is fine!');
});

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/users', userRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

export default app;