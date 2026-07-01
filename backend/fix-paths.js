// backend/fix-paths.js
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// الاتصال بقاعدة البيانات
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
    .catch(err => console.error('❌ خطأ في الاتصال:', err));

const OrderSchema = new mongoose.Schema({
    files: [{
        filename: String,
        path: String,
        size: Number,
        uploadDate: Date
    }]
}, { collection: 'orders' });

const Order = mongoose.model('Order', OrderSchema);

async function fixFilePaths() {
    try {
        console.log('🔍 جاري البحث عن الطلبات التي تحتوي على ملفات...');
        
        const orders = await Order.find({ 'files.0': { $exists: true } });
        console.log(`📦 تم العثور على ${orders.length} طلب يحتوي على ملفات`);
        
        let fixedCount = 0;
        
        for (const order of orders) {
            let updated = false;
            
            order.files = order.files.map(file => {
                // التحقق إذا كان المسار يحتوي على مسار كامل
                if (file.path && (file.path.includes('C:/') || file.path.includes('C:\\') || file.path.includes('backend'))) {
                    // استخراج اسم الملف من المسار الكامل
                    const fileName = file.path.split('/').pop().split('\\').pop();
                    // حفظ المسار النسبي فقط
                    file.path = `uploads/${fileName}`;
                    updated = true;
                    console.log(`✅ تم تحديث مسار الملف: ${fileName}`);
                }
                return file;
            });
            
            if (updated) {
                await order.save();
                fixedCount++;
                console.log(`✅ تم تحديث الطلب: ${order._id}`);
            }
        }
        
        console.log(`🎉 تم تحديث ${fixedCount} طلب بنجاح!`);
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

fixFilePaths();