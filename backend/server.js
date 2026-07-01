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
// المسار الرئيسي (الصفحة الرئيسية للـ API)
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
// مسار الصحة (Health Check)
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
// استيراد المسارات (Routes)
// ============================================================
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const videoRoutes = require('./routes/videoRoutes');
const modelRoutes = require('./routes/modelRoutes');

// ============================================================
// استخدام المسارات
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/models', modelRoutes);

// ============================================================
// مسارات الطلبات المباشرة (بدون use)
// ============================================================

// ============================================================
// 1. مسارات الطلبات (Orders)
// ============================================================

// جلب جميع الطلبات للمدير
app.get('/api/orders/admin/all', async (req, res) => {
    try {
        const Order = require('./models/Order');
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب طلبات الخبير
app.get('/api/orders/expert', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const orders = await Order.find({ assignedExpert: req.user.id })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الخبير:', error);
        if (error.name === 'CastError' || (error.message && error.message.includes('CastError'))) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب جميع الطلبات للمستخدم العادي
app.get('/api/orders', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const orders = await Order.find({ user: req.user.id })
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات المستخدم:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// إنشاء طلب جديد
app.post('/api/orders', async (req, res) => {
    try {
        const Order = require('./models/Order');
        req.body.user = req.user.id;
        const order = await Order.create(req.body);
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الطلب بنجاح ✅',
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب طلب محدد
app.get('/api/orders/:id', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user._id.toString() || 
            (req.user.role === 'expert' && req.user.id === order.assignedExpert?._id.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض هذا الطلب'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// تحديث طلب
app.put('/api/orders/:id', async (req, res) => {
    try {
        const Order = require('./models/Order');
        let order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user.toString();

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتعديل هذا الطلب'
            });
        }

        if (req.user.role !== 'admin') {
            delete req.body.assignedExpert;
            delete req.body.budget;
        }

        order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'تم تحديث الطلب بنجاح ✅',
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// حذف طلب
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user.toString();

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لحذف هذا الطلب'
            });
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
            message: 'تم حذف الطلب بنجاح 🗑️'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// رفع ملفات للطلب
app.post('/api/orders/:id/upload', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const upload = require('./middleware/upload');
        
        upload.array('files', 5)(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

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

            const isAuthorized = 
                req.user.role === 'admin' || 
                req.user.id === order.user.toString();

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: 'ليس لديك صلاحية لرفع ملفات لهذا الطلب'
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
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الملفات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب ملفات الطلب
app.get('/api/orders/:id/files', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user.toString() ||
            (req.user.role === 'expert' && req.user.id === order.assignedExpert?.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض هذه الملفات'
            });
        }

        res.status(200).json({
            success: true,
            files: order.files || []
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الملفات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// تحميل ملف معين
app.get('/api/orders/:orderId/files/:fileIndex', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const order = await Order.findById(req.params.orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user.toString() ||
            (req.user.role === 'expert' && req.user.id === order.assignedExpert?.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتحميل هذا الملف'
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// 2. مسارات المستخدمين (Users)
// ============================================================

// جلب جميع الخبراء
app.get('/api/users/experts', async (req, res) => {
    try {
        const User = require('./models/User');
        const experts = await User.find({ role: 'expert' })
            .select('-password')
            .sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: experts
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الخبراء:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب جميع المستخدمين
app.get('/api/users', async (req, res) => {
    try {
        const User = require('./models/User');
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب مستخدم محدد
app.get('/api/users/:id', async (req, res) => {
    try {
        const User = require('./models/User');
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// تحديث مستخدم
app.put('/api/users/:id', async (req, res) => {
    try {
        const User = require('./models/User');
        const { isActive, expertise, bio, role } = req.body;
        const updateData = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (expertise !== undefined) updateData.expertise = expertise;
        if (bio !== undefined) updateData.bio = bio;
        if (role !== undefined && req.user.role === 'admin') updateData.role = role;
        
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// حذف مستخدم
app.delete('/api/users/:id', async (req, res) => {
    try {
        const User = require('./models/User');
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// 3. مسارات الفيديوهات الإضافية
// ============================================================

// جلب جميع الفيديوهات
app.get('/api/videos/all', async (req, res) => {
    try {
        const Video = require('./models/Video');
        const videos = await Video.find().sort({ uploadDate: -1 });
        res.status(200).json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الفيديوهات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب فيديوهات مادة معينة
app.get('/api/videos/subject/:subjectId', async (req, res) => {
    try {
        const Video = require('./models/Video');
        const videos = await Video.find({ subjectId: req.params.subjectId });
        res.status(200).json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        console.error('❌ خطأ في جلب فيديوهات المادة:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// جلب فيديو محدد
app.get('/api/videos/:id', async (req, res) => {
    try {
        const Video = require('./models/Video');
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// تحديث عدد مشاهدات الفيديو
app.put('/api/videos/:id/views', async (req, res) => {
    try {
        const Video = require('./models/Video');
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// 4. معالجة 404 - يجب أن يكون في النهاية
// ============================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'المسار المطلوب غير موجود',
        path: req.originalUrl
    });
});

// ============================================================
// 5. معالجة الأخطاء العامة
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