const express=require('express');
const router=new express.Router();
const post=require("./model");
const userdatas=require("./modelt");
// const planuser=require("./planuser");
const Notification = require("./model/notificationModel");
const dotenv=require('dotenv')
dotenv.config();


router.post("/post",async(req,res)=>{
    try {
        const newpost=new post(req.body);
        await newpost.save();
        res.status(201).send(newpost);
    } catch (error) {
        res.status(402).send(`Unknown Error:${error}`);
    }
});
router.get("/post",async(req,res)=>{
    try {
        const getpost=(await post.find({})).reverse();
        res.status(201).send(getpost);
    } catch (error) {
        res.status(402).send(`Unknown Error:${error}`);
    }
});
router.get("/post_detail",async(req,res)=>{
    try {
        const email=req.query.email;
        const getpost=(await post.find({Email:email})).reverse();
        await res.send(getpost);
    } catch (error) {
        res.status(402).send(`Unknown Error:${error}`);
    }
});

router.patch('/userUpdates/:Email',async(req,res)=>{
    const filter=req.params;
    const profile=req.body;
    const options={upsert:true};
    const updateDoc={$set:profile};
    const result=await userdatas.updateOne(filter,updateDoc,options);
    res.send(result);
})

router.post("/register",async(req,res)=>{
    try {
        const newuser=new userdatas(req.body);
        await newuser.save();
        res.status(201).send(newuser);
    } catch (error) {
        res.status(402).send(`Unknown Error:${error}`);
    }
});
router.get("/loggedInUser",async(req,res)=>{
    const email=req.query.email;
    const user=await userdatas.find({Email:email});
    await res.send(user)
});
router.patch("/updone/:Email",async(req,res)=>{
      const filter=req.params;
      const profile=req.body;
      const options={upsert:true};
      const updateDoc={$set:profile};
      const result=await userdatas.updateOne(filter,updateDoc,options);
      res.send(result);
});

router.patch("/exp/:Email",async(req,res)=>{
    try {
      const filter=req.params;
      const profile=req.body;
      const options={upsert:true};
      const updateDoc={$set:profile};
      const result=await userdatas.updateOne(filter,updateDoc,options);
      res.send(result);   
    } catch (error) {
        res.status(402).send(`Expiration Error:${error}`);
    }
});


router.get("/notifications/:Email", async (req, res) => {
    try {
        const email = req.params.Email;
        const notifications = await Notification.find({
            $or: [
                {notifyTo:"everyone"},
                {notifyTo: email}
            ]
        }).sort({ timestamp:-1});
        res.status(200).send(notifications);
    } catch (error) {
        res.status(402).send(`Unknown Error:${error}`);
    }
});

router.post("/notifications", async (req, res) => {
    try {
        const newNotification = new Notification(req.body);
        await newNotification.save();
        res.status(201).send(newNotification);
    } catch (error) {
        res.status(402).send(`Unknown Error:${error}`);
    }
});


router.get("/getuser/:Email",async(req,res)=>{
    try {
        const email=req.params.Email;
        const user=await userdatas.find({Email:{$nin:email}});
        if(user.length>0){
            res.status(200).send(user);
        }else{
            res.status(404).send("User not found");
        }
    } catch (error) {
        res.status(402).send(`Unknown Error:${error}`);
    }
});

module.exports=router;