// 工作时长统计应用 - 云端版
class WorkHoursTracker {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.currentDate = new Date();
        this.records = [];
        this.xiaotiancheng = false;
        this.apiBase = '/api';
        
        this.init();
    }

    init() {
        this.checkLogin();
        this.bindEvents();
    }

    // 显示加载状态
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    // API 请求封装
    async apiRequest(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${this.apiBase}${url}`, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '请求失败');
            }

            return data;
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    }

    // 检查登录状态
    checkLogin() {
        const savedToken = localStorage.getItem('authToken');
        const savedUser = localStorage.getItem('currentUser');

        if (savedToken && savedUser) {
            this.token = savedToken;
            this.currentUser = JSON.parse(savedUser);
            this.verifyToken();
        } else {
            this.showAuthPage();
        }
    }

    // 验证 token 是否有效
    async verifyToken() {
        try {
            await this.apiRequest('/auth/me');
            this.showMainPage();
            this.loadMonthData();
        } catch (error) {
            // token 无效，清除本地存储
            this.handleLogout();
        }
    }

    // 显示登录页面
    showAuthPage() {
        document.getElementById('auth-page').style.display = 'flex';
        document.getElementById('main-page').style.display = 'none';
    }

    // 显示主页面
    showMainPage() {
        document.getElementById('auth-page').style.display = 'none';
        document.getElementById('main-page').style.display = 'block';
        document.getElementById('user-email').textContent = this.currentUser.email;
        this.updateMonthDisplay();
    }

    // 绑定事件
    bindEvents() {
        // 登录注册切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // 登录表单
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // 注册表单
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // 退出登录
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // 月份切换
        document.getElementById('prev-month').addEventListener('click', () => {
            this.changeMonth(-1);
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.changeMonth(1);
        });

        // 小添乘
        document.getElementById('xiaotiancheng').addEventListener('change', (e) => {
            this.xiaotiancheng = e.target.checked;
            this.renderStats();
        });

        // 添加记录
        document.getElementById('add-btn').addEventListener('click', () => {
            this.addRecord();
        });
    }

    // 切换登录注册标签
    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tab}-form`);
        });
        // 清除错误信息
        document.getElementById('login-error').textContent = '';
        document.getElementById('register-error').textContent = '';
    }

    // 处理登录
    async handleLogin() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const submitBtn = document.querySelector('#login-form .btn-primary');

        if (!email || !password) {
            errorEl.textContent = '请填写完整信息';
            return;
        }

        errorEl.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = '登录中...';

        try {
            const data = await this.apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            this.token = data.token;
            this.currentUser = data.user;
            
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            this.showMainPage();
            this.loadMonthData();
        } catch (error) {
            errorEl.textContent = error.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '登录';
        }
    }

    // 处理注册
    async handleRegister() {
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        const errorEl = document.getElementById('register-error');
        const submitBtn = document.querySelector('#register-form .btn-primary');

        if (!email || !password || !confirm) {
            errorEl.textContent = '请填写完整信息';
            return;
        }

        if (password.length < 6) {
            errorEl.textContent = '密码至少6位';
            return;
        }

        if (password !== confirm) {
            errorEl.textContent = '两次密码不一致';
            return;
        }

        errorEl.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = '注册中...';

        try {
            const data = await this.apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            this.token = data.token;
            this.currentUser = data.user;
            
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            this.showMainPage();
            this.loadMonthData();
        } catch (error) {
            errorEl.textContent = error.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '注册';
        }
    }

    // 处理退出
    handleLogout() {
        this.token = null;
        this.currentUser = null;
        this.records = [];
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        this.showAuthPage();
    }

    // 加载当月数据
    async loadMonthData() {
        this.showLoading();
        try {
            const month = this.getCurrentMonthStr();
            const data = await this.apiRequest(`/records?month=${month}`);
            this.records = data.records;
            this.renderStats();
            this.renderRecords();
        } catch (error) {
            console.error('加载数据失败:', error);
            if (error.message.includes('未登录') || error.message.includes('过期')) {
                this.handleLogout();
            }
        } finally {
            this.hideLoading();
        }
    }

    // 切换月份
    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.updateMonthDisplay();
        this.loadMonthData();
    }

    // 更新月份显示
    updateMonthDisplay() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        document.getElementById('current-month').textContent = `${year}年${month}月`;
    }

    // 获取当前月份字符串 YYYY-MM
    getCurrentMonthStr() {
        const year = this.currentDate.getFullYear();
        const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    // 计算总工时
    calculateTotalHours(records) {
        let total = 0;
        records.forEach(record => {
            total += record.totalHours;
        });
        
        // 小添乘加16小时
        if (this.xiaotiancheng) {
            total += 16;
        }
        
        return total;
    }

    // 计算关键时长
    calculateKeyHours(records) {
        let total = 0;
        records.forEach(record => {
            total += record.keyHours;
        });
        return total;
    }

    // 渲染统计数据
    renderStats() {
        const totalHours = this.calculateTotalHours(this.records);
        const keyHours = this.calculateKeyHours(this.records);
        const tripCount = this.records.length;

        document.getElementById('total-hours').textContent = `${totalHours.toFixed(2)}h`;
        document.getElementById('key-hours').textContent = `${keyHours.toFixed(2)}h`;
        document.getElementById('trip-count').textContent = tripCount;

        // 剩余时间
        const totalRemain = Math.max(0, 100 - totalHours);
        const keyRemain = Math.max(0, 50 - keyHours);
        document.getElementById('total-remain').textContent = `距100h还差${totalRemain.toFixed(2)}h`;
        document.getElementById('key-remain').textContent = `距50h还差${keyRemain.toFixed(2)}h`;
    }

    // 渲染记录列表
    renderRecords() {
        const listEl = document.getElementById('records-list');
        const countEl = document.getElementById('record-count');

        countEl.textContent = this.records.length;

        if (this.records.length === 0) {
            listEl.innerHTML = '<div class="empty-state">暂无出勤记录</div>';
            return;
        }

        // 按日期排序
        const sortedRecords = [...this.records].sort((a, b) => {
            if (a.date === b.date) {
                return a.startTime.localeCompare(b.startTime);
            }
            return a.date.localeCompare(b.date);
        });

        let html = '';
        sortedRecords.forEach((record, index) => {
            html += `
                <div class="record-row">
                    <div class="col-trip">${index + 1}</div>
                    <div class="col-start">${this.formatTime(record.startTime)}</div>
                    <div class="col-end">${this.formatTime(record.endTime)}</div>
                    <div class="col-total">${record.totalHours.toFixed(1)}h</div>
                    <div class="col-key">${record.keyHours.toFixed(1)}h</div>
                    <div class="col-action">
                        <button class="delete-btn" data-id="${record.id}" title="删除">🗑️</button>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;

        // 绑定删除事件
        listEl.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.deleteRecord(id);
            });
        });
    }

    // 格式化时间显示 0800 -> 08:00
    formatTime(time) {
        return time.substring(0, 2) + ':' + time.substring(2, 4);
    }

    // 添加记录
    async addRecord() {
        const startTime = document.getElementById('start-time').value.trim();
        const endTime = document.getElementById('end-time').value.trim();
        const addBtn = document.getElementById('add-btn');

        if (!startTime || !endTime) {
            alert('请填写出勤和退勤时间');
            return;
        }

        // 验证时间格式
        if (!/^\d{4}$/.test(startTime) || !/^\d{4}$/.test(endTime)) {
            alert('时间格式不正确，请输入4位数字，如 0930');
            return;
        }

        const startHour = parseInt(startTime.substring(0, 2));
        const startMin = parseInt(startTime.substring(2, 4));
        const endHour = parseInt(endTime.substring(0, 2));
        const endMin = parseInt(endTime.substring(2, 4));

        if (startHour >= 24 || startMin >= 60 || endHour >= 24 || endMin >= 60) {
            alert('时间格式不正确');
            return;
        }

        addBtn.disabled = true;

        try {
            const date = this.currentDate.toISOString().split('T')[0];
            const data = await this.apiRequest('/records', {
                method: 'POST',
                body: JSON.stringify({ date, startTime, endTime })
            });

            this.records.push(data.record);

            // 清空输入
            document.getElementById('start-time').value = '';
            document.getElementById('end-time').value = '';

            this.renderStats();
            this.renderRecords();
        } catch (error) {
            alert('添加失败: ' + error.message);
        } finally {
            addBtn.disabled = false;
        }
    }

    // 删除记录
    async deleteRecord(id) {
        if (!confirm('确定要删除这条记录吗？')) {
            return;
        }

        try {
            await this.apiRequest(`/records/${id}`, {
                method: 'DELETE'
            });

            this.records = this.records.filter(r => r.id !== id);
            this.renderStats();
            this.renderRecords();
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new WorkHoursTracker();
});
