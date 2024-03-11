const express=require('express');
const router=new express.Router();
const post=require("./model");
const userdatas=require("./modelt")

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
})

module.exports=router;