const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================================
// وسيط التحقق من التوكن (Protect)
// ============================================================
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'غير مصرح بالوصول، يرجى تسجيل الدخول' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'المستخدم غير موجود' 
            });
        }
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'توكن غير صالح أو منتهي الصلاحية' 
        });
    }
};

// ============================================================
// وسيط التحقق من الصلاحيات (Authorize)
// ============================================================
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `ليس لديك صلاحية للقيام بهذا الإجراء`
            });
        }
        next();
    };
};

// ============================================================
// تصدير الدوال
// ============================================================
module.exports = { protect, authorize };