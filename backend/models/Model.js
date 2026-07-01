// backend/models/Model.js
const mongoose = require('mongoose');

const ModelSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['proposal', 'thesis', 'survey', 'statistics', 'publication', 'other']
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
        default: '0 KB'
    },
    fileType: {
        type: String,
        default: 'application/octet-stream'
    },
    fileData: {
        type: String,
        required: true
    },
    // ✅ أضف هذه الحقول الجديدة
    mainService: {
        type: String,
        required: true,
        enum: ['statistics', 'proposal', 'literature', 'publication', 'design', 'video', 'consulting', 'tutoring', 'other']
    },
    subService: {
        type: String,
        default: 'خدمة فرعية'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Model', ModelSchema);