const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'عنوان النموذج مطلوب'],
        trim: true
    },
    category: {
        type: String,
        enum: ['proposal', 'thesis', 'survey', 'statistics', 'publication', 'other'],
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true
    },
    fileData: {
        type: String, // تخزين الملف كـ Base64
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Model', modelSchema);