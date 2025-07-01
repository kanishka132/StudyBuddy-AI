export class DashboardManager {
  constructor(databaseManager, authManager) {
    this.database = databaseManager;
    this.auth = authManager;
    this.materials = [];
    this.quizzes = [];
    this.events = [];
    this.todos = [];
    this.stats = {
      materials: 0,
      summaries: 0,
      quizzes: 0
    };
    
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    // Quick Actions - Remove create quiz button
    this.addEventBtn = document.getElementById('add-event-btn');
    this.addTodoBtn = document.getElementById('add-todo-btn');
    
    // Modals - Remove quiz modal
    this.eventModal = document.getElementById('event-modal');
    this.todoModal = document.getElementById('todo-modal');
    
    // Forms - Remove quiz form
    this.eventForm = document.getElementById('event-form');
    this.todoForm = document.getElementById('todo-form');
    
    // Stats
    this.materialsCountEl = document.getElementById('materials-count');
    this.summariesCountEl = document.getElementById('summaries-count');
    this.quizzesCountEl = document.getElementById('quizzes-count');
    
    // Recent Activity
    this.recentActivityEl = document.getElementById('recent-activity');
    
    // User dropdown
    this.userAvatarDropdown = document.getElementById('user-avatar-dropdown');
    this.dropdownMenu = document.getElementById('dropdown-menu');
    this.accountInfoBtn = document.getElementById('account-info-btn');
    this.logoutBtn = document.getElementById('logout-btn');
  }

  attachEventListeners() {
    // Quick Actions - Remove quiz creation
    this.addEventBtn.addEventListener('click', () => this.showEventModal());
    this.addTodoBtn.addEventListener('click', () => this.showTodoModal());
    
    // Event Modal
    this.eventForm.addEventListener('submit', (e) => this.handleCreateEvent(e));
    document.getElementById('close-event-modal').addEventListener('click', () => this.hideEventModal());
    document.getElementById('cancel-event').addEventListener('click', () => this.hideEventModal());
    
    // Todo Modal
    this.todoForm.addEventListener('submit', (e) => this.handleCreateTodo(e));
    document.getElementById('close-todo-modal').addEventListener('click', () => this.hideTodoModal());
    document.getElementById('cancel-todo').addEventListener('click', () => this.hideTodoModal());
    
    // User dropdown
    this.userAvatarDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });
    
    // Account actions
    this.accountInfoBtn.addEventListener('click', () => {
      this.hideDropdown();
      this.showAccountInfo();
    });
    
    this.logoutBtn.addEventListener('click', () => {
      this.hideDropdown();
      this.handleLogout();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      this.hideDropdown();
    });
    
    // Modal outside click - Remove quiz modal
    this.eventModal.addEventListener('click', (e) => {
      if (e.target === this.eventModal) this.hideEventModal();
    });
    this.todoModal.addEventListener('click', (e) => {
      if (e.target === this.todoModal) this.hideTodoModal();
    });
  }

  // Dropdown Methods
  toggleDropdown() {
    const userDropdown = document.querySelector('.user-dropdown');
    userDropdown.classList.toggle('active');
  }

  hideDropdown() {
    const userDropdown = document.querySelector('.user-dropdown');
    userDropdown.classList.remove('active');
  }

  // Event Methods
  showEventModal() {
    this.eventModal.classList.add('active');
    // Set default date to today
    document.getElementById('event-date').value = new Date().toISOString().split('T')[0];
    // Set default time to current hour
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    document.getElementById('event-time').value = currentTime;
  }

  hideEventModal() {
    this.eventModal.classList.remove('active');
    this.eventForm.reset();
  }

  async handleCreateEvent(e) {
    e.preventDefault();
    
    const user = this.auth.getCurrentUser();
    if (!user) return;

    const title = document.getElementById('event-title').value.trim();
    const description = document.getElementById('event-description').value.trim();
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const duration = parseInt(document.getElementById('event-duration').value);

    if (!title || !date || !time) {
      this.showErrorMessage('Please fill in all required fields.');
      return;
    }

    this.showLoading();

    try {
      const eventData = { title, description, date, time, duration };
      const result = await this.database.saveEvent(user.id, eventData);
      
      if (result.success) {
        this.events.unshift({
          ...eventData,
          created_at: new Date().toISOString()
        });
        
        this.addRecentActivity('event', `Scheduled: ${title}`);
        this.hideEventModal();
        this.showSuccessMessage('Event added successfully!');
      } else {
        this.showErrorMessage('Failed to create event. Please try again.');
      }
    } catch (error) {
      console.error('Event creation error:', error);
      this.showErrorMessage('Failed to create event. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  // Todo Methods
  showTodoModal() {
    this.todoModal.classList.add('active');
  }

  hideTodoModal() {
    this.todoModal.classList.remove('active');
    this.todoForm.reset();
  }

  async handleCreateTodo(e) {
    e.preventDefault();
    
    const user = this.auth.getCurrentUser();
    if (!user) return;

    const task = document.getElementById('todo-task').value.trim();
    const priority = document.getElementById('todo-priority').value;

    if (!task) {
      this.showErrorMessage('Please enter a task description.');
      return;
    }

    this.showLoading();

    try {
      const todoData = { task, priority, completed: false };
      const result = await this.database.saveTodo(user.id, todoData);
      
      if (result.success) {
        this.todos.unshift({
          ...todoData,
          id: result.data.id,
          created_at: new Date().toISOString()
        });
        
        this.addRecentActivity('todo', `Added task: ${task}`);
        this.hideTodoModal();
        this.showSuccessMessage('Task added successfully!');
      } else {
        this.showErrorMessage('Failed to add task. Please try again.');
      }
    } catch (error) {
      console.error('Todo creation error:', error);
      this.showErrorMessage('Failed to add task. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  // Data Loading Methods
  async loadUserData() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    try {
      // Load materials
      const materialsResult = await this.database.getUserMaterials(user.id);
      if (materialsResult.success) {
        this.materials = materialsResult.data || [];
      }

      // Load quizzes
      const quizzesResult = await this.database.getUserQuizzes(user.id);
      if (quizzesResult.success) {
        this.quizzes = quizzesResult.data || [];
      }

      // Load events
      const eventsResult = await this.database.getUserEvents(user.id);
      if (eventsResult.success) {
        this.events = eventsResult.data || [];
      }

      // Load todos
      const todosResult = await this.database.getUserTodos(user.id);
      if (todosResult.success) {
        this.todos = todosResult.data || [];
      }

      this.updateStats();
      this.updateRecentActivity();
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  // Stats Methods
  updateStats() {
    this.stats.materials = this.materials.length;
    this.stats.summaries = 0; // Placeholder for future feature
    this.stats.quizzes = this.quizzes.length;

    if (this.materialsCountEl) this.materialsCountEl.textContent = this.stats.materials;
    if (this.summariesCountEl) this.summariesCountEl.textContent = this.stats.summaries;
    if (this.quizzesCountEl) this.quizzesCountEl.textContent = this.stats.quizzes;
  }

  // Recent Activity Methods
  addRecentActivity(type, description) {
    const activity = {
      type,
      description,
      timestamp: new Date().toISOString()
    };

    // Add to beginning of array and limit to 5 items
    this.recentActivities = this.recentActivities || [];
    this.recentActivities.unshift(activity);
    this.recentActivities = this.recentActivities.slice(0, 5);

    this.updateRecentActivity();
  }

  updateRecentActivity() {
    if (!this.recentActivityEl) return;

    const activities = this.recentActivities || [];

    if (activities.length === 0) {
      this.recentActivityEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h4>No recent activity</h4>
          <p>Start by uploading your first study material in the Materials tab</p>
        </div>
      `;
      return;
    }

    const activitiesHTML = activities.map(activity => {
      const icon = this.getActivityIcon(activity.type);
      const timeAgo = this.getTimeAgo(activity.timestamp);

      return `
        <div class="activity-item">
          <div class="activity-icon">${icon}</div>
          <div class="activity-content">
            <div class="activity-description">${activity.description}</div>
            <div class="activity-time">${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');

    this.recentActivityEl.innerHTML = activitiesHTML;
  }

  getActivityIcon(type) {
    const icons = {
      upload: '📁',
      quiz: '🧠',
      event: '📅',
      todo: '✅'
    };
    return icons[type] || '📋';
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }

  // Account Info Methods
  async showAccountInfo() {
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!userProfile || !currentUser) return;

    const modal = document.getElementById('account-modal');
    const content = document.getElementById('account-info-content');

    const goalsHtml = userProfile.goals && userProfile.goals.length > 0 
      ? userProfile.goals.map(goal => `<span class="goal-tag">${goal.replace('-', ' ')}</span>`).join('')
      : '<span class="goal-tag">No goals set</span>';

    content.innerHTML = `
      <div class="account-info-grid">
        <div class="account-info-item">
          <div class="account-info-label">Display Name</div>
          <div class="account-info-value">${userProfile.display_name}</div>
        </div>
        <div class="account-info-item">
          <div class="account-info-label">Email</div>
          <div class="account-info-value">${currentUser.email}</div>
        </div>
        <div class="account-info-item">
          <div class="account-info-label">Avatar</div>
          <div class="account-info-value" style="font-size: 24px;">${userProfile.avatar}</div>
        </div>
        <div class="account-info-item">
          <div class="account-info-label">Education Level</div>
          <div class="account-info-value">${userProfile.education.replace('-', ' ')}</div>
        </div>
        <div class="account-info-item">
          <div class="account-info-label">Learning Goals</div>
          <div class="account-goals">${goalsHtml}</div>
        </div>
        ${userProfile.custom_goal ? `
        <div class="account-info-item">
          <div class="account-info-label">Custom Goal</div>
          <div class="account-info-value">${userProfile.custom_goal}</div>
        </div>
        ` : ''}
      </div>
    `;

    modal.classList.add('active');
  }

  // Utility Methods
  showLoading() {
    document.getElementById('loading-spinner').classList.add('active');
  }

  hideLoading() {
    document.getElementById('loading-spinner').classList.remove('active');
  }

  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .auth-error');
    existingMessages.forEach(msg => msg.remove());

    const messageEl = document.createElement('div');
    messageEl.className = type === 'success' ? 'success-message' : 'auth-error';
    messageEl.textContent = message;
    
    // Insert at the top of dashboard main
    const dashboardMain = document.querySelector('.dashboard-main');
    if (dashboardMain) {
      dashboardMain.insertBefore(messageEl, dashboardMain.firstChild);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.remove();
        }
      }, 5000);
    }
  }

  async handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;

    try {
      await this.auth.signOut();
      localStorage.removeItem('currentUser');
      localStorage.removeItem('userProfile');
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      this.showErrorMessage('Failed to logout. Please try again.');
    }
  }

  initializeDashboard(userProfile) {
    if (userProfile) {
      const userAvatar = document.getElementById('user-avatar');
      const welcomeTitle = document.getElementById('welcome-title');
      
      if (userAvatar) userAvatar.textContent = userProfile.avatar;
      if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${userProfile.display_name}!`;
    }

    // Load all user data
    this.loadUserData();
  }
}

// Make dashboardManager globally available for onclick handlers
window.dashboardManager = null;