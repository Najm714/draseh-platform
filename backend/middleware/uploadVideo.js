// backend/middleware/uploadVideo.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// التأكد من وجود مجلد الفيديوهات
const videosDir = path.join(__dirname, '../uploads/videos');
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
}

// ✅ إعداد التخزين - هذا هو المكان الذي يتم فيه تعيين filename
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, videosDir);
    },
    filename: function (req, file, cb) {
        // ✅ هنا يتم إنشاء اسم الملف
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'video-' + uniqueSuffix + ext);
    }
});

// فلتر الملفات - قبول الفيديوهات فقط
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('يرجى رفع ملف فيديو صالح (mp4, webm, avi, etc)'), false);
    }
};

// إنشاء الميدل وير
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500 ميجابايت
    },
    fileFilter: fileFilter
});

module.exports = upload;