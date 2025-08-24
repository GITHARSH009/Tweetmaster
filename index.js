const express=require('express');
const cors=require('cors');
const app=express()
const dotenv=require('dotenv')
dotenv.config();
const port=process.env.Port || 8002;
const userdatas=require("./modelt");
const razorpay =require("razorpay");
const crypto =require("crypto");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
require("./conn");
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


const router=require("./route");

app.use(router);

app.get("/",(req,res)=>{
    res.send(`Hello World`);
});
app.get("/api/getkey",(req,res)=>{
    return res.status(200).json({key:process.env.RAZORPAY_APT_KEY})
});
app.post("/checkout",async(req,res)=>{

    const options ={
        amount:Number(req.body.amount*100),
        currency:"INR",
    };
    const order = await instance.orders.create(options).catch((err)=>{
        console.log(`Payment Error:${err.message}`);
    });
    console.log(order);
    res.status(200).json({
        success:true,order
    })
    mail=req.body.email;
    Amt=Number(req.body.amount*100);
})

app.post("/paymentverification",async(req,res)=>{
    const {razorpay_payment_id,razorpay_order_id,razorpay_signature}=req.body;
    console.log(req.body);
   const body = razorpay_order_id + "|" +razorpay_payment_id;
   const expectedsignature =crypto.createHmac('sha256',process.env.RAZORPAY_API_SECRET).update(body.toString()).digest('hex');
   if(expectedsignature === razorpay_signature){
    if(Amt==44900){
         cnt=120;
         bet=0;
    }
    else if(Amt==124900){
        cnt=500;
        bet=1;
    }
    else{
        cnt=5000000;
        bet=1;
    }
    const changing=await userdatas.updateMany({Email:mail},{$set:{count:cnt,bt:bet,Exp:fir}});
    console.log(changing);
    // res.status(200).send(changing); 
    res.redirect(`http://localhost:3000/Home/paymentsuccess?reference=${razorpay_payment_id}`);
   }
   else{
    res.status(400).send(`Signature:${razorpay_signature} and the expected one is ${expectedsignature}`);
    // alert(`Payment Failed due to Incorrect Details`);
    // res.status(402).redirect(`http://localhost:3000/`);
   }
})


app.listen(port,()=>{
    console.log(`Server is running`)
})