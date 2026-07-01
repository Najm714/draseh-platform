const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// تحميل متغيرات البيئة
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Middleware
// ============================================================
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ============================================================
// خدمة الملفات الثابتة (Frontend)
// ============================================================
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================
// إنشاء مجلدات uploads
// ============================================================
const uploadsDir = path.join(__dirname, 'uploads');
const videosDir = path.join(uploadsDir, 'videos');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 تم إنشاء مجلد uploads');
}
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
    console.log('📁 تم إنشاء مجلد videos');
}

// ============================================================
// خدمة الملفات الثابتة (Uploads)
// ============================================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/videos', express.static(path.join(__dirname, 'uploads', 'videos')));

// ============================================================
// الاتصال بقاعدة البيانات
// ============================================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
    .catch(err => console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message));

// ============================================================
// استيراد النماذج (Models)
// ============================================================
const Video = require('./models/Video');
const Model = require('./models/Model');
const Order = require('./models/Order');
const User = require('./models/User');

// ============================================================
// استيراد الميدل وير
// ============================================================
const uploadVideo = require('./middleware/uploadVideo');
const upload = require('./middleware/upload');

// ============================================================
// المسار الرئيسي
// ============================================================
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: '🚀 مرحباً بك في منصة ارتقاء - الخادم يعمل بنجاح!',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            orders: '/api/orders',
            videos: '/api/videos',
            models: '/api/models',
            users: '/api/users',
            health: '/api/health'
        },
        status: {
            server: 'running',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            time: new Date().toISOString()
        }
    });
});

// ============================================================
// مسار الصحة
// ============================================================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'الخادم يعمل بشكل صحيح 🚀',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// ============================================================
// 1. مسارات المصادقة (AUTH)
// ============================================================
// ============================================================

// تسجيل مستخدم جديد
app.post('/api/auth/register', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { name, email, password, role } = req.body;

        // التحقق من وجود المستخدم
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مسجل بالفعل'
            });
        }

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'user',
            isActive: true
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تسجيل الدخول
// ============================================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const jwt = require('jsonwebtoken');
        const { email, password } = req.body;

        // ✅ التحقق من وجود البريد وكلمة المرور
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // ✅ التحقق من وجود كلمة المرور في قاعدة البيانات
        if (!user.password) {
            return res.status(500).json({
                success: false,
                message: 'خطأ في بيانات المستخدم، يرجى التواصل مع الدعم'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'my_super_secret_key_123456',
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب بيانات المستخدم الحالي
app.get('/api/auth/me', async (req, res) => {
    try {
        const user = await User.findById(req.user?.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ خطأ في جلب بيانات المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// ============================================================
// 2. مسارات الفيديوهات (VIDEOS)
// ============================================================
// رفع فيديو جديد
// ============================================================
app.post('/api/videos/upload', uploadVideo.single('video'), async (req, res) => {
    try {
        console.log('📁 استلام فيديو:', req.file);
        console.log('📦 بيانات:', req.body);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'يرجى اختيار فيديو'
            });
        }

        const { title, subjectId, subjectName, specialtyName, universityName, description } = req.body;

        if (!title || !subjectId || !subjectName) {
            return res.status(400).json({
                success: false,
                message: 'العنوان، معرف المادة، واسم المادة مطلوبون'
            });
        }

        // ✅ إنشاء الفيديو مع fileName من req.file
        const video = new Video({
            title: title,
            subjectId: parseInt(subjectId),
            subjectName: subjectName,
            specialtyName: specialtyName || '',
            universityName: universityName || '',
            description: description || '',
            fileName: req.file.filename,  // ✅ من multer
            filePath: req.file.path,
            fileSize: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            fileType: req.file.mimetype,
            uploadDate: new Date(),
            views: 0
            // uploadedBy: req.user?.id  // ✅ اختياري
        });

        await video.save();

        console.log('✅ تم رفع الفيديو:', video.title);

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

// جلب جميع الفيديوهات
app.get('/api/videos/all', async (req, res) => {
    try {
        const videos = await Video.find().sort({ uploadDate: -1 });
        res.status(200).json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الفيديوهات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب فيديوهات مادة معينة
app.get('/api/videos/subject/:subjectId', async (req, res) => {
    try {
        const videos = await Video.find({ subjectId: parseInt(req.params.subjectId) });
        res.status(200).json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        console.error('❌ خطأ في جلب فيديوهات المادة:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب فيديو محدد
app.get('/api/videos/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: video
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الفيديو:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث عدد المشاهدات
app.put('/api/videos/:id/views', async (req, res) => {
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
        res.status(200).json({
            success: true,
            data: video
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث المشاهدات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف فيديو
app.delete('/api/videos/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'الفيديو غير موجود'
            });
        }

        if (video.filePath && fs.existsSync(video.filePath)) {
            fs.unlinkSync(video.filePath);
        }

        await video.deleteOne();
        res.status(200).json({
            success: true,
            message: 'تم حذف الفيديو بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الفيديو:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// ============================================================
// 3. مسارات النماذج (MODELS)
// ============================================================
// ============================================================

// جلب جميع النماذج
app.get('/api/models', async (req, res) => {
    try {
        const models = await Model.find()
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: models.length,
            data: models
        });
    } catch (error) {
        console.error('❌ خطأ في جلب النماذج:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب نموذج محدد
app.get('/api/models/:id', async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({
                success: false,
                message: 'النموذج غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: model
        });
    } catch (error) {
        console.error('❌ خطأ في جلب النموذج:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// رفع نموذج جديد
app.post('/api/models', async (req, res) => {
    try {
        const { title, category, description, fileName, fileSize, fileType, fileData, mainService, subService } = req.body;

        if (!title || !category || !fileName || !fileData || !mainService) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال جميع البيانات المطلوبة (بما في ذلك الخدمة الرئيسية)'
            });
        }

        const model = new Model({
            title,
            category,
            description: description || '',
            fileName,
            fileSize: fileSize || '0 KB',
            fileType: fileType || 'application/octet-stream',
            fileData,
            mainService,
            subService: subService || 'خدمة فرعية'
        });

        await model.save();

        res.status(201).json({
            success: true,
            message: 'تم رفع النموذج بنجاح',
            data: model
        });
    } catch (error) {
        console.error('❌ خطأ في رفع النموذج:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف نموذج
app.delete('/api/models/:id', async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({
                success: false,
                message: 'النموذج غير موجود'
            });
        }
        await model.deleteOne();
        res.status(200).json({
            success: true,
            message: 'تم حذف النموذج بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف النموذج:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// ============================================================
// 4. مسارات الطلبات (ORDERS)
// ============================================================
// ============================================================

// جلب جميع الطلبات (للمدير)
app.get('/api/orders/admin/all', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب جميع الطلبات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلبات المستخدم
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user?.id })
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// إنشاء طلب جديد
app.post('/api/orders', async (req, res) => {
    try {
        req.body.user = req.user?.id;
        const order = await Order.create(req.body);
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الطلب بنجاح ✅',
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب طلب محدد
app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث طلب
app.put('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        res.status(200).json({
            success: true,
            message: 'تم تحديث الطلب بنجاح ✅',
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف طلب
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        await order.deleteOne();
        res.status(200).json({
            success: true,
            message: 'تم حذف الطلب بنجاح 🗑️'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// رفع ملفات للطلب
app.post('/api/orders/:id/upload', upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يرجى رفع ملف واحد على الأقل'
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const fileData = req.files.map(file => ({
            filename: file.originalname || file.filename,
            path: `uploads/${file.filename}`,
            size: file.size,
            uploadDate: new Date()
        }));

        order.files.push(...fileData);
        await order.save();

        res.status(200).json({
            success: true,
            message: `تم رفع ${req.files.length} ملف بنجاح ✅`,
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الملفات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب ملفات الطلب
app.get('/api/orders/:id/files', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            files: order.files || []
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الملفات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحميل ملف معين
app.get('/api/orders/:orderId/files/:fileIndex', async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }

        const fileIndex = parseInt(req.params.fileIndex);
        if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= order.files.length) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود'
            });
        }

        const file = order.files[fileIndex];
        const filePath = path.join(__dirname, file.path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود على الخادم'
            });
        }

        res.download(filePath, file.filename);
    } catch (error) {
        console.error('❌ خطأ في تحميل الملف:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// ============================================================
// 5. مسارات المستخدمين (USERS)
// ============================================================
// ============================================================

// جلب جميع المستخدمين
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('❌ خطأ في جلب المستخدمين:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب جميع الخبراء
app.get('/api/users/experts', async (req, res) => {
    try {
        const experts = await User.find({ role: 'expert' })
            .select('-password')
            .sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: experts
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الخبراء:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// جلب مستخدم محدد
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ خطأ في جلب المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث مستخدم
app.put('/api/users/:id', async (req, res) => {
    try {
        const { isActive, expertise, bio, role } = req.body;
        const updateData = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (expertise !== undefined) updateData.expertise = expertise;
        if (bio !== undefined) updateData.bio = bio;
        if (role !== undefined) updateData.role = role;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف مستخدم
app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }
        res.status(200).json({
            success: true,
            message: 'تم حذف المستخدم بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف المستخدم:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 6. معالجة 404
// ============================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'المسار المطلوب غير موجود',
        path: req.originalUrl
    });
});

// ============================================================
// 7. معالجة الأخطاء العامة
// ============================================================
app.use((err, req, res, next) => {
    console.error('❌ خطأ:', err.stack);
    res.status(500).json({
        success: false,
        message: err.message || 'حدث خطأ في الخادم'
    });
});

// ============================================================
// تشغيل الخادم
// ============================================================
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
    console.log(`📁 مجلد الفيديوهات: ${videosDir}`);
});