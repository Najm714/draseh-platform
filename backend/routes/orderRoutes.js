const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const orderController = require('../controllers/orderController');

// ============================================================
// جميع المسارات تتطلب توكن صحيح
// ============================================================
router.use(protect);

// ============================================================
// 1. المسارات الثابتة أولاً (بدون :id)
// ============================================================

// جلب طلبات الخبير (يجب أن يكون قبل :id)
router.get('/expert', authorize('expert'), orderController.getExpertOrders);

// جلب جميع الطلبات للمدير
router.get('/admin/all', authorize('admin'), orderController.getAllOrders);

// ============================================================
// 2. مسارات POST و GET الرئيسية
// ============================================================
router.post('/', orderController.createOrder);
router.get('/', orderController.getMyOrders);

// ============================================================
// 3. مسارات GET مع :id (يجب أن تكون بعد المسارات الثابتة)
// ============================================================
router.get('/:id', orderController.getOrderById);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

// ============================================================
// 4. مسار رفع الملفات
// ============================================================
router.post('/:id/upload', upload.array('files', 5), orderController.uploadFiles);

module.exports = router;