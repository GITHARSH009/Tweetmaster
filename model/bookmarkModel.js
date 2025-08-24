const mongoose= require('mongoose');

const bookmarkSchema=new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email:{ type: String, required: true },
    tweetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tweet', required: true },
    createdAt: { type: Date, default: Date.now }
})

const Bookmark= mongoose.model('Bookmark', bookmarkSchema);
module.exports= Bookmark;