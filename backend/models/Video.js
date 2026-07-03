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
    // ✅ حقل fileName مطلوب
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
    fileType: {
        type: String,
        default: 'video/mp4'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    views: {
        type: Number,
        default: 0
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Video', videoSchema);