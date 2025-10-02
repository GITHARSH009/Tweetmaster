const mongoose=require('mongoose');
const date=new Date();
var fir=date.getDate();
fir=fir.toString();
var sec=date.getMonth()+1;
sec=sec%12;
fir=fir+sec;

const userdata=new mongoose.Schema({
    Username:{
        type:String,
        required:true,
        trim:true,
    },
    Name:{
        type:String,
        required:true,
        trim:true,
    },
    Email:{
        type:String,
        required:true,
        lowercase:true,
        trim:true
    },
    coverImage:{
        type:String
    },
    profileImage:{
        type:String,
        trim:true
    },
    bio:{
       type:String,
       trim:true
    },
    location:{
        type:String,
        trim:true
    },
    website:{
        type:String,
        trim:true
    },
    dob:{
        type:String,
        trim:true
    },
    count:{
        type:Number,
        default:20,
        required:true
    },
    bt:{
         type:Number,
         default:0,
         required:true
    },
    Exp:{
        type:String,
        default:fir,
        required:true
    }
},{
    timestamps:true
});


const userdatas=new mongoose.model("userdata",userdata);


module.exports=userdatas;