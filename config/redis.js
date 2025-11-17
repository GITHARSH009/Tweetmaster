const redis=require("redis");
const dotenv=require("dotenv");
dotenv.config();
const {logger}=require("../middleware/logger")

const redisClient=redis.createClient({
    url: process.env.REDIS_URL
});

redisClient.on("connect",()=>{
    logger.info("Connected to Redis");
});

redisClient.on("error",(err)=>{
    logger.info("Redis error: ",err);  
});

module.exports=redisClient;