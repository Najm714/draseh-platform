// backend/routes/modelRoutes.js
const express = require('express');
const router = express.Router();
const Model = require('../models/Model');
const { protect, authorize } = require('../middleware/auth');

// جلب جميع النماذج
router.get('/', async (req, res) => {
    try {
        const models = await Model.find()
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: models.length, data: models });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب نموذج محدد
router.get('/:id', async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) return res.status(404).json({ success: false, message: 'النموذج غير موجود' });
        res.json({ success: true, data: model });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// رفع نموذج جديد
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, category, description, fileName, fileSize, fileType, fileData, mainService, subService } = req.body;
        if (!title || !category || !fileName || !fileData || !mainService) {
            return res.status(400).json({ success: false, message: 'البيانات المطلوبة ناقصة' });
        }
        const model = await Model.create({
            title, category, description: description || '',
            fileName, fileSize: fileSize || '0 KB',
            fileType: fileType || 'application/octet-stream',
            fileData, mainService, subService: subService || 'خدمة فرعية',
            uploadedBy: req.user.id
        });
        res.status(201).json({ success: true, message: 'تم رفع النموذج بنجاح', data: model });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف نموذج
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) return res.status(404).json({ success: false, message: 'النموذج غير موجود' });
        await model.deleteOne();
        res.json({ success: true, message: 'تم حذف النموذج بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;