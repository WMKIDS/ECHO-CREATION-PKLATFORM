// إدارة الإشعارات المشتركة (Global Notifications Manager)
function showNotification(text, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;

    // أيقونة مبسطة
    const icon = document.createElement('div');
    icon.className = 'p-1.5 bg-white/10 rounded-lg flex items-center justify-center';
    icon.innerHTML = `<i data-lucide="sparkles" class="w-5 h-5"></i>`;

    const msg = document.createElement('p');
    msg.className = 'text-sm font-medium';
    msg.textContent = text;

    notif.appendChild(icon);
    notif.appendChild(msg);
    container.appendChild(notif);

    // Initialize Lucide icons for the new element
    if (window.lucide) {
        lucide.createIcons({ root: notif });
    }

    // إزالة الإشعار بعد 4 ثوانٍ
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-10px)';
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

// دالة لجلب البيانات من الخادم (GET)
async function fetchAPI(endpoint) {
    try {
        const response = await fetch(window.location.origin + endpoint);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return [];
    }
}

// دالة للطلبات التي تحتاج مصادقة (Protected POST, PUT, DELETE)
async function fetchProtectedAPI(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin/login';
        return { error: 'No token found' };
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(window.location.origin + endpoint, options);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('adminToken');
                window.location.href = '/admin/login';
            }
            throw new Error(data.error || 'API Request Failed');
        }
        return data;
    } catch (error) {
        console.error(`Error in protected API (${method} ${endpoint}):`, error);
        throw error;
    }
}
