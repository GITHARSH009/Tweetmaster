const redisClient = require("../config/redis");
const {logger}=require("../middleware/logger");

const markUserOnline=async (req,res,next)=>{
    try {
        if((req.query && req.query.email)||(req.user && req.user.email)||(req.body && req.body.Email) ||(req.params && req.params.Email)){
            const email=req.query.email||req.user.email || req.body.Email || req.params.Email;
            await redisClient.setEx(`presence:${email}`,300,Date.now().toString());
        }
    } catch (error) {
         logger.error("Error in getting presence:", error);
    }
    finally{
        next();
    }
};

const getAllOnlineUsers=async(req,res)=>{
  try {
    const keys=await redisClient.keys('presence:*');
    const onlineUsers=keys.map(key=>key.replace('presence:',''));
    logger.info('Successfully get the online users');
    res.json({onlineUsers});
  } catch (error) {
    logger.error('Failed to fetch online users',error);
    res.status(500).json({error:'Failed to fetch online users'});
  }
};

module.exports={markUserOnline,getAllOnlineUsers};
