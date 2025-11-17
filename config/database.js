const mongoose=require('mongoose');
const url=process.env.url
const dotenv=require('dotenv')
dotenv.config();
const {logger}=require("../middleware/logger");

mongoose.connect(url).then(()=>{
    logger.info("Connected Successfully");
}).catch((err)=>{
    logger.error(`Expected Error:${err}`);
});

module.exports={mongoose}