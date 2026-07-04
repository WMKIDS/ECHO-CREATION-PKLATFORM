// --- المنطق الخاص بالواجهة الأمامية للمستخدم (Frontend Logic) ---

// Utility to escape HTML to prevent XSS
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}


// --- Articles Section Logic ---
async function initArticles() {
    const grid = document.getElementById('articles-grid');
    const loading = document.getElementById('articles-loading');

    if (typeof fetchArticles !== 'function') return;

    const articles = await fetchArticles();

    if (!articles || articles.length === 0) {
        if (loading) {
            loading.innerHTML = '<p class="text-slate-500 text-sm">لا توجد مقالات حالياً أو تعذر جلبها من Strapi.</p>';
        }
        return;
    }

    if (loading) {
        loading.remove();
    }

    grid.innerHTML = articles.map(articleObj => {
        const article = articleObj.attributes || articleObj;

        let coverHtml = '';
        if (article.Cover && article.Cover.data) {
            const url = 'http://localhost:1337' + article.Cover.data.attributes.url;
            coverHtml = `<img src="${escapeHTML(url)}" alt="cover" class="w-full h-40 object-cover rounded-t-3xl" />`;
        }

        return `
        <div class="bg-slate-900 border border-slate-800 rounded-3xl flex flex-col hover:border-indigo-500/40 transition-all">
            ${coverHtml}
            <div class="p-6 lg:p-8 space-y-4">
                <h4 class="text-xl font-bold text-white">${escapeHTML(article.Title)}</h4>
                <div class="text-sm text-slate-400 prose prose-invert">${article.Content}</div>
            </div>
        </div>
        `;
    }).join('');
}


// Initialize Icons (تفعيل أيقونات Lucide)
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    const path = window.location.pathname;
    if (path === '/' || path.includes('index.html')) {
        initHome();
        initArticles();
    } else if (path.includes('courses.html')) {
        initCourses();
    } else if (path.includes('forum.html')) {
        initForum();
    }
});

// --- Home Page Logic (منطق الصفحة الرئيسية) ---
async function initHome() {
    // Fetch Portfolio Data
    async function loadPortfolio() {
        const grid = document.getElementById('portfolio-grid');
        const items = await fetchAPI('/api/portfolio');
        if (!grid) return;

        if (items.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                    <p class="text-slate-500 text-sm">لا توجد أعمال لعرضها حالياً.</p>
                </div>
            `;
            return;
        }

        const renderItems = (filter = 'all') => {
            const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
            grid.innerHTML = filtered.map(item => `
                <div class="group relative bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300">
                    <div class="h-48 bg-slate-800 overflow-hidden relative">
                        ${item.image ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">` : `<div class="w-full h-full flex items-center justify-center text-slate-600"><i data-lucide="image" class="w-8 h-8"></i></div>`}
                        <div class="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm text-[10px] font-bold text-white px-2 py-1 rounded-md border border-slate-700/50 uppercase tracking-wide">
                            ${escapeHTML(item.category)}
                        </div>
                    </div>
                    <div class="p-5 space-y-3">
                        <h4 class="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">${escapeHTML(item.title)}</h4>
                        <p class="text-slate-400 text-xs leading-relaxed line-clamp-2">${escapeHTML(item.description)}</p>
                        ${item.link ? `<a href="${escapeHTML(item.link)}" target="_blank" class="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-semibold mt-2">معاينة المشروع <i data-lucide="external-link" class="w-3 h-3"></i></a>` : ''}
                    </div>
                </div>
            `).join('');
            if (window.lucide) lucide.createIcons();
        };

        renderItems();

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.remove('bg-indigo-600', 'text-white');
                    b.classList.add('bg-slate-800', 'text-slate-300');
                });
                e.target.classList.remove('bg-slate-800', 'text-slate-300');
                e.target.classList.add('bg-indigo-600', 'text-white');
                renderItems(e.target.dataset.filter);
            });
        });
    }

    async function loadStats() {
        const statsSec = document.getElementById('stats-section');
        if (!statsSec) return;
        const stats = await fetchAPI('/api/portfolio-stats');
        if (stats.length === 0) return;

        statsSec.innerHTML = stats.map(stat => `
            <div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center space-y-2 hover:bg-slate-900 transition-colors">
                <div class="w-10 h-10 mx-auto rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
                    <i data-lucide="${escapeHTML(stat.icon || 'star')}" class="w-5 h-5"></i>
                </div>
                <h4 class="text-3xl font-black text-white">${escapeHTML(stat.value)}</h4>
                <p class="text-xs text-slate-400 font-semibold">${escapeHTML(stat.label)}</p>
            </div>
        `).join('');
        if (window.lucide) lucide.createIcons();
    }

    loadPortfolio();
    loadStats();

    const servicesGrid = document.getElementById('services-grid');
    const countSpan = document.getElementById('services-count');

    // Fetch Services
    const services = await fetchAPI('/api/services');

    if (servicesGrid && countSpan) {
        countSpan.textContent = `مجموع الخدمات النشطة: ${services.length}`;

        if (services.length === 0) {
            servicesGrid.innerHTML = `
                <div class="col-span-full py-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                    <p class="text-slate-500 text-sm">تم إيقاف تفعيل جميع الخدمات مؤقتاً من قبل لوحة الإدارة.</p>
                </div>
            `;
        } else {
            servicesGrid.innerHTML = services.map(service => `
                <div class="group relative bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-300 flex flex-col justify-between">
                    <div class="space-y-4">
                        <div class="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 group-hover:text-white group-hover:bg-indigo-600 transition-all duration-300">
                            <i data-lucide="${service.icon === 'code' ? 'code' : (service.icon === 'palette' ? 'palette' : 'database')}" class="w-6 h-6"></i>
                        </div>
                        <div class="space-y-2">
                            <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">${service.category}</span>
                            <h4 class="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">${service.title}</h4>
                            <p class="text-slate-400 text-xs leading-relaxed">${service.description}</p>
                        </div>
                        <div class="flex flex-wrap gap-1.5 pt-2">
                            ${service.skills.map(skill => `<span class="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800/80">${skill}</span>`).join('')}
                        </div>
                    </div>
                    <div class="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-6">
                        <span class="text-slate-500 text-xs">تبدأ من: <span class="text-emerald-400 font-extrabold text-lg">${service.price}</span></span>
                        <button onclick="showNotification('تم فتح طلب مشروعك لـ \\'${service.title}\\' بنجاح! سنتواصل معك عبر حسابك.')" class="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs font-semibold rounded-lg transition-all">
                            اطلب الخدمة الآن
                        </button>
                    </div>
                </div>
            `).join('');
            if (window.lucide) lucide.createIcons();
        }
    }

    // AI Search Logic (محاكي البحث بالذكاء الاصطناعي)
    const aiForm = document.getElementById('ai-search-form');
    if (aiForm) {
        aiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = document.getElementById('search-input').value.toLowerCase().trim();
            if (!query) return;

            const btn = document.getElementById('search-btn');
            const btnText = document.getElementById('search-btn-text');
            btn.disabled = true;
            btnText.textContent = "جاري التحليل والترشيح...";

            // Simulate API delay
            setTimeout(async () => {
                const allCourses = await fetchAPI('/api/courses');

                const matchedServices = services.filter(s => s.title.toLowerCase().includes(query) || s.description.toLowerCase().includes(query));
                const matchedCourses = allCourses.filter(c => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query));

                let responseText = "";
                if (matchedServices.length > 0 || matchedCourses.length > 0) {
                    responseText = `أهلاً بك! لقد قمت بتحليل استفسارك الذكي حول "${query}" بموجب قواعد بيانات Echo Creation.\nلقد عثرت على حلول مخصصة تناسب تطلعاتك تماماً:`;
                } else {
                    responseText = `أهلاً بك! لقد بحثت عن "${query}". بصفتي المساعد الذكي، يبدو أننا لا نمتلك خدمة أو كورس مباشر بهذا الاسم حالياً. يمكنك التواصل مباشرة معنا!`;
                }

                document.getElementById('ai-response-text').textContent = responseText;

                const srvCont = document.getElementById('ai-services-container');
                const srvList = document.getElementById('ai-services-list');
                if (matchedServices.length > 0) {
                    srvList.innerHTML = matchedServices.map(s => `
                        <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div><h4 class="text-xs font-bold text-white">${s.title}</h4><p class="text-[10px] text-slate-500">${s.price} - ${s.category}</p></div>
                            <span class="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">متاح الآن</span>
                        </div>
                    `).join('');
                    srvCont.classList.remove('hidden');
                } else {
                    srvCont.classList.add('hidden');
                }

                const crsCont = document.getElementById('ai-courses-container');
                const crsList = document.getElementById('ai-courses-list');
                if (matchedCourses.length > 0) {
                    crsList.innerHTML = matchedCourses.map(c => `
                        <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div><h4 class="text-xs font-bold text-white">${c.title}</h4><p class="text-[10px] text-slate-500">${c.instructor} - ${c.duration}</p></div>
                            <a href="/courses.html" class="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-md hover:bg-indigo-500 hover:text-white transition-all">عرض الكورس</a>
                        </div>
                    `).join('');
                    crsCont.classList.remove('hidden');
                } else {
                    crsCont.classList.add('hidden');
                }

                document.getElementById('ai-response-container').classList.remove('hidden');
                btn.disabled = false;
                btnText.textContent = "توجيه بالذكاء";
            }, 1200);
        });

        document.getElementById('close-ai-response').addEventListener('click', () => {
            document.getElementById('ai-response-container').classList.add('hidden');
        });
    }
}

// --- Courses Page Logic (منطق الأكاديمية) ---
async function initCourses() {
    const grid = document.getElementById('courses-grid');
    const countSpan = document.getElementById('courses-count');

    const courses = await fetchAPI('/api/courses');

    countSpan.textContent = `مجموع الكورسات المتاحة: ${courses.length} كورس`;

    if (courses.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                <p class="text-slate-500 text-sm">لا تتوفر كورسات منشورة حالياً في الأكاديمية.</p>
            </div>
        `;
        return;
    }

    // Since we don't have a backend route to "enroll", we simulate it
    window.enrollCourse = function(title) {
        showNotification(`تهانينا! تم تسجيلك بنجاح في كورس "${title}". ابدأ التعلم الآن من حسابك!`);
    };

    grid.innerHTML = courses.map(course => `
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col justify-between hover:border-indigo-500/40 transition-all">
            <div class="space-y-6">
                <div class="flex items-center justify-between">
                    <span class="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">${course.category}</span>
                    <span class="text-xs text-slate-500">مدة الدورة: ${course.duration}</span>
                </div>
                <div class="space-y-2">
                    <h4 class="text-xl font-bold text-white">${course.title}</h4>
                    <p class="text-sm text-slate-400 leading-relaxed">${course.description}</p>
                </div>
                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <p class="text-xs font-bold text-slate-300">منهج الدورة المقترح للتعلم:</p>
                    <ul class="space-y-2">
                        ${course.lessons.map((lesson, i) => `
                            <li class="flex items-center gap-2 text-xs text-slate-400">
                                <span class="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">${i + 1}</span>
                                <span>${lesson}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="flex flex-wrap items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4">
                    <div>المستوى: <span class="text-slate-300 font-semibold">${course.level}</span></div>
                    <div>المدرب: <span class="text-indigo-400 font-semibold">${course.instructor}</span></div>
                    <div>الطلاب المسجلون: <span class="text-slate-300 font-semibold">${course.enrolledStudents} طالب</span></div>
                </div>
            </div>
            <div class="flex items-center justify-between mt-6 pt-4 border-t border-slate-800/80">
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-500">قيمة الدورة</span>
                    <span class="text-emerald-400 font-extrabold text-2xl">${course.price}</span>
                </div>
                <button onclick="enrollCourse('${course.title.replace(/'/g, "\\'")}')" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow shadow-indigo-600/35">
                    سجل في الكورس وافتح الأقسام 🚀
                </button>
            </div>
        </div>
    `).join('');
}

// --- Forum Page Logic (منطق المنتدى) ---
async function initForum() {
    const container = document.getElementById('forum-posts-container');

    async function loadPosts() {
        const posts = await fetchAPI('/api/forum-posts');

        if (posts.length === 0) {
            container.innerHTML = `<div class="py-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800"><p class="text-slate-500 text-sm">لا توجد منشورات حتى الآن.</p></div>`;
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center gap-3">
                        <img src="${post.avatar}" alt="${escapeHTML(post.author)}" class="w-10 h-10 rounded-full border border-slate-800 object-cover" />
                        <div>
                            <h4 class="text-sm font-bold text-white">${escapeHTML(post.author)}</h4>
                            <span class="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full">${escapeHTML(post.role)}</span>
                        </div>
                    </div>
                    <span class="text-xs text-slate-500">${escapeHTML(post.date)}</span>
                </div>
                <div class="space-y-2">
                    <h5 class="text-base font-bold text-white">${escapeHTML(post.title)}</h5>
                    <p class="text-slate-400 text-xs leading-relaxed">${escapeHTML(post.content)}</p>
                </div>
                <div class="flex flex-wrap gap-1.5 pt-1">
                    ${post.tags.map(tag => `<span class="text-[10px] bg-slate-950 text-indigo-400 border border-slate-800 px-2 py-0.5 rounded-md">#${escapeHTML(tag)}</span>`).join('')}
                </div>
                <div class="flex items-center gap-6 border-t border-slate-800/60 pt-4 text-xs text-slate-400">
                    <button class="flex items-center gap-1.5 hover:text-indigo-400 transition-colors">
                        <span>👍 أعجبني</span><span>(${post.likes})</span>
                    </button>
                    <span>💬 ${post.replies.length} رد</span>
                </div>

                ${post.replies.length > 0 ? `
                    <div class="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                        ${post.replies.map(reply => `
                            <div class="flex items-start gap-3 text-xs leading-relaxed">
                                <img src="${reply.avatar}" alt="${escapeHTML(reply.author)}" class="w-8 h-8 rounded-full border border-slate-800 object-cover" />
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-bold text-white">${escapeHTML(reply.author)}</span>
                                        <span class="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 rounded">${escapeHTML(reply.role)}</span>
                                    </div>
                                    <p class="text-slate-400">${escapeHTML(reply.content)}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="flex gap-2">
                    <input type="text" id="reply-input-${post.id}" placeholder="اكتب رداً تفاعلياً كأدمن أو مشرف على هذا السؤال..." class="flex-grow bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
                    <button onclick="submitReply('${post.id}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i><span>رد</span>
                    </button>
                </div>
            </div>
        `).join('');
        if (window.lucide) lucide.createIcons();
    }

    loadPosts();

    // إضافة منشور جديد
    const addForm = document.getElementById('add-post-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('post-title').value;
            const tagsInput = document.getElementById('post-tags').value;
            const content = document.getElementById('post-content').value;

            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

            try {
                const res = await fetch('/api/forum-posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, tags, content })
                });
                if (res.ok) {
                    showNotification("تم نشر موضوعك بنجاح في منتدى الطلاب");
                    addForm.reset();
                    loadPosts(); // Reload posts
                } else {
                    const data = await res.json();
                    showNotification(data.error || "خطأ في النشر", "error");
                }
            } catch (err) {
                showNotification("حدث خطأ في الاتصال بالخادم", "error");
            }
        });
    }

    // Global function for replies
    window.submitReply = async function(postId) {
        const input = document.getElementById(`reply-input-${postId}`);
        const content = input.value.trim();
        if (!content) return;

        try {
            const res = await fetch(`/api/forum-posts/${postId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            if (res.ok) {
                showNotification("تمت إضافة ردك بنجاح");
                input.value = '';
                loadPosts(); // Reload posts
            }
        } catch (err) {
            showNotification("حدث خطأ", "error");
        }
    };
}
