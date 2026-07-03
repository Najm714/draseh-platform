// backend/models/Video.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'عنوان الفيديو مطلوب'],
        trim: true,
        minlength: [3, 'عنوان الفيديو يجب أن يكون 3 أحرف على الأقل'],
        maxlength: [200, 'عنوان الفيديو يجب أن لا يتجاوز 200 حرف']
    },
    subjectId: {
        type: Number,
        required: [true, 'معرف المادة مطلوب'],
        index: true
    },
    subjectName: {
        type: String,
        required: [true, 'اسم المادة مطلوب'],
        trim: true
    },
    specialtyName: {
        type: String,
        default: '',
        trim: true
    },
    universityName: {
        type: String,
        default: '',
        trim: true
    },
    description: {
        type: String,
        default: '',
        maxlength: [500, 'الوصف يجب أن لا يتجاوز 500 حرف'],
        trim: true
    },
    fileName: {
        type: String,
        required: [true, 'اسم الملف مطلوب'],
        trim: true
    },
    filePath: {
        type: String,
        required: [true, 'مسار الملف مطلوب'],
        trim: true
    },
    fileSize: {
        type: String,
        required: [true, 'حجم الملف مطلوب'],
        trim: true
    },
    fileType: {
        type: String,
        default: 'video/mp4',
        trim: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    views: {
        type: Number,
        default: 0,
        min: [0, 'عدد المشاهدات لا يمكن أن يكون سالباً']
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // ✅ حقل duration - اختياري وليس مطلوباً
    duration: {
        type: Number,
        default: 0,
        min: 0
    },
    thumbnail: {
        type: String,
        default: '',
        trim: true
    },
    tags: {
        type: [String],
        default: [],
        index: true
    }
}, {
    timestamps: true
});

// ✅ إضافة فهرس مركب للبحث السريع
videoSchema.index({ subjectId: 1, uploadDate: -1 });
videoSchema.index({ title: 'text', description: 'text', subjectName: 'text' });

// ✅ Middleware: قبل الحفظ، تنظيف البيانات
videoSchema.pre('save', function(next) {
    if (this.tags && Array.isArray(this.tags)) {
        this.tags = this.tags
            .filter(tag => tag && tag.trim().length > 0)
            .map(tag => tag.trim().toLowerCase());
    }
    
    if (this.subjectId) {
        this.subjectId = parseInt(this.subjectId);
    }
    
    if (this.description) {
        this.description = this.description.trim();
    }
    
    // ✅ إذا كان duration نصاً، حوله إلى رقم
    if (this.duration && typeof this.duration === 'string') {
        const num = parseFloat(this.duration);
        this.duration = isNaN(num) ? 0 : num;
    }
    
    next();
});

// ✅ دالة مساعدة: زيادة عدد المشاهدات
videoSchema.methods.incrementViews = async function() {
    this.views += 1;
    return this.save();
};

// ✅ دالة مساعدة: الحصول على رابط الفيديو
videoSchema.methods.getVideoUrl = function(baseUrl) {
    if (!baseUrl) {
        baseUrl = '';
    }
    let path = this.filePath || '';
    if (path.includes('uploads/videos/')) {
        const fileName = path.split('uploads/videos/').pop();
        return `${baseUrl}/uploads/videos/${fileName}`;
    }
    return `${baseUrl}/uploads/videos/${this.fileName}`;
};

// ✅ دالة مساعدة: الحصول على معلومات الملف
videoSchema.methods.getFileInfo = function() {
    return {
        filename: this.fileName,
        filePath: this.filePath,
        fileSize: this.fileSize,
        fileType: this.fileType,
        duration: this.duration
    };
};

// ✅ دالة static: البحث عن فيديوهات مادة معينة
videoSchema.statics.findBySubject = function(subjectId) {
    return this.find({ 
        subjectId: parseInt(subjectId),
        isActive: true 
    }).sort({ uploadDate: -1 });
};

// ✅ دالة static: البحث عن فيديوهات جامعة معينة
videoSchema.statics.findByUniversity = function(universityName) {
    return this.find({ 
        universityName: { $regex: universityName, $options: 'i' },
        isActive: true 
    }).sort({ uploadDate: -1 });
};

// ✅ دالة static: البحث النصي
videoSchema.statics.search = function(query) {
    return this.find(
        { 
            $text: { $search: query },
            isActive: true 
        },
        { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
};

// ✅ دالة static: الحصول على إحصائيات الفيديوهات
videoSchema.statics.getStats = async function() {
    const total = await this.countDocuments();
    const active = await this.countDocuments({ isActive: true });
    const totalViews = await this.aggregate([
        { $group: { _id: null, total: { $sum: '$views' } } }
    ]);
    
    const bySubject = await this.aggregate([
        { $group: { _id: '$subjectName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    
    return {
        total,
        active,
        totalViews: totalViews.length > 0 ? totalViews[0].total : 0,
        bySubject
    };
};

// ✅ إنشاء النموذج
const Video = mongoose.model('Video', videoSchema);

module.exports = Video;