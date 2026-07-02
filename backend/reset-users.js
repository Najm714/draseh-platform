// backend/reset-users.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// رابط قاعدة البيانات
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
    .catch(err => console.error('❌ فشل الاتصال:', err));

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String,
    isActive: Boolean
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function resetUsers() {
    try {
        // 1. حذف جميع المستخدمين
        console.log('🗑️ جاري حذف جميع المستخدمين...');
        const deleteResult = await User.deleteMany({});
        console.log(`✅ تم حذف ${deleteResult.deletedCount} مستخدم`);

        // 2. إنشاء المدير الجديد
        console.log('👑 جاري إنشاء المدير الجديد...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('miaiLDGxIe5Wk0WH', salt);

        const admin = new User({
            name: 'مدير النظام',
            email: 'alqadynjm088@gmail.com',
            password: hashedPassword,
            role: 'admin',
            isActive: true
        });

        await admin.save();
        console.log('✅ تم إنشاء المدير الجديد بنجاح!');
        console.log('📧 البريد: alqadynjm088@gmail.com');
        console.log('🔑 كلمة المرور: miaiLDGxIe5Wk0WH');
        console.log('👤 الدور: admin');

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

resetUsers();