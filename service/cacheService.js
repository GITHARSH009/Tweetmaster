const redisClient = require("../config/redis");
const {logger}=require("../middleware/logger");

const Cache_Expiry = 10 * 60 * 60; // 10 hours
const Cache_Prefix = "userPosts";

const getCache = async (key) => {
    try {
        const data=await redisClient.get(`${Cache_Prefix}:${key}`);
        if(!data || data.length===0){
            logger.info("Cache Miss");
            return null;
        }
        return JSON.parse(data);
    } catch (error) {
        logger.info("Error in getCache:", error);
        return null;
    }
};

const setCache = async (key, value, expiry = Cache_Expiry) => {
    try {
        const stringData=JSON.stringify(value);
        await redisClient.setEx(`${Cache_Prefix}:${key}`,expiry,stringData);
        return true;
    } catch (error) {
        logger.info("Error in setCache:", error);
        return false;
    }
};

const delCache = async (key) => {
    try {
        await redisClient.del(`${Cache_Prefix}:${key}`);
        return true;
    } catch (error) {
        logger.info("Error in delCache:", error);
        return false;
    }
};

module.exports = { getCache, setCache, delCache };