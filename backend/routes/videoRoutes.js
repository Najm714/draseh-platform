// backend/routes/videoRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadVideo');
const Video = require('../models/Video');

// ============================================================
// رفع فيديو جديد
// ============================================================
router.post('/upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'يرجى اختيار فيديو'
            });
        }

        const { title, subjectId, subjectName, specialtyName, universityName, description } = req.body;

        if (!title || !subjectId) {
            return res.status(400).json({
                success: false,
                message: 'العنوان ومعرف المادة مطلوبان'
            });
        }

        const video = new Video({
            title,
            subjectId,
            subjectName: subjectName || '',
            specialtyName: specialtyName || '',
            universityName: universityName || '',
            description: description || '',
            filename: req.file.filename,
            filePath: req.file.path,
            fileSize: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            fileType: req.file.mimetype,
            uploadDate: new Date(),
            views: 0
        });

        await video.save();

        res.status(201).json({
            success: true,
            message: 'تم رفع الفيديو بنجاح',
            data: video
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الفيديو:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// جلب جميع الفيديوهات
// ============================================================
router.get('/all', async (req, res) => {
    try {
        const videos = await Video.find().sort({ uploadDate: -1 });
        res.json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// جلب فيديوهات مادة معينة
// ============================================================
router.get('/subject/:subjectId', async (req, res) => {
    try {
        const videos = await Video.find({ subjectId: req.params.subjectId });
        res.json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// جلب فيديو محدد
// ============================================================
router.get('/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }
        res.json({ success: true, data: video });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// تحديث عدد المشاهدات
// ============================================================
router.put('/:id/views', async (req, res) => {
    try {
        const video = await Video.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }
        res.json({ success: true, data: video });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;