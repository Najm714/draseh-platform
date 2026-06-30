// ============================================================
// routes/authRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getMe, updateUser, deleteUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// ============================================================
// مسار التسجيل (للمدير فقط - يمكنه إنشاء عملاء وخبراء)
// ============================================================
router.post('/register', protect, authorize('admin'), [
    body('name').notEmpty().withMessage('الاسم مطلوب'),
    body('email').isEmail().withMessage('يرجى إدخال بريد إلكتروني صحيح'),
    body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
], register);

// ============================================================
// مسار تسجيل الدخول (عام للجميع)
// ============================================================
router.post('/login', login);

// ============================================================
// مسار جلب بيانات المستخدم الحالي (محمي)
// ============================================================
router.get('/me', protect, getMe);

// ============================================================
// مسار تحديث مستخدم (للمدير فقط)
// ============================================================
router.put('/:id', protect, authorize('admin'), updateUser);

// ============================================================
// مسار حذف مستخدم (للمدير فقط)
// ============================================================
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;