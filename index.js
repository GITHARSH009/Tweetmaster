const express = require('express');
const cors = require('cors');
const app = express();
let server;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

const {logger, httpLogger} = require("./middleware/logger");
app.use(httpLogger);

const dotenv = require('dotenv');
dotenv.config();

const port = process.env.Port || 8002;
const userdatas = require("./model/userModal");
const razorpay = require("razorpay");
const crypto = require("crypto");
const {mongoose} = require("./config/database");
const redisClient = require("./config/redis");

redisClient.connect().catch((err) => {
    logger.error('Error connecting to Redis:', err);
});

const verifyFirebaseToken = require('./middleware/authmiddleware');
const {addToQueue} = require("./service/queueService/queue");
const {emailWorker} = require("./service/queueService/worker");

// Calculate expiration date
const date = new Date();
let fir = date.getDate().toString();
let sec = (date.getMonth() + 1) % 12;
fir = fir + sec;

const instance = new razorpay({
    key_id: process.env.RAZORPAY_APT_KEY,
    key_secret: process.env.RAZORPAY_API_SECRET,
});

const router = require("./route");
app.use(router);

// Health check routes
app.get("/", (req, res) => {
    res.send(`Welcome to the Chat Town`);
});

app.get("/health", (req, res) => {
    res.send(`Service is Up and Running`);
});

// Get Razorpay API key
app.get("/api/getkey", verifyFirebaseToken, (req, res) => {
    return res.status(200).json({
        key: process.env.RAZORPAY_APT_KEY
    });
});

// Create checkout order
app.post("/checkout", verifyFirebaseToken, async (req, res) => {
    try {
        const amount = Number(req.body.amount * 100);
        const userEmail = req.user.email;
        const userName = req.user.name;
        
        const options = {
            amount: amount,
            currency: "INR",
            notes: {
                email: userEmail,
                name: userName,
                originalAmount: amount
            }
        };
        
        const order = await instance.orders.create(options);
        
        res.status(200).json({
            success: true,
            order
        });
    } catch (err) {
        logger.error(`Payment Error: ${err.message}`);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Verify payment
app.post("/paymentverification", async (req, res) => {
    try {
        const {razorpay_payment_id, razorpay_order_id, razorpay_signature} = req.body;
        
        logger.info('Payment verification request:', {
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id
        });
        
        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_API_SECRET)
            .update(body.toString())
            .digest('hex');
        
        if (expectedSignature !== razorpay_signature) {
            logger.error('Invalid signature:', {
                expected: expectedSignature,
                received: razorpay_signature
            });
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }
        
        // Fetch order details from Razorpay
        const order = await instance.orders.fetch(razorpay_order_id);
        
        // Extract data from order metadata
        const userEmail = order.notes.email;
        const userName = order.notes.name;
        const amount = order.notes.originalAmount;
        
        // Determine plan based on amount
        const cnt = amount === 24900 ? 30 : 45;
        const bet = 1;
        
        // Update user in database
        const result = await userdatas.updateOne(
            {Email: userEmail},
            {$set: {count: cnt, bt: bet, Exp: fir}}
        );
        
        logger.info('User updated:', {email: userEmail, count: cnt});
        
        // Add email to queue
        try {
            await addToQueue({
                userEmail: userEmail,
                userName: userName,
                amount: amount / 100,
                transactionId: razorpay_payment_id,
            });
            logger.info('Email queued for:', userEmail);
        } catch (error) {
            logger.error('Error adding email job to queue:', error);
        }
        
        // Redirect to success page
        res.redirect(
            `https://chat-town.netlify.app`
        );
        
    } catch (error) {
        logger.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Graceful Shutdown Handler
const shutdown = async (signal) => {
    logger.info(`${signal} received - shutting down gracefully`);
    
    const timeout = setTimeout(() => {
        logger.error('Forced exit - timeout exceeded');
        process.exit(1);
    }, 25000);
    
    try {
        // Stop accepting new requests
        if (server) {
            server.close(() => logger.info('✓ Server closed'));
        }
        
        // Close connections in parallel
        await Promise.all([
            redisClient?.isOpen 
                ? redisClient.quit().then(() => logger.info('✓ Redis closed')) 
                : Promise.resolve(),
            mongoose.connection.readyState === 1 
                ? mongoose.connection.close().then(() => logger.info('✓ MongoDB closed')) 
                : Promise.resolve(),
            emailWorker 
                ? emailWorker.close().then(() => logger.info('✓ Worker closed')) 
                : Promise.resolve()
        ]);
        
        clearTimeout(timeout);
        logger.info('✨ Shutdown complete');
        process.exit(0);
    } catch (err) {
        logger.error('Shutdown error:', err);
        clearTimeout(timeout);
        process.exit(1);
    }
};

// Start server
if (require.main === module) {
    server = app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
    });
}

// Signal handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    shutdown('EXCEPTION');
});
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    shutdown('REJECTION');
});

module.exports = {app};