const Order = require('../models/Order');

// ===========================================
// 1. إنشاء طلب جديد (للعميل)
// ===========================================
exports.createOrder = async (req, res) => {
    try {
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
};

// ===========================================
// 2. جلب جميع طلبات المستخدم الحالي
// ===========================================
exports.getMyOrders = async (req, res) => {
    try {
        let query = { user: req.user.id };

        if (req.user.role === 'admin') {
            query = {};
        } else if (req.user.role === 'expert') {
            query = { assignedExpert: req.user.id };
        }

        const orders = await Order.find(query)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلبات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// جلب طلبات الخبير مع الملفات
// ============================================================
app.get('/api/orders/expert', protect, authorize('expert'), async (req, res) => {
    try {
        const Order = require('./models/Order');
        
        // ✅ جلب جميع الطلبات المسندة إلى هذا الخبير
        const orders = await Order.find({ 
            assignedExpert: req.user.id 
        })
        .populate('user', 'name email')
        .populate('assignedExpert', 'name email')
        .sort({ assignedAt: -1, createdAt: -1 });
            
        // ✅ إضافة معلومات إضافية لكل طلب
        const ordersWithDetails = orders.map(order => ({
            ...order.toObject(),
            filesCount: order.files?.length || 0,
            totalFilesSize: order.files?.reduce((acc, f) => acc + (f.size || 0), 0) || 0
        }));

        res.status(200).json({
            success: true,
            count: orders.length,
            data: ordersWithDetails
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الخبير:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ في جلب الطلبات' 
        });
    }
});

// ===========================================
// 5. جلب طلب محدد بالمعرف
// ===========================================
exports.getOrderById = async (req, res) => {
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
        if (error.name === 'CastError' || (error.message && error.message.includes('CastError'))) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 6. تحديث طلب
// ===========================================
exports.updateOrder = async (req, res) => {
    try {
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
};

// ===========================================
// 7. حذف طلب
// ===========================================
exports.deleteOrder = async (req, res) => {
    try {
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
};

// ===========================================
// 8. رفع ملفات لطلب محدد
// ===========================================
exports.uploadFiles = async (req, res) => {
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
            path: file.path.replace(/\\/g, '/'),
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};