const redis=require("redis");
const dotenv=require("dotenv");
dotenv.config();

const redisClient=redis.createClient({
    url: process.env.REDIS_URL
});

redisClient.on("connect",()=>{
    console.log("Connected to Redis");
});

redisClient.on("error",(err)=>{
    console.log("Redis error: ",err);  
});

module.exports=redisClient;