const express=require('express');
const cors=require('cors');
const app=express();
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
require("./config/database");
const redisClient=require("./config/redis");
redisClient.connect().catch((err)=>{
    logger.info('Error connecting to Redis:', err);
});
const verifyFirebaseToken = require('./middleware/authmiddleware');
const {addToQueue}=require("./service/queueService/queue");
const {emailWorker}=require("./service/queueService/worker");
const date=new Date();
var fir=date.getDate();
fir=fir.toString();
var sec=date.getMonth()+1;
sec=sec%12;
fir=fir+sec;
const instance = new razorpay({
    key_id:process.env.RAZORPAY_APT_KEY,
    key_secret:process.env.RAZORPAY_API_SECRET,
})


let Amt;
let cnt;
let bet;
let mail;
let name="";


const router=require("./route");

app.use(router);

app.get("/",(req,res)=>{
    res.send(`Welcome to the Chat Town`);
});
app.get("/health",(req,res)=>{
    res.send(`Service is Up and Running`);
});

app.get("/api/getkey",verifyFirebaseToken,(req,res)=>{
    name=req.user.name;
    mail=req.user.email;
    return res.status(200).json({key:process.env.RAZORPAY_APT_KEY})
});
app.post("/checkout",verifyFirebaseToken,async(req,res)=>{

    const options ={
        amount:Number(req.body.amount*100),
        currency:"INR",
    };
    const order = await instance.orders.create(options).catch((err)=>{
        logger.info(`Payment Error:${err.message}`);
    });
    res.status(200).json({
        success:true,order
    });
    Amt=Number(req.body.amount*100);
})

app.post("/paymentverification",async(req,res)=>{
    const {razorpay_payment_id,razorpay_order_id,razorpay_signature}=req.body;
    logger.info(req.body);
   const body = razorpay_order_id + "|" +razorpay_payment_id;
   const expectedsignature =crypto.createHmac('sha256',process.env.RAZORPAY_API_SECRET).update(body.toString()).digest('hex');
   if(expectedsignature === razorpay_signature){
    if(Amt==24900){
         cnt=30;
         bet=1;
    }
    else{
        cnt=45;
        bet=1;
    }
    const changing=await userdatas.updateMany({Email:mail},{$set:{count:cnt,bt:bet,Exp:fir}});
    try {
        await addToQueue({
            userEmail: mail,
            userName: name,
            amount: Amt / 100,
            transactionId: razorpay_payment_id,
        });
    } catch (error) {
        logger.error('Error adding email job to queue:', error);
    }
    // res.status(200).send(changing); 
    res.redirect(`https://chat-town.netlify.app/Home/paymentsuccess?reference=${razorpay_payment_id}`);
   }
   else{
    res.status(400).send(`Signature:${razorpay_signature} and the expected one is ${expectedsignature}`);
    // alert(`Payment Failed due to Incorrect Details`);
    // res.status(402).redirect(`http://localhost:3000/`);
   }
})

if(require.main===module){
   app.listen(port,()=>{
    logger.info(`Server is running`)
});
}


module.exports={app}