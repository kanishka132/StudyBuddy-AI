export class PlannerManager {
  constructor(databaseManager, authManager) {
    this.database = databaseManager;
    this.auth = authManager;
    this.events = [];
    this.todos = [];
    
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    // Calendar content
    this.calendarContent = document.getElementById('calendar-content');
    this.todosContent = document.getElementById('todos-content');
    
    // Planner tabs
    this.plannerTabs = document.querySelectorAll('.planner-tab');
  }

  attachEventListeners() {
    // Tab switching is handled by NavigationManager
    // We just need to listen for when planner tab becomes active
  }

  async loadUserData() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    try {
      // Load events
      const eventsResult = await this.database.getUserEvents(user.id);
      if (eventsResult.success) {
        this.events = eventsResult.data || [];
        this.renderTodos(); // Render todos first since calendar is handled by CalendarManager
      }

      // Load todos
      const todosResult = await this.database.getUserTodos(user.id);
      if (todosResult.success) {
        this.todos = todosResult.data || [];
        this.renderTodos();
      }
    } catch (error) {
      console.error('Error loading planner data:', error);
    }
  }

  getPriorityColor(priority) {
    switch (priority) {
      case 'high':
        return 'var(--error-500)'; // Red
      case 'medium':
        return 'var(--warning-500)'; // Yellow
      case 'low':
        return '#8B5CF6'; // Purple
      default:
        return 'var(--warning-500)'; // Default to medium (yellow)
    }
  }

  getPriorityLabel(priority) {
    switch (priority) {
      case 'high':
        return 'High Priority';
      case 'medium':
        return 'Medium Priority';
      case 'low':
        return 'Low Priority';
      default:
        return 'Medium Priority';
    }
  }

  renderTodos() {
    if (!this.todosContent) return;

    if (this.todos.length === 0) {
      this.todosContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <h4>No tasks yet</h4>
          <p>Add your first task to stay organized</p>
        </div>
      `;
      return;
    }

    // Separate completed and pending todos
    const pendingTodos = this.todos.filter(todo => !todo.completed);
    const completedTodos = this.todos.filter(todo => todo.completed);

    const renderTodoList = (todos, title, emptyMessage) => {
      if (todos.length === 0) {
        return `
          <div class="todos-section">
            <h4 class="todos-section-title">${title}</h4>
            <div class="empty-todos">${emptyMessage}</div>
          </div>
        `;
      }

      const todosHTML = todos.map(todo => {
        const priorityColor = this.getPriorityColor(todo.priority);
        const priorityLabel = this.getPriorityLabel(todo.priority);
        
        return `
          <div class="todo-item ${todo.completed ? 'completed' : ''}" data-priority="${todo.priority}">
            <input 
              type="checkbox" 
              class="todo-checkbox" 
              ${todo.completed ? 'checked' : ''} 
              onchange="plannerManager.toggleTodo('${todo.id}', this.checked)"
            >
            <div class="todo-content">
              <div class="todo-task">${todo.task}</div>
              <div class="todo-meta">
                <span class="todo-priority" style="color: ${priorityColor}; font-weight: 600;">
                  ${priorityLabel}
                </span>
                <span class="todo-date">
                  ${new Date(todo.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button 
              class="todo-delete" 
              onclick="plannerManager.deleteTodo('${todo.id}')"
              title="Delete task"
            >
              🗑️
            </button>
          </div>
        `;
      }).join('');

      return `
        <div class="todos-section">
          <h4 class="todos-section-title">${title} (${todos.length})</h4>
          <div class="todos-list">
            ${todosHTML}
          </div>
        </div>
      `;
    };

    this.todosContent.innerHTML = `
      <div class="todos-view">
        ${renderTodoList(pendingTodos, 'Pending Tasks', 'No pending tasks')}
        ${renderTodoList(completedTodos, 'Completed Tasks', 'No completed tasks')}
      </div>
    `;
  }

  async toggleTodo(todoId, completed) {
    try {
      const result = await this.database.updateTodoStatus(todoId, completed);
      
      if (result.success) {
        // Update local data
        const todoIndex = this.todos.findIndex(t => t.id === todoId);
        if (todoIndex !== -1) {
          this.todos[todoIndex].completed = completed;
        }
        
        // Re-render todos
        this.renderTodos();
      } else {
        this.showErrorMessage('Failed to update task status');
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
      this.showErrorMessage('Failed to update task status');
    }
  }

  async deleteTodo(todoId) {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const result = await this.database.deleteTodo(todoId);
      
      if (result.success) {
        // Remove from local data
        this.todos = this.todos.filter(t => t.id !== todoId);
        
        // Re-render todos
        this.renderTodos();
        this.showSuccessMessage('Task deleted successfully');
      } else {
        this.showErrorMessage('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      this.showErrorMessage('Failed to delete task');
    }
  }

  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    const existingMessages = document.querySelectorAll('.success-message, .auth-error');
    existingMessages.forEach(msg => msg.remove());

    const messageEl = document.createElement('div');
    messageEl.className = type === 'success' ? 'success-message' : 'auth-error';
    messageEl.textContent = message;
    
    const pageContainer = document.querySelector('.page-container');
    if (pageContainer) {
      pageContainer.insertBefore(messageEl, pageContainer.firstChild);
      
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.remove();
        }
      }, 5000);
    }
  }
}

// Make plannerManager globally available
window.plannerManager = null;