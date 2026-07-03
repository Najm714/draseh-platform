// backend/fix-video-paths.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/draseh_platform';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
    .catch(err => console.error('❌ خطأ في الاتصال:', err));

const Video = require('./models/Video');

async function fixVideoPaths() {
    try {
        const videos = await Video.find({});
        let count = 0;

        for (const video of videos) {
            let needsUpdate = false;
            
            // ✅ إصلاح المسار
            if (video.filePath && (
                video.filePath.includes('/opt/render/') ||
                video.filePath.includes('backend/uploads/') ||
                video.filePath.includes('\\')
            )) {
                const fileName = video.filePath.split('/').pop().split('\\').pop();
                if (fileName) {
                    video.filePath = `/uploads/videos/${fileName}`;
                    needsUpdate = true;
                    console.log(`📁 إصلاح مسار: ${fileName}`);
                }
            }
            
            // ✅ إصلاح duration إذا كان نصاً
            if (video.duration && typeof video.duration === 'string') {
                const num = parseFloat(video.duration);
                video.duration = isNaN(num) ? 0 : num;
                needsUpdate = true;
                console.log(`⏱️ إصلاح duration: ${video.duration}`);
            }
            
            // ✅ حفظ التغييرات
            if (needsUpdate) {
                await video.save();
                count++;
                console.log(`✅ تم تحديث: ${video.title}`);
            }
        }

        console.log(`✅ تم تحديث ${count} فيديو بنجاح!`);
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

fixVideoPaths();