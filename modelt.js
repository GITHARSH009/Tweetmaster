const mongoose=require('mongoose');

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
    }
},{
    timestamps:true
});


const userdatas=new mongoose.model("userdata",userdata);


module.exports=userdatas;