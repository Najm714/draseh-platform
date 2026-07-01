// backend/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    serviceType: {
        type: String,
        required: true,
        default: 'خدمة'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    deadline: {
        type: Date,
        required: true
    },
    budget: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'revision', 'cancelled'],
        default: 'pending'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    assignedExpert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    expertNotes: {
        type: String,
        default: ''
    },
    files: [{
        filename: String,
        path: String,
        size: Number,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],
    assignedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema);