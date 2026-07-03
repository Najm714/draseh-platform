// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    uploadFiles,
    downloadFile,
    deleteFile,
    getFilesInfo,
    getAllOrders,
    assignExpert,
    updateOrderStatus
} = require('../controllers/orderController');

// ============================================================
// مسارات الملفات (يجب أن تكون قبل مسارات :id)
// ============================================================

// 📤 رفع ملفات لطلب محدد
router.post('/:orderId/files', protect, uploadFiles);

// 📥 تحميل ملف من طلب محدد
router.get('/:orderId/files/:fileIndex', protect, downloadFile);

// 🗑️ حذف ملف من طلب محدد
router.delete('/:orderId/files/:fileIndex', protect, deleteFile);

// ℹ️ جلب معلومات الملفات لطلب محدد
router.get('/:orderId/files-info', protect, getFilesInfo);

// ============================================================
// مسارات الطلبات الرئيسية
// ============================================================

// 📋 جلب جميع الطلبات (للمدير فقط)
router.get('/admin/all', protect, authorize('admin'), getAllOrders);

// 🔍 جلب طلبات الخبير
router.get('/expert', protect, authorize('expert'), async (req, res) => {
    try {
        const Order = require('../models/Order');
        const orders = await Order.find({ assignedExpert: req.user.id })
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات الخبير:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 📝 جلب طلبات المستخدم العادي
router.get('/', protect, getMyOrders);

// ➕ إنشاء طلب جديد
router.post('/', protect, createOrder);

// ============================================================
// مسارات الطلبات الفردية (يجب أن تكون بعد المسارات المحددة)
// ============================================================

// 🔍 جلب طلب محدد
router.get('/:id', protect, getOrderById);

// ✏️ تحديث طلب
router.put('/:id', protect, updateOrder);

// 🗑️ حذف طلب
router.delete('/:id', protect, deleteOrder);

// 👨‍🏫 تعيين خبير للطلب (للمدير فقط)
router.put('/:id/assign-expert', protect, authorize('admin'), assignExpert);

// 🔄 تحديث حالة الطلب
router.put('/:id/status', protect, updateOrderStatus);

// ============================================================
// مسارات إضافية مفيدة
// ============================================================

// 📊 إحصائيات الطلبات (للمدير)
router.get('/stats/admin', protect, authorize('admin'), async (req, res) => {
    try {
        const Order = require('../models/Order');
        const total = await Order.countDocuments();
        const pending = await Order.countDocuments({ status: 'pending' });
        const inProgress = await Order.countDocuments({ status: 'in-progress' });
        const completed = await Order.countDocuments({ status: 'completed' });
        const cancelled = await Order.countDocuments({ status: 'cancelled' });
        const revision = await Order.countDocuments({ status: 'revision' });

        // إحصائيات حسب الخدمة
        const serviceStats = await Order.aggregate([
            { $group: { _id: '$serviceType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // إحصائيات حسب الميزانية
        const budgetStats = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    avgBudget: { $avg: '$budget' },
                    minBudget: { $min: '$budget' },
                    maxBudget: { $max: '$budget' },
                    totalBudget: { $sum: '$budget' }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                total,
                pending,
                inProgress,
                completed,
                cancelled,
                revision,
                serviceStats,
                budgetStats: budgetStats[0] || { avgBudget: 0, minBudget: 0, maxBudget: 0, totalBudget: 0 }
            }
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الإحصائيات:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 📊 إحصائيات طلبات الخبير
router.get('/stats/expert', protect, authorize('expert'), async (req, res) => {
    try {
        const Order = require('../models/Order');
        const total = await Order.countDocuments({ assignedExpert: req.user.id });
        const pending = await Order.countDocuments({ assignedExpert: req.user.id, status: 'pending' });
        const inProgress = await Order.countDocuments({ assignedExpert: req.user.id, status: 'in-progress' });
        const completed = await Order.countDocuments({ assignedExpert: req.user.id, status: 'completed' });
        const revision = await Order.countDocuments({ assignedExpert: req.user.id, status: 'revision' });

        res.status(200).json({
            success: true,
            data: {
                total,
                pending,
                inProgress,
                completed,
                revision
            }
        });
    } catch (error) {
        console.error('❌ خطأ في جلب إحصائيات الخبير:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// مسار اختبار للتحقق من عمل API
// ============================================================
router.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: '✅ Order API يعمل بشكل صحيح',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;