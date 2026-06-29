const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Apply middlewares (إضافة طبقات الحماية والوسائط)
app.use(helmet({
    contentSecurityPolicy: false, // Disabling for simple local setup to allow CDNs
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files (تقديم ملفات الواجهة)

// --- Public API Endpoints (نقاط الوصول العامة) ---

// Get all active services (جلب الخدمات النشطة)
app.get('/api/services', (req, res) => {
    db.all('SELECT * FROM services WHERE active = 1', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Parse JSON strings back to arrays
        const services = rows.map(r => ({...r, skills: JSON.parse(r.skills || '[]')}));
        res.json(services);
    });
});

// Get all active courses (جلب الكورسات النشطة)
app.get('/api/courses', (req, res) => {
    db.all('SELECT * FROM courses WHERE active = 1', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const courses = rows.map(r => ({...r, lessons: JSON.parse(r.lessons || '[]')}));
        res.json(courses);
    });
});

// Get all forum posts with their replies (جلب المنشورات والردود)
app.get('/api/forum-posts', (req, res) => {
    db.all('SELECT * FROM forum_posts ORDER BY date DESC', [], (err, posts) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT * FROM forum_replies', [], (err, replies) => {
            if (err) return res.status(500).json({ error: err.message });

            const fullPosts = posts.map(post => {
                const postReplies = replies.filter(r => r.post_id === post.id);
                return {
                    ...post,
                    tags: JSON.parse(post.tags || '[]'),
                    replies: postReplies
                };
            });
            res.json(fullPosts);
        });
    });
});

// Add a new forum post (إضافة منشور جديد للمنتدى)
app.post('/api/forum-posts', (req, res) => {
    const { title, content, tags } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: "العنوان والمحتوى مطلوبان" });
    }

    const id = `post-${Date.now()}`;
    const author = "زائر المنصة (أنت)";
    const role = "طالب جديد";
    const avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80";
    const likes = 0;
    const date = "الآن";
    const tagsStr = JSON.stringify(tags || []);

    const stmt = db.prepare('INSERT INTO forum_posts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, author, role, avatar, title, content, likes, tagsStr, date, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
            id, author, role, avatar, title, content, likes, tags: tags || [], date, replies: []
        });
    });
    stmt.finalize();
});

// Add a reply to a post (إضافة رد على منشور)
app.post('/api/forum-posts/:id/replies', (req, res) => {
    const { content } = req.body;
    const postId = req.params.id;

    if (!content) return res.status(400).json({ error: "محتوى الرد مطلوب" });

    const id = `rep-${Date.now()}`;
    const author = "عمر الفاروق (أنت)";
    const role = "المشرف والأدمن";
    const avatar = "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80";

    const stmt = db.prepare('INSERT INTO forum_replies VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, postId, author, role, avatar, content, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id, post_id: postId, author, role, avatar, content });
    });
    stmt.finalize();
});

// Basic Route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// API placeholder
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});



const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const SECRET_KEY = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex'); // Generate dynamic key if env var not set // مفتاح تشفير التوكن

// Login endpoint (نقطة تسجيل الدخول للمدراء)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "اسم المستخدم غير صحيح" });

        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
                res.json({ token, message: "تم تسجيل الدخول بنجاح" });
            } else {
                res.status(401).json({ error: "كلمة المرور غير صحيحة" });
            }
        });
    });
});

// Middleware to verify JWT (وسيط للتحقق من التوكن للمسارات المحمية)
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: "لا يوجد صلاحية وصول" });

    // Bearer token validation
    const tokenParts = token.split(' ');
    if (tokenParts[0] !== 'Bearer' || !tokenParts[1]) {
         return res.status(401).json({ error: "صيغة التوكن غير صحيحة" });
    }

    jwt.verify(tokenParts[1], SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: "جلسة منتهية، يرجى تسجيل الدخول مجدداً" });
        req.user = decoded;
        next();
    });
}

// --- Protected API Endpoints (نقاط الوصول المحمية للإدارة) ---

// Get all services (including inactive ones)
app.get('/api/admin/services', verifyToken, (req, res) => {
    db.all('SELECT * FROM services', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const services = rows.map(r => ({...r, skills: JSON.parse(r.skills || '[]')}));
        res.json(services);
    });
});

// Get all courses (including inactive ones)
app.get('/api/admin/courses', verifyToken, (req, res) => {
    db.all('SELECT * FROM courses', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const courses = rows.map(r => ({...r, lessons: JSON.parse(r.lessons || '[]')}));
        res.json(courses);
    });
});

// Add a service (إضافة خدمة)
app.post('/api/admin/services', verifyToken, (req, res) => {
    const { title, description, category, price, icon, skills } = req.body;
    const id = `serv-${Date.now()}`;
    const skillsStr = JSON.stringify(skills || []);

    const stmt = db.prepare('INSERT INTO services VALUES (?, ?, ?, ?, ?, ?, 1, ?)');
    stmt.run(id, title, description, category, price, icon || 'code', skillsStr, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id, title, description, category, price, icon, active: 1, skills: skills || [] });
    });
    stmt.finalize();
});

// Add a course (إضافة كورس)
app.post('/api/admin/courses', verifyToken, (req, res) => {
    const { title, description, instructor, level, duration, price, category, lessons } = req.body;
    const id = `course-${Date.now()}`;
    const lessonsStr = JSON.stringify(lessons || []);

    const stmt = db.prepare('INSERT INTO courses VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?)');
    stmt.run(id, title, description, instructor, level, duration, price, category, lessonsStr, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id, title, description, instructor, level, duration, price, active: 1, category, enrolledStudents: 0, lessons: lessons || [] });
    });
    stmt.finalize();
});

// Toggle service status (تبديل حالة الخدمة)
app.put('/api/admin/services/:id/toggle', verifyToken, (req, res) => {
    const id = req.params.id;
    db.get('SELECT active FROM services WHERE id = ?', [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "الخدمة غير موجودة" });
        const newStatus = row.active === 1 ? 0 : 1;
        db.run('UPDATE services SET active = ? WHERE id = ?', [newStatus, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, active: newStatus });
        });
    });
});

// Toggle course status (تبديل حالة الكورس)
app.put('/api/admin/courses/:id/toggle', verifyToken, (req, res) => {
    const id = req.params.id;
    db.get('SELECT active FROM courses WHERE id = ?', [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "الكورس غير موجود" });
        const newStatus = row.active === 1 ? 0 : 1;
        db.run('UPDATE courses SET active = ? WHERE id = ?', [newStatus, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, active: newStatus });
        });
    });
});

// Delete service (حذف خدمة)
app.delete('/api/admin/services/:id', verifyToken, (req, res) => {
    db.run('DELETE FROM services WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "تم الحذف بنجاح" });
    });
});

// Delete course (حذف كورس)
app.delete('/api/admin/courses/:id', verifyToken, (req, res) => {
    db.run('DELETE FROM courses WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "تم الحذف بنجاح" });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
