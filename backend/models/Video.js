// backend/models/Video.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'عنوان الفيديو مطلوب'],
        trim: true
    },
    subjectId: {
        type: Number,
        required: [true, 'معرف المادة مطلوب'],
        index: true
    },
    subjectName: {
        type: String,
        required: true
    },
    specialtyName: {
        type: String,
        default: ''
    },
    universityName: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        default: '00:00'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false  // ✅ تغيير إلى false
    },
    views: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// فهرس للبحث السريع
videoSchema.index({ subjectId: 1, uploadDate: -1 });

module.exports = mongoose.model('Video', videoSchema);