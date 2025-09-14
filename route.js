const express=require('express');
const router=new express.Router();
const post=require("./model/postModal");
const userdatas=require("./model/userModal");
const Notification = require("./model/notificationModel");
const dotenv=require('dotenv');
dotenv.config();
const {getCache,setCache,delCache}=require("./service/cacheService");
const cacheKey="allPosts";

const verifyFirebaseToken = require('./middleware/authmiddleware');

// News API endpoint
router.get("/news", async (req, res) => {
    try {
        const { q = 'India', pageSize = 20 } = req.query;
        
        // Input validation
        if (!q.trim()) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const NEWS_API_KEY = process.env.NEWS_API_KEY;
        
        if (!NEWS_API_KEY) {
            return res.status(500).json({ error: 'News API key not configured' });
        }

        const newsApiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`;
        
        const response = await fetch(newsApiUrl);
        
        if (!response.ok) {
            throw new Error(`News API returned status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Optional: Filter articles with images and valid content
        if (data.articles) {
            const filteredArticles = data.articles.filter(
                article => article.urlToImage && article.title && article.description
            );
            data.articles = filteredArticles;
        }
        
        res.status(200).json(data);
    } catch (error) {
        console.error('News fetch error:', error);
        res.status(500).json({ 
            error: 'Unable to fetch news at this time',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// router.use(verifyFirebaseToken);

router.post("/post",async(req,res)=>{
    try {
        const newpost=new post(req.body);
        await newpost.save();
        await delCache(cacheKey);
        res.status(201).send(newpost);
    } catch (error) {
        res.status(402).send(`Unknown Error:${error}`);
    }
});

router.get("/post",verifyFirebaseToken,async(req,res)=>{
    try {
        const cachedData=await getCache(cacheKey);
        if(cachedData!==null){
            return res.status(200).send(cachedData);
        }
        const getpost=(await post.find({})).reverse();
        await setCache(cacheKey,getpost);
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