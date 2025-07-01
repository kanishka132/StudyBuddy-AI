export class NavigationManager {
  constructor() {
    this.currentTab = 'dashboard';
    this.currentPlannerTab = 'calendar';
    this.currentLearnTab = 'library';
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.navTabs = document.querySelectorAll('.nav-tab');
    this.tabContents = document.querySelectorAll('.tab-content');
    this.plannerTabs = document.querySelectorAll('.planner-tab');
    this.plannerContents = document.querySelectorAll('.planner-content');
    this.learnTabs = document.querySelectorAll('.learn-tab');
    this.learnContents = document.querySelectorAll('.learn-content');
    this.backToLearnBtn = document.getElementById('back-to-learn-btn');
    this.libraryFilterContainer = document.getElementById('library-filter-container');
  }

  attachEventListeners() {
    // Main navigation tabs
    this.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const page = tab.dataset.page;
        this.switchTab(page);
      });
    });

    // Planner sub-tabs
    this.plannerTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const plannerTab = tab.dataset.plannerTab;
        this.switchPlannerTab(plannerTab);
      });
    });

    // Learn sub-tabs
    this.learnTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const learnTab = tab.dataset.learnTab;
        this.switchLearnTab(learnTab);
      });
    });

    // Back to Learn button
    if (this.backToLearnBtn) {
      this.backToLearnBtn.addEventListener('click', () => {
        this.switchTab('learn');
        this.switchLearnTab('library');
      });
    }

    // Connect additional buttons to Planner page
    const addEventBtnPlanner = document.getElementById('add-event-btn-planner');
    const addTodoBtnPlanner = document.getElementById('add-todo-btn-planner');
    
    if (addEventBtnPlanner) {
      addEventBtnPlanner.addEventListener('click', () => {
        if (window.dashboardManager) {
          window.dashboardManager.showEventModal();
        }
      });
    }

    if (addTodoBtnPlanner) {
      addTodoBtnPlanner.addEventListener('click', () => {
        if (window.dashboardManager) {
          window.dashboardManager.showTodoModal();
        }
      });
    }

    // Add event listeners for workspace form interactions
    this.attachWorkspaceEventListeners();
  }

  attachWorkspaceEventListeners() {
    // Project name input listener
    const projectNameInput = document.getElementById('workspace-project-name');
    if (projectNameInput) {
      projectNameInput.addEventListener('input', () => {
        this.updateWorkspaceVisibility();
        if (window.learnManager) {
          window.learnManager.updateGenerateButton();
        }
      });
    }
  }

  switchTab(tabName) {
    // Update active tab
    this.navTabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.page === tabName) {
        tab.classList.add('active');
      }
    });

    // Update active content
    this.tabContents.forEach(content => {
      content.classList.remove('active');
    });

    // Show the correct content
    const targetContent = this.getTabContent(tabName);
    if (targetContent) {
      targetContent.classList.add('active');
    }

    this.currentTab = tabName;

    // Trigger any tab-specific initialization
    this.onTabSwitch(tabName);
  }

  switchPlannerTab(plannerTabName) {
    // Update active planner tab
    this.plannerTabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.plannerTab === plannerTabName) {
        tab.classList.add('active');
      }
    });

    // Update active planner content
    this.plannerContents.forEach(content => {
      content.classList.remove('active');
    });

    // Show the correct planner content
    const targetContent = this.getPlannerTabContent(plannerTabName);
    if (targetContent) {
      targetContent.classList.add('active');
    }

    this.currentPlannerTab = plannerTabName;
  }

  switchLearnTab(learnTabName) {
    // Update active learn tab
    this.learnTabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.learnTab === learnTabName) {
        tab.classList.add('active');
      }
    });

    // Update active learn content
    this.learnContents.forEach(content => {
      content.classList.remove('active');
    });

    // Show the correct learn content
    const targetContent = this.getLearnTabContent(learnTabName);
    if (targetContent) {
      targetContent.classList.add('active');
    }

    this.currentLearnTab = learnTabName;

    // Update workspace visibility when switching to workspace tab
    if (learnTabName === 'workspace') {
      this.updateWorkspaceVisibility();
    }

    // Show/hide library filter container based on active learn tab
    this.updateLibraryFilterVisibility(learnTabName);
  }

  updateLibraryFilterVisibility(learnTabName) {
    if (this.libraryFilterContainer) {
      if (learnTabName === 'library') {
        // Show filter container in library tab
        this.libraryFilterContainer.style.display = 'block';
      } else {
        // Hide filter container in workspace tab
        this.libraryFilterContainer.style.display = 'none';
      }
    }
  }

  updateWorkspaceVisibility() {
    const actionsContainer = document.getElementById('workspace-actions-container');
    const nameContainer = document.getElementById('workspace-name-container');
    const materialsContainer = document.getElementById('workspace-materials-container');
    
    // Check if materials are selected
    const selectedMaterials = materialsContainer?.querySelectorAll('.material-checkbox:checked') || [];
    const hasSelectedMaterials = selectedMaterials.length > 0;
    
    // Show/hide actions section
    if (actionsContainer) {
      actionsContainer.style.display = hasSelectedMaterials ? 'block' : 'none';
    }
    
    // Check if actions are selected
    const selectedActions = document.querySelectorAll('.action-checkbox:checked') || [];
    const hasSelectedActions = selectedActions.length > 0;
    
    // Show/hide name section
    if (nameContainer) {
      nameContainer.style.display = (hasSelectedMaterials && hasSelectedActions) ? 'block' : 'none';
    }
  }

  getTabContent(tabName) {
    switch (tabName) {
      case 'dashboard':
        return document.getElementById('dashboard-tab');
      case 'materials':
        return document.getElementById('materials-page');
      case 'learn':
        return document.getElementById('learn-page');
      case 'planner':
        return document.getElementById('planner-page');
      case 'project-viewer':
        return document.getElementById('project-viewer-page');
      default:
        return null;
    }
  }

  getPlannerTabContent(plannerTabName) {
    switch (plannerTabName) {
      case 'calendar':
        return document.getElementById('calendar-content');
      case 'todos':
        return document.getElementById('todos-content');
      default:
        return null;
    }
  }

  getLearnTabContent(learnTabName) {
    switch (learnTabName) {
      case 'library':
        return document.getElementById('library-content');
      case 'workspace':
        return document.getElementById('workspace-content');
      default:
        return null;
    }
  }

  showPage(pageId) {
    // Show the project viewer page
    this.tabContents.forEach(content => {
      content.classList.remove('active');
    });

    const targetContent = document.getElementById(pageId);
    if (targetContent) {
      targetContent.classList.add('active');
    }
  }

  onTabSwitch(tabName) {
    // Handle any specific logic when switching tabs
    switch (tabName) {
      case 'dashboard':
        // Refresh dashboard stats if needed
        if (window.dashboardManager) {
          window.dashboardManager.updateStats();
        }
        break;
      case 'materials':
        // Refresh materials if needed
        if (window.materialsManager) {
          window.materialsManager.loadUserMaterials();
        }
        break;
      case 'learn':
        // Initialize learn page if needed
        if (window.learnManager) {
          window.learnManager.loadUserMaterials();
        }
        // Ensure filter visibility is correct when entering learn tab
        this.updateLibraryFilterVisibility(this.currentLearnTab);
        break;
      case 'planner':
        // Initialize planner page if needed
        if (window.plannerManager) {
          window.plannerManager.loadUserData();
        }
        break;
    }
  }

  getCurrentTab() {
    return this.currentTab;
  }

  getCurrentPlannerTab() {
    return this.currentPlannerTab;
  }

  getCurrentLearnTab() {
    return this.currentLearnTab;
  }
}