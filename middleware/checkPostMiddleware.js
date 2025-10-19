const userdatas = require("../model/userModal");

const checkPostLimit = async (req, res, next) => {
    try {
        // SECURITY: Use authenticated user's email from Firebase token
        // Not from request body (which can be faked)
        const userEmail = req.user.email; // From Firebase auth middleware
        
        if (!userEmail) {
            return res.status(401).json({ 
                success: false, 
                message: "Authentication required" 
            });
        }
        
        // Get user data using authenticated email
        const user = await userdatas.findOne({ Email: userEmail });
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User profile not found. Please complete registration." 
            });
        }
        
        // Check if month expired - reset count
        const today = new Date();
        const currentDate = today.getDate().toString();
        const currentMonth = (today.getMonth() + 1) % 12;
        const userExp = user.Exp;
        
        const expNum = parseInt(userExp);
        const currentNum = parseInt(currentDate + currentMonth);
        
        if (expNum <= currentNum) {
            user.count = user.bt === 1 ? 60 : 20;
            user.Exp = currentDate + ((currentMonth + 1) % 12);
            await user.save();
        }
        
        // Check if user has posts remaining
        if (user.count <= 0) {
            return res.status(429).json({
                success: false,
                message: "Monthly post limit reached. Upgrade to continue posting.",
                remainingPosts: 0,
                isPremium: user.bt === 1
            });
        }
        
        // Attach full user to request
        req.userProfile = user;
        next();
        
    } catch (error) {
        // console.error("Post limit check error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to verify post limit",
            error: error.message 
        });
    }
};

module.exports = checkPostLimit;