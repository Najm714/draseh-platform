const Model = require('./models/Model');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const { protect, authorize } = require('./middleware/auth');
const upload = require('./middleware/upload');

dotenv.config();
connectDB();

const app = express();

// ============================================================
// Middleware
// ============================================================
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ============================================================
// إنشاء مجلدات uploads إذا لم تكن موجودة
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
// خدمة الملفات الثابتة
// ============================================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/videos', express.static(path.join(__dirname, 'uploads', 'videos')));

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
            health: '/api/health'
        },
        status: {
            server: 'running',
            database: 'connected',
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
// مسارات API
// ============================================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/videos', require('./routes/videoRoutes'));

// ============================================================
// مسارات الطلبات المباشرة (بدون use)
// ============================================================

// ============================================================
// 1. المسارات الثابتة أولاً (بدون :id)
// ============================================================

// جلب جميع الطلبات للمدير
app.get('/api/orders/admin/all', protect, authorize('admin'), async (req, res) => {
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
app.get('/api/orders/expert', protect, authorize('expert'), async (req, res) => {
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

// ============================================================
// 2. مسار جلب جميع الطلبات للمستخدم العادي
// ============================================================
app.get('/api/orders', protect, async (req, res) => {
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

// ============================================================
// 3. مسارات POST
// ============================================================
app.post('/api/orders', protect, async (req, res) => {
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

// ============================================================
// 4. مسارات GET مع :id
// ============================================================
app.get('/api/orders/:id', protect, async (req, res) => {
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

// ============================================================
// 5. مسارات PUT و DELETE
// ============================================================
app.put('/api/orders/:id', protect, async (req, res) => {
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

app.delete('/api/orders/:id', protect, async (req, res) => {
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

// ============================================================
// 6. مسار رفع الملفات - مع مسار نسبي
// ============================================================
app.post('/api/orders/:id/upload', protect, upload.array('files', 5), async (req, res) => {
    try {
        const Order = require('./models/Order');
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

        // ✅ تخزين المسار النسبي فقط
        const fileData = req.files.map(file => ({
            filename: file.originalname || file.filename,
            path: `uploads/${file.filename}`, // ✅ مسار نسبي
            size: file.size,
            uploadDate: new Date()
        }));

        order.files.push(...fileData);
        await order.save();

        console.log('✅ تم رفع الملفات:', fileData);

        res.status(200).json({
            success: true,
            message: `تم رفع ${req.files.length} ملف بنجاح ✅`,
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الملفات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// 7. مسارات جلب وتحميل الملفات المرفوعة
// ============================================================

// جلب قائمة الملفات المرفوعة لطلب معين
app.get('/api/orders/:id/files', protect, async (req, res) => {
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

// تحميل ملف معين - النسخة المصححة
app.get('/api/orders/:orderId/files/:fileIndex', protect, async (req, res) => {
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
        
        // ✅ بناء المسار الصحيح
        let filePath;
        if (file.path && file.path.startsWith('uploads/')) {
            filePath = path.join(__dirname, file.path);
        } else {
            // إذا كان المسار كاملاً، استخرج اسم الملف
            const fileName = file.path ? file.path.split('/').pop().split('\\').pop() : file.filename;
            filePath = path.join(__dirname, 'uploads', fileName);
        }
        
        console.log('📁 محاولة تحميل الملف:', filePath);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود على الخادم',
                path: filePath
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
// 8. مسارات النماذج (Models)
// ============================================================
// ============================================================
// مسارات النماذج (Models)
// ============================================================
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post('/api/models', protect, authorize('admin'), async (req, res) => {
    try {
        // ✅ هنا يجب إضافة mainService و subService
        const { 
            title, 
            category, 
            description, 
            fileName, 
            fileSize, 
            fileType, 
            fileData,
            mainService,   // ✅ أضف هذا
            subService     // ✅ أضف هذا
        } = req.body;
        
        // ✅ تحقق من وجود mainService
        if (!title || !category || !fileName || !fileData || !mainService) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال جميع البيانات المطلوبة (بما في ذلك الخدمة الرئيسية)'
            });
        }
        
        const model = await Model.create({
            title, 
            category, 
            description: description || '',
            fileName, 
            fileSize: fileSize || '0 KB',
            fileType: fileType || 'application/octet-stream',
            fileData, 
            mainService,    // ✅ حفظ الخدمة الرئيسية
            subService: subService || 'خدمة فرعية',  // ✅ حفظ الخدمة الفرعية
            uploadedBy: req.user.id
        });
        
        res.status(201).json({
            success: true,
            message: 'تم رفع النموذج بنجاح',
            data: model
        });
    } catch (error) {
        console.error('❌ خطأ في رفع النموذج:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.delete('/api/models/:id', protect, authorize('admin'), async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// 9. مسارات الخبراء
// ============================================================
app.get('/api/users/experts', protect, authorize('admin'), async (req, res) => {
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

app.get('/api/users/find', protect, authorize('admin'), async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال البريد الإلكتروني'
            });
        }
        const User = require('./models/User');
        const user = await User.findOne({ email, role: 'expert' }).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'لم يتم العثور على خبير بهذا البريد'
            });
        }
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('❌ خطأ في البحث عن خبير:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.put('/api/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const User = require('./models/User');
        const { isActive, expertise, bio } = req.body;
        const updateData = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (expertise !== undefined) updateData.expertise = expertise;
        if (bio !== undefined) updateData.bio = bio;
        
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

app.delete('/api/users/:id', protect, authorize('admin'), async (req, res) => {
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
// 10. معالجة 404 - يجب أن يكون في النهاية
// ============================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'المسار المطلوب غير موجود',
        path: req.originalUrl
    });
});

// ============================================================
// 11. معالجة الأخطاء العامة
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
    console.log(`📁 مجلد الفيديوهات: ${videosDir}`);
});