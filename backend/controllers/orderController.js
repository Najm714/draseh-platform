// backend/controllers/orderController.js
const Order = require('../models/Order');
const path = require('path');
const fs = require('fs');

// ===========================================
// 1. إنشاء طلب جديد (للعميل)
// ===========================================
exports.createOrder = async (req, res) => {
    try {
        req.body.user = req.user.id;
        const order = await Order.create(req.body);
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الطلب بنجاح ✅',
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 2. جلب جميع طلبات المستخدم الحالي
// ===========================================
exports.getMyOrders = async (req, res) => {
    try {
        let query = { user: req.user.id };

        if (req.user.role === 'admin') {
            query = {};
        } else if (req.user.role === 'expert') {
            query = { assignedExpert: req.user.id };
        }

        const orders = await Order.find(query)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلبات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 3. جلب طلب محدد بالمعرف
// ===========================================
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user._id.toString() || 
            (req.user.role === 'expert' && req.user.id === order.assignedExpert?._id.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض هذا الطلب'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الطلب:', error);
        if (error.name === 'CastError' || (error.message && error.message.includes('CastError'))) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 4. تحديث طلب
// ===========================================
exports.updateOrder = async (req, res) => {
    try {
        let order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user.toString();

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتعديل هذا الطلب'
            });
        }

        if (req.user.role !== 'admin') {
            delete req.body.assignedExpert;
            delete req.body.budget;
        }

        order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'تم تحديث الطلب بنجاح ✅',
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 5. حذف طلب
// ===========================================
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user.toString();

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لحذف هذا الطلب'
            });
        }

        // حذف الملفات المرتبطة بالطلب من الخادم
        if (order.files && order.files.length > 0) {
            for (const file of order.files) {
                if (file.filePath && fs.existsSync(file.filePath)) {
                    try {
                        fs.unlinkSync(file.filePath);
                    } catch (err) {
                        console.error('❌ خطأ في حذف الملف:', err);
                    }
                }
            }
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
            message: 'تم حذف الطلب بنجاح 🗑️'
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 6. رفع ملفات لطلب محدد
// ===========================================
exports.uploadFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يرجى رفع ملف واحد على الأقل'
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user.toString();

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لرفع ملفات لهذا الطلب'
            });
        }

        const fileData = req.files.map(file => ({
            filename: file.originalname || file.filename,
            filePath: file.path.replace(/\\/g, '/'), // 🆕 مسار الملف
            fileId: file.filename, // 🆕 الاسم الفريد للملف
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadDate: new Date()
        }));

        order.files.push(...fileData);
        await order.save();

        res.status(200).json({
            success: true,
            message: `تم رفع ${req.files.length} ملف بنجاح ✅`,
            data: {
                files: fileData,
                order: order
            }
        });
    } catch (error) {
        console.error('❌ خطأ في رفع الملفات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 7. تحميل ملف مرفق من طلب محدد
// ===========================================
exports.downloadFile = async (req, res) => {
    try {
        const { orderId, fileIndex } = req.params;
        
        // جلب الطلب من قاعدة البيانات
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        // التحقق من الصلاحيات
        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user.toString() ||
            (req.user.role === 'expert' && req.user.id === order.assignedExpert?.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتحميل هذا الملف'
            });
        }

        // التحقق من وجود الملفات
        if (!order.files || order.files.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'لا توجد ملفات مرفقة'
            });
        }

        const fileIndexNum = parseInt(fileIndex);
        if (isNaN(fileIndexNum) || fileIndexNum >= order.files.length || fileIndexNum < 0) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود'
            });
        }

        const fileData = order.files[fileIndexNum];
        
        // 1. محاولة استخدام المسار المخزن في قاعدة البيانات
        if (fileData.filePath && fs.existsSync(fileData.filePath)) {
            return res.download(fileData.filePath, fileData.filename);
        }

        // 2. محاولة البحث في مجلد uploads
        const uploadsDir = path.join(__dirname, '../uploads/orders');
        if (fs.existsSync(uploadsDir)) {
            const possibleFiles = fs.readdirSync(uploadsDir);
            
            // البحث عن الملف بالاسم الفريد أو بالاسم الأصلي
            const foundFile = possibleFiles.find(file => {
                if (fileData.fileId && file.includes(fileData.fileId)) {
                    return true;
                }
                if (file.includes(fileData.filename)) {
                    return true;
                }
                if (file.includes(orderId)) {
                    return true;
                }
                return false;
            });

            if (foundFile) {
                const filePath = path.join(uploadsDir, foundFile);
                return res.download(filePath, fileData.filename);
            }
        }

        // 3. إذا لم يتم العثور على الملف
        return res.status(404).json({
            success: false,
            message: 'الملف غير موجود على الخادم'
        });

    } catch (error) {
        console.error('❌ خطأ في تحميل الملف:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 8. حذف ملف مرفق من طلب محدد
// ===========================================
exports.deleteFile = async (req, res) => {
    try {
        const { orderId, fileIndex } = req.params;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        // التحقق من الصلاحيات
        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user.toString();

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لحذف هذا الملف'
            });
        }

        const fileIndexNum = parseInt(fileIndex);
        if (isNaN(fileIndexNum) || fileIndexNum >= order.files.length || fileIndexNum < 0) {
            return res.status(404).json({
                success: false,
                message: 'الملف غير موجود'
            });
        }

        const fileData = order.files[fileIndexNum];
        
        // حذف الملف من الخادم
        if (fileData.filePath && fs.existsSync(fileData.filePath)) {
            try {
                fs.unlinkSync(fileData.filePath);
            } catch (err) {
                console.error('❌ خطأ في حذف الملف من الخادم:', err);
            }
        }

        // حذف الملف من قاعدة البيانات
        order.files.splice(fileIndexNum, 1);
        await order.save();

        res.status(200).json({
            success: true,
            message: 'تم حذف الملف بنجاح 🗑️'
        });

    } catch (error) {
        console.error('❌ خطأ في حذف الملف:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 9. جلب معلومات الملفات لطلب محدد
// ===========================================
exports.getFilesInfo = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        // التحقق من الصلاحيات
        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.id === order.user.toString() ||
            (req.user.role === 'expert' && req.user.id === order.assignedExpert?.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لعرض معلومات الملفات'
            });
        }

        // إرجاع معلومات الملفات مع التحقق من وجودها
        const filesInfo = (order.files || []).map((file, index) => ({
            index: index,
            filename: file.filename,
            fileId: file.fileId,
            filePath: file.filePath,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            uploadDate: file.uploadDate,
            exists: file.filePath ? fs.existsSync(file.filePath) : false
        }));

        res.status(200).json({
            success: true,
            count: filesInfo.length,
            data: filesInfo
        });

    } catch (error) {
        console.error('❌ خطأ في جلب معلومات الملفات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 10. جلب جميع الطلبات (للمدير فقط)
// ===========================================
exports.getAllOrders = async (req, res) => {
    try {
        // التحقق من أن المستخدم مدير
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بعرض جميع الطلبات'
            });
        }

        const orders = await Order.find()
            .populate('user', 'name email')
            .populate('assignedExpert', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('❌ خطأ في جلب جميع الطلبات:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 11. تعيين خبير لطلب
// ===========================================
exports.assignExpert = async (req, res) => {
    try {
        const { expertId, notes } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        // التحقق من أن المستخدم مدير
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بتعيين خبراء'
            });
        }

        order.assignedExpert = expertId;
        order.status = 'in-progress';
        order.adminNotes = notes || order.adminNotes;
        await order.save();

        res.status(200).json({
            success: true,
            message: 'تم تعيين الخبير بنجاح ✅',
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في تعيين الخبير:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// 12. تحديث حالة الطلب
// ===========================================
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'in-progress', 'completed', 'revision', 'cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'حالة غير صالحة'
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'الطلب غير موجود ❌'
            });
        }

        // التحقق من الصلاحيات
        const isAuthorized = 
            req.user.role === 'admin' || 
            (req.user.role === 'expert' && req.user.id === order.assignedExpert?.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتحديث حالة هذا الطلب'
            });
        }

        order.status = status;
        await order.save();

        res.status(200).json({
            success: true,
            message: `تم تحديث حالة الطلب إلى ${status} ✅`,
            data: order
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الطلب:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};