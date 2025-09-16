import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

// Memperluas interface Request dari Express untuk menyertakan properti 'user'
// Ini agar TypeScript tidak error saat kita menambahkan req.user
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    role: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // 1. Dapatkan token dari header Authorization
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Formatnya: "Bearer TOKEN"

  // 2. Jika tidak ada token, kirim error 401 Unauthorized
  if (!token) {
    return res
      .status(401)
      .json({
        status: "error",
        message: "Akses ditolak. Token tidak disediakan.",
      });
  }

  // 3. Verifikasi token
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res
      .status(500)
      .json({
        status: "error",
        message: "Kunci rahasia JWT tidak dikonfigurasi.",
      });
  }

  jwt.verify(token, secret, (err, decoded) => {
    // Jika token tidak valid (misalnya, kadaluwarsa atau salah), kirim error 403 Forbidden
    if (err) {
      return res
        .status(403)
        .json({ status: "error", message: "Token tidak valid." });
    }

    // 4. Jika token valid, simpan payload (data user) di object request
    // 'decoded' berisi payload yang kita sign sebelumnya: { userId, username, role }
    req.user = decoded as { userId: number; username: string; role: string };

    // Lanjutkan ke controller selanjutnya
    next();
  });
};
