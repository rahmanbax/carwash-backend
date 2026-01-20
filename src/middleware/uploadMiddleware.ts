import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

// Konstanta untuk validasi
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_FILENAME_LENGTH = 100;
const UPLOAD_DIR = "public/uploads/";

// Whitelist MIME types yang diizinkan
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png"
];

// Magic bytes untuk validasi file signature
const MAGIC_BYTES: { [key: string]: number[][] } = {
  jpeg: [
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG JFIF
    [0xFF, 0xD8, 0xFF, 0xE1], // JPEG Exif
    [0xFF, 0xD8, 0xFF, 0xE2], // JPEG
    [0xFF, 0xD8, 0xFF, 0xE3], // JPEG
    [0xFF, 0xD8, 0xFF, 0xDB], // JPEG raw
  ],
  png: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG
};

// Fungsi untuk sanitasi nama file
const sanitizeFilename = (filename: string): string => {
  // Hapus path traversal attempts
  let sanitized = filename.replace(/\.\./g, "");

  // Hapus karakter berbahaya
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Batasi panjang nama file
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = sanitized.slice(0, MAX_FILENAME_LENGTH - ext.length);
    sanitized = nameWithoutExt + ext;
  }

  return sanitized;
};

// Fungsi untuk validasi magic bytes
const validateMagicBytes = (buffer: Buffer, mimetype: string): boolean => {
  let magicBytesArray: number[][] = [];

  if (mimetype === "image/jpeg" || mimetype === "image/jpg") {
    magicBytesArray = MAGIC_BYTES.jpeg;
  } else if (mimetype === "image/png") {
    magicBytesArray = MAGIC_BYTES.png;
  } else {
    return false;
  }

  // Cek apakah buffer cocok dengan salah satu magic bytes
  return magicBytesArray.some((magicBytes) => {
    if (buffer.length < magicBytes.length) return false;
    return magicBytes.every((byte, index) => buffer[index] === byte);
  });
};

// Pastikan direktori upload ada
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Konfigurasi penyimpanan untuk multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Sanitasi nama file original
    const sanitizedOriginalName = sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedOriginalName).toLowerCase();
    const nameWithoutExt = path.basename(sanitizedOriginalName, ext);

    // Generate nama file yang unik dan aman
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeFilename = `${file.fieldname}-${uniqueSuffix}${ext}`;

    cb(null, safeFilename);
  },
});

// Filter file dengan validasi yang ketat
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // 1. Validasi MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(
        "Tipe file tidak diizinkan. Hanya gambar JPEG, JPG, dan PNG yang diperbolehkan."
      )
    );
  }

  // 2. Validasi ekstensi file
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [".jpg", ".jpeg", ".png"];

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(
        "Ekstensi file tidak valid. Hanya .jpg, .jpeg, dan .png yang diperbolehkan."
      )
    );
  }

  // 3. Validasi panjang nama file
  if (file.originalname.length > MAX_FILENAME_LENGTH) {
    return cb(new Error("Nama file terlalu panjang. Maksimal 100 karakter."));
  }

  cb(null, true);
};

// Konfigurasi multer dengan validasi keamanan
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // 3MB
    files: 1, // Hanya 1 file per request
    fields: 10, // Maksimal 10 field
  },
});

// Middleware tambahan untuk validasi magic bytes setelah file di-upload
export const validateFileSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const file = req.file;

  if (!file) {
    return next();
  }

  try {
    // Baca beberapa byte pertama dari file
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(file.path, "r");
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    // Validasi magic bytes
    if (!validateMagicBytes(buffer, file.mimetype)) {
      // Hapus file yang tidak valid
      fs.unlinkSync(file.path);

      return res.status(400).json({
        status: "error",
        message: "File tidak valid. File signature tidak sesuai dengan tipe file.",
      });
    }

    next();
  } catch (error) {
    // Jika terjadi error, hapus file dan kirim response error
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat memvalidasi file.",
    });
  }
};
