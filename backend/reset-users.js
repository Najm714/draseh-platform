// backend/reset-users.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb+srv://alqadynjm088_db_user:miaiLDGxIe5Wk0WH@cluster0.ctsx5vv.mongodb.net/draseh_platform?retryWrites=true&w=majority&appName=Cluster0';

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
        // عرض عدد المستخدمين قبل الحذف
        const before = await User.countDocuments();
        console.log('📊 عدد المستخدمين قبل الحذف:', before);

        // حذف جميع المستخدمين
        const result = await User.deleteMany({});
        console.log('✅ تم حذف', result.deletedCount, 'مستخدم');

        // عرض عدد المستخدمين بعد الحذف
        const after = await User.countDocuments();
        console.log('📊 عدد المستخدمين بعد الحذف:', after);

        // إنشاء مدير جديد
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
        console.log('✅ تم إنشاء المدير الجديد');
        console.log('📧 البريد: alqadynjm088@gmail.com');
        console.log('🔑 كلمة المرور: miaiLDGxIe5Wk0WH');

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

resetUsers();