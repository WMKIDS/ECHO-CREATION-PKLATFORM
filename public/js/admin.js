// --- المنطق الخاص بلوحة تحكم الإدارة (Admin Logic) ---

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    const path = window.location.pathname;

    if (path.includes('login.html')) {
        initLogin();
    } else if (path.includes('admin.html')) {
        // التحقق من وجود التوكن قبل عرض صفحة الأدمن
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/login.html';
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
                    setTimeout(() => window.location.href = '/admin.html', 1000);
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
        window.location.href = '/login.html';
    });

    // تحميل البيانات
    await loadAdminServices();
    await loadAdminCourses();

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
                    <button onclick="deleteService('${service.id}')" class="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-all" title="حذف الخدمة">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
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
                    <button onclick="deleteCourse('${course.id}')" class="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-all" title="حذف الكورس">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
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
