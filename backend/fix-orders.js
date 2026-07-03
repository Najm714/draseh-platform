// backend/fix-orders.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
    .catch(err => console.error('❌ فشل الاتصال:', err));

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // ... باقي الحقول
}, { collection: 'orders' });

const Order = mongoose.model('Order', OrderSchema);

async function fixOrders() {
    try {
        // ✅ عرض عدد الطلبات التي ليس لها مستخدم
        const nullUserOrders = await Order.find({ user: null });
        console.log(`📊 عدد الطلبات بدون مستخدم: ${nullUserOrders.length}`);
        
        // ✅ يمكنك تحديثها أو تركها كما هي
        // لا نحتاج إلى حذفها، فقط نتعامل معها في الكود
        
        console.log('✅ تم الانتهاء');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

fixOrders();