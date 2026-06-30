// --- المنطق الخاص بلوحة تحكم الإدارة (Admin Logic) ---

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    const path = window.location.pathname;

    if (path.includes('login') || path.includes('login.html')) {
        initLogin();
    } else if (path === '/admin' || path === '/admin/' || path.includes('admin.html')) {
        // التحقق من وجود التوكن قبل عرض صفحة الأدمن
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/admin/login';
        } else {
            // كشف محتوى الصفحة بمجرد التحقق
            document.getElementById('admin-body').classList.remove('hidden');
            initAdminDashboard();
        }
    }
});

// --- إعداد صفحة تسجيل الدخول ---
function initLogin() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.ok) {
                    // حفظ التوكن في التخزين المحلي
                    localStorage.setItem('adminToken', data.token);
                    showNotification(data.message);
                    setTimeout(() => window.location.href = '/admin', 1000);
                } else {
                    showNotification(data.error || "بيانات الاعتماد غير صحيحة", "error");
                }
            } catch (err) {
                showNotification("حدث خطأ في الاتصال بالخادم", "error");
            }
        });
    }
}

// --- إعداد لوحة تحكم الإدارة ---
async function initAdminDashboard() {
    // تسجيل الخروج
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
    });

    // تحميل البيانات
    await loadAdminServices();
    await loadAdminCourses();

    await loadAdminPortfolio();
    await loadAdminStats();


    // إعداد نماذج الإضافة
    setupAddForms();
}

async function loadAdminServices() {
    const tbody = document.getElementById('admin-services-list');
    try {
        const services = await fetchProtectedAPI('/api/admin/services');
        if (services.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">لا توجد خدمات.</td></tr>`;
            return;
        }

        tbody.innerHTML = services.map(service => `
            <tr class="hover:bg-slate-950/40">
                <td class="py-4 font-semibold">
                    <p class="text-white">${service.title}</p>
                    <div class="flex gap-1 pt-1">
                        ${service.skills.map(skill => `<span class="bg-slate-900 text-[9px] text-slate-400 px-1 rounded">${skill}</span>`).join('')}
                    </div>
                </td>
                <td class="py-4 text-slate-300">${service.category}</td>
                <td class="py-4 text-emerald-400 font-extrabold">${service.price}</td>
                <td class="py-4">
                    <button onclick="toggleService('${service.id}')" class="px-3 py-1.5 rounded-lg font-semibold transition-all ${service.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}">
                        ${service.active ? '🟢 نشط في المتجر (ON)' : '🔴 مخفي ومغلق (OFF)'}
                    </button>
                </td>
                <td class="py-4">
                    <button onclick="openEditModal('service', '${service.id}')" class="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all mr-1" title="تعديل"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deleteService('${service.id}')" class="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-all" title="حذف الخدمة"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-500">فشل في تحميل الخدمات</td></tr>`;
    }
}

async function loadAdminCourses() {
    const tbody = document.getElementById('admin-courses-list');
    try {
        const courses = await fetchProtectedAPI('/api/admin/courses');
        if (courses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-slate-500">لا توجد كورسات.</td></tr>`;
            return;
        }

        tbody.innerHTML = courses.map(course => `
            <tr class="hover:bg-slate-950/40">
                <td class="py-4 font-semibold text-white">${course.title}</td>
                <td class="py-4 text-slate-400">${course.instructor} - ${course.duration}</td>
                <td class="py-4 text-slate-300 font-bold">${course.enrolledStudents} طالب</td>
                <td class="py-4 text-emerald-400 font-extrabold">${course.price}</td>
                <td class="py-4">
                    <button onclick="toggleCourse('${course.id}')" class="px-3 py-1.5 rounded-lg font-semibold transition-all ${course.active ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}">
                        ${course.active ? '🟢 معروض للطلاب (ON)' : '🔴 معطل من العرض (OFF)'}
                    </button>
                </td>
                <td class="py-4">
                    <button onclick="openEditModal('course', '${course.id}')" class="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all mr-1" title="تعديل"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deleteCourse('${course.id}')" class="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-all" title="حذف الكورس"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-rose-500">فشل في تحميل الكورسات</td></tr>`;
    }
}

// Functions exposed to window for inline onclick handlers
window.toggleService = async function(id) {
    try {
        await fetchProtectedAPI(`/api/admin/services/${id}/toggle`, 'PUT');
        showNotification("تم تحديث حالة الخدمة بنجاح", 'info');
        loadAdminServices();
    } catch (e) {
        showNotification("حدث خطأ أثناء التحديث", 'error');
    }
};

window.deleteService = async function(id) {
    if(!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    try {
        await fetchProtectedAPI(`/api/admin/services/${id}`, 'DELETE');
        showNotification("تم حذف الخدمة بنجاح", 'error');
        loadAdminServices();
    } catch (e) {
        showNotification("حدث خطأ أثناء الحذف", 'error');
    }
};

window.toggleCourse = async function(id) {
    try {
        await fetchProtectedAPI(`/api/admin/courses/${id}/toggle`, 'PUT');
        showNotification("تم تحديث حالة الكورس بنجاح", 'info');
        loadAdminCourses();
    } catch (e) {
        showNotification("حدث خطأ أثناء التحديث", 'error');
    }
};

window.deleteCourse = async function(id) {
    if(!confirm('هل أنت متأكد من حذف هذا الكورس؟')) return;
    try {
        await fetchProtectedAPI(`/api/admin/courses/${id}`, 'DELETE');
        showNotification("تم حذف الكورس بنجاح", 'error');
        loadAdminCourses();
    } catch (e) {
        showNotification("حدث خطأ أثناء الحذف", 'error');
    }
};


async function loadAdminPortfolio() {
    const tbody = document.getElementById('admin-portfolio-list');
    try {
        const items = await fetchProtectedAPI('/api/admin/portfolio');
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-500">لا توجد مشاريع.</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-950/40">
                <td class="py-4 font-semibold">
                    <p class="text-white">${item.title}</p>
                </td>
                <td class="py-4 text-slate-300">${item.category} (${item.status})</td>
                <td class="py-4">
                    <button onclick="togglePortfolio('${item.id}')" class="px-3 py-1.5 rounded-lg font-semibold transition-all ${item.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}">
                        ${item.active ? '🟢 نشط (ON)' : '🔴 مخفي (OFF)'}
                    </button>
                </td>
                <td class="py-4">
                    <button onclick="openEditModal('portfolio', '${item.id}')" class="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all mr-1" title="تعديل"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deletePortfolio('${item.id}')" class="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-all" title="حذف"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-rose-500">فشل التحميل</td></tr>`;
    }
}

async function loadAdminStats() {
    const tbody = document.getElementById('admin-stats-list');
    try {
        const items = await fetchProtectedAPI('/api/admin/portfolio-stats');
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-500">لا توجد إحصائيات.</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-950/40">
                <td class="py-4 font-black text-white">${item.value}</td>
                <td class="py-4 text-slate-300">${item.label}</td>
                <td class="py-4 text-slate-300"><i data-lucide="${item.icon || 'star'}" class="w-4 h-4"></i></td>
                <td class="py-4">
                    <button onclick="openEditModal('stat', '${item.id}')" class="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all mr-1" title="تعديل"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deleteStat('${item.id}')" class="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-all" title="حذف"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-rose-500">فشل التحميل</td></tr>`;
    }
}

window.togglePortfolio = async function(id) {
    try {
        await fetchProtectedAPI(`/api/admin/portfolio/${id}/toggle`, 'PUT');
        showNotification("تم تحديث الحالة بنجاح", 'info');
        loadAdminPortfolio();
    } catch (e) {
        showNotification("حدث خطأ", 'error');
    }
};

window.deletePortfolio = async function(id) {
    if(!confirm('تأكيد الحذف؟')) return;
    try {
        await fetchProtectedAPI(`/api/admin/portfolio/${id}`, 'DELETE');
        showNotification("تم الحذف", 'error');
        loadAdminPortfolio();
    } catch (e) {
        showNotification("حدث خطأ", 'error');
    }
};

window.deleteStat = async function(id) {
    if(!confirm('تأكيد الحذف؟')) return;
    try {
        await fetchProtectedAPI(`/api/admin/portfolio-stats/${id}`, 'DELETE');
        showNotification("تم الحذف", 'error');
        loadAdminStats();
    } catch (e) {
        showNotification("حدث خطأ", 'error');
    }
};

function setupAddForms() {
    const addSrvForm = document.getElementById('add-service-form');
    if (addSrvForm) {
        addSrvForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                title: document.getElementById('srv-title').value,
                category: document.getElementById('srv-category').value,
                price: document.getElementById('srv-price').value,
                skills: document.getElementById('srv-skills').value.split(',').map(s=>s.trim()).filter(Boolean),
                description: document.getElementById('srv-desc').value,
                icon: 'code' // default
            };
            try {
                await fetchProtectedAPI('/api/admin/services', 'POST', body);
                showNotification("تمت إضافة الخدمة بنجاح للمتجر");
                addSrvForm.reset();
                loadAdminServices();
            } catch (e) {
                showNotification("حدث خطأ أثناء الإضافة", "error");
            }
        });
    }


    const addPortForm = document.getElementById('add-portfolio-form');
    if (addPortForm) {
        addPortForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                title: document.getElementById('port-title').value,
                category: document.getElementById('port-category').value,
                status: document.getElementById('port-status').value,
                link: document.getElementById('port-link').value,
                image: document.getElementById('port-image').value,
                description: document.getElementById('port-desc').value
            };
            try {
                await fetchProtectedAPI('/api/admin/portfolio', 'POST', body);
                showNotification("تمت الإضافة بنجاح");
                addPortForm.reset();
                loadAdminPortfolio();
            } catch (e) {
                showNotification("حدث خطأ", "error");
            }
        });
    }

    const addStatForm = document.getElementById('add-stat-form');
    if (addStatForm) {
        addStatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                value: document.getElementById('stat-value').value,
                label: document.getElementById('stat-label').value,
                icon: document.getElementById('stat-icon').value
            };
            try {
                await fetchProtectedAPI('/api/admin/portfolio-stats', 'POST', body);
                showNotification("تمت الإضافة بنجاح");
                addStatForm.reset();
                loadAdminStats();
            } catch (e) {
                showNotification("حدث خطأ", "error");
            }
        });
    }

    const addCrsForm = document.getElementById('add-course-form');
    if (addCrsForm) {
        addCrsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                title: document.getElementById('crs-title').value,
                price: document.getElementById('crs-price').value,
                duration: document.getElementById('crs-duration').value,
                level: document.getElementById('crs-level').value,
                lessons: document.getElementById('crs-lessons').value.split(',').map(l=>l.trim()).filter(Boolean),
                description: document.getElementById('crs-desc').value,
                instructor: 'عمر الفاروق', // default instructor
                category: 'كورسات برمجة'
            };
            try {
                await fetchProtectedAPI('/api/admin/courses', 'POST', body);
                showNotification("تم نشر الكورس الجديد في الأكاديمية بنجاح");
                addCrsForm.reset();
                loadAdminCourses();
            } catch (e) {
                showNotification("حدث خطأ أثناء الإضافة", "error");
            }
        });
    }
}


let currentEditType = null;
let currentEditId = null;
let editDataCache = {};

window.openEditModal = async function(type, id) {
    currentEditType = type;
    currentEditId = id;
    const modal = document.getElementById('edit-modal');
    const inputsContainer = document.getElementById('edit-form-inputs');
    const title = document.getElementById('edit-modal-title');

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    let endpoint = '';
    if (type === 'service') endpoint = '/api/admin/services';
    if (type === 'course') endpoint = '/api/admin/courses';
    if (type === 'portfolio') endpoint = '/api/admin/portfolio';
    if (type === 'stat') endpoint = '/api/admin/portfolio-stats';

    try {
        const items = await fetchProtectedAPI(endpoint);
        const item = items.find(i => i.id === id);
        if (!item) return showNotification("Item not found", "error");

        editDataCache = item;

        if (type === 'service') {
            title.textContent = "تعديل خدمة";
            inputsContainer.innerHTML = `
                <input type="text" id="edit-title" value="${item.title}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="اسم الخدمة">
                <input type="text" id="edit-category" value="${item.category}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="التصنيف">
                <input type="text" id="edit-price" value="${item.price}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="السعر">
                <input type="text" id="edit-skills" value="${(item.skills||[]).join(', ')}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="المهارات (مفصولة بفاصلة)">
                <textarea id="edit-desc" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none" placeholder="الوصف">${item.description}</textarea>
            `;
        } else if (type === 'course') {
            title.textContent = "تعديل كورس";
            inputsContainer.innerHTML = `
                <input type="text" id="edit-title" value="${item.title}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="عنوان الكورس">
                <input type="text" id="edit-price" value="${item.price}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="السعر">
                <input type="text" id="edit-duration" value="${item.duration}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="المدة">
                <input type="text" id="edit-level" value="${item.level}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="المستوى">
                <input type="text" id="edit-lessons" value="${(item.lessons||[]).join(', ')}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="الدروس (مفصولة بفاصلة)">
                <textarea id="edit-desc" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none" placeholder="الوصف">${item.description}</textarea>
            `;
        } else if (type === 'portfolio') {
            title.textContent = "تعديل مشروع";
            inputsContainer.innerHTML = `
                <input type="text" id="edit-title" value="${item.title}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="اسم المشروع">
                <input type="text" id="edit-category" value="${item.category}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="التصنيف">
                <select id="edit-status" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white">
                    <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                    <option value="product" ${item.status === 'product' ? 'selected' : ''}>منتج</option>
                    <option value="in-progress" ${item.status === 'in-progress' ? 'selected' : ''}>قيد التنفيذ</option>
                </select>
                <input type="text" id="edit-link" value="${item.link||''}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="رابط المعاينة">
                <input type="text" id="edit-image" value="${item.image||''}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="رابط الصورة">
                <textarea id="edit-desc" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none" placeholder="الوصف">${item.description}</textarea>
            `;
        } else if (type === 'stat') {
            title.textContent = "تعديل إحصائية";
            inputsContainer.innerHTML = `
                <input type="text" id="edit-value" value="${item.value}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="القيمة">
                <input type="text" id="edit-label" value="${item.label}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="العنوان">
                <input type="text" id="edit-icon" value="${item.icon||''}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" placeholder="أيقونة">
            `;
        }
        if(window.lucide) lucide.createIcons();
    } catch (e) {
        showNotification("Failed to load details", "error");
    }
};

window.closeEditModal = function() {
    const modal = document.getElementById('edit-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    currentEditType = null;
    currentEditId = null;
};

document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentEditType || !currentEditId) return;

            let body = {};
            let endpoint = `/api/admin/${currentEditType === 'stat' ? 'portfolio-stats' : (currentEditType === 'portfolio' ? 'portfolio' : currentEditType + 's')}/${currentEditId}`;

            if (currentEditType === 'service') {
                body = {
                    title: document.getElementById('edit-title').value,
                    category: document.getElementById('edit-category').value,
                    price: document.getElementById('edit-price').value,
                    skills: document.getElementById('edit-skills').value.split(',').map(s=>s.trim()).filter(Boolean),
                    description: document.getElementById('edit-desc').value,
                    icon: editDataCache.icon || 'code'
                };
            } else if (currentEditType === 'course') {
                body = {
                    title: document.getElementById('edit-title').value,
                    price: document.getElementById('edit-price').value,
                    duration: document.getElementById('edit-duration').value,
                    level: document.getElementById('edit-level').value,
                    lessons: document.getElementById('edit-lessons').value.split(',').map(s=>s.trim()).filter(Boolean),
                    description: document.getElementById('edit-desc').value,
                    instructor: editDataCache.instructor,
                    category: editDataCache.category
                };
            } else if (currentEditType === 'portfolio') {
                body = {
                    title: document.getElementById('edit-title').value,
                    category: document.getElementById('edit-category').value,
                    status: document.getElementById('edit-status').value,
                    link: document.getElementById('edit-link').value,
                    image: document.getElementById('edit-image').value,
                    description: document.getElementById('edit-desc').value
                };
            } else if (currentEditType === 'stat') {
                body = {
                    value: document.getElementById('edit-value').value,
                    label: document.getElementById('edit-label').value,
                    icon: document.getElementById('edit-icon').value
                };
            }

            try {
                await fetchProtectedAPI(endpoint, 'PUT', body);
                showNotification("تم الحفظ بنجاح");
                closeEditModal();
                if(currentEditType === 'service') loadAdminServices();
                if(currentEditType === 'course') loadAdminCourses();
                if(currentEditType === 'portfolio') loadAdminPortfolio();
                if(currentEditType === 'stat') loadAdminStats();
            } catch (err) {
                showNotification("خطأ أثناء الحفظ", "error");
            }
        });
    }
});
