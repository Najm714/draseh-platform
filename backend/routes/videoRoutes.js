// routes/videoRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/uploadVideo');
const {
    getVideosBySubject,
    getVideoById,
    getAllVideos,
    uploadVideo,
    deleteVideo,
    incrementViews
} = require('../controllers/videoController');

// ✅ مسار جلب جميع الفيديوهات
router.get('/all', getAllVideos);

// ✅ مسار جلب فيديوهات المادة
router.get('/subject/:subjectId', getVideosBySubject);

// ✅ مسار جلب فيديو واحد - يجب أن يكون بعد /all و /subject
router.get('/:id', getVideoById);

// ✅ مسار تحديث المشاهدات
router.put('/:id/views', incrementViews);

// ✅ مسارات للمدير فقط
router.post('/upload', protect, authorize('admin'), upload.single('video'), uploadVideo);
router.delete('/:id', protect, authorize('admin'), deleteVideo);

module.exports = router;