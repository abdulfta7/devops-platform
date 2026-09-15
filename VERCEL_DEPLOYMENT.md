# Vercel Deployment Guide

## الخطوات لنشر المشروع على Vercel (Frontend + Backend)

### 1. إعداد الـ Environment Variables في Vercel

بعد ربط المشروع مع Vercel، أضف الـ Environment Variables التالية في إعدادات المشروع:

**Required Variables:**
```
DATABASE_URL=postgresql://neondb_owner:npg_AaZCv76ypGig@ep-small-art-aw026ici-pooler.c-12.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
JWT_SECRET=your_secure_jwt_secret_key_here_change_this_in_production
CLIENT_URL=https://your-project.vercel.app
NODE_ENV=production
```

**Optional Variables (للميزات الإضافية):**
```
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@yourdomain.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. نشر المشروع على Vercel

**الخيار أ: عبر الويب**
1. اذهب إلى [vercel.com](https://vercel.com)
2. قم بتسجيل الدخول أو إنشاء حساب
3. اضغط "Add New Project"
4. اربط حساب GitHub واختر مستودع المشروع
5. في إعدادات المشروع:
   - **Root Directory**: `./` (المجلد الرئيسي)
   - **Build Command**: سيتم تحديده تلقائياً من `vercel.json`
   - **Output Directory**: سيتم تحديده تلقائياً من `vercel.json`
6. أضف الـ Environment Variables المذكورة أعلاه
7. اضغط "Deploy"

**الخيار ب: عبر CLI**
```bash
# تثبيت Vercel CLI
npm i -g vercel

# تسجيل الدخول
vercel login

# نشر المشروع
vercel
```

### 3. التحقق من النشر

بعد اكتمال النشر:

1. **اختبر الـ Backend API:**
   ```
   https://your-project.vercel.app/api/health
   ```
   يجب أن تعيد: `{"status":"OK","timestamp":"..."}`

2. **اختبر الـ Frontend:**
   ```
   https://your-project.vercel.app
   ```
   يجب أن تظهر الصفحة الرئيسية

3. **اختبر التسجيل والدخول:**
   - حاول إنشاء حساب جديد
   - تأكد من أن البيانات تُحفظ في قاعدة البيانات

### 4. ما تم تعديله في المشروع

1. **تحويل Backend لـ Serverless Function:**
   - إنشاء ملف `api/index.js` كـ handler لـ Express app
   - تحديث قاعدة البيانات للعمل مع serverless environment
   - تحويل جميع database queries لـ async/await

2. **تحديث إعدادات Vercel:**
   - تعديل `vercel.json` ليعالج طلبات `/api` وتوجيهها للـ backend
   - إعداد timeout للـ serverless functions

3. **تحديث Frontend:**
   - تغيير `REACT_APP_API_URL` في `.env.production` إلى `/api`
   - هذا يجعل الـ frontend يتصل بالـ backend عبر نفس النطاق

4. **تحديث الـ Scripts:**
   - إضافة `postinstall` script لتثبيت dependencies في backend و frontend

### 5. المشاكل المحتملة وحلولها

**مشكلة: Database connection timeout**
- الحل: تم تحديث database pool للعمل مع serverless environment

**مشكلة: CORS errors**
- الحل: تم إضافة CORS headers في `api/index.js`

**مشكلة: File upload not working**
- الحل: رفع الملفات على Vercel serverless functions محدود، يُفضل استخدام Cloudinary أو خدمة خارجية

**مشكلة: Email sending not working**
- الحل: أضف إعدادات SMTP في Environment Variables

### 6. تحديث CLIENT_URL

بعد الحصول على رابط موقعك على Vercel:
1. اذهب إلى إعدادات المشروع في Vercel
2. ابحث عن Environment Variables
3. قم بتحديث `CLIENT_URL` برابط موقعك الحقيقي
4. أعد نشر المشروع

### 7. ملاحظات مهمة

- **Database**: تأكد من أن قاعدة بيانات Neon PostgreSQL متاحة وقابلة للوصول
- **JWT Secret**: استخدم secret قوي وآمن للإنتاج
- **Environment Variables**: لا تضع بيانات حساسة في الكود، استخدم Environment Variables فقط
- **Testing**: اختبر جميع الميزات بعد النشر (تسجيل، دخول، courses، إلخ)

### 8. للتكامل المحلي

```bash
# تشغيل المشروع محلياً
npm run dev

# بناء المشروع للإنتاج
npm run build
```

## ملخص التغييرات

- ✅ تحويل Express backend لـ serverless function
- ✅ تحديث vercel.json للتعامل مع frontend و backend
- ✅ تحديث database connection للعمل مع serverless
- ✅ تحويل جميع database queries لـ async/await
- ✅ تحديث API client في frontend لاستخدام `/api`
- ✅ إضافة proper CORS headers
- ✅ تحديث build scripts
