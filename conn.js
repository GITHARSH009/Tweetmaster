const mongoose=require('mongoose');
const url=process.env.url
const dotenv=require('dotenv')
dotenv.config();

mongoose.connect(url).then(()=>{
    console.log("Connected Successfully");
}).catch((err)=>{
    console.error(`Expected Error:${err}`);
})