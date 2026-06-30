const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================
// المسار المطلق لمجلد الفيديوهات
// ============================================================
const videoDir = path.join(__dirname, '..', 'uploads', 'videos');

// ============================================================
// التأكد من وجود مجلد الفيديوهات
// ============================================================
if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
    console.log('✅ تم إنشاء مجلد الفيديوهات في:', videoDir);
} else {
    console.log('✅ مجلد الفيديوهات موجود بالفعل في:', videoDir);
}

// ============================================================
// إعداد تخزين الفيديوهات
// ============================================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, videoDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'video-' + uniqueSuffix + ext);
    }
});

// ============================================================
// فلترة أنواع الفيديوهات المسموحة
// ============================================================
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('نوع الملف غير مدعوم. يرجى رفع فيديو بصيغة MP4, WebM, OGG, AVI, أو MKV.'), false);
    }
};

// ============================================================
// إعداد Multer
// ============================================================
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500 ميجابايت
    },
    fileFilter: fileFilter
});

module.exports = upload;