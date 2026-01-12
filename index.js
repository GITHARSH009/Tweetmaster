const express=require('express');
const cors=require('cors');
const app=express();
let server;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
const {logger,httpLogger}=require("./middleware/logger");
app.use(httpLogger);
const dotenv=require('dotenv')
dotenv.config();
const port=process.env.Port || 8002;
const userdatas=require("./model/userModal");
const razorpay =require("razorpay");
const crypto =require("crypto");
const {mongoose}=require("./config/database");
const redisClient=require("./config/redis");
redisClient.connect().catch((err)=>{
    logger.error('Error connecting to Redis:', err);
});
const verifyFirebaseToken = require('./middleware/authmiddleware');
const {addToQueue}=require("./service/queueService/queue");
const {emailWorker}=require("./service/queueService/worker");

// ✅ CRITICAL FIX: Proper expiry date calculation
const calculateExpiryDate = () => {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
    const day = expiryDate.getDate().toString().padStart(2, '0');
    const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
    return day + month; // Format: DDMM (e.g., "1501" for Jan 15)
};

const instance = new razorpay({
    key_id:process.env.RAZORPAY_APT_KEY,
    key_secret:process.env.RAZORPAY_API_SECRET,
})

const router=require("./route");
app.use(router);

app.get("/",(req,res)=>{
    res.send(`Welcome to the Chat Town`);
});

app.get("/health",(req,res)=>{
    res.send(`Service is Up and Running`);
});

app.get("/api/getkey",verifyFirebaseToken,(req,res)=>{
    return res.status(200).json({key:process.env.RAZORPAY_APT_KEY})
});

app.post("/checkout",verifyFirebaseToken,async(req,res)=>{
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

app.post("/paymentverification",async(req,res)=>{
    try {
        const {razorpay_payment_id, razorpay_order_id, razorpay_signature} = req.body;
        
        logger.info('Payment verification:', {payment_id: razorpay_payment_id, order_id: razorpay_order_id});
        
        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_API_SECRET)
            .update(body.toString())
            .digest('hex');
        
        if (expectedSignature !== razorpay_signature) {
            logger.error('Invalid signature');
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }
        
        // Fetch order details
        const order = await instance.orders.fetch(razorpay_order_id);
        
        const userEmail = order.notes.email;
        const userName = order.notes.name;
        const amount = order.notes.originalAmount;
        
        // Determine plan
        let cnt, bet;
        if (amount === 24900) {
            cnt = 30;
            bet = 1;
        } else {
            cnt = 45;
            bet = 1;
        }
        
        // ✅ CRITICAL FIX: Use proper expiry calculation
        const expiryDate = calculateExpiryDate();
        
        // Update user
        await userdatas.updateOne(
            {Email: userEmail},
            {$set: {count: cnt, bt: bet, Exp: expiryDate}}
        );
        
        logger.info('User updated:', {email: userEmail, count: cnt, expiry: expiryDate});
        
        // Queue email
        try {
            await addToQueue({
                userEmail: userEmail,
                userName: userName,
                amount: amount / 100,
                transactionId: razorpay_payment_id,
            });
        } catch (error) {
            logger.error('Error adding email job to queue:', error);
        }
        
        res.redirect(`https://chat-town.netlify.app/`);
        
    } catch (error) {
        logger.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
});

// Graceful Shutdown
const shutdown = async (signal) => {
    logger.info(`${signal} received - shutting down gracefully`);
    
    const timeout = setTimeout(() => {
        logger.error('Forced exit - timeout exceeded');
        process.exit(1);
    }, 25000);
    
    try {
        if (server) {
            server.close(() => logger.info('✓ Server closed'));
        }
        
        await Promise.all([
            redisClient?.isOpen ? redisClient.quit().then(() => logger.info('✓ Redis closed')) : Promise.resolve(),
            mongoose.connection.readyState === 1 ? mongoose.connection.close().then(() => logger.info('✓ MongoDB closed')) : Promise.resolve(),
            emailWorker ? emailWorker.close().then(() => logger.info('✓ Worker closed')) : Promise.resolve()
        ]);
        
        clearTimeout(timeout);
        logger.info('✨ Shutdown complete');
        process.exit(0);
    } catch (err) {
        logger.error('Shutdown error:', err);
        process.exit(1);
    }
};

if(require.main===module){
   server=app.listen(port,()=>{
    logger.info(`Server is running on port ${port}`)
   });
}

process.on('SIGTERM',()=> shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));
process.on('uncaughtException',(err)=>{
   logger.error('Uncaught Exception:', err);
    shutdown('EXCEPTION');
});
process.on('unhandledRejection',(err)=>{
    logger.error('Unhandled Rejection:', err);
    shutdown('REJECTION');
});

module.exports={app};