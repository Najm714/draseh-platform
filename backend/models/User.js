// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'الاسم مطلوب']
    },
    email: {
        type: String,
        required: [true, 'البريد الإلكتروني مطلوب'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'كلمة المرور مطلوبة'],
        minlength: 6
    },
    role: {
        type: String,
        enum: ['admin', 'expert', 'user', 'client'],  // ✅ أضف 'user' هنا
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expertise: [{
        type: String
    }],
    bio: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', UserSchema);