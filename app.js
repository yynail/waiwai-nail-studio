/**
 * 美甲工作室管理工作台 - app.js
 * 纯前端单页应用，数据存 localStorage
 */

// ============================================================
// 1. 工具函数
// ============================================================

const Utils = {
  genId(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  formatDate(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  formatDateTime(ts) {
    return Utils.formatDate(ts) + ' ' + new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
  },

  formatMoney(n) {
    return '¥' + Number(n).toFixed(2);
  },

  today() {
    return Utils.formatDate(new Date());
  },

  tomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return Utils.formatDate(d);
  },

  currentMonth() {
    const d = new Date();
    return d.getMonth() + 1;
  },

  currentYear() {
    return new Date().getFullYear();
  },

  monthName(m) {
    return m + '月';
  },

  isBirthdayMonth(birthdayStr) {
    if (!birthdayStr) return false;
    const b = new Date(birthdayStr);
    return (b.getMonth() + 1) === Utils.currentMonth();
  },

  daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  },

  // 获取ISO周几（周一=1...周日=7）
  getDayOfWeek(dateStr) {
    const d = new Date(dateStr);
    return d.getDay() === 0 ? 7 : d.getDay();
  },

  // 获取某月第一天是周几（周一=1）
  firstDayOfMonth(year, month) {
    return Utils.getDayOfWeek(`${year}-${String(month).padStart(2, '0')}-01`);
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  copyToClipboard(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  },

  showToast(msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    toast.style.cssText = 'padding:10px 20px;border-radius:8px;color:#fff;font-size:14px;animation:toastIn 0.3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
    if (type === 'success') toast.style.background = '#4CAF50';
    else if (type === 'error') toast.style.background = '#F44336';
    else if (type === 'warning') toast.style.background = '#FF9800';
    else toast.style.background = '#607D8B';
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
};

// ============================================================
// 2. 事件总线
// ============================================================

const EventBus = {
  _events: {},
  on(event, cb) {
    (this._events[event] = this._events[event] || []).push(cb);
  },
  off(event, cb) {
    if (!this._events[event]) return;
    this._events[event] = this._events[event].filter(f => f !== cb);
  },
  emit(event, data) {
    (this._events[event] || []).forEach(cb => cb(data));
  }
};

// ============================================================
// 3. 数据访问层 DataStore
// ============================================================

const DataStore = {
  _cache: {},

  _load(key) {
    if (this._cache[key] !== undefined) return this._cache[key];
    const raw = localStorage.getItem('nail_' + key);
    if (raw === null) return null;
    try {
      this._cache[key] = JSON.parse(raw);
      return this._cache[key];
    } catch (e) {
      return null;
    }
  },

  _save(key, value) {
    this._cache[key] = value;
    localStorage.setItem('nail_' + key, JSON.stringify(value));
    EventBus.emit('data:changed', { key });
  },

  _ensureArray(key, defaultValue) {
    let data = this._load(key);
    if (!data) {
      data = defaultValue || [];
      this._save(key, data);
    }
    return data;
  },

  _ensureObject(key, defaultValue) {
    let data = this._load(key);
    if (!data) {
      data = defaultValue || {};
      this._save(key, data);
    }
    return data;
  },

  // ---- 初始化 ----
  init() {
    // 初始化所有表
    this._ensureArray('customers', []);
    this._ensureArray('appointments', []);
    this._ensureArray('styles', []);
    this._ensureArray('transactions', []);
    this._ensureArray('points', []);
    this._ensureArray('task_records', []);
    this._ensureArray('gift_exchange', []);
    this._ensureArray('notifications', []);

    // 款式分类默认值
    const cats = this._ensureArray('style_categories', [
      { id: 'cat_01', name: '猫眼系列', order: 1 },
      { id: 'cat_02', name: '渐变系列', order: 2 },
      { id: 'cat_03', name: '手绘系列', order: 3 },
      { id: 'cat_04', name: '法式系列', order: 4 },
      { id: 'cat_05', name: '延长甲系列', order: 5 },
      { id: 'cat_06', name: '其他', order: 99 }
    ]);

    // 任务默认值
    this._ensureArray('tasks', [
      { id: 'task_01', name: '推荐新顾客', description: '推荐一位新顾客到店消费', points: 50, type: 'referral', enabled: true, isBirthdayBonus: false },
      { id: 'task_02', name: '生日月消费', description: '生日当月消费享双倍积分', points: 0, type: 'birthday', enabled: true, isBirthdayBonus: true },
      { id: 'task_03', name: '首次充值', description: '首次充值会员卡', points: 100, type: 'first_recharge', enabled: true, isBirthdayBonus: false },
      { id: 'task_04', name: '充值满500', description: '单次储值卡充值满500元', points: 50, type: 'recharge_500', enabled: true, isBirthdayBonus: false },
      { id: 'task_05', name: '连续3个月消费', description: '连续3个月有消费记录', points: 30, type: 'consecutive_3m', enabled: true, isBirthdayBonus: false }
    ]);

    // 礼物默认值
    this._ensureArray('gifts', []);

    // 设置默认值
    let settings = this._load('settings');
    if (!settings) {
      settings = {
        pointsPerYuan: 0.5,
        balanceWarningThreshold: 100,
        passCardWarningThreshold: 1,
        pointsExchangeThreshold: 200,
        birthdayDoublePoints: true,
        shopName: '歪歪美甲工作室',
        notificationTemplates: {
          consume_balance: '{name}您好，本次消费{amount}元，卡内剩余{balance}元，如美甲有问题10天内可免费质保服务！',
          consume_passcard: '{name}您好，本次{passCardType}已消费1次，剩余{count}次，如美甲有问题10天内可免费质保服务！',
          points_achieved: '{name}您好，恭喜您的积分已达{points}分，可兑换精美礼物~',
          birthday_reminder: '{name}您好，祝您生日快乐！本月消费享双倍积分哦~'
        },
        expenseCategories: ['房租', '材料', '设备', '水电', '人工', '其他'],
        quickPriceInputs: [68, 88, 128, 168, 198, 288]
      };
    } else {
      // 强制修正旧数据中的店铺名
      settings.shopName = '歪歪美甲工作室';
      Object.keys(settings.notificationTemplates || {}).forEach(key => {
        const tmpl = settings.notificationTemplates[key];
        if (typeof tmpl === 'string') {
          settings.notificationTemplates[key] = tmpl.replace(/美甲工作室/g, '歪歪美甲工作室');
        }
      });
    }
    this._save('settings', settings);

    // 元数据
    if (!this._load('meta')) {
      this._save('meta', { version: '1.0.0', createdAt: Date.now(), lastBackupAt: null, lastNotificationCheck: Date.now() });
    }
  },

  // ---- 设置 ----
  getSettings() { return this._load('settings'); },
  updateSettings(updates) {
    const s = this.getSettings();
    Object.assign(s, updates);
    this._save('settings', s);
  },

  // ---- 顾客 ----
  getCustomers() { return this._ensureArray('customers'); },
  getCustomer(id) { return this.getCustomers().find(c => c.id === id); },
  addCustomer(data) {
    const list = this.getCustomers();
    const c = {
      id: Utils.genId('cust'),
      name: data.name,
      phone: data.phone || '',
      birthday: data.birthday || '',
      remark: data.remark || '',
      card: {
        balance: data.card?.balance || 0,
        passCardCount: data.card?.passCardCount || 0,
        passCardType: data.card?.passCardType || ''
      },
      totalPoints: data.totalPoints || 0,
      usedPoints: data.usedPoints || 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    list.push(c);
    this._save('customers', list);
    return c;
  },
  updateCustomer(id, updates) {
    const list = this.getCustomers();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    if (updates.card) {
      list[idx].card = { ...list[idx].card, ...updates.card };
      delete updates.card;
    }
    Object.assign(list[idx], updates, { updatedAt: Date.now() });
    this._save('customers', list);
    return list[idx];
  },
  deleteCustomer(id) {
    const list = this.getCustomers();
    const filtered = list.filter(c => c.id !== id);
    if (filtered.length === list.length) return false;
    this._save('customers', filtered);
    // 级联删除
    this._save('appointments', this.getAppointments().filter(a => a.customerId !== id));
    this._save('transactions', this.getTransactions().filter(t => t.customerId !== id));
    this._save('points', this.getPoints().filter(p => p.customerId !== id));
    this._save('task_records', this.getTaskRecords().filter(t => t.customerId !== id));
    this._save('gift_exchange', this.getGiftExchanges().filter(e => e.customerId !== id));
    this._save('notifications', this.getNotifications().filter(n => n.customerId !== id));
    return true;
  },
  findCustomerByPhone(phone) {
    return this.getCustomers().find(c => c.phone === phone);
  },
  getUpcomingBirthdays(month) {
    return this.getCustomers().filter(c => c.birthday && new Date(c.birthday).getMonth() + 1 === month);
  },
  getLowBalance(threshold) {
    return this.getCustomers().filter(c => c.card.balance > 0 && c.card.balance < threshold);
  },
  getPassCardLow() {
    const th = this.getSettings().passCardWarningThreshold;
    return this.getCustomers().filter(c => c.card.passCardCount > 0 && c.card.passCardCount <= th);
  },

  // ---- 预约 ----
  getAppointments() { return this._ensureArray('appointments'); },
  getAppointment(id) { return this.getAppointments().find(a => a.id === id); },
  addAppointment(data) {
    const list = this.getAppointments();
    const a = {
      id: Utils.genId('apt'),
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      date: data.date || Utils.today(),
      timeSlot: data.timeSlot || '',
      styleId: data.styleId || '',
      styleName: data.styleName || '',
      price: data.price || 0,
      status: data.status || 'confirmed',
      customerType: data.customerType || 'new', // 'new' 新客 / 'returning' 老客
      remark: data.remark || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    list.push(a);
    this._save('appointments', list);
    return a;
  },
  updateAppointment(id, updates) {
    const list = this.getAppointments();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) return null;
    Object.assign(list[idx], updates, { updatedAt: Date.now() });
    this._save('appointments', list);
    return list[idx];
  },
  deleteAppointment(id) {
    const list = this.getAppointments();
    this._save('appointments', list.filter(a => a.id !== id));
  },
  getTodayAppointments() {
    const today = Utils.today();
    return this.getAppointments().filter(a => a.date === today);
  },
  getTomorrowAppointments() {
    const tomorrow = Utils.tomorrow();
    return this.getAppointments().filter(a => a.date === tomorrow);
  },
  getDateAppointments(date) {
    return this.getAppointments().filter(a => a.date === date);
  },
  getMonthAppointments(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return this.getAppointments().filter(a => a.date.startsWith(prefix));
  },

  // ---- 款式 ----
  getStyles() { return this._ensureArray('styles'); },
  getStyle(id) { return this.getStyles().find(s => s.id === id); },
  addStyle(data) {
    const list = this.getStyles();
    const s = {
      id: Utils.genId('style'),
      categoryId: data.categoryId || '',
      name: data.name || '',
      price: data.price || 0,
      image: data.image || '',
      description: data.description || '',
      sourceUrl: data.sourceUrl || '',
      isQuickInput: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    list.push(s);
    this._save('styles', list);
    return s;
  },
  updateStyle(id, updates) {
    const list = this.getStyles();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) return null;
    Object.assign(list[idx], updates, { updatedAt: Date.now() });
    this._save('styles', list);
    return list[idx];
  },
  deleteStyle(id) {
    const list = this.getStyles();
    this._save('styles', list.filter(s => s.id !== id));
  },
  getStylesByCategory(catId) {
    return this.getStyles().filter(s => s.categoryId === catId);
  },
  updateStyleQuickInput(id) {
    const s = this.getStyle(id);
    if (!s) return;
    s.isQuickInput = true;
    s.updatedAt = Date.now();
    this._save('styles', this.getStyles());
    // 同步更新快捷价格
    const settings = this.getSettings();
    if (!settings.quickPriceInputs.includes(s.price)) {
      settings.quickPriceInputs.push(s.price);
      settings.quickPriceInputs.sort((a, b) => a - b);
      this._save('settings', settings);
    }
  },

  // ---- 款式分类 ----
  getStyleCategories() { return this._ensureArray('style_categories'); },
  addStyleCategory(name) {
    const list = this.getStyleCategories();
    const cat = { id: Utils.genId('cat'), name, order: list.length + 1 };
    list.push(cat);
    this._save('style_categories', list);
    return cat;
  },
  updateStyleCategory(id, updates) {
    const list = this.getStyleCategories();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    Object.assign(list[idx], updates);
    this._save('style_categories', list);
    return list[idx];
  },
  deleteStyleCategory(id) {
    const list = this.getStyleCategories();
    this._save('style_categories', list.filter(c => c.id !== id));
  },

  // ---- 交易（充值/消费/支出 统一存储） ----
  getTransactions() { return this._ensureArray('transactions'); },
  getTransaction(id) { return this.getTransactions().find(t => t.id === id); },

  /** 充值 */
  addRecharge(data) {
    const txn = {
      id: Utils.genId('txn'),
      type: 'recharge',
      customerId: data.customerId,
      customerName: data.customerName || '',
      amount: data.amount || 0,
      bonusAmount: data.bonusAmount || 0,
      paymentMethod: data.paymentMethod || 'wechat',
      remark: data.remark || '',
      date: data.date || Utils.today(),
      createdAt: Date.now()
    };
    const list = this.getTransactions();
    list.push(txn);

    // 更新顾客余额
    const cust = this.getCustomer(data.customerId);
    if (cust) {
      cust.card.balance += (data.amount + (data.bonusAmount || 0));
      cust.updatedAt = Date.now();
      this._save('customers', this.getCustomers());

      // 检查首次充值任务
      const rechargeCount = list.filter(t => t.customerId === data.customerId && t.type === 'recharge').length;
      if (rechargeCount === 1) {
        this._checkAndAwardTask(cust, 'first_recharge', null);
      }
      // 检查充值满500任务
      if (data.amount >= 500) {
        this._checkAndAwardTask(cust, 'recharge_500', null);
      }
    }

    this._save('transactions', list);
    return txn;
  },

  /** 消费 */
  addConsume(data) {
    const settings = this.getSettings();
    let pointsEarned = Math.floor(data.actualPrice * settings.pointsPerYuan);

    // 生日月双倍积分
    const cust = this.getCustomer(data.customerId);
    if (cust && cust.birthday && settings.birthdayDoublePoints && Utils.isBirthdayMonth(cust.birthday)) {
      pointsEarned *= 2;
    }

    const txn = {
      id: Utils.genId('txn'),
      type: 'consume',
      customerId: data.customerId,
      customerName: data.customerName || '',
      styleId: data.styleId || '',
      styleName: data.styleName || '',
      originalPrice: data.originalPrice || 0,
      actualPrice: data.actualPrice || 0,
      deductType: data.deductType || 'balance', // balance | passcard | cash
      deductAmount: data.deductAmount || 0,
      passCardUsed: data.passCardUsed || 0,
      pointsEarned: pointsEarned,
      paymentMethod: data.paymentMethod || '',
      remark: data.remark || '',
      date: data.date || Utils.today(),
      createdAt: Date.now()
    };
    const list = this.getTransactions();
    list.push(txn);

    // 更新顾客余额/次卡
    if (cust) {
      if (data.deductType === 'balance') {
        cust.card.balance -= (data.deductAmount || 0);
      } else if (data.deductType === 'passcard') {
        cust.card.passCardCount -= (data.passCardUsed || 1);
      }
      cust.totalPoints += pointsEarned;
      cust.updatedAt = Date.now();
      this._save('customers', this.getCustomers());

      // 创建积分记录
      this.addPointsRecord({
        customerId: cust.id,
        customerName: cust.name,
        change: pointsEarned,
        type: 'consume',
        reason: `消费${data.styleName || '项目'} +${pointsEarned}积分`,
        refTxnId: txn.id
      });

      // 检查连续3月消费任务
      this._checkConsecutiveMonths(cust);

      // 更新快捷输入
      if (data.styleId) this.updateStyleQuickInput(data.styleId);

      // 自动生成消费通知（通过手机发送给顾客）
      this._createConsumeNotification(cust, data, settings);
    }

    this._save('transactions', list);
    return txn;
  },

  /** 支出 */
  addExpense(data) {
    const txn = {
      id: Utils.genId('txn'),
      type: 'expense',
      customerId: '',
      customerName: '',
      amount: data.amount || 0,
      expenseCategory: data.expenseCategory || '其他',
      expenseDetail: data.expenseDetail || '',
      remark: data.remark || '',
      date: data.date || Utils.today(),
      createdAt: Date.now()
    };
    const list = this.getTransactions();
    list.push(txn);
    this._save('transactions', list);
    return txn;
  },

  /** 其他收入（非消费/充值，如卖产品、茶水费等） */
  addIncome(data) {
    const txn = {
      id: Utils.genId('txn'),
      type: 'income',
      customerId: '',
      customerName: data.customerName || '',
      amount: data.amount || 0,
      incomeCategory: data.incomeCategory || '其他收入',
      incomeDetail: data.incomeDetail || '',
      paymentMethod: data.paymentMethod || 'cash',
      remark: data.remark || '',
      date: data.date || Utils.today(),
      createdAt: Date.now()
    };
    const list = this.getTransactions();
    list.push(txn);
    this._save('transactions', list);
    return txn;
  },

  deleteTransaction(id) {
    const list = this.getTransactions();
    this._save('transactions', list.filter(t => t.id !== id));
  },

  getMonthlyIncome(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return this.getTransactions()
      .filter(t => (t.type === 'recharge' || t.type === 'consume' || t.type === 'income') && t.date.startsWith(prefix))
      .reduce((sum, t) => {
        if (t.type === 'income') return sum + (t.amount || 0);
        return sum + (t.amount || 0) + (t.bonusAmount || 0) + (t.type === 'consume' ? (t.actualPrice || 0) : 0);
      }, 0);
  },

  getMonthlyExpense(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return this.getTransactions()
      .filter(t => t.type === 'expense' && t.date.startsWith(prefix))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  },

  getMonthlyConsumeIncome(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return this.getTransactions()
      .filter(t => t.type === 'consume' && t.date.startsWith(prefix))
      .reduce((sum, t) => sum + (t.actualPrice || 0), 0);
  },

  getMonthlyRechargeIncome(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return this.getTransactions()
      .filter(t => t.type === 'recharge' && t.date.startsWith(prefix))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  },

  getMonthlyOtherIncome(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return this.getTransactions()
      .filter(t => t.type === 'income' && t.date.startsWith(prefix))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  },

  getTodayIncome() {
    const today = Utils.today();
    return this.getTransactions()
      .filter(t => (t.type === 'recharge' || t.type === 'consume' || t.type === 'income') && t.date === today)
      .reduce((sum, t) => {
        if (t.type === 'income') return sum + (t.amount || 0);
        if (t.type === 'recharge') return sum + (t.amount || 0) + (t.bonusAmount || 0);
        return sum + (t.actualPrice || 0);
      }, 0);
  },

  getTodayExpense() {
    const today = Utils.today();
    return this.getTransactions()
      .filter(t => t.type === 'expense' && t.date === today)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  },

  // ---- 积分 ----
  getPoints() { return this._ensureArray('points'); },
  addPointsRecord(data) {
    const list = this.getPoints();
    const rec = {
      id: Utils.genId('pts'),
      customerId: data.customerId,
      customerName: data.customerName || '',
      change: data.change || 0,
      type: data.type || 'consume',
      reason: data.reason || '',
      refTxnId: data.refTxnId || '',
      balanceAfter: 0,
      createdAt: Date.now()
    };
    // 计算积分余额
    const cust = this.getCustomer(data.customerId);
    if (cust) rec.balanceAfter = cust.totalPoints - cust.usedPoints;

    list.push(rec);
    this._save('points', list);
    return rec;
  },

  // ---- 任务 ----
  getTasks() { return this._ensureArray('tasks'); },
  getTaskRecords() { return this._ensureArray('task_records'); },

  _checkAndAwardTask(cust, taskType, refId) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.type === taskType && t.enabled);
    if (!task) return;

    // 检查是否已完成过（一次性任务）
    const records = this.getTaskRecords();
    if (taskType === 'first_recharge' || taskType === 'recharge_500') {
      const done = records.find(r => r.customerId === cust.id && r.taskId === task.id);
      if (done) return;
    }

    let points = task.points;
    if (task.isBirthdayBonus) points = 0; // 生日任务在消费时已处理

    if (points > 0) {
      const rec = {
        id: Utils.genId('tr'),
        taskId: task.id,
        taskName: task.name,
        customerId: cust.id,
        customerName: cust.name,
        pointsEarned: points,
        refCustomerId: refId || '',
        createdAt: Date.now()
      };
      records.push(rec);
      this._save('task_records', records);

      // 增加积分
      cust.totalPoints += points;
      cust.updatedAt = Date.now();
      this._save('customers', this.getCustomers());

      this.addPointsRecord({
        customerId: cust.id,
        customerName: cust.name,
        change: points,
        type: 'task',
        reason: `完成任务「${task.name}」+${points}积分`,
        refTxnId: rec.id
      });
    }
  },

  _checkConsecutiveMonths(cust) {
    const txn = this.getTransactions().filter(t => t.customerId === cust.id && t.type === 'consume');
    const months = new Set(txn.map(t => t.date.substring(0, 7)));
    const sorted = [...months].sort();
    let consecutive = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1] + '-01');
      const curr = new Date(sorted[i] + '-01');
      if ((curr.getFullYear() === prev.getFullYear() && curr.getMonth() === prev.getMonth() + 1) ||
          (curr.getFullYear() === prev.getFullYear() + 1 && curr.getMonth() === 0 && prev.getMonth() === 11)) {
        consecutive++;
      } else {
        consecutive = 1;
      }
    }
    if (consecutive >= 3) {
      const task = this.getTasks().find(t => t.type === 'consecutive_3m');
      if (task && task.enabled) {
        const records = this.getTaskRecords();
        const already = records.filter(r => r.customerId === cust.id && r.taskId === task.id);
        if (already.length < Math.floor(consecutive / 3)) {
          this._checkAndAwardTask(cust, 'consecutive_3m', null);
        }
      }
    }
  },

  /** 消费后自动生成消费通知（发给顾客） */
  _createConsumeNotification(cust, data, settings) {
    const templates = settings.notificationTemplates;
    let content = '';
    let copyText = '';

    if (data.deductType === 'passcard') {
      // 次卡消费：通知本次消耗1次，剩余几次
      const passType = cust.card.passCardType || '次卡套餐';
      content = this._fillTemplateStatic(templates.consume_passcard, {
        name: cust.name,
        passCardType: passType,
        count: cust.card.passCardCount
      });
      copyText = `${cust.name}您好，本次${passType}已消费1次，剩余${cust.card.passCardCount}次，如美甲有问题10天内可免费质保服务！`;
    } else if (data.deductType === 'balance') {
      // 储值卡消费：通知本次消费多少，剩余多少
      content = this._fillTemplateStatic(templates.consume_balance, {
        name: cust.name,
        amount: Utils.formatMoney(data.actualPrice || 0),
        balance: Utils.formatMoney(cust.card.balance)
      });
      copyText = `${cust.name}您好，本次消费${Utils.formatMoney(data.actualPrice || 0)}元，卡内剩余${Utils.formatMoney(cust.card.balance)}元，如美甲有问题10天内可免费质保服务！`;
    } else {
      // 现金消费
      content = `${cust.name}您好，本次消费${Utils.formatMoney(data.actualPrice || 0)}元，感谢您的光临，如美甲有问题10天内可免费质保服务！`;
      copyText = content;
    }

    this.addNotification({
      type: 'consume_notify',
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      title: '消费通知（发送顾客）',
      content,
      copyText
    });
  },

  /** 模板填充（静态版本，不依赖实例） */
  _fillTemplateStatic(template, data) {
    if (!template) return '';
    let result = template;
    Object.entries(data).forEach(([k, v]) => {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
    return result;
  },

  // ---- 礼物 ----
  getGifts() { return this._ensureArray('gifts'); },
  addGift(data) {
    const list = this.getGifts();
    const g = {
      id: Utils.genId('gift'),
      name: data.name || '',
      pointsCost: data.pointsCost || 0,
      stock: data.stock || 0,
      image: data.image || '',
      enabled: true
    };
    list.push(g);
    this._save('gifts', list);
    return g;
  },
  updateGift(id, updates) {
    const list = this.getGifts();
    const idx = list.findIndex(g => g.id === id);
    if (idx === -1) return null;
    Object.assign(list[idx], updates);
    this._save('gifts', list);
    return list[idx];
  },
  deleteGift(id) {
    const list = this.getGifts();
    this._save('gifts', list.filter(g => g.id !== id));
  },

  // ---- 兑换 ----
  getGiftExchanges() { return this._ensureArray('gift_exchange'); },
  exchangeGift(customerId, giftId) {
    const cust = this.getCustomer(customerId);
    const gift = this.getGifts().find(g => g.id === giftId);
    if (!cust || !gift || gift.stock <= 0) return null;

    const available = cust.totalPoints - cust.usedPoints;
    if (available < gift.pointsCost) return null;

    // 扣积分
    cust.usedPoints += gift.pointsCost;
    cust.updatedAt = Date.now();
    this._save('customers', this.getCustomers());

    // 扣库存
    gift.stock--;
    this._save('gifts', this.getGifts());

    // 积分记录
    this.addPointsRecord({
      customerId: cust.id,
      customerName: cust.name,
      change: -gift.pointsCost,
      type: 'exchange',
      reason: `兑换「${gift.name}」-${gift.pointsCost}积分`,
      refTxnId: giftId
    });

    // 兑换记录
    const list = this.getGiftExchanges();
    const exc = {
      id: Utils.genId('exc'),
      customerId: cust.id,
      customerName: cust.name,
      giftId: gift.id,
      giftName: gift.name,
      pointsCost: gift.pointsCost,
      date: Utils.today(),
      createdAt: Date.now()
    };
    list.push(exc);
    this._save('gift_exchange', list);
    return exc;
  },

  // ---- 通知 ----
  getNotifications() { return this._ensureArray('notifications'); },
  addNotification(data) {
    const list = this.getNotifications();
    const n = {
      id: Utils.genId('notif'),
      type: data.type || 'info',
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      title: data.title || '',
      content: data.content || '',
      copyText: data.copyText || data.content || '',
      status: 'pending',
      isRead: false,
      createdAt: Date.now()
    };
    list.unshift(n);
    this._save('notifications', list);
    return n;
  },
  markNotificationRead(id) {
    const list = this.getNotifications();
    const n = list.find(x => x.id === id);
    if (n) { n.isRead = true; n.status = 'read'; this._save('notifications', list); }
  },
  markAllNotificationsRead() {
    const list = this.getNotifications();
    list.forEach(n => { n.isRead = true; n.status = 'read'; });
    this._save('notifications', list);
  },

  // ---- 导出/导入 ----
  exportAll() {
    const keys = ['customers', 'appointments', 'styles', 'style_categories', 'transactions',
      'points', 'tasks', 'task_records', 'gifts', 'gift_exchange', 'notifications', 'settings', 'meta'];
    const data = {};
    keys.forEach(k => { data[k] = this._load(k); });
    return data;
  },

  importAll(data, mode = 'overwrite') {
    if (mode === 'overwrite') {
      Object.entries(data).forEach(([k, v]) => { this._save(k, v); });
    } else if (mode === 'merge') {
      const arrKeys = ['customers', 'appointments', 'styles', 'style_categories', 'transactions',
        'points', 'tasks', 'task_records', 'gifts', 'gift_exchange', 'notifications'];
      arrKeys.forEach(k => {
        if (data[k]) {
          const existing = this._ensureArray(k, []);
          const existingIds = new Set(existing.map(e => e.id));
          data[k].forEach(item => {
            if (!existingIds.has(item.id)) {
              existing.push(item);
            }
          });
          this._save(k, existing);
        }
      });
      if (data.settings) { this._save('settings', data.settings); }
      if (data.meta) { this._save('meta', data.meta); }
    }
    this._cache = {};
    EventBus.emit('data:imported', {});
  }
};

// ============================================================
// 4. 通知引擎
// ============================================================

const NotificationEngine = {
  check() {
    const settings = DataStore.getSettings();
    const templates = settings.notificationTemplates;

    // 只检查生日提醒和积分达标（消费通知在消费时即时生成）
    this.checkBirthdays(templates);
    this.checkPointsAchieved(settings, templates);

    const meta = DataStore._load('meta');
    meta.lastNotificationCheck = Date.now();
    DataStore._save('meta', meta);
  },

  _fillTemplate(template, data) {
    let result = template;
    Object.entries(data).forEach(([k, v]) => {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });
    return result;
  },

  _isDuplicate(type, customerId) {
    const notifications = DataStore.getNotifications();
    const today = Utils.today();
    return notifications.some(n =>
      n.type === type && n.customerId === customerId &&
      Utils.formatDate(n.createdAt) === today
    );
  },

  checkLowBalance(settings, templates) {
    const low = DataStore.getLowBalance(settings.balanceWarningThreshold);
    low.forEach(cust => {
      if (this._isDuplicate('balance_warning', cust.id)) return;
      const content = this._fillTemplate(templates.balance_warning, {
        name: cust.name,
        balance: Utils.formatMoney(cust.card.balance)
      });
      DataStore.addNotification({
        type: 'balance_warning',
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        title: '余额不足提醒',
        content,
        copyText: content
      });
    });
  },

  checkPassCardEmpty(settings, templates) {
    const low = DataStore.getPassCardLow();
    low.forEach(cust => {
      if (this._isDuplicate('passcard_empty', cust.id)) return;
      const content = this._fillTemplate(templates.passcard_empty, {
        name: cust.name,
        passCardType: cust.card.passCardType || '次卡',
        count: cust.card.passCardCount
      });
      DataStore.addNotification({
        type: 'passcard_empty',
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        title: '次卡不足提醒',
        content,
        copyText: content
      });
    });
  },

  checkBirthdays(templates) {
    const thisMonth = DataStore.getUpcomingBirthdays(Utils.currentMonth());
    thisMonth.forEach(cust => {
      if (this._isDuplicate('birthday_reminder', cust.id)) return;
      const content = this._fillTemplate(templates.birthday_reminder, {
        name: cust.name,
        birthday: cust.birthday
      });
      DataStore.addNotification({
        type: 'birthday_reminder',
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        title: '生日提醒',
        content,
        copyText: content
      });
    });
  },

  checkPointsAchieved(settings, templates) {
    const all = DataStore.getCustomers();
    all.forEach(cust => {
      const available = cust.totalPoints - cust.usedPoints;
      if (available >= settings.pointsExchangeThreshold) {
        if (this._isDuplicate('points_achieved', cust.id)) return;
        const content = this._fillTemplate(templates.points_achieved, {
          name: cust.name,
          points: available
        });
        DataStore.addNotification({
          type: 'points_achieved',
          customerId: cust.id,
          customerName: cust.name,
          customerPhone: cust.phone,
          title: '积分达标提醒',
          content,
          copyText: content
        });
      }
    });
  },

  // 预约提前一天提醒已移除，仅消费后生成通知
  checkTomorrowAppointments(settings, templates) {
    // 不再生成预约提醒通知
  },

  getDashboardNotifications() {
    const notifications = DataStore.getNotifications();
    const unread = notifications.filter(n => !n.isRead);
    return unread.length > 0 ? unread : notifications.slice(0, 5);
  },

  getUnreadCount() {
    return DataStore.getNotifications().filter(n => !n.isRead).length;
  }
};

// ============================================================
// 5. 路由
// ============================================================

const Router = {
  _routes: {},
  _current: 'dashboard',

  init() {
    window.addEventListener('hashchange', () => this.handle());
    this.handle();
  },

  register(name, renderFn) {
    this._routes[name] = renderFn;
  },

  go(name) {
    location.hash = name;
  },

  handle() {
    const route = location.hash.replace('#', '') || 'dashboard';
    this._current = route;

    // 更新导航激活状态
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });
    document.querySelectorAll('.mobile-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });

    // 渲染对应视图
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const renderFn = this._routes[route];
    if (renderFn) {
      mainContent.innerHTML = '';
      mainContent.appendChild(renderFn());
    }

    // 回到顶部
    window.scrollTo(0, 0);
  }
};

// ============================================================
// 6. 组件工厂
// ============================================================

const Comp = {
  /** 统计卡片 */
  statCard(title, value, sub = '', icon = '', color = '#e91e63') {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-icon" style="background:${color}20;color:${color}">${icon}</div>
      <div class="stat-info">
        <div class="stat-title">${title}</div>
        <div class="stat-value">${value}</div>
        ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
      </div>
    `;
    return card;
  },

  /** 弹窗 */
  showModal(title, contentHtml, onSave, opts = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${opts.wide ? 'modal-wide' : ''}">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">${contentHtml}</div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
          ${opts.hideSave ? '' : '<button class="btn btn-primary modal-save-btn">保存</button>'}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const saveBtn = overlay.querySelector('.modal-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (onSave) onSave(overlay);
        else overlay.remove();
      });
    }

    return overlay;
  },

  /** 确认弹窗 */
  confirm(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body"><p>${message}</p></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="btn btn-danger confirm-yes-btn">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('.confirm-yes-btn').addEventListener('click', () => {
      overlay.remove();
      if (onConfirm) onConfirm();
    });

    return overlay;
  },

  /** 表单组 */
  formGroup(label, inputHtml) {
    return `<div class="form-group"><label>${label}</label>${inputHtml}</div>`;
  },

  /** 空状态 */
  emptyState(msg = '暂无数据', icon = '📭') {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `<div class="empty-icon">${icon}</div><p>${msg}</p>`;
    return div;
  },

  /** 标签 */
  badge(text, type = 'default') {
    return `<span class="badge badge-${type}">${text}</span>`;
  },

  /** 按钮 */
  btn(text, cls = '', onClick = null) {
    const b = document.createElement('button');
    b.className = `btn ${cls}`;
    b.textContent = text;
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
};

// ============================================================
// 7. 弹幕系统
// ============================================================

const Danmaku = {
  _queue: [],
  _running: false,
  _container: null,

  init() {
    this._container = document.getElementById('danmaku-container');
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'danmaku-container';
      document.body.appendChild(this._container);
    }
  },

  feed(notifications) {
    notifications.forEach(n => {
      if (!n.isRead) {
        this._queue.push(n);
      }
    });
    if (!this._running) this._run();
  },

  _run() {
    if (this._queue.length === 0) { this._running = false; return; }
    this._running = true;

    const n = this._queue.shift();
    const el = document.createElement('div');
    el.className = 'danmaku-item';

    const colorMap = {
      consume_notify: '#ff9800',
      balance_warning: '#ff6b6b',
      passcard_empty: '#ff6b6b',
      points_achieved: '#51cf66',
      birthday_reminder: '#f783ac',
      appointment_reminder: '#74c0fc'
    };

    el.style.borderLeftColor = colorMap[n.type] || '#868e96';
    el.innerHTML = `<span class="danmaku-tag">${n.title}</span> ${n.content} <span style="font-size:11px;opacity:0.7">👆点击发送顾客</span>`;
    el.title = '点击发送短信给顾客';
    el.addEventListener('click', () => {
      const shopName = DataStore.getSettings().shopName || '歪歪美甲工作室';
      const fullText = `【${shopName}】${n.copyText}`;
      Utils.copyToClipboard(fullText).catch(() => {});
      if (n.customerPhone) {
        const smsUrl = `sms:${n.customerPhone}?body=${encodeURIComponent(fullText)}`;
        const a = document.createElement('a');
        a.href = smsUrl;
        a.target = '_blank';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      Utils.showToast('正在打开短信...', 'info');
    });

    this._container.appendChild(el);

    // 动画结束后移除
    const duration = 8000;
    el.style.animation = `danmakuSlide ${duration}ms linear`;

    setTimeout(() => {
      if (el.parentNode) el.remove();
      setTimeout(() => this._run(), 500);
    }, duration);
  },

  clear() {
    this._queue = [];
    if (this._container) this._container.innerHTML = '';
    this._running = false;
  }
};

// ============================================================
// 8. 应用初始化
// ============================================================

function initApp() {
  DataStore.init();
  Danmaku.init();

  // 请求浏览器通知权限（用于预约铃声提醒）
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // 注册所有路由
  Router.register('dashboard', Views.renderDashboard);
  Router.register('members', Views.renderMembers);
  Router.register('appointments', Views.renderAppointments);
  Router.register('styles', Views.renderStyles);
  Router.register('finance', Views.renderFinance);
  Router.register('points', Views.renderPoints);
  Router.register('marketing', Views.renderMarketing);
  Router.register('notifications', Views.renderNotifications);
  Router.register('settings', Views.renderSettings);

  // 检查通知
  NotificationEngine.check();

  // 弹幕通知
  const dashNotifs = NotificationEngine.getDashboardNotifications();
  Danmaku.feed(dashNotifs);

  // 更新通知徽标
  updateNotificationBadge();

  // 启动路由
  Router.init();

  // 数据变更时重新检查通知
  EventBus.on('data:changed', () => {
    setTimeout(() => {
      NotificationEngine.check();
      Danmaku.feed(NotificationEngine.getDashboardNotifications());
      updateNotificationBadge();
    }, 100);
  });

  // 定时检查通知
  setInterval(() => {
    NotificationEngine.check();
    Danmaku.feed(NotificationEngine.getDashboardNotifications());
    updateNotificationBadge();
  }, 300000); // 5分钟
}

function updateNotificationBadge() {
  const badge = document.getElementById('notif-badge');
  const mobileBadge = document.getElementById('notif-badge-mobile');
  const count = NotificationEngine.getUnreadCount();
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
  if (mobileBadge) {
    mobileBadge.textContent = count;
    mobileBadge.style.display = count > 0 ? 'flex' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
