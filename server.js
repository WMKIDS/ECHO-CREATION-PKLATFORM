const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
db.initDatabase();

const app = express();
const port = process.env.PORT || 3000;

// Apply middlewares (إضافة طبقات الحماية والوسائط)
app.use(helmet({
    contentSecurityPolicy: false, // Disabling for simple local setup to allow CDNs
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve public frontend files
app.use('/admin', express.static('admin')); // Serve admin files

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

    db.run('INSERT INTO forum_posts (id, author, role, avatar, title, content, likes, tags, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, author, role, avatar, title, content, likes, tagsStr, date], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
            id, author, role, avatar, title, content, likes, tags: tags || [], date, replies: []
        });
    });
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

    db.run('INSERT INTO forum_replies (id, post_id, author, role, avatar, content) VALUES (?, ?, ?, ?, ?, ?)', [id, postId, author, role, avatar, content], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id, post_id: postId, author, role, avatar, content });
    });
});

// Basic Route

app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/admin/admin.html');
});
app.get('/admin/login', (req, res) => {
    res.sendFile(__dirname + '/admin/login.html');
});
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

    db.run('INSERT INTO services (id, title, description, category, price, icon, active, skills) VALUES (?, ?, ?, ?, ?, ?, 1, ?)', [id, title, description, category, price, icon || 'code', skillsStr], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id, title, description, category, price, icon, active: 1, skills: skills || [] });
    });
});

// Add a course (إضافة كورس)
app.post('/api/admin/courses', verifyToken, (req, res) => {
    const { title, description, instructor, level, duration, price, category, lessons } = req.body;
    const id = `course-${Date.now()}`;
    const lessonsStr = JSON.stringify(lessons || []);

    db.run('INSERT INTO courses (id, title, description, instructor, level, duration, price, active, category, enrolledStudents, lessons) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?)', [id, title, description, instructor, level, duration, price, category, lessonsStr], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id, title, description, instructor, level, duration, price, active: 1, category, enrolledStudents: 0, lessons: lessons || [] });
    });
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


// Get all active portfolio items (Public)
app.get('/api/portfolio', (req, res) => {
    db.all('SELECT * FROM portfolio WHERE active = 1', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get all active portfolio stats (Public)
app.get('/api/portfolio-stats', (req, res) => {
    db.all('SELECT * FROM portfolio_stats', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Get all portfolio items
app.get('/api/admin/portfolio', verifyToken, (req, res) => {
    db.all('SELECT * FROM portfolio', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Add portfolio item
app.post('/api/admin/portfolio', verifyToken, (req, res) => {
    const { title, description, category, status, link, image } = req.body;
    const id = `port-${Date.now()}`;
    db.run('INSERT INTO portfolio (id, title, description, category, status, link, image, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [id, title, description, category, status, link, image], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id, title, description, category, status, link, image, active: 1 });
    });
});

// Admin: Delete portfolio item
app.delete('/api/admin/portfolio/:id', verifyToken, (req, res) => {
    db.run('DELETE FROM portfolio WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted" });
    });
});

// Admin: Toggle portfolio active status
app.put('/api/admin/portfolio/:id/toggle', verifyToken, (req, res) => {
    const id = req.params.id;
    db.get('SELECT active FROM portfolio WHERE id = ?', [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Item not found" });
        const newStatus = row.active === 1 ? 0 : 1;
        db.run('UPDATE portfolio SET active = ? WHERE id = ?', [newStatus, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, active: newStatus });
        });
    });
});

// Admin: Get all stats
app.get('/api/admin/portfolio-stats', verifyToken, (req, res) => {
    db.all('SELECT * FROM portfolio_stats', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Add stats
app.post('/api/admin/portfolio-stats', verifyToken, (req, res) => {
    const { label, value, icon } = req.body;
    const id = `stat-${Date.now()}`;
    db.run('INSERT INTO portfolio_stats (id, label, value, icon) VALUES (?, ?, ?, ?)', [id, label, value, icon], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id, label, value, icon });
    });
});

// Admin: Delete stats
app.delete('/api/admin/portfolio-stats/:id', verifyToken, (req, res) => {
    db.run('DELETE FROM portfolio_stats WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted" });
    });
});


// Admin: Edit service
app.put('/api/admin/services/:id', verifyToken, (req, res) => {
    const { title, description, category, price, icon, skills } = req.body;
    const skillsStr = JSON.stringify(skills || []);
    db.run('UPDATE services SET title = ?, description = ?, category = ?, price = ?, icon = ?, skills = ? WHERE id = ?',
        [title, description, category, price, icon || 'code', skillsStr, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: req.params.id });
    });
});

// Admin: Edit course
app.put('/api/admin/courses/:id', verifyToken, (req, res) => {
    const { title, description, instructor, level, duration, price, category, lessons } = req.body;
    const lessonsStr = JSON.stringify(lessons || []);
    db.run('UPDATE courses SET title = ?, description = ?, instructor = ?, level = ?, duration = ?, price = ?, category = ?, lessons = ? WHERE id = ?',
        [title, description, instructor, level, duration, price, category, lessonsStr, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: req.params.id });
    });
});

// Admin: Edit portfolio item
app.put('/api/admin/portfolio/:id', verifyToken, (req, res) => {
    const { title, description, category, status, link, image } = req.body;
    db.run('UPDATE portfolio SET title = ?, description = ?, category = ?, status = ?, link = ?, image = ? WHERE id = ?',
        [title, description, category, status, link, image, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: req.params.id });
    });
});

// Admin: Edit stats
app.put('/api/admin/portfolio-stats/:id', verifyToken, (req, res) => {
    const { label, value, icon } = req.body;
    db.run('UPDATE portfolio_stats SET label = ?, value = ?, icon = ? WHERE id = ?', [label, value, icon, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: req.params.id });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
