import express, { Request, Response } from 'express';
import authRoutes from './routes/authRoutes';
import vehicleRoutes from './routes/vehicleRoutes';

const app = express();
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Your server is fine!');
});

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);

export default app;