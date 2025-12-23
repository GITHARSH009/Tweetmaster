const express=require('express');
const mongoose = require('mongoose');
const {logger}=require("./middleware/logger");
const checkPostLimit = require('./middleware/checkPostMiddleware');
const router=new express.Router();
const post=require("./model/postModal");
const userdatas=require("./model/userModal");
const Notification = require("./model/notificationModel");
const dotenv=require('dotenv');
dotenv.config();
const {getCache,setCache,delCache}=require("./service/cacheService");
const cacheKey="allPosts";
const fetchWithRetry = require('./utility/fetchWithRetry');

const verifyFirebaseToken = require('./middleware/authmiddleware');
// router.use(verifyFirebaseToken);

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
        logger.error('News fetch error:', error);
        res.status(500).json({ 
            error: 'Unable to fetch news at this time',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Add this route to your backend router
router.get("/movies", async (req, res) => {
    try {
        const { category = 'popular', query = '', page = 1 } = req.query;
        
        const MOVIES_API_KEY = process.env.MOVIES_API_KEY;
        
        if (!MOVIES_API_KEY) {
            return res.status(500).json({ error: 'Movies API key not configured' });
        }

        const BASE_URL = 'https://api.themoviedb.org/3';
        let movieApiUrl;

        // Handle search vs category endpoints
        if (query.trim()) {
            movieApiUrl = `${BASE_URL}/search/movie?api_key=${MOVIES_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
        } else {
            // Map category names to API endpoints
            const categoryMap = {
                'popular': 'popular',
                'upcoming': 'upcoming',
                'now_playing': 'now_playing',
                'top_rated': 'top_rated'
            };
            
            const apiCategory = categoryMap[category] || 'popular';
            movieApiUrl = `${BASE_URL}/movie/${apiCategory}?api_key=${MOVIES_API_KEY}&page=${page}`;
        }
        
        // Use the reusable retry utility
        const response = await fetchWithRetry(movieApiUrl, {
            maxRetries: 3,
            timeout: 6000
        });
        
        const data = await response.json();
        
        // Optional: Filter movies with posters and valid content
        if (data.results) {
            const filteredMovies = data.results.filter(
                movie => movie.poster_path && movie.title && movie.overview
            );
            data.results = filteredMovies;
        }
        
        res.status(200).json(data);
    } catch (error) {
        logger.error('Movies fetch error:', error);
        res.status(500).json({ 
            error: 'Unable to fetch movies at this time',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.post("/post", 
    verifyFirebaseToken,
    checkPostLimit,
    async(req, res) => {
    
    try {
        // Get authenticated user email
        const authenticatedEmail = req.user.email;
        
        // Validate email match
        if (req.body.Email !== authenticatedEmail) {
            return res.status(403).json({
                success: false,
                message: 'Cannot create post for another user'
            });
        }
        
        // Step 1: Create post first
        const newpost = new post({
            Profile: req.body.Profile,
            Post: req.body.Post,
            Photo: req.body.Photo,
            Username: req.userProfile.Username,
            Name: req.userProfile.Name,
            Email: authenticatedEmail,
            bt: req.userProfile.bt
        });
        
        await newpost.save();
        // logger.info('✅ Post created:', newpost._id);
        
        // Step 2: Decrement count (separate operation)
        try {
            await userdatas.findOneAndUpdate(
                { Email: authenticatedEmail },
                { $inc: { count: -1 } }
            );
            logger.info('✅ Count decremented');
        } catch (countError) {
            // If count update fails, log but don't fail the request
            logger.error('⚠️ Count update failed:', countError);
            // Post is still created successfully
        }
        
        // Step 3: Clear cache
        try {
            await delCache(cacheKey);
        } catch (cacheError) {
            logger.error('⚠️ Cache clear failed:', cacheError);
            // Not critical
        }
        
        // Return success
        res.status(201).json({
            success: true,
            post: newpost,
            remainingPosts: Math.max(0, req.userProfile.count - 1),
            message: "Post created successfully"
        });
        
    } catch (error) {
        logger.error("❌ Post creation failed:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create post",
            error: error.message
        });
    }
});

router.get("/post",async(req,res)=>{
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
        const {Email, Username, Name}=req.body;
        logger.info(`here is the email of the user ${Email.toLowerCase()}:`);
        const existingUser=await userdatas.find({Email:Email.toLowerCase()});
        if(existingUser!=null && existingUser!=""){
            logger.info(`User Already registered`);
            return res.status(200).send(existingUser);
        }
        const newuser=new userdatas(req.body);
        await newuser.save();
        res.status(201).send(newuser);
    } catch (error) {
        if (error.code === 11000) {
            const existingUser = await userdatas.findOne({ Email: req.body.Email });
            logger.info("User Already registered");
            return res.status(200).send(existingUser);
        }
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