const bodyparser = require("body-parser");
require('dotenv').config();

const express = require("express");

const server = express();

const cors = require("cors");

server.use(express.json());

server.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
const mongoose = require("mongoose");


server.use(bodyparser.json());

const PORT = process.env.PORT || 5000

mongoose.Promise = global.Promise;


const uri = `${process.env.mongo_db_url}`;

const mongodb = mongoose.connect(uri).then(()=>{
    console.log("db is connected");
    
}).catch((error)=>{
    console.log(error,"db is not connected");
})

const userRoutes = require("./users/userRoutes");
server.use('/api/users', userRoutes);

const menuRoutes = require('./menus/menuRoutes');
const cartRoutes = require('./cart/cartRoutes');
server.use('/api/menus', menuRoutes);
server.use('/api/cart', cartRoutes);

const addressRoutes = require('./addresses/addressRoutes');
server.use('/api', addressRoutes);
const ordersRoutes = require('./orders/orderRoutes');
server.use('/api', ordersRoutes);
const categoryRoutes = require('./menus/categoryRoutes');
server.use('/api', categoryRoutes);

server.listen(PORT , () =>{
    console.log(`server is running ${PORT}`);
    
})







