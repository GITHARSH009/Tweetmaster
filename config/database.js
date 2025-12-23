const mongoose=require('mongoose');
const url=process.env.url
const dotenv=require('dotenv')
dotenv.config();
const {logger}=require("../middleware/logger");

mongoose.connect(url).then(async()=>{
    logger.info("Connected Successfully");
    try {
        await mongoose.connection.db.collection('userdatas').createIndex({Email:1},{unique:true});
         logger.info("Email index created/verified");
    } catch (indexError) {
        logger.info("Email index already exists or creation skipped");
    }
}).catch((err)=>{
    logger.error(`Expected Error:${err}`);
});

module.exports={mongoose}