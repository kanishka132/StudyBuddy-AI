export class CalendarManager {
  constructor(databaseManager, authManager) {
    this.database = databaseManager;
    this.auth = authManager;
    this.events = [];
    this.currentDate = new Date();
    this.currentView = 'week'; // week, day, month
    this.timeSlots = this.generateTimeSlots();
    this.currentViewingEvent = null;
    
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.calendarContainer = document.getElementById('calendar-container');
    this.calendarHeader = document.getElementById('calendar-header');
    this.calendarGrid = document.getElementById('calendar-grid');
    this.todayBtn = document.getElementById('today-btn');
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.viewSelector = document.getElementById('view-selector');
    this.currentDateDisplay = document.getElementById('current-date-display');

    // Create event details modal
    this.createEventDetailsModal();
  }

  createEventDetailsModal() {
    // Create event details modal if it doesn't exist
    let modal = document.getElementById('event-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'event-details-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Event Details</h3>
            <button id="close-event-details-modal" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div id="event-details-content">
              <!-- Event details will be populated here -->
            </div>
            <div class="modal-actions">
              <button type="button" id="edit-event-btn" class="btn btn-secondary">Edit</button>
              <button type="button" id="delete-event-btn" class="btn btn-ghost" style="color: var(--error-500);">Delete</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  }

  attachEventListeners() {
    if (this.todayBtn) {
      this.todayBtn.addEventListener('click', () => this.goToToday());
    }
    
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.navigatePrevious());
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.navigateNext());
    }
    
    if (this.viewSelector) {
      this.viewSelector.addEventListener('change', (e) => this.changeView(e.target.value));
    }

    // Event details modal listeners
    document.getElementById('close-event-details-modal')?.addEventListener('click', () => this.hideEventDetailsModal());
    document.getElementById('edit-event-btn')?.addEventListener('click', () => this.editEvent());
    document.getElementById('delete-event-btn')?.addEventListener('click', () => this.deleteEvent());

    // Modal outside click
    document.getElementById('event-details-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'event-details-modal') this.hideEventDetailsModal();
    });
  }

  generateTimeSlots() {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      const displayTime = this.formatTimeDisplay(hour, 0);
      slots.push({ time, displayTime, hour, minute: 0 });
    }
    return slots;
  }

  formatTimeDisplay(hour, minute) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  async loadUserEvents() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    try {
      const result = await this.database.getUserEvents(user.id);
      if (result.success) {
        this.events = result.data || [];
        this.renderCalendar();
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }

  renderCalendar() {
    this.updateDateDisplay();
    
    switch (this.currentView) {
      case 'week':
        this.renderWeekView();
        break;
      case 'day':
        this.renderDayView();
        break;
      case 'month':
        this.renderMonthView();
        break;
    }
  }

  updateDateDisplay() {
    if (!this.currentDateDisplay) return;
    
    const options = { 
      year: 'numeric', 
      month: 'long',
      ...(this.currentView === 'day' && { day: 'numeric' })
    };
    
    if (this.currentView === 'week') {
      const weekStart = this.getWeekStart(this.currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        this.currentDateDisplay.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      } else {
        this.currentDateDisplay.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
      }
    } else {
      this.currentDateDisplay.textContent = this.currentDate.toLocaleDateString('en-US', options);
    }
  }

  renderWeekView() {
    if (!this.calendarGrid) return;

    const weekStart = this.getWeekStart(this.currentDate);
    const weekDays = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      weekDays.push(day);
    }

    // Create the new compact layout
    const calendarHTML = `
      <div class="calendar-compact-view">
        <div class="calendar-header-row">
          <div class="time-column-header"></div>
          ${weekDays.map(day => `
            <div class="day-header-compact ${this.isToday(day) ? 'today' : ''}">
              <div class="day-name-compact">${day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div class="day-number-compact">${day.getDate()}</div>
            </div>
          `).join('')}
        </div>
        <div class="calendar-body-compact">
          <div class="time-labels-column">
            ${this.timeSlots.map(slot => `
              <div class="time-label-compact">
                <span class="time-text">${slot.displayTime}</span>
              </div>
            `).join('')}
          </div>
          ${weekDays.map((day, dayIndex) => `
            <div class="day-column" data-date="${day.toISOString().split('T')[0]}">
              ${this.renderDayEvents(day)}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.calendarGrid.innerHTML = calendarHTML;
  }

  renderDayView() {
    if (!this.calendarGrid) return;

    const calendarHTML = `
      <div class="calendar-compact-view">
        <div class="calendar-header-row">
          <div class="time-column-header"></div>
          <div class="day-header-compact today">
            <div class="day-name-compact">${this.currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</div>
            <div class="day-number-compact">${this.currentDate.getDate()}</div>
          </div>
        </div>
        <div class="calendar-body-compact">
          <div class="time-labels-column">
            ${this.timeSlots.map(slot => `
              <div class="time-label-compact">
                <span class="time-text">${slot.displayTime}</span>
              </div>
            `).join('')}
          </div>
          <div class="day-column" data-date="${this.currentDate.toISOString().split('T')[0]}">
            ${this.renderDayEvents(this.currentDate)}
          </div>
        </div>
      </div>
    `;

    this.calendarGrid.innerHTML = calendarHTML;
  }

  renderDayEvents(date) {
    const dayEvents = this.getEventsForDate(date);
    const hourHeight = 60; // Height of each hour slot in pixels
    
    return dayEvents.map(event => {
      const startTime = event.event_time;
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const duration = event.duration || 60;
      
      // Calculate position and height
      const top = (startMinutes / 60) * hourHeight;
      const height = Math.max((duration / 60) * hourHeight, 30); // Minimum height of 30px
      
      const eventClass = this.getEventTypeClass(event);
      
      return `
        <div class="calendar-event-item ${eventClass}" 
             style="top: ${top}px; height: ${height}px;"
             onclick="event.stopPropagation(); calendarManager.showEventDetails('${event.id}')"
             title="${event.title}${event.description ? ' - ' + event.description : ''}">
          <div class="event-title-compact">${event.title}</div>
          <div class="event-time-compact">${this.formatEventTimeCompact(event)}</div>
        </div>
      `;
    }).join('');
  }

  getEventTypeClass(event) {
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();
    
    // Determine event type based on keywords
    if (title.includes('meeting') || title.includes('call') || title.includes('sync')) {
      return 'event-type-meeting';
    }
    if (title.includes('lunch') || title.includes('dinner') || title.includes('coffee')) {
      return 'event-type-personal';
    }
    if (title.includes('study') || title.includes('review') || title.includes('exam')) {
      return 'event-type-study';
    }
    if (title.includes('work') || title.includes('project') || title.includes('task')) {
      return 'event-type-work';
    }
    
    return 'event-type-default';
  }

  formatEventTimeCompact(event) {
    const startTime = event.event_time;
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + (event.duration || 60);
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    const formatTime = (h, m) => {
      if (h === 0) return m === 0 ? '12 AM' : `12:${m.toString().padStart(2, '0')} AM`;
      if (h === 12) return m === 0 ? '12 PM' : `12:${m.toString().padStart(2, '0')} PM`;
      if (h < 12) return m === 0 ? `${h} AM` : `${h}:${m.toString().padStart(2, '0')} AM`;
      return m === 0 ? `${h - 12} PM` : `${h - 12}:${m.toString().padStart(2, '0')} PM`;
    };
    
    const start = formatTime(hours, minutes);
    const end = formatTime(endHours % 24, endMins);
    
    return `${start} - ${end}`;
  }

  renderMonthView() {
    if (!this.calendarGrid) return;

    const monthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const monthEnd = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    
    // Get the first day of the week for the month view
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());
    
    const weeks = [];
    const currentWeek = [];
    
    for (let i = 0; i < 42; i++) { // 6 weeks max
      const day = new Date(calendarStart);
      day.setDate(day.getDate() + i);
      
      currentWeek.push(day);
      
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek.length = 0;
      }
      
      if (day.getMonth() > this.currentDate.getMonth()) break;
    }

    const headerHTML = `
      <div class="calendar-month-header">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `
          <div class="month-day-header">${day}</div>
        `).join('')}
      </div>
    `;

    const weeksHTML = weeks.map(week => `
      <div class="calendar-week">
        ${week.map(day => {
          const dayEvents = this.getEventsForDate(day);
          const isCurrentMonth = day.getMonth() === this.currentDate.getMonth();
          const isToday = this.isToday(day);
          
          return `
            <div class="calendar-month-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}"
                 onclick="calendarManager.selectDate('${day.toISOString().split('T')[0]}')">
              <div class="month-day-number">${day.getDate()}</div>
              <div class="month-day-events">
                ${dayEvents.slice(0, 3).map(event => `
                  <div class="month-event ${this.getEventTypeClass(event)}" title="${event.title}" onclick="event.stopPropagation(); calendarManager.showEventDetails('${event.id}')">
                    ${event.title}
                  </div>
                `).join('')}
                ${dayEvents.length > 3 ? `<div class="more-events">+${dayEvents.length - 3} more</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');

    this.calendarGrid.innerHTML = `
      <div class="calendar-month-view">
        ${headerHTML}
        <div class="calendar-month-grid">
          ${weeksHTML}
        </div>
      </div>
    `;
  }

  getEventsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return this.events.filter(event => event.event_date === dateStr);
  }

  getEventsForDateTime(date, time) {
    const dateStr = date.toISOString().split('T')[0];
    return this.events.filter(event => {
      if (event.event_date !== dateStr) return false;
      
      const eventTime = event.event_time;
      const eventStart = new Date(`2000-01-01T${eventTime}`);
      const eventEnd = new Date(eventStart.getTime() + event.duration * 60000);
      const slotTime = new Date(`2000-01-01T${time}`);
      
      return slotTime >= eventStart && slotTime < eventEnd;
    });
  }

  getWeekStart(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  // Navigation methods
  goToToday() {
    this.currentDate = new Date();
    this.renderCalendar();
  }

  navigatePrevious() {
    switch (this.currentView) {
      case 'day':
        this.currentDate.setDate(this.currentDate.getDate() - 1);
        break;
      case 'week':
        this.currentDate.setDate(this.currentDate.getDate() - 7);
        break;
      case 'month':
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        break;
    }
    this.renderCalendar();
  }

  navigateNext() {
    switch (this.currentView) {
      case 'day':
        this.currentDate.setDate(this.currentDate.getDate() + 1);
        break;
      case 'week':
        this.currentDate.setDate(this.currentDate.getDate() + 7);
        break;
      case 'month':
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        break;
    }
    this.renderCalendar();
  }

  changeView(view) {
    this.currentView = view;
    this.renderCalendar();
  }

  selectDate(dateStr) {
    this.currentDate = new Date(dateStr + 'T12:00:00');
    this.currentView = 'day';
    if (this.viewSelector) this.viewSelector.value = 'day';
    this.renderCalendar();
  }

  showEventDetails(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    this.currentViewingEvent = event;
    
    const modal = document.getElementById('event-details-modal');
    const content = document.getElementById('event-details-content');
    
    if (!content) return;

    const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const startTime = this.formatEventTimeCompact(event);

    content.innerHTML = `
      <div class="event-details-grid">
        <div class="event-detail-item">
          <div class="event-detail-label">Title</div>
          <div class="event-detail-value">${event.title}</div>
        </div>
        ${event.description ? `
        <div class="event-detail-item">
          <div class="event-detail-label">Description</div>
          <div class="event-detail-value">${event.description}</div>
        </div>
        ` : ''}
        <div class="event-detail-item">
          <div class="event-detail-label">Date</div>
          <div class="event-detail-value">${eventDate}</div>
        </div>
        <div class="event-detail-item">
          <div class="event-detail-label">Time</div>
          <div class="event-detail-value">${startTime}</div>
        </div>
        <div class="event-detail-item">
          <div class="event-detail-label">Duration</div>
          <div class="event-detail-value">${event.duration} minutes</div>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  hideEventDetailsModal() {
    const modal = document.getElementById('event-details-modal');
    modal.classList.remove('active');
    this.currentViewingEvent = null;
  }

  editEvent() {
    if (!this.currentViewingEvent || !window.dashboardManager) return;

    // Pre-fill the event modal with current event data
    const eventDateInput = document.getElementById('event-date');
    const eventTimeInput = document.getElementById('event-time');
    const eventTitleInput = document.getElementById('event-title');
    const eventDescriptionInput = document.getElementById('event-description');
    const eventDurationInput = document.getElementById('event-duration');

    if (eventDateInput) eventDateInput.value = this.currentViewingEvent.event_date;
    if (eventTimeInput) eventTimeInput.value = this.currentViewingEvent.event_time;
    if (eventTitleInput) eventTitleInput.value = this.currentViewingEvent.title;
    if (eventDescriptionInput) eventDescriptionInput.value = this.currentViewingEvent.description || '';
    if (eventDurationInput) eventDurationInput.value = this.currentViewingEvent.duration;

    this.hideEventDetailsModal();
    window.dashboardManager.showEventModal();
  }

  async deleteEvent() {
    if (!this.currentViewingEvent) return;

    if (!confirm(`Are you sure you want to delete "${this.currentViewingEvent.title}"? This action cannot be undone.`)) {
      return;
    }

    this.showLoading();

    try {
      const result = await this.database.deleteEvent(this.currentViewingEvent.id);
      
      if (result.success) {
        // Remove from local events array
        this.events = this.events.filter(e => e.id !== this.currentViewingEvent.id);
        
        // Re-render calendar
        this.renderCalendar();
        
        // Hide modal and show success message
        this.hideEventDetailsModal();
        this.showSuccessMessage('Event deleted successfully!');
      } else {
        this.showErrorMessage('Failed to delete event. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      this.showErrorMessage('Failed to delete event. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  // Public method to refresh events
  async refreshEvents() {
    await this.loadUserEvents();
  }

  // Utility methods
  showLoading() {
    document.getElementById('loading-spinner')?.classList.add('active');
  }

  hideLoading() {
    document.getElementById('loading-spinner')?.classList.remove('active');
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

// Make calendarManager globally available
window.calendarManager = null;