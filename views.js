/**
 * 美甲工作室管理工作台 - views.js
 * 所有视图渲染函数
 */

const Views = {
  // ============================================================
  // 首页看板
  // ============================================================
  renderDashboard() {
    const container = document.createElement('div');
    container.className = 'view-dashboard';

    const today = Utils.today();
    const todayApts = DataStore.getTodayAppointments();
    const todayIncome = DataStore.getTodayIncome();
    const todayExpense = DataStore.getTodayExpense();
    const todayNewMembers = DataStore.getCustomers().filter(c => Utils.formatDate(c.createdAt) === today).length;
    const tomorrowApts = DataStore.getTomorrowAppointments();
    const birthdayCustomers = DataStore.getUpcomingBirthdays(Utils.currentMonth());
    const lowBalance = DataStore.getLowBalance(DataStore.getSettings().balanceWarningThreshold);
    const passLow = DataStore.getPassCardLow();
    const settings = DataStore.getSettings();
    const pointsCustomers = DataStore.getCustomers().filter(c => {
      const avail = c.totalPoints - c.usedPoints;
      return avail >= settings.pointsExchangeThreshold;
    });

    // 今日消费统计
    const todayConsume = DataStore.getTransactions()
      .filter(t => t.type === 'consume' && t.date === today)
      .reduce((s, t) => s + (t.actualPrice || 0), 0);
    const todayRecharge = DataStore.getTransactions()
      .filter(t => t.type === 'recharge' && t.date === today)
      .reduce((s, t) => s + (t.amount || 0) + (t.bonusAmount || 0), 0);

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">📊 首页看板</h2>
        <div style="color:var(--text-muted)">${today} | ${DataStore.getSettings().shopName}</div>
      </div>

      ${'Notification' in window && Notification.permission === 'default' ? `
      <div class="card" style="border:2px solid #ff9800;background:#fff8e1;margin-bottom:12px">
        <div class="card-body" style="display:flex;align-items:center;gap:10px;padding:12px">
          <span style="font-size:24px">🔔</span>
          <div style="flex:1;font-size:13px;color:#666">开启通知权限后，预约时间到会有铃声+弹窗提醒</div>
          <button class="btn btn-sm" style="background:#ff9800;color:#fff;white-space:nowrap" onclick="requestNotificationPermission();this.closest('.card').remove()">开启</button>
        </div>
      </div>
      ` : ''}

      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:#e3f2fd;color:#2196f3">📅</div>
          <div class="stat-info">
            <div class="stat-title">今日预约</div>
            <div class="stat-value">${todayApts.length} <span style="font-size:14px;font-weight:400">人</span></div>
            <div class="stat-sub">明日 ${tomorrowApts.length} 人</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#e8f5e9;color:#4caf50">💰</div>
          <div class="stat-info">
            <div class="stat-title">今日营业额</div>
            <div class="stat-value">${Utils.formatMoney(todayIncome)}</div>
            <div class="stat-sub">消费${Utils.formatMoney(todayConsume)} 充值${Utils.formatMoney(todayRecharge)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fff3e0;color:#ff9800">⚠️</div>
          <div class="stat-info">
            <div class="stat-title">待办提醒</div>
            <div class="stat-value">${pointsCustomers.length + birthdayCustomers.length}</div>
            <div class="stat-sub">积分达标 ${pointsCustomers.length} | 生日 ${birthdayCustomers.length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fce4ec;color:#e91e63">🎂</div>
          <div class="stat-info">
            <div class="stat-title">本月生日</div>
            <div class="stat-value">${birthdayCustomers.length} <span style="font-size:14px;font-weight:400">人</span></div>
            <div class="stat-sub">${birthdayCustomers.map(c => c.name).join('、') || '无'}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#f3e5f5;color:#9c27b0">⭐</div>
          <div class="stat-info">
            <div class="stat-title">积分达标</div>
            <div class="stat-value">${pointsCustomers.length} <span style="font-size:14px;font-weight:400">人</span></div>
            <div class="stat-sub">可兑换礼物</div>
          </div>
        </div>
      </div>

      <div class="content-grid">
        <!-- 今日预约列表 -->
        <div class="card">
          <div class="card-header">
            <h3>📋 今日预约</h3>
            <button class="btn btn-sm btn-primary" onclick="Router.go('appointments')">预约管理</button>
          </div>
          <div class="card-body" id="dash-appointments">
            ${todayApts.length === 0 ? '<div class="empty-state"><div class="empty-icon">📭</div><p>今日暂无预约</p></div>' :
              todayApts.sort((a,b) => a.timeSlot.localeCompare(b.timeSlot)).map(apt => `
                <div class="appointment-item${apt.status==='completed'?' apt-completed':''}" onclick="Router.go('appointments')">
                  <div class="appointment-time">${apt.timeSlot}</div>
                  <div class="appointment-info">
                    <div class="appointment-customer">${Utils.escapeHtml(apt.styleName || '未指定项目')}</div>
                    ${apt.remark ? `<div class="appointment-style">${Utils.escapeHtml(apt.remark)}</div>` : ''}
                  </div>
                  <div class="appointment-status">
                    ${Comp.badge(apt.status === 'completed' ? '已完成' : apt.status === 'cancelled' ? '已取消' : '进行中', apt.status === 'completed' ? 'default' : apt.status === 'cancelled' ? 'danger' : 'danger')}
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>

        <!-- 预警顾客列表 -->
        <div class="card">
          <div class="card-header">
            <h3>⚠️ 需关注顾客</h3>
          </div>
          <div class="card-body">
            ${lowBalance.length === 0 && passLow.length === 0 ? '<div class="empty-state"><div class="empty-icon">✅</div><p>暂无需要关注的顾客</p></div>' : ''}
            ${lowBalance.map(c => `
              <div class="appointment-item" style="border-left:3px solid var(--warning)">
                <div style="color:var(--warning);font-weight:700;cursor:pointer" onclick="openMemberDetail('${c.id}')">余额不足</div>
                <div class="appointment-info" onclick="openMemberDetail('${c.id}')" style="cursor:pointer">
                  <div class="appointment-customer">${Utils.escapeHtml(c.name)}</div>
                  <div class="appointment-style">余额: ${Utils.formatMoney(c.card.balance)}</div>
                </div>
                <button class="btn btn-sm" style="background:#2196F3;color:#fff;font-size:11px;padding:4px 8px;flex-shrink:0" onclick="event.stopPropagation();sendWarningToCustomer('${c.id}','${c.name.replace(/'/g, "\\'")}','${c.phone.replace(/'/g, "\\'")}',${c.card.balance})">📱 短信</button>
              </div>
            `).join('')}
            ${passLow.map(c => `
              <div class="appointment-item" style="border-left:3px solid var(--danger)">
                <div style="color:var(--danger);font-weight:700;cursor:pointer" onclick="openMemberDetail('${c.id}')">次卡将尽</div>
                <div class="appointment-info" onclick="openMemberDetail('${c.id}')" style="cursor:pointer">
                  <div class="appointment-customer">${Utils.escapeHtml(c.name)}</div>
                  <div class="appointment-style">${c.card.passCardType}: 剩${c.card.passCardCount}次</div>
                </div>
                <button class="btn btn-sm" style="background:#2196F3;color:#fff;font-size:11px;padding:4px 8px;flex-shrink:0" onclick="event.stopPropagation();sendWarningToCustomer('${c.id}','${c.name.replace(/'/g, "\\'")}','${c.phone.replace(/'/g, "\\'")}',0,'${(c.card.passCardType||'').replace(/'/g, "\\'")}',${c.card.passCardCount})">📱 短信</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 今日工作汇报 -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3>📝 今日工作汇报</h3>
          <button class="btn btn-sm btn-outline" id="copy-report-btn">📋 复制汇报</button>
        </div>
        <div class="card-body" id="daily-report">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:16px">
            <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
              <div style="font-size:12px;color:var(--text-muted)">完成/总预约</div>
              <div style="font-size:20px;font-weight:700">${todayApts.filter(a=>a.status==='completed').length}/${todayApts.length}</div>
            </div>
            <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
              <div style="font-size:12px;color:var(--text-muted)">营业额</div>
              <div style="font-size:20px;font-weight:700;color:var(--primary)">${Utils.formatMoney(todayIncome)}</div>
            </div>
            <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
              <div style="font-size:12px;color:var(--text-muted)">今日支出</div>
              <div style="font-size:20px;font-weight:700;color:var(--danger)">${Utils.formatMoney(todayExpense)}</div>
            </div>
            <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
              <div style="font-size:12px;color:var(--text-muted)">净利润</div>
              <div style="font-size:20px;font-weight:700;color:var(--success)">${Utils.formatMoney(todayIncome - todayExpense)}</div>
            </div>
            <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
              <div style="font-size:12px;color:var(--text-muted)">新增会员</div>
              <div style="font-size:20px;font-weight:700">${todayNewMembers}</div>
            </div>
            <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
              <div style="font-size:12px;color:var(--text-muted)">明日预约</div>
              <div style="font-size:20px;font-weight:700">${tomorrowApts.length}</div>
            </div>
          </div>
          <pre id="report-text" style="background:#f8f9fa;padding:12px;border-radius:8px;font-size:13px;line-height:1.8;white-space:pre-wrap">今日工作汇报（${today}）
完成预约：${todayApts.filter(a=>a.status==='completed').length}/${todayApts.length}单
营业额：${Utils.formatMoney(todayIncome)}（消费${Utils.formatMoney(todayConsume)}+充值${Utils.formatMoney(todayRecharge)}）
支出：${Utils.formatMoney(todayExpense)}
净利润：${Utils.formatMoney(todayIncome - todayExpense)}
新增会员：${todayNewMembers}人
明日预约：${tomorrowApts.length}单
${lowBalance.length > 0 ? '⚠️ 余额不足顾客：' + lowBalance.map(c=>c.name).join('、') : ''}
${birthdayCustomers.length > 0 ? '🎂 本月生日顾客：' + birthdayCustomers.map(c=>c.name).join('、') : ''}</pre>
        </div>
      </div>

      <!-- 弹幕通知区 -->
      <div class="card">
        <div class="card-header">
          <h3>🔔 最新通知</h3>
          <button class="btn btn-sm btn-outline" onclick="Router.go('notifications')">查看全部</button>
        </div>
        <div class="card-body">
          ${(() => {
            const notifs = NotificationEngine.getDashboardNotifications().slice(0, 5);
            if (notifs.length === 0) return '<div class="empty-state"><div class="empty-icon">🔕</div><p>暂无新通知</p></div>';
            return notifs.map(n => `
              <div class="notification-item ${n.isRead ? '' : 'unread'}">
                <div class="notification-content">
                  <div class="notification-title">${n.title}</div>
                  <div class="notification-text">${Utils.escapeHtml(n.content)}</div>
                  <div class="notification-time">${Utils.formatDateTime(n.createdAt)}</div>
                </div>
                <div class="notification-actions" style="display:flex;flex-direction:column;gap:4px">
                  <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();copyNotification('${n.id}')">📋</button>
                  ${n.customerPhone ? `<button class="btn btn-sm" style="background:#2196F3;color:#fff;font-size:11px;padding:3px 6px" onclick="event.stopPropagation();sendToCustomerPhone('${n.id}')">📱 短信</button>` : ''}
                </div>
              </div>
            `).join('');
          })()}
        </div>
      </div>

      <!-- 数据安全备份 -->
      <div class="card" style="border:2px solid #ff9800;background:#fff8e1">
        <div class="card-header" style="background:#ff9800;color:#fff">
          <h3>💾 数据备份</h3>
        </div>
        <div class="card-body" style="text-align:center;padding:16px">
          <p style="margin:0 0 12px 0;color:#666;font-size:13px">防止数据丢失，建议定期备份！</p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="btn" style="background:#ff9800;color:#fff;font-size:14px;padding:10px 20px" onclick="exportAllData()">📥 一键备份</button>
            <button class="btn btn-outline" style="font-size:14px;padding:10px 20px" onclick="document.getElementById('import-file-input').click()">📤 恢复数据</button>
            <input type="file" id="import-file-input" accept=".json" style="display:none" onchange="importAllData(this)">
          </div>
          <p style="margin:8px 0 0 0;font-size:11px;color:#999">备份文件会下载到手机，换设备时用「恢复数据」导入即可</p>
        </div>
      </div>
    `;

    // 绑定复制按钮
    setTimeout(() => {
      const copyBtn = container.querySelector('#copy-report-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          const text = container.querySelector('#report-text').textContent;
          Utils.copyToClipboard(text).then(() => Utils.showToast('已复制工作汇报', 'success'));
        });
      }
    }, 0);

    return container;
  },

  // ============================================================
  // 会员管理
  // ============================================================
  renderMembers() {
    const container = document.createElement('div');
    const customers = DataStore.getCustomers();
    const settings = DataStore.getSettings();

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">👥 会员管理</h2>
        <div class="quick-actions">
          <button class="btn btn-primary" onclick="openMemberForm()">+ 添加会员</button>
          <button class="btn btn-outline" onclick="document.getElementById('member-search').value='';renderMemberList()">刷新</button>
        </div>
      </div>

      <div class="search-bar">
        <input type="text" class="search-input" id="member-search" placeholder="搜索姓名/手机号..." oninput="renderMemberList()">
        <div class="filter-tags">
          <span class="filter-tag active" data-filter="all" onclick="setMemberFilter('all',this)">全部</span>
          <span class="filter-tag" data-filter="low_balance" onclick="setMemberFilter('low_balance',this)">余额不足</span>
          <span class="filter-tag" data-filter="birthday" onclick="setMemberFilter('birthday',this)">本月生日</span>
          <span class="filter-tag" data-filter="points" onclick="setMemberFilter('points',this)">积分达标</span>
        </div>
      </div>

      <div class="member-grid" id="member-list"></div>

      <div id="member-detail-panel" class="modal-overlay" style="display:none"></div>
    `;

    container._filter = 'all';

    setTimeout(() => {
      renderMemberList.call(container);
    }, 0);

    return container;
  },

  // ============================================================
  // 预约管理
  // ============================================================
  renderAppointments() {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">📅 预约管理</h2>
        <div class="quick-actions">
          <button class="btn btn-primary" onclick="openAppointmentForm()">+ 新建预约</button>
          <button class="btn btn-outline" onclick="openQRCodeModal()">📱 预约二维码</button>
        </div>
      </div>

      <div class="content-grid">
        <div class="card">
          <div class="card-header">
            <h3>📆 预约日历</h3>
          </div>
          <div class="card-body" id="appointment-calendar"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3>📋 预约列表</h3>
          </div>
          <div class="card-body" id="appointment-list"></div>
        </div>
      </div>
    `;

    container._selectedDate = Utils.today();
    container._calendarYear = Utils.currentYear();
    container._calendarMonth = Utils.currentMonth();

    setTimeout(() => {
      renderCalendar.call(container);
      renderAppointmentList.call(container);
    }, 0);

    return container;
  },

  // ============================================================
  // 款式库
  // ============================================================
  renderStyles() {
    const container = document.createElement('div');
    const categories = DataStore.getStyleCategories();

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">🎨 款式库</h2>
        <div class="quick-actions">
          <button class="btn btn-primary" onclick="openStyleForm()">+ 添加款式</button>
          <button class="btn btn-outline" onclick="openCategoryManager()">管理分类</button>
        </div>
      </div>

      <div class="tabs" id="style-cat-tabs">
        <span class="tab active" data-cat="all" onclick="setStyleCategory('all',this)">全部</span>
        ${categories.map(cat => `
          <span class="tab" data-cat="${cat.id}" onclick="setStyleCategory('${cat.id}',this)">${Utils.escapeHtml(cat.name)}</span>
        `).join('')}
      </div>

      <div class="search-bar">
        <input type="text" class="search-input" id="style-search" placeholder="搜索款式..." oninput="renderStyleList()">
      </div>

      <div class="style-grid" id="style-list"></div>
    `;

    container._selectedCat = 'all';

    setTimeout(() => renderStyleList.call(container), 0);

    return container;
  },

  // ============================================================
  // 财务管理
  // ============================================================
  renderFinance() {
    const container = document.createElement('div');
    const year = Utils.currentYear();
    const month = Utils.currentMonth();
    const income = DataStore.getMonthlyIncome(year, month);
    const expense = DataStore.getMonthlyExpense(year, month);
    const consumeIncome = DataStore.getMonthlyConsumeIncome(year, month);
    const rechargeIncome = DataStore.getMonthlyRechargeIncome(year, month);
    const otherIncome = DataStore.getMonthlyOtherIncome(year, month);
    const profit = income - expense;

    // 本周统计
    const weekIncome = DataStore.getWeekIncome();
    const weekExpense = DataStore.getWeekExpense();
    const weekProfit = weekIncome - weekExpense;

    // 获取本月收支明细
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthTxns = DataStore.getTransactions().filter(t => t.date.startsWith(prefix)).sort((a, b) => b.createdAt - a.createdAt);

    // 近6个月利润
    const profitData = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m <= 0) { m += 12; y--; }
      const inc = DataStore.getMonthlyIncome(y, m);
      const exp = DataStore.getMonthlyExpense(y, m);
      profitData.push({ month: `${m}月`, income: inc, expense: exp, profit: inc - exp });
    }

    const maxProfit = Math.max(...profitData.map(d => Math.abs(d.profit)), 1);

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">💰 财务管理</h2>
        <div class="quick-actions">
          <button class="btn btn-primary" onclick="openIncomeForm()">+ 记录收入</button>
          <button class="btn btn-danger" onclick="openExpenseForm()">+ 记录支出</button>
          <button class="btn btn-outline" onclick="Router.go('finance')">刷新</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:#e8f5e9;color:#4caf50">📥</div>
          <div class="stat-info">
            <div class="stat-title">本月收入</div>
            <div class="stat-value">${Utils.formatMoney(income)}</div>
            <div class="stat-sub">消费${Utils.formatMoney(consumeIncome)} 充值${Utils.formatMoney(rechargeIncome)} ${otherIncome>0?`其他${Utils.formatMoney(otherIncome)}`:''}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#ffebee;color:#f44336">📤</div>
          <div class="stat-info">
            <div class="stat-title">本月支出</div>
            <div class="stat-value">${Utils.formatMoney(expense)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#e3f2fd;color:#2196f3">💎</div>
          <div class="stat-info">
            <div class="stat-title">本月利润</div>
            <div class="stat-value" style="color:${profit>=0?'#4caf50':'#f44336'}">${Utils.formatMoney(profit)}</div>
            <div class="stat-sub">利润率 ${income > 0 ? (profit/income*100).toFixed(1) : 0}%</div>
          </div>
        </div>
      </div>

      <!-- 本周统计 -->
      <div class="stats-grid" style="margin-bottom:12px">
        <div class="stat-card" style="border:2px solid #e8f5e9">
          <div class="stat-icon" style="background:#e8f5e9;color:#4caf50">📅</div>
          <div class="stat-info">
            <div class="stat-title">本周收入</div>
            <div class="stat-value">${Utils.formatMoney(weekIncome)}</div>
          </div>
        </div>
        <div class="stat-card" style="border:2px solid #ffebee">
          <div class="stat-icon" style="background:#ffebee;color:#f44336">📤</div>
          <div class="stat-info">
            <div class="stat-title">本周支出</div>
            <div class="stat-value">${Utils.formatMoney(weekExpense)}</div>
          </div>
        </div>
        <div class="stat-card" style="border:2px solid #e3f2fd">
          <div class="stat-icon" style="background:#e3f2fd;color:#2196f3">💎</div>
          <div class="stat-info">
            <div class="stat-title">本周利润</div>
            <div class="stat-value" style="color:${weekProfit>=0?'#4caf50':'#f44336'}">${Utils.formatMoney(weekProfit)}</div>
          </div>
        </div>
      </div>

      <!-- 利润图表 -->
      <div class="chart-container">
        <div class="chart-title">📈 近6个月利润趋势</div>
        <div class="bar-chart">
          ${profitData.map(d => {
            const h = Math.max((Math.abs(d.profit) / maxProfit * 180), 4);
            return `
              <div class="bar-col">
                <div class="bar-value" style="font-size:11px">${Utils.formatMoney(d.profit)}</div>
                <div class="bar-fill" style="height:${h}px;background:${d.profit>=0?'var(--primary)':'var(--danger)'}"></div>
                <div class="bar-label">${d.month}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 收支明细 -->
      <div class="card">
        <div class="card-header">
          <h3>📋 本月收支明细</h3>
        </div>
        <div class="card-body">
          ${monthTxns.length === 0 ? '<div class="empty-state"><div class="empty-icon">📭</div><p>本月暂无收支记录</p></div>' : `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>日期</th><th>类型</th><th>顾客/来源</th><th>详情</th><th>金额</th><th>操作</th></tr>
                </thead>
                <tbody>
                  ${monthTxns.map(t => {
                    const typeLabel = t.type === 'recharge' ? '充值' : t.type === 'consume' ? '消费' : t.type === 'income' ? '收入' : '支出';
                    const typeBadge = t.type === 'recharge' ? 'success' : t.type === 'consume' ? 'primary' : t.type === 'income' ? 'info' : 'danger';
                    const amount = t.type === 'expense' ? -t.amount : (t.type === 'income' ? t.amount : (t.type === 'consume' ? t.actualPrice : (t.amount + (t.bonusAmount || 0))));
                    return `
                      <tr>
                        <td>${t.date}</td>
                        <td>${Comp.badge(typeLabel, typeBadge)}</td>
                        <td>${Utils.escapeHtml(t.customerName || t.expenseCategory || t.incomeCategory || '-')}</td>
                        <td>${Utils.escapeHtml(t.styleName || t.expenseDetail || t.incomeDetail || t.remark || '-')}${t.paymentMethod ? ` <span style="font-size:11px;color:var(--text-muted)">(${t.paymentMethod==='wechat'?'微信':t.paymentMethod==='alipay'?'支付宝':t.paymentMethod==='cash'?'现金':'银行卡'})</span>` : ''}</td>
                        <td style="font-weight:700;color:${t.type==='expense'?'var(--danger)':(t.type==='income'?'var(--info)':'var(--success)')}">${Utils.formatMoney(amount)}</td>
                        <td><button class="btn btn-sm btn-outline" onclick="deleteTransaction('${t.id}')">删除</button></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    return container;
  },

  // ============================================================
  // 积分管理
  // ============================================================
  renderPoints() {
    const container = document.createElement('div');
    const points = DataStore.getPoints().sort((a, b) => b.createdAt - a.createdAt);
    const gifts = DataStore.getGifts();
    const tasks = DataStore.getTasks();
    const exchanges = DataStore.getGiftExchanges().sort((a, b) => b.createdAt - a.createdAt);

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">⭐ 积分管理</h2>
        <div class="quick-actions">
          <button class="btn btn-primary" onclick="openGiftForm()">+ 添加礼物</button>
        </div>
      </div>

      <div class="tabs" id="points-tabs">
        <span class="tab active" data-tab="records" onclick="switchPointsTab('records',this)">积分流水</span>
        <span class="tab" data-tab="tasks" onclick="switchPointsTab('tasks',this)">任务体系</span>
        <span class="tab" data-tab="gifts" onclick="switchPointsTab('gifts',this)">礼物兑换</span>
      </div>

      <div id="points-tab-records">
        ${points.length === 0 ? '<div class="empty-state"><div class="empty-icon">📭</div><p>暂无积分记录</p></div>' : `
          <div class="table-wrap">
            <table>
              <thead><tr><th>时间</th><th>顾客</th><th>变动</th><th>类型</th><th>原因</th><th>余额</th></tr></thead>
              <tbody>
                ${points.slice(0, 100).map(p => `
                  <tr>
                    <td>${Utils.formatDateTime(p.createdAt)}</td>
                    <td>${Utils.escapeHtml(p.customerName)}</td>
                    <td style="font-weight:700;color:${p.change>=0?'var(--success)':'var(--danger)'}">${p.change>=0?'+':''}${p.change}</td>
                    <td>${Comp.badge(p.type==='consume'?'消费':p.type==='task'?'任务':p.type==='exchange'?'兑换':'调整', p.type==='consume'?'primary':p.type==='task'?'info':'warning')}</td>
                    <td>${Utils.escapeHtml(p.reason)}</td>
                    <td>${p.balanceAfter}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div id="points-tab-tasks" style="display:none">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
          ${tasks.map(t => `
            <div class="card">
              <div class="card-body">
                <div style="display:flex;justify-content:space-between;align-items:start">
                  <div>
                    <h4 style="font-size:14px">${Utils.escapeHtml(t.name)}</h4>
                    <p style="font-size:12px;color:var(--text-muted);margin-top:4px">${Utils.escapeHtml(t.description)}</p>
                  </div>
                  ${t.isBirthdayBonus ? Comp.badge('双倍积分', 'success') : Comp.badge('+' + t.points + '积分', 'primary')}
                </div>
                <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">
                  类型: ${t.type} | ${t.enabled ? '✅ 已启用' : '⛔ 已禁用'}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div id="points-tab-gifts" style="display:none">
        <div class="style-grid">
          ${gifts.map(g => `
            <div class="style-card">
              <div class="style-image">${g.image ? `<img src="${g.image}" class="preview-image" style="height:180px;width:100%">` : '🎁'}</div>
              <div class="style-info">
                <div class="style-name">${Utils.escapeHtml(g.name)}</div>
                <div class="style-price">${g.pointsCost} 积分</div>
                <div class="style-meta">
                  <span>库存: ${g.stock}</span>
                  <button class="btn btn-sm btn-primary" onclick="openExchangeGift('${g.id}')">兑换</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        ${gifts.length === 0 ? '<div class="empty-state"><div class="empty-icon">🎁</div><p>暂无可兑换礼物</p></div>' : ''}

        ${exchanges.length > 0 ? `
          <h4 style="margin-top:20px;margin-bottom:12px">兑换记录</h4>
          <div class="table-wrap">
            <table>
              <thead><tr><th>日期</th><th>顾客</th><th>礼物</th><th>消耗积分</th></tr></thead>
              <tbody>
                ${exchanges.map(e => `
                  <tr>
                    <td>${e.date}</td>
                    <td>${Utils.escapeHtml(e.customerName)}</td>
                    <td>${Utils.escapeHtml(e.giftName)}</td>
                    <td style="font-weight:700;color:var(--danger)">-${e.pointsCost}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;

    return container;
  },

  // ============================================================
  // 营销管理
  // ============================================================
  renderMarketing() {
    const container = document.createElement('div');
    const year = Utils.currentYear();
    const month = Utils.currentMonth();
    const customers = DataStore.getCustomers();
    const settings = DataStore.getSettings();

    // 月度利润数据（12个月）
    const yearlyData = [];
    for (let m = 1; m <= 12; m++) {
      const inc = DataStore.getMonthlyIncome(year, m);
      const exp = DataStore.getMonthlyExpense(year, m);
      yearlyData.push({ month: `${m}月`, income: inc, expense: exp, profit: inc - exp });
    }
    const maxVal = Math.max(...yearlyData.map(d => Math.max(d.income, d.expense)), 1);

    // 预约统计
    const monthApts = DataStore.getMonthAppointments(year, month);
    const aptByStatus = {
      confirmed: monthApts.filter(a => a.status === 'confirmed').length,
      completed: monthApts.filter(a => a.status === 'completed').length,
      pending: monthApts.filter(a => a.status === 'pending').length,
      cancelled: monthApts.filter(a => a.status === 'cancelled').length
    };
    const totalApts = monthApts.length;

    // 客单价
    const monthConsumes = DataStore.getTransactions().filter(t => t.type === 'consume' && t.date.startsWith(`${year}-${String(month).padStart(2, '0')}`));
    const avgPrice = monthConsumes.length > 0 ? monthConsumes.reduce((s, t) => s + t.actualPrice, 0) / monthConsumes.length : 0;

    // 回头客率（基于本月预约中的老客占比）
    const monthCompletedApts = monthApts.filter(a => a.status === 'completed');
    const newCount = monthCompletedApts.filter(a => a.customerType === 'new').length;
    const returningCount = monthCompletedApts.filter(a => a.customerType === 'returning').length;
    const returnRate = monthCompletedApts.length > 0 ? (returningCount / monthCompletedApts.length * 100).toFixed(0) : 0;

    // 回头客（本月消费≥2次的顾客）
    const consumeMap = {};
    monthConsumes.forEach(t => { consumeMap[t.customerId] = (consumeMap[t.customerId] || 0) + 1; });
    const repeatCount = Object.values(consumeMap).filter(v => v >= 2).length;

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">📈 营销管理</h2>
        <div class="quick-actions">
          <button class="btn btn-outline" onclick="Router.go('marketing')">刷新数据</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:#e8f5e9;color:#4caf50">💰</div>
          <div class="stat-info">
            <div class="stat-title">本月利润</div>
            <div class="stat-value">${Utils.formatMoney(yearlyData[month-1].profit)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#e3f2fd;color:#2196f3">📅</div>
          <div class="stat-info">
            <div class="stat-title">预约转化率</div>
            <div class="stat-value">${totalApts > 0 ? (aptByStatus.completed/totalApts*100).toFixed(0) : 0}%</div>
            <div class="stat-sub">完成${aptByStatus.completed}/${totalApts}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#f3e5f5;color:#9c27b0">💳</div>
          <div class="stat-info">
            <div class="stat-title">客单价</div>
            <div class="stat-value">${Utils.formatMoney(avgPrice)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fff3e0;color:#ff9800">🔄</div>
          <div class="stat-info">
            <div class="stat-title">回头客率</div>
            <div class="stat-value">${returnRate}%</div>
            <div class="stat-sub">新客${newCount}人 / 老客${returningCount}人</div>
          </div>
        </div>
      </div>

      <!-- 年度利润图 -->
      <div class="chart-container">
        <div class="chart-title">📊 ${year}年 月度收支利润</div>
        <div style="display:flex;gap:8px;margin-bottom:12px;justify-content:center">
          <button class="btn btn-sm" id="half-btn-h1" style="background:var(--primary);color:#fff;border-radius:20px;padding:6px 18px" onclick="switchHalfYear('h1')">1~6月</button>
          <button class="btn btn-sm" id="half-btn-h2" style="border-radius:20px;padding:6px 18px" onclick="switchHalfYear('h2')">7~12月</button>
        </div>
        <div id="half-chart-h1" class="bar-chart">
          ${yearlyData.slice(0, 6).map(d => `
            <div class="bar-col">
              <div class="bar-value" style="font-size:10px">${Utils.formatMoney(d.profit)}</div>
              <div style="display:flex;gap:2px;height:180px;align-items:flex-end">
                <div style="width:14px;height:${Math.max(d.income/maxVal*180,1)}px;background:var(--success);opacity:0.6;border-radius:2px 2px 0 0" title="收入${Utils.formatMoney(d.income)}"></div>
                <div style="width:14px;height:${Math.max(d.expense/maxVal*180,1)}px;background:var(--danger);opacity:0.6;border-radius:2px 2px 0 0" title="支出${Utils.formatMoney(d.expense)}"></div>
              </div>
              <div class="bar-label">${d.month}</div>
            </div>
          `).join('')}
        </div>
        <div id="half-chart-h2" class="bar-chart" style="display:none">
          ${yearlyData.slice(6, 12).map(d => `
            <div class="bar-col">
              <div class="bar-value" style="font-size:10px">${Utils.formatMoney(d.profit)}</div>
              <div style="display:flex;gap:2px;height:180px;align-items:flex-end">
                <div style="width:14px;height:${Math.max(d.income/maxVal*180,1)}px;background:var(--success);opacity:0.6;border-radius:2px 2px 0 0" title="收入${Utils.formatMoney(d.income)}"></div>
                <div style="width:14px;height:${Math.max(d.expense/maxVal*180,1)}px;background:var(--danger);opacity:0.6;border-radius:2px 2px 0 0" title="支出${Utils.formatMoney(d.expense)}"></div>
              </div>
              <div class="bar-label">${d.month}</div>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:12px">
          <span>🟢 收入</span><span>🔴 支出</span>
        </div>
      </div>

      <!-- 预约时段统计 -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3>⏰ 本月预约时段分布</h3></div>
        <div class="card-body">
          ${(() => {
            const slots = {};
            monthApts.forEach(a => {
              const hour = a.timeSlot ? a.timeSlot.split(':')[0] : '未知';
              slots[hour] = (slots[hour] || 0) + 1;
            });
            const sorted = Object.entries(slots).sort((a,b) => a[0].localeCompare(b[0]));
            const maxCount = Math.max(...sorted.map(s=>s[1]), 1);
            if (sorted.length === 0) return '<div class="empty-state"><p>本月暂无预约</p></div>';
            return `<div class="bar-chart">${sorted.map(([hour,count]) => `
              <div class="bar-col">
                <div class="bar-value">${count}单</div>
                <div class="bar-fill" style="height:${Math.max(count/maxCount*150,8)}px;background:var(--info);opacity:0.7"></div>
                <div class="bar-label">${hour}时</div>
              </div>
            `).join('')}</div>`;
          })()}
        </div>
      </div>

      <!-- 会员统计 -->
      <div class="card">
        <div class="card-header"><h3>👥 会员概况</h3></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">
            <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
              <div style="font-size:24px;font-weight:700">${customers.length}</div>
              <div style="font-size:12px;color:var(--text-muted)">总会员数</div>
            </div>
            <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
              <div style="font-size:24px;font-weight:700;color:var(--primary)">${Utils.formatMoney(customers.reduce((s,c)=>s+c.card.balance,0))}</div>
              <div style="font-size:12px;color:var(--text-muted)">总储值余额</div>
            </div>
            <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
              <div style="font-size:24px;font-weight:700;color:var(--success)">${customers.reduce((s,c)=>s+c.totalPoints,0)}</div>
              <div style="font-size:12px;color:var(--text-muted)">总积分</div>
            </div>
            <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
              <div style="font-size:24px;font-weight:700;color:var(--warning)">${customers.filter(c=>c.totalPoints-c.usedPoints>=settings.pointsExchangeThreshold).length}</div>
              <div style="font-size:12px;color:var(--text-muted)">积分达标人数</div>
            </div>
          </div>
        </div>
      </div>
    `;

    return container;
  },

  // ============================================================
  // 通知中心
  // ============================================================
  renderNotifications() {
    const container = document.createElement('div');
    const notifications = DataStore.getNotifications();
    const unreadCount = notifications.filter(n => !n.isRead).length;

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">🔔 通知中心</h2>
        <div class="quick-actions">
          <button class="btn btn-outline" onclick="DataStore.markAllNotificationsRead();Router.go('notifications')">全部已读</button>
          <button class="btn btn-outline" onclick="NotificationEngine.check();Router.go('notifications')">刷新通知</button>
        </div>
      </div>

      ${unreadCount > 0 ? `<div style="margin-bottom:12px;color:var(--primary);font-weight:600">${unreadCount} 条未读通知</div>` : ''}

      ${notifications.length === 0 ? '<div class="empty-state"><div class="empty-icon">🔕</div><p>暂无通知</p></div>' :
        notifications.map(n => `
          <div class="notification-item ${n.isRead ? '' : 'unread'}">
            <div class="notification-content">
              <div class="notification-title">${n.title}</div>
              <div class="notification-text">${Utils.escapeHtml(n.content)}</div>
              <div class="notification-time">${Utils.formatDateTime(n.createdAt)}</div>
              ${n.customerName ? `<div class="notification-time">顾客: ${Utils.escapeHtml(n.customerName)} | ${Utils.escapeHtml(n.customerPhone)}</div>` : ''}
            </div>
            <div class="notification-actions" style="display:flex;flex-direction:column;gap:6px">
              <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();copyNotification('${n.id}')">📋 复制</button>
              ${n.customerPhone ? `<button class="btn btn-sm" style="background:#2196F3;color:#fff" onclick="event.stopPropagation();sendToCustomerPhone('${n.id}')">📱 短信发送</button>` : ''}
              ${!n.isRead ? `<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();DataStore.markNotificationRead('${n.id}');Router.go('notifications')">已读</button>` : ''}
            </div>
          </div>
        `).join('')
      }
    `;

    return container;
  },

  // ============================================================
  // 设置
  // ============================================================
  renderSettings() {
    const container = document.createElement('div');
    const settings = DataStore.getSettings();

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">⚙️ 设置</h2>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3>基础设置</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>店铺名称</label>
              <input type="text" id="set-shop-name" value="${Utils.escapeHtml(settings.shopName)}">
            </div>
            <div class="form-group">
              <label>积分比例 (1元=X积分)</label>
              <input type="number" id="set-points-per-yuan" value="${settings.pointsPerYuan}" step="0.1" min="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>余额预警阈值 (元)</label>
              <input type="number" id="set-balance-warn" value="${settings.balanceWarningThreshold}" min="0">
            </div>
            <div class="form-group">
              <label>积分兑换阈值</label>
              <input type="number" id="set-points-exch" value="${settings.pointsExchangeThreshold}" min="0">
            </div>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="set-birthday-double" ${settings.birthdayDoublePoints ? 'checked' : ''}>
              生日月消费双倍积分
            </label>
          </div>
          <button class="btn btn-primary" onclick="saveBasicSettings()">保存基础设置</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3>通知模板</h3></div>
        <div class="card-body">
          ${Object.entries(settings.notificationTemplates).map(([key, tmpl]) => `
            <div class="form-group">
              <label>${key === 'consume_balance' ? '消费通知(扣余额)' : key === 'consume_passcard' ? '消费通知(扣次卡)' : key === 'points_achieved' ? '积分达标提醒' : key === 'birthday_reminder' ? '生日提醒' : key}</label>
              <input type="text" class="notif-tmpl" data-key="${key}" value="${Utils.escapeHtml(tmpl)}">
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">变量: {name} {amount} {balance} {passCardType} {count} {points}</div>
            </div>
          `).join('')}
          <button class="btn btn-primary" onclick="saveNotificationTemplates()">保存通知模板</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3>快捷价格管理</h3></div>
        <div class="card-body">
          <div class="price-chips" id="price-chips-list">
            ${settings.quickPriceInputs.map(p => `
              <span class="price-chip">${p} <span style="cursor:pointer;margin-left:4px" onclick="removeQuickPrice(${p})">×</span></span>
            `).join('')}
          </div>
          <div class="form-row" style="margin-top:12px">
            <div class="form-group">
              <input type="number" id="new-quick-price" placeholder="输入新价格" min="0">
            </div>
            <button class="btn btn-primary" onclick="addQuickPrice()">添加</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>数据管理</h3></div>
        <div class="card-body">
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="exportAllData()">📥 导出全部数据 (JSON)</button>
            <button class="btn btn-outline" onclick="document.getElementById('import-file-input').click()">📤 导入数据</button>
            <input type="file" id="import-file-input" accept=".json" style="display:none" onchange="importAllData(this)">
          </div>
          <div style="margin-top:12px;font-size:12px;color:var(--text-muted)">
            <p>导出：下载所有数据为JSON文件，可用于备份或迁移到其他设备</p>
            <p>导入：选择JSON文件，数据将覆盖当前所有数据（请先导出备份）</p>
          </div>
        </div>
      </div>
    `;

    return container;
  }
};

// ============================================================
// 全局函数（视图交互）
// ============================================================

// --- 会员相关 ---

let currentMemberFilter = 'all';

function setMemberFilter(filter, el) {
  currentMemberFilter = filter;
  document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderMemberList();
}

function renderMemberList() {
  const listEl = document.getElementById('member-list');
  if (!listEl) return;

  const search = (document.getElementById('member-search')?.value || '').toLowerCase();
  let customers = DataStore.getCustomers();
  const settings = DataStore.getSettings();

  // 搜索
  if (search) {
    customers = customers.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.phone.includes(search)
    );
  }

  // 筛选
  if (currentMemberFilter === 'low_balance') {
    customers = customers.filter(c => c.card.balance > 0 && c.card.balance < settings.balanceWarningThreshold);
  } else if (currentMemberFilter === 'birthday') {
    customers = customers.filter(c => c.birthday && Utils.isBirthdayMonth(c.birthday));
  } else if (currentMemberFilter === 'points') {
    customers = customers.filter(c => (c.totalPoints - c.usedPoints) >= settings.pointsExchangeThreshold);
  }

  if (customers.length === 0) {
    listEl.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👤</div><p>暂无匹配的会员</p></div>';
    return;
  }

  listEl.innerHTML = customers.map(c => {
    const availablePoints = c.totalPoints - c.usedPoints;
    const isLowBalance = c.card.balance > 0 && c.card.balance < settings.balanceWarningThreshold;
    const isBirthday = c.birthday && Utils.isBirthdayMonth(c.birthday);

    return `
      <div class="member-card" onclick="openMemberDetail('${c.id}')">
        <div class="member-card-header">
          <div class="member-avatar">${c.name.charAt(0)}</div>
          <div>
            <div class="member-name">${Utils.escapeHtml(c.name)} ${isBirthday ? '🎂' : ''}</div>
            <div class="member-phone">${Utils.escapeHtml(c.phone)}</div>
          </div>
        </div>
        <div class="member-stats">
          <div class="member-stat">
            储值余额
            <strong style="color:${isLowBalance?'var(--warning)':'var(--text)'}">${Utils.formatMoney(c.card.balance)}</strong>
          </div>
          <div class="member-stat">
            积分
            <strong>${availablePoints}</strong>
          </div>
          ${c.card.passCardType ? `
            <div class="member-stat">
              ${c.card.passCardType}
              <strong>剩${c.card.passCardCount}次</strong>
            </div>
          ` : '<div class="member-stat"></div>'}
          ${c.birthday ? `
            <div class="member-stat">
              生日
              <strong>${c.birthday}</strong>
            </div>
          ` : '<div class="member-stat"></div>'}
        </div>
        <div class="member-actions">
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openRechargeForm('${c.id}')">充值</button>
          <button class="btn btn-sm btn-success" onclick="event.stopPropagation();openConsumeForm('${c.id}')">消费</button>
        </div>
      </div>
    `;
  }).join('');
}

function openMemberDetail(customerId) {
  const cust = DataStore.getCustomer(customerId);
  if (!cust) return;

  const txns = DataStore.getTransactions().filter(t => t.customerId === customerId).sort((a, b) => b.createdAt - a.createdAt);
  const points = DataStore.getPoints().filter(p => p.customerId === customerId).sort((a, b) => b.createdAt - a.createdAt);
  const apts = DataStore.getAppointments().filter(a => a.customerId === customerId).sort((a, b) => b.date.localeCompare(a.date));
  const availablePoints = cust.totalPoints - cust.usedPoints;

  const modal = Comp.showModal(
    `${cust.name} - 会员详情`,
    `
      <div class="tabs" id="detail-tabs">
        <span class="tab active" data-tab="info" onclick="switchDetailTab('info',this)">基本信息</span>
        <span class="tab" data-tab="txns" onclick="switchDetailTab('txns',this)">交易记录</span>
        <span class="tab" data-tab="points" onclick="switchDetailTab('points',this)">积分明细</span>
        <span class="tab" data-tab="apts" onclick="switchDetailTab('apts',this)">预约历史</span>
      </div>

      <div id="detail-tab-info">
        <div class="form-row">
          <div class="form-group">
            <label>姓名</label>
            <input type="text" id="det-name" value="${Utils.escapeHtml(cust.name)}">
          </div>
          <div class="form-group">
            <label>手机号</label>
            <input type="text" id="det-phone" value="${Utils.escapeHtml(cust.phone)}">
          </div>
        </div>
        <div class="form-group">
          <label>生日</label>
          <input type="date" id="det-birthday" value="${cust.birthday}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>储值卡余额</label>
            <input type="number" id="det-balance" value="${cust.card.balance}" step="0.01">
          </div>
          <div class="form-group">
            <label>次卡类型</label>
            <input type="text" id="det-passcard-type" value="${Utils.escapeHtml(cust.card.passCardType || '')}" placeholder="如：猫眼次卡10次">
          </div>
          <div class="form-group">
            <label>次卡剩余</label>
            <input type="number" id="det-passcard-count" value="${cust.card.passCardCount}" min="0">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>总积分</label>
            <input type="number" id="det-total-points" value="${cust.totalPoints}" min="0">
          </div>
          <div class="form-group">
            <label>已用积分</label>
            <input type="number" id="det-used-points" value="${cust.usedPoints}" min="0">
          </div>
        </div>
        <div class="form-group">
          <label>备注</label>
          <textarea id="det-remark">${Utils.escapeHtml(cust.remark || '')}</textarea>
        </div>
        <div style="margin-bottom:8px">
          可用积分：<strong>${availablePoints}</strong> |
          储值余额：<strong>${Utils.formatMoney(cust.card.balance)}</strong>
        </div>
      </div>

      <div id="detail-tab-txns" style="display:none">
        ${txns.length === 0 ? '<div class="empty-state"><p>暂无交易记录</p></div>' : `
          <div class="table-wrap">
            <table>
              <thead><tr><th>日期</th><th>类型</th><th>详情</th><th>金额</th></tr></thead>
              <tbody>
                ${txns.map(t => {
                  const typeLabel = t.type === 'recharge' ? '充值' : t.type === 'consume' ? '消费' : '支出';
                  const typeBadge = t.type === 'recharge' ? 'success' : t.type === 'consume' ? 'primary' : 'danger';
                  const amount = t.type === 'consume' ? t.actualPrice : (t.amount + (t.bonusAmount || 0));
                  return `
                    <tr>
                      <td>${t.date}</td>
                      <td>${Comp.badge(typeLabel, typeBadge)}</td>
                      <td>${Utils.escapeHtml(t.styleName || t.remark || '-')}</td>
                      <td style="font-weight:700;color:${t.type==='recharge'||t.type==='consume'?'var(--success)':'var(--danger)'}">${Utils.formatMoney(amount)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div id="detail-tab-points" style="display:none">
        ${points.length === 0 ? '<div class="empty-state"><p>暂无积分记录</p></div>' : `
          <div class="table-wrap">
            <table>
              <thead><tr><th>时间</th><th>变动</th><th>原因</th><th>余额</th></tr></thead>
              <tbody>
                ${points.map(p => `
                  <tr>
                    <td>${Utils.formatDateTime(p.createdAt)}</td>
                    <td style="color:${p.change>=0?'var(--success)':'var(--danger)'};font-weight:700">${p.change>=0?'+':''}${p.change}</td>
                    <td>${Utils.escapeHtml(p.reason)}</td>
                    <td>${p.balanceAfter}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div id="detail-tab-apts" style="display:none">
        ${apts.length === 0 ? '<div class="empty-state"><p>暂无预约记录</p></div>' : `
          <div class="table-wrap">
            <table>
              <thead><tr><th>日期</th><th>时间</th><th>款式</th><th>状态</th></tr></thead>
              <tbody>
                ${apts.map(a => `
                  <tr>
                    <td>${a.date}</td>
                    <td>${a.timeSlot}</td>
                    <td>${Utils.escapeHtml(a.styleName || '-')}</td>
                    <td>${Comp.badge(a.status==='completed'?'已完成':a.status==='cancelled'?'已取消':'进行中', a.status==='completed'?'default':a.status==='cancelled'?'danger':'danger')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `,
    (overlay) => {
      // 保存会员信息
      const name = overlay.querySelector('#det-name').value.trim();
      if (!name) { Utils.showToast('姓名不能为空', 'error'); return; }

      DataStore.updateCustomer(customerId, {
        name,
        phone: overlay.querySelector('#det-phone').value.trim(),
        birthday: overlay.querySelector('#det-birthday').value,
        remark: overlay.querySelector('#det-remark').value.trim(),
        card: {
          balance: parseFloat(overlay.querySelector('#det-balance').value) || 0,
          passCardType: overlay.querySelector('#det-passcard-type').value.trim(),
          passCardCount: parseInt(overlay.querySelector('#det-passcard-count').value) || 0
        },
        totalPoints: parseInt(overlay.querySelector('#det-total-points').value) || 0,
        usedPoints: parseInt(overlay.querySelector('#det-used-points').value) || 0
      });

      overlay.remove();
      Utils.showToast('会员信息已更新', 'success');
      Router.go('members');
    },
    { wide: true }
  );

  // 添加充值消费按钮和删除按钮到footer
  const footer = modal.querySelector('.modal-footer');
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger';
  delBtn.textContent = '删除顾客';
  delBtn.style.marginRight = 'auto';
  delBtn.onclick = () => {
    Comp.confirm('确认删除', `确定要删除顾客「${cust.name}」吗？此操作不可恢复，关联的预约、交易、积分记录也将被删除。`, () => {
      DataStore.deleteCustomer(customerId);
      modal.remove();
      Utils.showToast('已删除顾客', 'success');
      Router.go('members');
    });
  };
  footer.insertBefore(delBtn, footer.firstChild);

  const rechargeBtn = document.createElement('button');
  rechargeBtn.className = 'btn btn-primary';
  rechargeBtn.textContent = '充值';
  rechargeBtn.onclick = () => { modal.remove(); openRechargeForm(customerId); };
  footer.insertBefore(rechargeBtn, footer.querySelector('.modal-save-btn'));

  const consumeBtn = document.createElement('button');
  consumeBtn.className = 'btn btn-success';
  consumeBtn.textContent = '消费';
  consumeBtn.onclick = () => { modal.remove(); openConsumeForm(customerId); };
  footer.insertBefore(consumeBtn, footer.querySelector('.modal-save-btn'));
}

function switchDetailTab(tabName, el) {
  document.querySelectorAll('#detail-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['info', 'txns', 'points', 'apts'].forEach(t => {
    const panel = document.getElementById('detail-tab-' + t);
    if (panel) panel.style.display = t === tabName ? 'block' : 'none';
  });
}

function openMemberForm() {
  Comp.showModal('添加会员', `
    <div class="form-row">
      <div class="form-group">
        <label>姓名 *</label>
        <input type="text" id="mf-name" placeholder="顾客姓名">
      </div>
      <div class="form-group">
        <label>手机号</label>
        <input type="text" id="mf-phone" placeholder="手机号码">
      </div>
    </div>
    <div class="form-group">
      <label>生日</label>
      <input type="date" id="mf-birthday">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>初始储值金额</label>
        <input type="number" id="mf-balance" value="0" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label>赠送金额</label>
        <input type="number" id="mf-bonus" value="0" min="0" step="0.01">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>次卡类型</label>
        <input type="text" id="mf-passcard-type" placeholder="如：猫眼次卡10次">
      </div>
      <div class="form-group">
        <label>次卡次数</label>
        <input type="number" id="mf-passcard-count" value="0" min="0">
      </div>
    </div>
    <div class="form-group">
      <label>备注</label>
      <textarea id="mf-remark" placeholder="备注信息"></textarea>
    </div>
  `, (overlay) => {
    const name = overlay.querySelector('#mf-name').value.trim();
    if (!name) { Utils.showToast('请输入顾客姓名', 'error'); return; }

    const balance = parseFloat(overlay.querySelector('#mf-balance').value) || 0;
    const bonus = parseFloat(overlay.querySelector('#mf-bonus').value) || 0;

    DataStore.addCustomer({
      name,
      phone: overlay.querySelector('#mf-phone').value.trim(),
      birthday: overlay.querySelector('#mf-birthday').value,
      card: {
        balance: balance + bonus,
        passCardType: overlay.querySelector('#mf-passcard-type').value.trim(),
        passCardCount: parseInt(overlay.querySelector('#mf-passcard-count').value) || 0
      },
      remark: overlay.querySelector('#mf-remark').value.trim()
    });

    overlay.remove();
    Utils.showToast('会员添加成功', 'success');
    Router.go('members');
  });
}

function openRechargeForm(customerId) {
  const cust = DataStore.getCustomer(customerId);
  if (!cust) return;

  Comp.showModal(`充值 - ${cust.name}`, `
    <div class="form-group" style="background:#f8f9fa;padding:10px;border-radius:8px">
      当前余额: <strong>${Utils.formatMoney(cust.card.balance)}</strong>
      ${cust.card.passCardType ? ` | ${cust.card.passCardType}: <strong>${cust.card.passCardCount}次</strong>` : ''}
    </div>
    <div class="form-group">
      <label>充值类型</label>
      <select id="rc-type" onchange="onRechargeTypeChange()">
        <option value="balance">💰 储值金额</option>
        <option value="passcard">🎫 次卡充值</option>
      </select>
    </div>
    <!-- 储值金额区域 -->
    <div id="rc-balance-area">
      <div class="form-row">
        <div class="form-group">
          <label>充值金额 *</label>
          <input type="number" id="rc-amount" min="0" step="0.01" placeholder="0">
        </div>
        <div class="form-group">
          <label>赠送金额</label>
          <input type="number" id="rc-bonus" value="0" min="0" step="0.01">
        </div>
      </div>
    </div>
    <!-- 次卡充值区域 -->
    <div id="rc-passcard-area" style="display:none">
      <div class="form-row">
        <div class="form-group">
          <label>次卡名称</label>
          <input type="text" id="rc-passcard-name" value="${Utils.escapeHtml(cust.card.passCardType || '')}" placeholder="如：猫眼次卡10次">
        </div>
        <div class="form-group">
          <label>充值次数</label>
          <input type="number" id="rc-passcard-count" min="1" placeholder="如：10">
        </div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>支付方式</label>
        <select id="rc-payment">
          <option value="wechat">微信</option>
          <option value="alipay">支付宝</option>
          <option value="cash">现金</option>
          <option value="card">银行卡</option>
        </select>
      </div>
      <div class="form-group">
        <label>日期</label>
        <input type="date" id="rc-date" value="${Utils.today()}">
      </div>
    </div>
    <div class="form-group">
      <label>备注</label>
      <input type="text" id="rc-remark" placeholder="充值备注">
    </div>
  `, (overlay) => {
    const type = overlay.querySelector('#rc-type').value;

    if (type === 'passcard') {
      const passName = overlay.querySelector('#rc-passcard-name').value.trim();
      const passCount = parseInt(overlay.querySelector('#rc-passcard-count').value) || 0;
      if (!passName) { Utils.showToast('请输入次卡名称', 'error'); return; }
      if (passCount <= 0) { Utils.showToast('请输入充值次数', 'error'); return; }

      // 更新顾客次卡信息
      const updatedCust = DataStore.getCustomer(customerId);
      updatedCust.card.passCardType = passName;
      updatedCust.card.passCardCount += passCount;
      updatedCust.updatedAt = Date.now();
      DataStore._save('customers', DataStore.getCustomers());

      // 记录充值交易
      const txns = DataStore.getTransactions();
      txns.push({
        id: Utils.genId('txn'),
        type: 'recharge',
        customerId,
        customerName: cust.name,
        amount: 0,
        bonusAmount: 0,
        paymentMethod: overlay.querySelector('#rc-payment').value,
        remark: `次卡充值：${passName} +${passCount}次 ${overlay.querySelector('#rc-remark').value.trim()}`,
        date: overlay.querySelector('#rc-date').value,
        createdAt: Date.now()
      });
      DataStore._save('transactions', txns);

      overlay.remove();
      Utils.showToast(`${passName} 充值成功！剩余 ${updatedCust.card.passCardCount} 次`, 'success');
    } else {
      const amount = parseFloat(overlay.querySelector('#rc-amount').value) || 0;
      if (amount <= 0) { Utils.showToast('请输入充值金额', 'error'); return; }

      DataStore.addRecharge({
        customerId,
        customerName: cust.name,
        amount,
        bonusAmount: parseFloat(overlay.querySelector('#rc-bonus').value) || 0,
        paymentMethod: overlay.querySelector('#rc-payment').value,
        remark: overlay.querySelector('#rc-remark').value.trim(),
        date: overlay.querySelector('#rc-date').value
      });

      overlay.remove();
      Utils.showToast(`充值成功！余额: ${Utils.formatMoney(DataStore.getCustomer(customerId).card.balance)}`, 'success');
    }

    Router.go('members');
  });
}

function onRechargeTypeChange() {
  const type = document.querySelector('#rc-type')?.value;
  const balanceArea = document.querySelector('#rc-balance-area');
  const passcardArea = document.querySelector('#rc-passcard-area');
  if (type === 'passcard') {
    if (balanceArea) balanceArea.style.display = 'none';
    if (passcardArea) passcardArea.style.display = 'block';
  } else {
    if (balanceArea) balanceArea.style.display = 'block';
    if (passcardArea) passcardArea.style.display = 'none';
  }
}

function openConsumeForm(customerId) {
  const cust = DataStore.getCustomer(customerId);
  if (!cust) return;
  const settings = DataStore.getSettings();
  const styles = DataStore.getStyles();

  // 判断顾客类型：有次卡优先次卡，有余额是储值会员
  const hasPassCard = cust.card.passCardCount > 0 && cust.card.passCardType;
  const hasBalance = cust.card.balance > 0;

  Comp.showModal(`消费 - ${cust.name}`, `
    <div class="form-group" style="background:#f8f9fa;padding:10px;border-radius:8px">
      ${hasPassCard ? `次卡: <strong>${Utils.escapeHtml(cust.card.passCardType)} 剩余${cust.card.passCardCount}次</strong>` : ''}
      ${hasPassCard && hasBalance ? ' | ' : ''}
      ${hasBalance ? `余额: <strong>${Utils.formatMoney(cust.card.balance)}</strong>` : ''}
      ${!hasPassCard && !hasBalance ? '无储值/次卡，仅支持现金收款' : ''}
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>选择款式</label>
        <select id="cs-style" onchange="onConsumeStylePick()">
          <option value="">-- 选择款式 --</option>
          ${styles.map(s => `<option value="${s.id}" data-price="${s.price}" data-name="${Utils.escapeHtml(s.name)}">${Utils.escapeHtml(s.name)} - ${Utils.formatMoney(s.price)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>项目名称</label>
        <input type="text" id="cs-style-manual" placeholder="自动填写，可手动修改" value="${Utils.escapeHtml(hasPassCard ? cust.card.passCardType : '')}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>扣款方式</label>
        <select id="cs-deduct-type" onchange="onDeductTypeChange()">
          ${hasBalance ? '<option value="balance">💰 扣余额</option>' : ''}
          ${hasPassCard ? '<option value="passcard">🎫 扣次卡</option>' : ''}
          <option value="cash">💵 现金收款</option>
        </select>
      </div>
      <div class="form-group">
        <label>日期</label>
        <input type="date" id="cs-date" value="${Utils.today()}">
      </div>
    </div>
    <!-- 扣余额/现金区域 -->
    <div id="cs-balance-area">
      <div class="form-group">
        <label>消费金额 *</label>
        <div class="price-chips" style="margin-bottom:6px">
          ${settings.quickPriceInputs.map(p => `<span class="price-chip" onclick="document.getElementById('cs-actual-price').value=${p}">${Utils.formatMoney(p)}</span>`).join('')}
        </div>
        <input type="number" id="cs-actual-price" min="0" step="0.01" placeholder="0">
      </div>
    </div>
    <!-- 扣次卡区域 -->
    <div id="cs-passcard-area" style="display:none">
      <div class="form-group" style="background:#f0f7ff;padding:12px;border-radius:8px">
        <label>本次消耗次数</label>
        <select id="cs-passcard-times" onchange="document.getElementById('cs-passcard-remain').textContent = ${cust.card.passCardCount} - parseInt(this.value)">
          ${Array.from({length: Math.min(cust.card.passCardCount, 10)}, (_, i) => i + 1).map(n => `<option value="${n}">消耗 ${n} 次</option>`).join('')}
        </select>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
          ${Utils.escapeHtml(cust.card.passCardType || '次卡')}：消耗后剩余 <strong id="cs-passcard-remain">${cust.card.passCardCount - 1}</strong> 次
        </div>
      </div>
    </div>
    <div class="form-group">
      <label>备注</label>
      <input type="text" id="cs-remark" placeholder="消费备注">
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
      预计获得积分: <span id="cs-est-points">0</span> ${cust.birthday && settings.birthdayDoublePoints && Utils.isBirthdayMonth(cust.birthday) ? '(生日月双倍)' : ''}
    </div>
  `, (overlay) => {
    const deductType = overlay.querySelector('#cs-deduct-type').value;
    const styleSelect = overlay.querySelector('#cs-style');
    const styleId = styleSelect.value;
    // 优先用手动输入的项目名，如果没填就用款式选择的，再没填用次卡类型
    const manualName = overlay.querySelector('#cs-style-manual').value.trim();
    const styleName = manualName || (styleId ? styleSelect.selectedOptions[0].dataset.name : (cust.card.passCardType || '美甲服务'));

    let actualPrice = 0;
    let passCardUsed = 0;

    if (deductType === 'passcard') {
      passCardUsed = parseInt(overlay.querySelector('#cs-passcard-times').value) || 1;
    } else {
      actualPrice = parseFloat(overlay.querySelector('#cs-actual-price').value) || 0;
      if (actualPrice <= 0) { Utils.showToast('请输入消费金额', 'error'); return; }
    }

    DataStore.addConsume({
      customerId,
      customerName: cust.name,
      styleId,
      styleName,
      originalPrice: actualPrice,
      actualPrice,
      deductType: deductType,
      deductAmount: actualPrice,
      passCardUsed: passCardUsed,
      remark: overlay.querySelector('#cs-remark').value.trim(),
      date: overlay.querySelector('#cs-date').value
    });

    const updated = DataStore.getCustomer(customerId);

    overlay.remove();

    // 消费成功后，自动唤起手机分享面板发短信给顾客
    const shopName = DataStore.getSettings().shopName || '歪歪美甲工作室';
    let notifyText = '';
    if (deductType === 'passcard') {
      notifyText = `【${shopName}】${cust.name}您好，本次${updated.card.passCardType || '次卡套餐'}已消费${passCardUsed}次，剩余${updated.card.passCardCount}次，如美甲有问题10天内可免费质保服务！`;
    } else if (deductType === 'balance') {
      notifyText = `【${shopName}】${cust.name}您好，本次消费${Utils.formatMoney(actualPrice)}元，卡内剩余${Utils.formatMoney(updated.card.balance)}元，如美甲有问题10天内可免费质保服务！`;
    } else {
      notifyText = `【${shopName}】${cust.name}您好，本次消费${Utils.formatMoney(actualPrice)}元，感谢您的光临，如美甲有问题10天内可免费质保服务！`;
    }

    // 复制到剪贴板备用
    Utils.copyToClipboard(notifyText).catch(() => {});

    // 直接打开短信App，自动填入顾客手机号和文案
    const smsUrl = `sms:${cust.phone}?body=${encodeURIComponent(notifyText)}`;
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = smsUrl;
      a.target = '_blank';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 300);

    Utils.showToast(`消费记录成功！正在打开短信发送给 ${cust.name}`, 'success');
    Router.go('members');
  });

  // 实时计算积分 + 扣款方式切换
  setTimeout(() => {
    const actualInput = document.querySelector('#cs-actual-price');
    const estSpan = document.querySelector('#cs-est-points');
    if (actualInput && estSpan) {
      const updateEst = () => {
        const price = parseFloat(actualInput.value) || 0;
        let pts = Math.floor(price * settings.pointsPerYuan);
        if (cust.birthday && settings.birthdayDoublePoints && Utils.isBirthdayMonth(cust.birthday)) pts *= 2;
        estSpan.textContent = pts;
      };
      actualInput.addEventListener('input', updateEst);
    }

    // 初始化显示
    const deductSelect = document.querySelector('#cs-deduct-type');
    if (deductSelect) {
      const initVal = deductSelect.value;
      onDeductTypeChange(initVal);
    }
  }, 100);
}

function onDeductTypeChange(val) {
  const deductType = val || document.querySelector('#cs-deduct-type')?.value;
  const balanceArea = document.querySelector('#cs-balance-area');
  const passcardArea = document.querySelector('#cs-passcard-area');
  if (deductType === 'passcard') {
    if (balanceArea) balanceArea.style.display = 'none';
    if (passcardArea) passcardArea.style.display = 'block';
  } else {
    if (balanceArea) balanceArea.style.display = 'block';
    if (passcardArea) passcardArea.style.display = 'none';
  }
}

// 款式选择时自动填入价格
function onConsumeStylePick() {
  const sel = document.querySelector('#cs-style');
  const actualPrice = document.querySelector('#cs-actual-price');
  if (sel && sel.value && actualPrice) {
    const price = sel.selectedOptions[0].dataset.price;
    actualPrice.value = price;
    actualPrice.dispatchEvent(new Event('input'));
  }
}

// --- 预约相关 ---

function renderCalendar() {
  const container = document.querySelector('#appointment-calendar');
  if (!container) return;

  const view = document.querySelector('.view-dashboard')?.parentElement?.querySelector('#appointment-calendar') ? null : null;
  const year = this._calendarYear || Utils.currentYear();
  const month = this._calendarMonth || Utils.currentMonth();
  const selectedDate = this._selectedDate || Utils.today();

  const daysInMonth = Utils.daysInMonth(year, month);
  const firstDay = Utils.firstDayOfMonth(year, month);
  const today = Utils.today();

  const monthApts = DataStore.getMonthAppointments(year, month);
  const aptDates = new Set(monthApts.map(a => a.date));

  const dayHeaders = ['一', '二', '三', '四', '五', '六', '日'];

  container.innerHTML = `
    <div class="calendar-nav">
      <button class="btn btn-sm btn-outline" onclick="calendarNav(-1)">◀</button>
      <h3>${year}年 ${month}月</h3>
      <button class="btn btn-sm btn-outline" onclick="calendarNav(1)">▶</button>
      <button class="btn btn-sm btn-outline" onclick="calendarGoToday()">今天</button>
    </div>
    <div class="calendar-grid">
      ${dayHeaders.map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
      ${(() => {
        let html = '';
        // 填充上个月空白
        for (let i = 1; i < firstDay; i++) {
          html += '<div class="calendar-day other-month"></div>';
        }
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasApt = aptDates.has(dateStr);
          html += `<div class="calendar-day${isToday?' today':''}${isSelected?' selected':''}${hasApt?' has-appointment':''}" onclick="selectDate('${dateStr}')">${d}</div>`;
        }
        return html;
      })()}
    </div>
  `;

  // 更新导航函数上下文
  window._calendarCtx = this;
}

function calendarNav(delta) {
  const ctx = window._calendarCtx;
  if (!ctx) return;
  ctx._calendarMonth += delta;
  if (ctx._calendarMonth > 12) { ctx._calendarMonth = 1; ctx._calendarYear++; }
  if (ctx._calendarMonth < 1) { ctx._calendarMonth = 12; ctx._calendarYear--; }
  renderCalendar.call(ctx);
}

function calendarGoToday() {
  const ctx = window._calendarCtx;
  if (!ctx) return;
  ctx._calendarYear = Utils.currentYear();
  ctx._calendarMonth = Utils.currentMonth();
  ctx._selectedDate = Utils.today();
  renderCalendar.call(ctx);
  renderAppointmentList.call(ctx);
}

function selectDate(dateStr) {
  const ctx = window._calendarCtx;
  if (!ctx) return;
  ctx._selectedDate = dateStr;
  renderCalendar.call(ctx);
  renderAppointmentList.call(ctx);
}

function renderAppointmentList() {
  const listEl = document.querySelector('#appointment-list');
  if (!listEl) return;

  const ctx = window._calendarCtx;
  const date = ctx ? ctx._selectedDate : Utils.today();
  const apts = DataStore.getDateAppointments(date).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  listEl.innerHTML = `
    <h4 style="margin-bottom:12px">📋 ${date} 预约列表</h4>
    ${apts.length === 0 ? '<div class="empty-state"><div class="empty-icon">📭</div><p>当天暂无预约</p></div>' :
      apts.map(apt => `
        <div class="appointment-item${apt.status==='completed'?' apt-completed':''}" onclick="openEditAppointment('${apt.id}')">
          <div class="appointment-time">${apt.timeSlot}</div>
          <div class="appointment-info">
            <div class="appointment-customer">
              ${Utils.escapeHtml(apt.styleName || '未指定项目')}
              ${apt.price > 0 ? `<span style="color:var(--primary);font-weight:600;margin-left:6px">¥${apt.price}</span>` : ''}
              ${apt.customerType === 'new' ? '<span style="background:#ff9800;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:6px">新客</span>' : apt.customerType === 'returning' ? '<span style="background:#4caf50;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:6px">老客</span>' : ''}
            </div>
            ${apt.remark ? `<div class="appointment-style">${Utils.escapeHtml(apt.remark)}</div>` : ''}
          </div>
          <div class="appointment-status">
            ${Comp.badge(apt.status === 'completed' ? '已完成' : apt.status === 'cancelled' ? '已取消' : '进行中', apt.status === 'completed' ? 'default' : apt.status === 'cancelled' ? 'danger' : 'danger')}
          </div>
          <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();deleteAppointment('${apt.id}')">删除</button>
        </div>
      `).join('')
    }
  `;
}

function openAppointmentForm(dateStr) {
  const date = dateStr || (window._calendarCtx ? window._calendarCtx._selectedDate : Utils.today());

  Comp.showModal('新建预约', `
    <div class="form-row">
      <div class="form-group">
        <label>预约项目 *</label>
        <input type="text" id="apt-project" placeholder="如：猫眼美甲、手绘美甲">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>顾客类型</label>
        <select id="apt-customer-type">
          <option value="new">🆕 新客</option>
          <option value="returning">🔄 老客</option>
        </select>
      </div>
      <div class="form-group">
        <label>价格</label>
        <input type="number" id="apt-price" min="0" step="0.01" placeholder="如：128">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>日期</label>
        <input type="date" id="apt-date" value="${date}">
      </div>
      <div class="form-group">
        <label>开始时间 *</label>
        <input type="time" id="apt-start-time" placeholder="如 14:00">
      </div>
      <div class="form-group">
        <label>结束时间</label>
        <input type="time" id="apt-end-time" placeholder="如 15:30">
      </div>
    </div>
    <div class="form-group">
      <label>备注</label>
      <input type="text" id="apt-remark" placeholder="备注（可选）">
    </div>
  `, (overlay) => {
    const project = overlay.querySelector('#apt-project').value.trim();
    const startTime = overlay.querySelector('#apt-start-time').value;
    const endTime = overlay.querySelector('#apt-end-time').value;

    if (!project) { Utils.showToast('请输入预约项目', 'error'); return; }
    if (!startTime) { Utils.showToast('请选择开始时间', 'error'); return; }

    const timeSlot = endTime ? `${startTime}-${endTime}` : startTime;
    const aptDate = overlay.querySelector('#apt-date').value;

    DataStore.addAppointment({
      customerId: '',
      customerName: '',
      customerPhone: '',
      date: aptDate,
      timeSlot: timeSlot,
      styleId: '',
      styleName: project,
      price: parseFloat(overlay.querySelector('#apt-price').value) || 0,
      status: 'confirmed',
      customerType: overlay.querySelector('#apt-customer-type').value,
      remark: overlay.querySelector('#apt-remark').value.trim()
    });

    // 设置闹钟提醒
    const newApt = DataStore.getAppointments().slice(-1)[0];
    scheduleAppointmentAlarm(aptDate, startTime, project, newApt ? newApt.id : null);

    overlay.remove();
    Utils.showToast(`预约「${project}」创建成功，开始时间到会铃声提醒`, 'success');
    Router.go('appointments');
  });
}

/**
 * 预约到时间铃声提醒
 * 改进版：每次打开APP自动恢复所有闹钟 + 后台也能通知
 */
let _activeAlarms = {}; // 存储所有活跃的闹钟timer

function isValidTimeFormat(timeStr) {
  return /^([0-1]?\d|2[0-3]):[0-5]\d$/.test(timeStr);
}

function scheduleAppointmentAlarm(dateStr, timeStr, project, aptId) {
  // 严格校验日期和时间格式
  if (!dateStr || !isValidTimeFormat(timeStr)) {
    console.log('日期或时间格式无效，跳过闹钟:', dateStr, timeStr);
    return;
  }

  const alarmTime = new Date(`${dateStr}T${timeStr}:00`);
  const now = new Date();

  // 再次检查是否是有效日期
  if (isNaN(alarmTime.getTime())) {
    console.log('无效日期:', dateStr, timeStr);
    return;
  }

  // 如果预约时间已经过去，不设置闹钟
  if (alarmTime.getTime() <= now.getTime()) {
    console.log('预约时间已过，跳过:', project, alarmTime.toLocaleString());
    return;
  }

  const msUntil = alarmTime.getTime() - now.getTime();
  const key = aptId || `${dateStr}_${timeStr}_${project}`;

  // 如果已有同名闹钟，先清掉
  if (_activeAlarms[key]) clearTimeout(_activeAlarms[key]);

  // 设置新的 timer（最多2147483647ms，约24.8天）
  _activeAlarms[key] = setTimeout(() => {
    triggerAlarm(project, dateStr, timeStr);
  }, Math.min(msUntil, 2147483647));

  console.log('闹钟已设置:', project, alarmTime.toLocaleString(), '还有', Math.round(msUntil/1000), '秒');
}

/**
 * 触发闹钟：铃声 + 振动 + 系统通知 + 弹窗
 */
function triggerAlarm(project, dateStr, timeStr) {
  // 1. 播放铃声（循环直到用户关闭）
  playAlarmSound();

  // 2. 手机振动
  if (navigator.vibrate) {
    navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
  }

  // 3. 系统通知（后台也能收到）
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      // 通过 Service Worker 发送通知（更可靠）
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: '⏰ 预约开始时间到！',
          body: `${project} - ${dateStr} ${timeStr} 开始`,
          icon: '/icons/icon-192x192.png'
        });
      } else {
        const notif = new Notification('⏰ 预约开始时间到！', {
          body: `${project} - ${dateStr} ${timeStr} 开始`,
          icon: '/icons/icon-192x192.png',
          tag: 'appointment-alarm',
          requireInteraction: true
        });
        notif.onclick = function() { window.focus(); this.close(); };
      }
    } catch(e) { console.log('通知失败:', e); }
  }

  // 4. 页面内弹窗提醒
  const alarmOverlay = document.createElement('div');
  alarmOverlay.className = 'modal-overlay';
  alarmOverlay.style.zIndex = '9999';
  alarmOverlay.innerHTML = `
    <div class="modal modal-sm" style="text-align:center;animation:pulse 0.6s ease infinite alternate">
      <div class="modal-header" style="background:#e91e63;color:#fff;border-radius:12px 12px 0 0">
        <h3>⏰ 预约开始时间到！</h3>
      </div>
      <div class="modal-body">
        <div style="font-size:48px;margin:16px 0">💅</div>
        <h2 style="font-size:20px;color:#e91e63">${Utils.escapeHtml(project)}</h2>
        <p style="font-size:16px;color:#666;margin-top:8px">开始时间：${dateStr} ${timeStr}</p>
      </div>
      <div class="modal-footer" style="justify-content:center;flex-direction:column;gap:8px">
        <button class="btn btn-primary btn-lg" onclick="this.closest('.modal-overlay').remove();stopAlarmSound()">知道了</button>
        <button class="btn btn-outline" onclick="playAlarmSound()">🔔 重播铃声</button>
      </div>
    </div>
  `;
  document.body.appendChild(alarmOverlay);
}

/**
 * APP打开时恢复所有未到时间的预约闹钟
 */
function restoreAllAlarms() {
  const apts = DataStore.getAppointments();
  const now = new Date();

  // 清理旧的闹钟
  Object.values(_activeAlarms).forEach(timer => clearTimeout(timer));
  _activeAlarms = {};

  apts.forEach(apt => {
    if (apt.status === 'cancelled' || apt.status === 'completed') return;

    const startTime = apt.timeSlot ? apt.timeSlot.split('-')[0] : '';
    if (!startTime || !isValidTimeFormat(startTime)) return;

    const alarmTime = new Date(`${apt.date}T${startTime}:00`);
    if (isNaN(alarmTime.getTime()) || alarmTime.getTime() <= now.getTime()) return;

    scheduleAppointmentAlarm(apt.date, startTime, apt.styleName || '未命名项目', apt.id);
  });
}

/**
 * 请求通知权限
 */
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(result => {
      console.log('通知权限:', result);
    });
  }
}

// 铃声播放（使用 audio 元素 + 内联 WAV，更可靠）
let alarmAudioEl = null;
let _audioUnlocked = false;

function unlockAudio() {
  if (_audioUnlocked) return;
  try {
    const silent = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    silent.play().then(() => {
      _audioUnlocked = true;
      console.log('音频已解锁');
    }).catch(e => {});
  } catch(e) {}
}

function playAlarmSound() {
  stopAlarmSound();

  // 生成简单的铃声 WAV 数据（短信风格：嘀嘀嘀）
  const sampleRate = 8000;
  const duration = 1.5; // 1.5秒
  const samples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);

  // WAV header
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeStr(36, 'data');
  view.setUint32(40, samples, true);

  // 生成铃声波形：800Hz 和 1000Hz 交替（短信风格）
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const phase = t % 0.3; // 每0.3秒一个周期
    const freq = phase < 0.15 ? 800 : 1000;
    const envelope = Math.max(0, 1 - t / duration); // 渐弱
    const val = Math.sin(2 * Math.PI * freq * t) * 0.6 * envelope;
    view.setUint8(44 + i, Math.floor((val + 1) * 127.5));
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  alarmAudioEl = new Audio(url);
  alarmAudioEl.loop = true;
  alarmAudioEl.volume = 1.0;

  // iOS 需要用户交互后才能播放
  const playPromise = alarmAudioEl.play();
  if (playPromise) {
    playPromise.catch(e => {
      console.log('自动播放被阻止:', e);
    });
  }
}

function stopAlarmSound() {
  if (alarmAudioEl) {
    alarmAudioEl.pause();
    alarmAudioEl.currentTime = 0;
    alarmAudioEl = null;
  }
  if (navigator.vibrate) navigator.vibrate(0);
}

function openEditAppointment(aptId) {
  const apt = DataStore.getAppointment(aptId);
  if (!apt) return;

  // 解析时间
  const timeParts = (apt.timeSlot || '').split('-');
  const startTime = timeParts[0] || '';
  const endTime = timeParts[1] || '';

  Comp.showModal('编辑预约', `
    <div class="form-row">
      <div class="form-group">
        <label>预约项目 *</label>
        <input type="text" id="apt-project" value="${Utils.escapeHtml(apt.styleName || '')}" placeholder="如：猫眼美甲">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>日期</label>
        <input type="date" id="apt-date" value="${apt.date}">
      </div>
      <div class="form-group">
        <label>开始时间</label>
        <input type="time" id="apt-start-time" value="${startTime}">
      </div>
      <div class="form-group">
        <label>结束时间</label>
        <input type="time" id="apt-end-time" value="${endTime}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>状态</label>
        <select id="apt-status">
          <option value="confirmed" ${apt.status==='confirmed'?'selected':''}>进行中</option>
          <option value="completed" ${apt.status==='completed'?'selected':''}>✅ 已完成</option>
          <option value="cancelled" ${apt.status==='cancelled'?'selected':''}>❌ 已取消</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>备注</label>
      <input type="text" id="apt-remark" value="${Utils.escapeHtml(apt.remark || '')}">
    </div>
  `, (overlay) => {
    const project = overlay.querySelector('#apt-project').value.trim();
    const startTime = overlay.querySelector('#apt-start-time').value;
    const endTime = overlay.querySelector('#apt-end-time').value;

    if (!project) { Utils.showToast('请输入预约项目', 'error'); return; }

    const timeSlot = endTime ? `${startTime}-${endTime}` : startTime;

    DataStore.updateAppointment(aptId, {
      customerId: apt.customerId,
      customerName: apt.customerName,
      customerPhone: apt.customerPhone,
      date: overlay.querySelector('#apt-date').value,
      timeSlot: timeSlot,
      styleId: '',
      styleName: project,
      status: overlay.querySelector('#apt-status').value,
      remark: overlay.querySelector('#apt-remark').value.trim()
    });

    overlay.remove();
    Utils.showToast('预约已更新', 'success');
    Router.go('appointments');
  });
}

function deleteAppointment(aptId) {
  Comp.confirm('删除预约', '确定要删除此预约吗？', () => {
    DataStore.deleteAppointment(aptId);
    Utils.showToast('已删除预约', 'success');
    Router.go('appointments');
  });
}

function openQRCodeModal() {
  const canvasId = 'qr-placeholder-' + Date.now();
  Comp.showModal('预约二维码', `
    <div style="text-align:center">
      <canvas id="${canvasId}" width="200" height="200" style="border:1px solid #eee;border-radius:8px"></canvas>
      <p style="margin-top:12px;font-size:14px">顾客扫码后填写预约信息</p>
      <p style="font-size:12px;color:var(--text-muted)">将此二维码打印或展示给顾客扫码</p>
      <button class="btn btn-primary" style="margin-top:12px" onclick="openAppointmentForm()">模拟顾客预约</button>
    </div>
  `, null, { hideSave: true });

  // 绘制二维码占位图
  setTimeout(() => {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const size = 200;
      const moduleCount = 21;
      const moduleSize = size / (moduleCount + 8);
      const offset = 4 * moduleSize;

      // 背景
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);

      // 随机生成二维码图案
      ctx.fillStyle = '#333';
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          // 定位标记
          const isFinder = (row < 7 && col < 7) || (row < 7 && col > moduleCount - 8) || (row > moduleCount - 8 && col < 7);
          if (isFinder) {
            const inOuter = row < 7 && col < 7;
            const finderRow = inOuter ? row : (row > moduleCount - 8 ? row - (moduleCount - 7) : row);
            const finderCol = inOuter ? col : (col > moduleCount - 8 ? col - (moduleCount - 7) : col < 7 ? col : col);
            const isOuter = finderRow === 0 || finderRow === 6 || finderCol === 0 || finderCol === 6;
            const isInner = finderRow >= 2 && finderRow <= 4 && finderCol >= 2 && finderCol <= 4;
            if (isOuter || isInner) {
              ctx.fillRect(offset + col * moduleSize, offset + row * moduleSize, moduleSize, moduleSize);
            }
          } else if (Math.random() > 0.5) {
            ctx.fillRect(offset + col * moduleSize, offset + row * moduleSize, moduleSize, moduleSize);
          }
        }
      }
    }
  }, 100);
}

// --- 款式相关 ---

function setStyleCategory(catId, el) {
  document.querySelectorAll('#style-cat-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  const container = document.querySelector('#style-list')?.closest('.view-dashboard')?.querySelector('#style-list')
    || document.querySelector('#style-list');
  if (container && container.parentElement) {
    container.parentElement._selectedCat = catId;
  }
  renderStyleList();
}

function renderStyleList() {
  const listEl = document.querySelector('#style-list');
  if (!listEl) return;

  const container = listEl.closest('.view-dashboard') || document;
  const catId = listEl.parentElement?._selectedCat || 'all';
  const search = (document.getElementById('style-search')?.value || '').toLowerCase();
  let styles = DataStore.getStyles();

  if (catId !== 'all') {
    styles = styles.filter(s => s.categoryId === catId);
  }
  if (search) {
    styles = styles.filter(s => s.name.toLowerCase().includes(search));
  }

  if (styles.length === 0) {
    listEl.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎨</div><p>暂无款式</p></div>';
    return;
  }

  const categories = DataStore.getStyleCategories();
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c.name; });

  listEl.innerHTML = styles.map(s => `
    <div class="style-card">
      <div class="style-image">
        ${s.image ? `<img src="${s.image}" style="width:100%;height:180px;object-fit:cover">` : '💅'}
      </div>
      <div class="style-info">
        <div class="style-name">${Utils.escapeHtml(s.name)}</div>
        <div class="style-price">${Utils.formatMoney(s.price)}</div>
        <div class="style-meta">
          <span>${Comp.badge(catMap[s.categoryId] || '未分类', 'default')}</span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-outline" onclick="openQuoteForm('${s.id}')">报价</button>
            <button class="btn btn-sm btn-outline" onclick="openStyleForm('${s.id}')">编辑</button>
            <button class="btn btn-sm btn-outline" style="color:var(--danger)" onclick="deleteStyle('${s.id}')">删除</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function openStyleForm(styleId) {
  const style = styleId ? DataStore.getStyle(styleId) : null;
  const categories = DataStore.getStyleCategories();
  const isEdit = !!style;

  Comp.showModal(isEdit ? '编辑款式' : '添加款式', `
    <div class="form-row">
      <div class="form-group">
        <label>款式名称 *</label>
        <input type="text" id="sf-name" value="${Utils.escapeHtml(style?.name || '')}">
      </div>
      <div class="form-group">
        <label>价格 *</label>
        <input type="number" id="sf-price" value="${style?.price || ''}" min="0" step="0.01">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>分类</label>
        <select id="sf-category">
          ${categories.map(c => `<option value="${c.id}" ${style?.categoryId===c.id?'selected':''}>${Utils.escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>来源链接 (抖音/小红书)</label>
        <input type="text" id="sf-url" value="${Utils.escapeHtml(style?.sourceUrl || '')}" placeholder="粘贴链接获取款式信息">
      </div>
    </div>
    <div class="form-group">
      <label>款式图片</label>
      <input type="file" id="sf-image" accept="image/*">
      ${style?.image ? `<img src="${style.image}" class="preview-image">` : ''}
    </div>
    <div class="form-group">
      <label>描述</label>
      <textarea id="sf-desc">${Utils.escapeHtml(style?.description || '')}</textarea>
    </div>
  `, (overlay) => {
    const name = overlay.querySelector('#sf-name').value.trim();
    const price = parseFloat(overlay.querySelector('#sf-price').value) || 0;
    if (!name) { Utils.showToast('请输入款式名称', 'error'); return; }
    if (price <= 0) { Utils.showToast('请输入价格', 'error'); return; }

    const fileInput = overlay.querySelector('#sf-image');
    const processSave = (imageData) => {
      const data = {
        name,
        price,
        categoryId: overlay.querySelector('#sf-category').value,
        sourceUrl: overlay.querySelector('#sf-url').value.trim(),
        description: overlay.querySelector('#sf-desc').value.trim(),
        image: imageData || style?.image || ''
      };

      if (isEdit) {
        DataStore.updateStyle(styleId, data);
        Utils.showToast('款式已更新', 'success');
      } else {
        const s = DataStore.addStyle(data);
        // 自动设为快捷输入
        DataStore.updateStyleQuickInput(s.id);
        Utils.showToast('款式添加成功', 'success');
      }

      overlay.remove();
      Router.go('styles');
    };

    if (fileInput && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => processSave(e.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      processSave('');
    }
  });
}

function deleteStyle(styleId) {
  Comp.confirm('删除款式', '确定要删除这个款式吗？', () => {
    DataStore.deleteStyle(styleId);
    Utils.showToast('已删除款式', 'success');
    Router.go('styles');
  });
}

function openCategoryManager() {
  const categories = DataStore.getStyleCategories();

  Comp.showModal('管理款式分类', `
    <div id="cat-list">
      ${categories.map((c, i) => `
        <div class="form-row" style="align-items:center;margin-bottom:8px">
          <div class="form-group" style="flex:1">
            <input type="text" value="${Utils.escapeHtml(c.name)}" data-cat-id="${c.id}" class="cat-name-input">
          </div>
          <button class="btn btn-sm btn-outline" style="color:var(--danger)" onclick="deleteCategory('${c.id}')">删除</button>
        </div>
      `).join('')}
    </div>
    <div class="form-row" style="margin-top:12px">
      <div class="form-group" style="flex:1">
        <input type="text" id="new-cat-name" placeholder="新分类名称">
      </div>
      <button class="btn btn-primary btn-sm" onclick="addCategory()">添加</button>
    </div>
  `, (overlay) => {
    // 保存所有分类名
    const inputs = overlay.querySelectorAll('.cat-name-input');
    inputs.forEach(input => {
      const id = input.dataset.catId;
      const name = input.value.trim();
      if (name) {
        DataStore.updateStyleCategory(id, { name });
      }
    });
    overlay.remove();
    Utils.showToast('分类已更新', 'success');
    Router.go('styles');
  });
}

function addCategory() {
  const input = document.querySelector('#new-cat-name');
  if (!input || !input.value.trim()) return;
  DataStore.addStyleCategory(input.value.trim());
  input.value = '';
  // 重新打开分类管理器
  document.querySelector('.modal-overlay')?.remove();
  openCategoryManager();
}

function deleteCategory(catId) {
  Comp.confirm('删除分类', '确定要删除此分类吗？（款式不会删除）', () => {
    DataStore.deleteStyleCategory(catId);
    document.querySelector('.modal-overlay')?.remove();
    openCategoryManager();
  });
}

function openQuoteForm(styleId) {
  const style = DataStore.getStyle(styleId);
  if (!style) return;
  const customers = DataStore.getCustomers();
  const settings = DataStore.getSettings();

  Comp.showModal(`报价 - ${style.name}`, `
    <div class="form-group">
      <label>款式: ${Utils.escapeHtml(style.name)} | 标准价: ${Utils.formatMoney(style.price)}</label>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>选择顾客 (可选)</label>
        <select id="qt-customer">
          <option value="">-- 选择顾客 --</option>
          ${customers.map(c => `<option value="${c.id}" data-name="${Utils.escapeHtml(c.name)}">${Utils.escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>或输入顾客名</label>
        <input type="text" id="qt-cust-name" placeholder="顾客姓名">
      </div>
    </div>
    <div class="form-group">
      <label>报价金额</label>
      <div class="price-chips" style="margin-bottom:8px">
        ${settings.quickPriceInputs.map(p => `<span class="price-chip" onclick="document.getElementById('qt-price').value=${p}">${Utils.formatMoney(p)}</span>`).join('')}
      </div>
      <input type="number" id="qt-price" value="${style.price}" min="0" step="0.01">
    </div>
    <div id="qt-result" style="margin-top:12px;padding:12px;background:#f8f9fa;border-radius:8px;font-size:13px;display:none"></div>
  `, null, { hideSave: true });

  // 添加生成报价按钮
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      const genBtn = document.createElement('button');
      genBtn.className = 'btn btn-primary';
      genBtn.textContent = '生成报价文案';
      genBtn.onclick = () => {
        const custSelect = document.querySelector('#qt-customer');
        let custName = document.querySelector('#qt-cust-name').value.trim();
        if (custSelect && custSelect.value && !custName) {
          custName = custSelect.selectedOptions[0].dataset.name;
        }
        const price = document.querySelector('#qt-price').value;
        const text = `${custName ? custName + '您好，' : ''}${style.name}款式报价${Utils.formatMoney(parseFloat(price)||style.price)}${custName ? '，预约请回复时间~' : ''}`;
        const result = document.querySelector('#qt-result');
        if (result) {
          result.style.display = 'block';
          result.innerHTML = `<strong>报价文案：</strong><br>${Utils.escapeHtml(text)}<br><button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="Utils.copyToClipboard('${text.replace(/'/g, "\\'")}').then(()=>Utils.showToast('已复制报价文案','success'))">📋 一键复制</button>`;
        }
      };
      footer.appendChild(genBtn);
    }
  }, 100);
}

// --- 财务管理相关 ---

function openExpenseForm() {
  const settings = DataStore.getSettings();

  Comp.showModal('记录支出', `
    <div class="form-row">
      <div class="form-group">
        <label>支出类目</label>
        <select id="exp-category">
          ${settings.expenseCategories.map(c => `<option value="${Utils.escapeHtml(c)}">${Utils.escapeHtml(c)}</option>`).join('')}
          <option value="其他">其他</option>
        </select>
      </div>
      <div class="form-group">
        <label>金额 *</label>
        <input type="number" id="exp-amount" min="0" step="0.01" placeholder="0">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>日期</label>
        <input type="date" id="exp-date" value="${Utils.today()}">
      </div>
    </div>
    <div class="form-group">
      <label>详细说明</label>
      <input type="text" id="exp-detail" placeholder="如：甲油胶×5瓶">
    </div>
    <div class="form-group">
      <label>备注</label>
      <input type="text" id="exp-remark" placeholder="备注">
    </div>
  `, (overlay) => {
    const amount = parseFloat(overlay.querySelector('#exp-amount').value) || 0;
    if (amount <= 0) { Utils.showToast('请输入支出金额', 'error'); return; }

    DataStore.addExpense({
      amount,
      expenseCategory: overlay.querySelector('#exp-category').value,
      expenseDetail: overlay.querySelector('#exp-detail').value.trim(),
      remark: overlay.querySelector('#exp-remark').value.trim(),
      date: overlay.querySelector('#exp-date').value
    });

    overlay.remove();
    Utils.showToast('支出记录成功', 'success');
    Router.go('finance');
  });
}

function openIncomeForm() {
  Comp.showModal('记录收入', `
    <div class="form-row">
      <div class="form-group">
        <label>收入类目</label>
        <select id="inc-category">
          <option value="定金">💎 定金</option>
          <option value="手部美甲项目">💅 手部美甲项目</option>
          <option value="足部美甲项目">🦶 足部美甲项目</option>
          <option value="美睫项目">👁️ 美睫项目</option>
          <option value="美团订单">🟡 美团订单</option>
          <option value="抖音订单">🎵 抖音订单</option>
          <option value="卖产品">卖产品（甲油胶/饰品等）</option>
          <option value="茶水费">茶水/小吃</option>
          <option value="培训费">培训/教学</option>
          <option value="其他收入">其他收入</option>
        </select>
      </div>
      <div class="form-group">
        <label>金额 *</label>
        <input type="number" id="inc-amount" min="0" step="0.01" placeholder="0">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>支付方式</label>
        <select id="inc-payment">
          <option value="wechat">微信</option>
          <option value="alipay">支付宝</option>
          <option value="cash">现金</option>
          <option value="card">银行卡</option>
        </select>
      </div>
      <div class="form-group">
        <label>日期</label>
        <input type="date" id="inc-date" value="${Utils.today()}">
      </div>
    </div>
    <div class="form-group">
      <label>详细说明</label>
      <input type="text" id="inc-detail" placeholder="如：甲油胶×3瓶">
    </div>
    <div class="form-group">
      <label>备注</label>
      <input type="text" id="inc-remark" placeholder="备注">
    </div>
  `, (overlay) => {
    const amount = parseFloat(overlay.querySelector('#inc-amount').value) || 0;
    if (amount <= 0) { Utils.showToast('请输入收入金额', 'error'); return; }

    DataStore.addIncome({
      amount,
      incomeCategory: overlay.querySelector('#inc-category').value,
      incomeDetail: overlay.querySelector('#inc-detail').value.trim(),
      paymentMethod: overlay.querySelector('#inc-payment').value,
      remark: overlay.querySelector('#inc-remark').value.trim(),
      date: overlay.querySelector('#inc-date').value
    });

    overlay.remove();
    Utils.showToast('收入记录成功', 'success');
    Router.go('finance');
  });
}

function deleteTransaction(txnId) {
  Comp.confirm('删除记录', '确定要删除此条记录吗？', () => {
    DataStore.deleteTransaction(txnId);
    Utils.showToast('已删除记录', 'success');
    Router.go('finance');
  });
}

// --- 营销管理半年切换 ---

function switchHalfYear(half) {
  const h1 = document.getElementById('half-chart-h1');
  const h2 = document.getElementById('half-chart-h2');
  const btn1 = document.getElementById('half-btn-h1');
  const btn2 = document.getElementById('half-btn-h2');

  if (half === 'h1') {
    h1.style.display = 'flex';
    h2.style.display = 'none';
    btn1.style.background = 'var(--primary)';
    btn1.style.color = '#fff';
    btn2.style.background = 'transparent';
    btn2.style.color = 'var(--text)';
  } else {
    h1.style.display = 'none';
    h2.style.display = 'flex';
    btn2.style.background = 'var(--primary)';
    btn2.style.color = '#fff';
    btn1.style.background = 'transparent';
    btn1.style.color = 'var(--text)';
  }
}

// --- 积分相关 ---

function switchPointsTab(tabName, el) {
  document.querySelectorAll('#points-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['records', 'tasks', 'gifts'].forEach(t => {
    const panel = document.getElementById('points-tab-' + t);
    if (panel) panel.style.display = t === tabName ? 'block' : 'none';
  });
}

function openGiftForm() {
  Comp.showModal('添加礼物', `
    <div class="form-row">
      <div class="form-group">
        <label>礼物名称 *</label>
        <input type="text" id="gf-name">
      </div>
      <div class="form-group">
        <label>所需积分 *</label>
        <input type="number" id="gf-points" min="1">
      </div>
    </div>
    <div class="form-group">
      <label>库存数量</label>
      <input type="number" id="gf-stock" value="1" min="0">
    </div>
  `, (overlay) => {
    const name = overlay.querySelector('#gf-name').value.trim();
    const points = parseInt(overlay.querySelector('#gf-points').value) || 0;
    if (!name) { Utils.showToast('请输入礼物名称', 'error'); return; }
    if (points <= 0) { Utils.showToast('请输入所需积分', 'error'); return; }

    DataStore.addGift({
      name,
      pointsCost: points,
      stock: parseInt(overlay.querySelector('#gf-stock').value) || 0
    });

    overlay.remove();
    Utils.showToast('礼物添加成功', 'success');
    Router.go('points');
  });
}

function openExchangeGift(giftId) {
  const gift = DataStore.getGifts().find(g => g.id === giftId);
  if (!gift) return;
  const customers = DataStore.getCustomers().filter(c => (c.totalPoints - c.usedPoints) >= gift.pointsCost);

  if (customers.length === 0) {
    Utils.showToast('没有顾客积分达到兑换要求', 'warning');
    return;
  }

  Comp.showModal(`兑换 - ${gift.name} (${gift.pointsCost}积分)`, `
    <div class="form-group">
      <label>选择顾客</label>
      <select id="ex-customer">
        ${customers.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)} - 可用积分: ${c.totalPoints - c.usedPoints}</option>`).join('')}
      </select>
    </div>
    <p style="font-size:12px;color:var(--text-muted)">消耗 ${gift.pointsCost} 积分，库存剩余 ${gift.stock}</p>
  `, (overlay) => {
    const customerId = overlay.querySelector('#ex-customer').value;
    const result = DataStore.exchangeGift(customerId, giftId);
    if (result) {
      overlay.remove();
      Utils.showToast('兑换成功', 'success');
      Router.go('points');
    } else {
      Utils.showToast('兑换失败，积分不足或库存不足', 'error');
    }
  });
}

// --- 设置相关 ---

function saveBasicSettings() {
  const name = document.getElementById('set-shop-name').value.trim();
  const pointsPerYuan = parseFloat(document.getElementById('set-points-per-yuan').value) || 0;
  const balanceWarn = parseFloat(document.getElementById('set-balance-warn').value) || 0;
  const pointsExch = parseInt(document.getElementById('set-points-exch').value) || 0;
  const birthdayDouble = document.getElementById('set-birthday-double').checked;

  DataStore.updateSettings({
    shopName: name || '歪歪美甲工作室',
    pointsPerYuan,
    balanceWarningThreshold: balanceWarn,
    pointsExchangeThreshold: pointsExch,
    birthdayDoublePoints: birthdayDouble
  });

  Utils.showToast('设置已保存', 'success');
  Router.go('settings');
}

function saveNotificationTemplates() {
  const templates = {};
  document.querySelectorAll('.notif-tmpl').forEach(input => {
    templates[input.dataset.key] = input.value;
  });

  const settings = DataStore.getSettings();
  settings.notificationTemplates = templates;
  DataStore._save('settings', settings);

  Utils.showToast('通知模板已保存', 'success');
}

function addQuickPrice() {
  const input = document.getElementById('new-quick-price');
  const val = parseFloat(input.value);
  if (!val || val <= 0) return;

  const settings = DataStore.getSettings();
  if (!settings.quickPriceInputs.includes(val)) {
    settings.quickPriceInputs.push(val);
    settings.quickPriceInputs.sort((a, b) => a - b);
    DataStore._save('settings', settings);
  }

  input.value = '';
  Router.go('settings');
}

function removeQuickPrice(price) {
  const settings = DataStore.getSettings();
  settings.quickPriceInputs = settings.quickPriceInputs.filter(p => p !== price);
  DataStore._save('settings', settings);
  Router.go('settings');
}

// --- 数据导入导出 ---

function exportAllData() {
  const data = DataStore.exportAll();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `歪歪美甲工作室数据备份_${Utils.today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  Utils.showToast('数据已导出', 'success');
}

function importAllData(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  Comp.confirm('导入数据', '导入将<strong>覆盖</strong>当前所有数据，建议先导出备份。确定继续？', () => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        DataStore.importAll(data, 'overwrite');
        Utils.showToast('数据导入成功', 'success');
        Router.go('dashboard');
      } catch (err) {
        Utils.showToast('导入失败：JSON格式错误', 'error');
      }
    };
    reader.readAsText(file);
  });

  fileInput.value = '';
}

// --- 通知相关 ---

function copyNotification(notifId) {
  const notifs = DataStore.getNotifications();
  const n = notifs.find(x => x.id === notifId);
  if (!n) return;

  Utils.copyToClipboard(n.copyText).then(() => {
    DataStore.markNotificationRead(notifId);
    Utils.showToast('已复制通知文案，去微信粘贴发送', 'success');
  });
}

/**
 * 通过手机发送通知给顾客
 * @param {string} notifId - 通知ID
 * @param {string} channel - 'sms' 或 'wechat'
 */
function sendToCustomerPhone(notifId) {
  const notifs = DataStore.getNotifications();
  const n = notifs.find(x => x.id === notifId);
  if (!n || !n.customerPhone) {
    Utils.showToast('该通知没有顾客手机号', 'error');
    return;
  }

  const shopName = DataStore.getSettings().shopName || '歪歪美甲工作室';
  const fullText = `【${shopName}】${n.copyText}`;

  Utils.copyToClipboard(fullText).catch(() => {});

  // 直接打开短信App，自动填入手机号和内容
  const smsUrl = `sms:${n.customerPhone}?body=${encodeURIComponent(fullText)}`;
  const a = document.createElement('a');
  a.href = smsUrl;
  a.target = '_blank';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  DataStore.markNotificationRead(notifId);
  Utils.showToast(`正在打开短信发送给 ${n.customerName}...`, 'info');
}

/**
 * 从首页看板直接发送预警给顾客
 */
function sendWarningToCustomer(customerId, name, phone, balance, passCardType, passCardCount) {
  const shopName = DataStore.getSettings().shopName || '歪歪美甲工作室';
  let text = `【${shopName}】${name}您好，`;

  if (balance > 0 && balance < 100) {
    text += `您的储值卡余额仅剩${Utils.formatMoney(balance)}，建议及时充值~`;
  } else if (passCardType && passCardCount !== undefined) {
    text += `您的${passCardType}剩余${passCardCount}次，建议及时续卡~`;
  } else {
    text += `温馨提醒您关注账户余额~`;
  }

  text += `回复预约或咨询新款~`;

  Utils.copyToClipboard(text).catch(() => {});

  // 直接打开短信App，自动填入手机号和内容
  const smsUrl = `sms:${phone}?body=${encodeURIComponent(text)}`;
  const a = document.createElement('a');
  a.href = smsUrl;
  a.target = '_blank';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  Utils.showToast(`正在打开短信发送给 ${name}`, 'info');
}
