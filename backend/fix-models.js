// backend/fix-models.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// الاتصال بقاعدة البيانات
const MONGO_URI = process.env.MONGO_URI || 'MONGO_URI=mongodb+srv://alqadynjm088_db_user:miaiLDGxIe5Wk0WH@cluster0.ctsx5vv.mongodb.net/draseh_platform?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
    .catch(err => console.error('❌ خطأ في الاتصال:', err));

// تعريف نموذج النماذج المؤقت
const ModelSchema = new mongoose.Schema({
    title: String,
    category: String,
    description: String,
    fileName: String,
    fileSize: String,
    fileType: String,
    fileData: String,
    mainService: String,
    subService: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'models' });

const Model = mongoose.model('Model', ModelSchema);

async function fixModels() {
    try {
        console.log('🔍 جاري البحث عن النماذج...');
        
        const models = await Model.find({});
        console.log(`📦 تم العثور على ${models.length} نموذج`);
        
        let fixedCount = 0;
        
        for (const model of models) {
            let mainService = model.mainService || '';
            let subService = model.subService || '';
            
            // إذا لم يكن هناك mainService، حدده بناءً على العنوان
            if (!mainService) {
                const title = model.title || '';
                
                // تحديد الخدمة من العنوان
                if (title.includes('إحصائي') || title.includes('SPSS') || title.includes('تحليل') || title.includes('Statistic')) {
                    mainService = 'statistics';
                    subService = 'تحليل إحصائي';
                } else if (title.includes('مقترح') || title.includes('خطة') || title.includes('بحثية') || title.includes('Proposal')) {
                    mainService = 'proposal';
                    subService = 'إعداد مقترحات';
                } else if (title.includes('مراجعة') || title.includes('مراجع') || title.includes('literature') || title.includes('دراسات')) {
                    mainService = 'literature';
                    subService = 'مراجعة الأدبيات';
                } else if (title.includes('نشر') || title.includes('بحث') || title.includes('publication') || title.includes('Publication')) {
                    mainService = 'publication';
                    subService = 'إعداد للنشر';
                } else if (title.includes('تصميم') || title.includes('بوستر') || title.includes('جرافيك') || title.includes('Design')) {
                    mainService = 'design';
                    subService = 'تصميم جرافيكي';
                } else if (title.includes('فيديو') || title.includes('موشن') || title.includes('video') || title.includes('Video')) {
                    mainService = 'video';
                    subService = 'إنتاج فيديو';
                } else if (title.includes('استشارة') || title.includes('CV') || title.includes('سيرة') || title.includes('Consulting')) {
                    mainService = 'consulting';
                    subService = 'استشارات';
                } else if (title.includes('شرح') || title.includes('مراجعة') || title.includes('تدريس') || title.includes('Tutoring')) {
                    mainService = 'tutoring';
                    subService = 'شرح ومراجعة';
                } else {
                    mainService = 'other';
                    subService = 'خدمة أخرى';
                }
                
                // تحديث النموذج
                await Model.findByIdAndUpdate(model._id, {
                    mainService: mainService,
                    subService: subService
                });
                fixedCount++;
                console.log(`✅ تم تحديث: "${model.title}" -> ${mainService} / ${subService}`);
            }
        }
        
        console.log(`🎉 تم تحديث ${fixedCount} نموذج بنجاح!`);
        
        // عرض النماذج بعد التحديث
        const updatedModels = await Model.find({});
        console.log('\n📊 النماذج بعد التحديث:');
        updatedModels.forEach(m => {
            console.log(`   - ${m.title}: ${m.mainService} / ${m.subService}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

fixModels();