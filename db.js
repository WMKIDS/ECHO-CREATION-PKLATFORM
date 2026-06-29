const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');

// Create a database file or open it if it exists
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Initialize tables and mock data
        initDatabase();
    }
});

function initDatabase() {
    // إنشاء جدول الخدمات
    // Create services table
    db.run(`CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        price TEXT,
        icon TEXT,
        active INTEGER DEFAULT 1,
        skills TEXT
    )`);

    // إنشاء جدول الكورسات
    // Create courses table
    db.run(`CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        instructor TEXT,
        level TEXT,
        duration TEXT,
        price TEXT,
        active INTEGER DEFAULT 1,
        category TEXT,
        enrolledStudents INTEGER DEFAULT 0,
        lessons TEXT
    )`);

    // إنشاء جدول المنشورات
    // Create forum posts table
    db.run(`CREATE TABLE IF NOT EXISTS forum_posts (
        id TEXT PRIMARY KEY,
        author TEXT,
        role TEXT,
        avatar TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        tags TEXT,
        date TEXT
    )`);

    // إنشاء جدول الردود
    // Create forum replies table
    db.run(`CREATE TABLE IF NOT EXISTS forum_replies (
        id TEXT PRIMARY KEY,
        post_id TEXT,
        author TEXT,
        role TEXT,
        avatar TEXT,
        content TEXT NOT NULL,
        FOREIGN KEY (post_id) REFERENCES forum_posts(id)
    )`);

    // إنشاء جدول المستخدمين (المدراء)
    // Create users (admin) table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`, (err) => {
        if (!err) {
            // Seed Admin User
            bcrypt.hash('admin123', 10, (err, hash) => {
                db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('admin', ?)`, [hash]);
            });
        }
    });

    // إضافة البيانات الافتراضية إذا كانت الجداول فارغة
    // Seed initial mock data if tables are empty
    db.get('SELECT COUNT(*) as count FROM services', (err, row) => {
        if (row && row.count === 0) {
            seedServices();
        }
    });

    db.get('SELECT COUNT(*) as count FROM courses', (err, row) => {
        if (row && row.count === 0) {
            seedCourses();
        }
    });

    db.get('SELECT COUNT(*) as count FROM forum_posts', (err, row) => {
        if (row && row.count === 0) {
            seedForumPosts();
        }
    });
}

function seedServices() {
    const services = [
        {
            id: "serv-1",
            title: "تطوير منصات الويب المتكاملة SaaS",
            description: "بناء مواقع وتطبيقات ويب سحابية خارقة السرعة باستخدام React و Python مع حماية متطورة ولوحة تحكم حية.",
            category: "برمجة وتطوير",
            price: "450$",
            icon: "code",
            active: 1,
            skills: JSON.stringify(["React", "FastAPI", "MongoDB"])
        },
        {
            id: "serv-2",
            title: "تصميم واجهات المستخدم الفاخرة UI/UX",
            description: "رسم واجهات تفاعلية تركز على تجربة المستخدم وتزيد من معدلات التحويل والمبيعات لموقعك.",
            category: "تصاميم",
            price: "200$",
            icon: "palette",
            active: 1,
            skills: JSON.stringify(["Figma", "Tailwind", "Motion"])
        },
        {
            id: "serv-3",
            title: "بنية قواعد البيانات وحماية الأنظمة",
            description: "تصميم وإعداد خوادم وقواعد بيانات آمنة ومقاومة للاختراق والطلبات العشوائية الكثيفة.",
            category: "أنظمة وبرمجة",
            price: "350$",
            icon: "database",
            active: 1,
            skills: JSON.stringify(["Postgres", "JWT", "SSL"])
        }
    ];

    const stmt = db.prepare('INSERT INTO services VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    services.forEach(s => {
        stmt.run(s.id, s.title, s.description, s.category, s.price, s.icon, s.active, s.skills);
    });
    stmt.finalize();
}

function seedCourses() {
    const courses = [
        {
            id: "course-1",
            title: "احتراف الـ Full-Stack بـ React & Python",
            description: "دورة مكثفة من الصفر لبناء منصات ويب حقيقية ومشاريع عملاقة باستخدام React وجافاسكريبت و FastAPI بايثون.",
            instructor: "عمر الفاروق",
            level: "من مبتدئ إلى محترف",
            duration: "40 ساعة",
            price: "120$",
            active: 1,
            category: "كورسات برمجة",
            enrolledStudents: 148,
            lessons: JSON.stringify([
                "تجهيز بيئة العمل المثالية بالذكاء الاصطناعي",
                "أساسيات React الحديثة و إدارة الحالة State",
                "بناء خادم FastAPI فائق السرعة ببايثون",
                "ربط قواعد البيانات وحماية الـ APIs وتشفير البيانات"
            ])
        },
        {
            id: "course-2",
            title: "عصر الـ Vibe Coding وهندسة الذكاء الاصطناعي",
            description: "تعلم كيف تقود أدوات الذكاء الاصطناعي (Cursor, Windsurf, Claude) لبناء تطبيقات بدون كتابة أكواد تقليدية مملة.",
            instructor: "عمر الفاروق",
            level: "متوسط",
            duration: "15 ساعة",
            price: "75$",
            active: 1,
            category: "أدوات الذكاء الاصطناعي",
            enrolledStudents: 94,
            lessons: JSON.stringify([
                "مقدمة لفلسفة الـ Vibe Coding وتطور البرمجة",
                "هندسة الأوامر المتقدمة لحل المشاكل البرمجية",
                "إصلاح الثغرات وفحص الأكواد بشكل مؤتمت بالكامل"
            ])
        }
    ];

    const stmt = db.prepare('INSERT INTO courses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    courses.forEach(c => {
        stmt.run(c.id, c.title, c.description, c.instructor, c.level, c.duration, c.price, c.active, c.category, c.enrolledStudents, c.lessons);
    });
    stmt.finalize();
}

function seedForumPosts() {
    const posts = [
        {
            id: "post-1",
            author: "أحمد بن علي",
            role: "طالب مسجل",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
            title: "كيف أقوم بحل مشكلة الـ CORS أثناء ربط React بخادم FastAPI؟",
            content: "السلام عليكم يا شباب، لقد قمت ببناء خادم FastAPI في بايثون ولكن عند محاولة إرسال طلب من تطبيق React يظهر لي خطأ CORS في الكونسول. كيف أحله بشكل آمن؟",
            likes: 12,
            tags: JSON.stringify(["FastAPI", "React", "بايثون"]),
            date: "منذ ساعتين"
        },
        {
            id: "post-2",
            author: "ليندا طاهر",
            role: "طالبة مسجلة",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
            title: "أفضل الممارسات لتهيئة السيو (SEO) في تطبيقات React أحادية الصفحة",
            content: "هل تنصحون باستخدام Next.js بدلاً من React العادي لتجاوز مشكلة فهرسة الصفحات من قبل محرك بحث جوجل؟ وما هي التقنيات المطلوبة؟",
            likes: 8,
            tags: JSON.stringify(["SEO", "React", "NextJS"]),
            date: "منذ يوم واحد"
        }
    ];

    const replies = [
        {
            id: "rep-1",
            post_id: "post-1",
            author: "عمر الفاروق",
            role: "المدرب والمسؤول",
            avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80",
            content: "أهلاً أحمد! الحل بسيط جداً. في بايثون عليك استخدام CORSMiddleware من fastapi.middleware.cors وتحديد الـ origins المسموح بها (رابط تطبيق React الخاص بك) لتجنب الثغرات."
        }
    ];

    const stmtPost = db.prepare('INSERT INTO forum_posts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    posts.forEach(p => {
        stmtPost.run(p.id, p.author, p.role, p.avatar, p.title, p.content, p.likes, p.tags, p.date);
    });
    stmtPost.finalize();

    const stmtReply = db.prepare('INSERT INTO forum_replies VALUES (?, ?, ?, ?, ?, ?)');
    replies.forEach(r => {
        stmtReply.run(r.id, r.post_id, r.author, r.role, r.avatar, r.content);
    });
    stmtReply.finalize();
}

module.exports = db;
