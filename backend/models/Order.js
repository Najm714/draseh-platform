const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    serviceType: {
        type: String,
        enum: ['proposal', 'translation', 'statistics', 'proofreading', 'other'],
        required: true
    },
    title: {
        type: String,
        required: [true, 'عنوان الطلب مطلوب']
    },
    description: {
        type: String,
        required: [true, 'وصف الطلب مطلوب']
    },
    files: [{
        filename: String,
        path: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'revision', 'cancelled'],
        default: 'pending'
    },
    deadline: {
        type: Date,
        required: [true, 'الموعد النهائي مطلوب']
    },
    budget: {
        type: Number,
        default: 0
    },
    assignedExpert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);