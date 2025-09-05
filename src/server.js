require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const server = express();

/** ---- CORS FIRST ---- */
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
server.use(cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
}));
server.options('*', cors());

/** ---- BODY PARSERS (keep JSON small; files go via multer) ---- */
server.use(express.json({ limit: '1mb' }));
server.use(express.urlencoded({ extended: true, limit: '1mb' }));

/** ---- STATIC UPLOADS ---- */
server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/** ---- DB ---- */
mongoose.Promise = global.Promise;
const uri = process.env.mongo_db_url;
mongoose.connect(uri)
    .then(() => console.log('db is connected'))
    .catch(err => console.log('db is not connected', err));

/** ---- ROUTES ---- */
const userRoutes = require('./users/userRoutes');
const menuRoutes = require('./menus/menuRoutes');
const cartRoutes = require('./cart/cartRoutes');
const addressRoutes = require('./addresses/addressRoutes');
const ordersRoutes = require('./orders/orderRoutes');
const categoryRoutes = require('./menus/categoryRoutes');
const uploadRoutes = require('./menus/uploadRoutes');

server.use('/api/users', userRoutes);
server.use('/api/menus', menuRoutes);
server.use('/api/cart', cartRoutes);
server.use('/api', addressRoutes);
server.use('/api', ordersRoutes);
server.use('/api', categoryRoutes);
server.use('/api/uploads', uploadRoutes);

/** ---- FRIENDLY 413 (must be after body parsers) ---- */
server.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') {
        return res.status(413).json({
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request too large. Upload the image first and send only its URL.'
        });
    }
    next(err);
});

/** ---- START ---- */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`server is running ${PORT}`));
