const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '.jpg');
        cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (_req, file, cb) => {
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.mimetype)) {
            return cb(new Error('Only PNG/JPG/WEBP images are allowed'));
        }
        cb(null, true);
    },
});

// POST /api/uploads  (form field: "image")
router.post('/', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
});

module.exports = router;
