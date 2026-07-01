// backend/updateModels.js - ملف منفصل لتحديث النماذج

const mongoose = require('mongoose');
const Model = require('./models/Model');

async function updateExistingModels() {
    try {
        // الاتصال بقاعدة البيانات
        await mongoose.connect('MONGO_URI=mongodb+srv://alqadynjm088_db_user:miaiLDGxIe5Wk0WH@cluster0.ctsx5vv.mongodb.net/draseh_platform?retryWrites=true&w=majority&appName=Cluster0');
        console.log('✅ تم الاتصال بقاعدة البيانات');

        // جلب جميع النماذج
        const models = await Model.find({});
        console.log(`📦 عدد النماذج الكلي: ${models.length}`);

        let updatedCount = 0;

        for (const model of models) {
            let needsUpdate = false;
            let mainService = model.mainService || '';
            let subService = model.subService || '';

            // إذا كان النموذج لا يحتوي على mainService، حدده بناءً على العنوان
            if (!mainService) {
                const title = model.title || '';
                
                if (title.includes('إحصائي') || title.includes('SPSS') || title.includes('تحليل')) {
                    mainService = 'statistics';
                    subService = 'تحليل إحصائي';
                } else if (title.includes('مقترح') || title.includes('خطة') || title.includes('بحثية')) {
                    mainService = 'proposal';
                    subService = 'إعداد مقترحات';
                } else if (title.includes('مراجعة') || title.includes('مراجع') || title.includes('literature') || title.includes('دراسات')) {
                    mainService = 'literature';
                    subService = 'مراجعة الأدبيات';
                } else if (title.includes('نشر') || title.includes('بحث') || title.includes('publication')) {
                    mainService = 'publication';
                    subService = 'إعداد للنشر';
                } else if (title.includes('تصميم') || title.includes('بوستر') || title.includes('جرافيك')) {
                    mainService = 'design';
                    subService = 'تصميم جرافيكي';
                } else if (title.includes('فيديو') || title.includes('موشن') || title.includes('video')) {
                    mainService = 'video';
                    subService = 'إنتاج فيديو';
                } else if (title.includes('استشارة') || title.includes('CV') || title.includes('سيرة')) {
                    mainService = 'consulting';
                    subService = 'استشارات';
                } else if (title.includes('شرح') || title.includes('مراجعة') || title.includes('تدريس')) {
                    mainService = 'tutoring';
                    subService = 'شرح ومراجعة';
                } else {
                    mainService = 'other';
                    subService = 'خدمة أخرى';
                }
                needsUpdate = true;
            }

            if (needsUpdate) {
                await Model.findByIdAndUpdate(model._id, {
                    mainService: mainService,
                    subService: subService
                });
                updatedCount++;
                console.log(`✅ تم تحديث: ${model.title} -> ${mainService} / ${subService}`);
            }
        }

        console.log(`🎉 تم تحديث ${updatedCount} نموذج بنجاح!`);
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

// تشغيل الدالة
updateExistingModels();