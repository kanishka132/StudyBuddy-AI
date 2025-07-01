import { AuthManager } from './utils/auth.js';
import { DatabaseManager } from './utils/database.js';
import { PageManager } from './components/PageManager.js';
import { OnboardingManager } from './components/OnboardingManager.js';
import { DashboardManager } from './components/DashboardManager.js';
import { MaterialsManager } from './components/MaterialsManager.js';
import { NavigationManager } from './components/NavigationManager.js';
import { LearnManager } from './components/LearnManager.js';
import { PlannerManager } from './components/PlannerManager.js';
import { CalendarManager } from './components/CalendarManager.js';

class StudyBuddyApp {
  constructor() {
    this.authManager = new AuthManager();
    this.databaseManager = new DatabaseManager();
    this.pageManager = new PageManager();
    this.navigationManager = null;
    this.onboardingManager = null;
    this.dashboardManager = null;
    this.materialsManager = null;
    this.learnManager = null;
    this.plannerManager = null;
    this.calendarManager = null;
    
    this.init();
  }

  init() {
    this.initializeComponents();
    this.attachEventListeners();
    this.handleAuthStateChange();
    this.initializeNavigation();
  }

  initializeComponents() {
    // Initialize onboarding manager
    this.onboardingManager = new OnboardingManager(
      this.databaseManager, 
      this.pageManager
    );

    // Initialize dashboard manager
    this.dashboardManager = new DashboardManager(
      this.databaseManager,
      this.authManager
    );

    // Initialize materials manager
    this.materialsManager = new MaterialsManager(
      this.databaseManager,
      this.authManager
    );

    // Initialize learn manager
    this.learnManager = new LearnManager(
      this.databaseManager,
      this.authManager
    );

    // Initialize planner manager
    this.plannerManager = new PlannerManager(
      this.databaseManager,
      this.authManager
    );

    // Initialize calendar manager
    this.calendarManager = new CalendarManager(
      this.databaseManager,
      this.authManager
    );

    // Initialize navigation manager
    this.navigationManager = new NavigationManager();

    // Make managers globally available
    window.dashboardManager = this.dashboardManager;
    window.materialsManager = this.materialsManager;
    window.learnManager = this.learnManager;
    window.plannerManager = this.plannerManager;
    window.calendarManager = this.calendarManager;
    window.navigationManager = this.navigationManager;
  }

  initializeNavigation() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
          targetSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          
          // Update active nav link
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    });
  }

  attachEventListeners() {
    // Landing page buttons - all get started buttons should show signup
    const getStartedBtns = document.querySelectorAll('#get-started-btn, .hero-get-started, .contact-get-started');
    getStartedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.showAuthModal('signup');
      });
    });

    // Login button
    document.getElementById('login-btn').addEventListener('click', () => {
      this.showAuthModal('login');
    });

    // Modal controls
    document.getElementById('close-modal').addEventListener('click', () => {
      this.hideAuthModal();
    });

    document.getElementById('auth-form').addEventListener('submit', (e) => {
      this.handleAuth(e);
    });

    document.getElementById('auth-switch-link').addEventListener('click', () => {
      this.switchAuthMode();
    });

    // Close modal on outside click
    document.getElementById('auth-modal').addEventListener('click', (e) => {
      if (e.target.id === 'auth-modal') {
        this.hideAuthModal();
      }
    });

    // Contact form
    document.getElementById('contact-form').addEventListener('submit', (e) => {
      this.handleContactForm(e);
    });

    // Account info modal
    document.getElementById('close-account-modal').addEventListener('click', () => {
      this.hideAccountModal();
    });

    document.getElementById('account-modal').addEventListener('click', (e) => {
      if (e.target.id === 'account-modal') {
        this.hideAccountModal();
      }
    });
  }

  handleAuthStateChange() {
    this.authManager.onAuthStateChange((user) => {
      if (user) {
        // User is signed in
        localStorage.setItem('currentUser', JSON.stringify({
          uid: user.id,
          email: user.email
        }));
        
        this.checkUserProfile(user);
      } else {
        // User is signed out
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userProfile');
        this.pageManager.showPage('landing-page');
      }
    });
  }

  async checkUserProfile(user) {
    try {
      const result = await this.databaseManager.getUserProfile(user.id);
      
      if (result.success && result.data) {
        // User has completed onboarding
        localStorage.setItem('userProfile', JSON.stringify(result.data));
        this.pageManager.showPage('dashboard-page');
        this.dashboardManager.initializeDashboard(result.data);
        this.materialsManager.loadUserMaterials();
        this.learnManager.loadUserMaterials();
        this.learnManager.loadUserProjects(); // Load projects for library
        this.plannerManager.loadUserData();
        this.calendarManager.loadUserEvents();
      } else {
        // User needs to complete onboarding
        this.pageManager.showPage('onboarding-page');
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      // If there's an error, show onboarding to be safe
      this.pageManager.showPage('onboarding-page');
    }
  }

  showAuthModal(mode) {
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit');
    const switchText = document.getElementById('auth-switch-text');
    const switchLink = document.getElementById('auth-switch-link');
    const errorDiv = document.getElementById('auth-error');

    // Clear any previous errors
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    if (mode === 'signup') {
      title.textContent = 'Sign Up';
      submitBtn.textContent = 'Sign Up';
      switchText.innerHTML = 'Already have an account? <span id="auth-switch-link">Login</span>';
    } else {
      title.textContent = 'Login';
      submitBtn.textContent = 'Login';
      switchText.innerHTML = 'Don\'t have an account? <span id="auth-switch-link">Sign Up</span>';
    }

    // Re-attach switch link event listener
    document.getElementById('auth-switch-link').addEventListener('click', () => {
      this.switchAuthMode();
    });

    modal.classList.add('active');
    this.currentAuthMode = mode;
  }

  hideAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
    document.getElementById('auth-form').reset();
    document.getElementById('auth-error').style.display = 'none';
  }

  switchAuthMode() {
    const newMode = this.currentAuthMode === 'signup' ? 'login' : 'signup';
    this.showAuthModal(newMode);
  }

  showAuthError(message) {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  async handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      this.showAuthError('Please fill in all fields.');
      return;
    }

    // Show loading
    document.getElementById('loading-spinner').classList.add('active');

    try {
      let result;
      
      if (this.currentAuthMode === 'signup') {
        result = await this.authManager.signUp(email, password);
        
        // Check if user already exists
        if (!result.success && result.error.includes('already registered')) {
          this.showAuthError('This email is already registered. Please login instead.');
          document.getElementById('loading-spinner').classList.remove('active');
          return;
        }
        
        // Check if email confirmation is needed
        if (result.success && result.needsEmailConfirmation) {
          this.showAuthError('Please check your email and click the confirmation link to complete your registration.');
          document.getElementById('loading-spinner').classList.remove('active');
          return;
        }
      } else {
        result = await this.authManager.signIn(email, password);
      }

      if (result.success) {
        this.hideAuthModal();
        // Auth state change will handle navigation
      } else {
        // Provide more informative error messages for sign-in failures
        if (this.currentAuthMode === 'login' && result.error === 'Invalid login credentials') {
          this.showAuthError('Invalid email or password. If you recently signed up, please check your email for a confirmation link.');
        } else {
          this.showAuthError(result.error || 'Authentication failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      this.showAuthError('An error occurred. Please try again.');
    } finally {
      document.getElementById('loading-spinner').classList.remove('active');
    }
  }

  async handleContactForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message')
    };

    // Show loading
    document.getElementById('loading-spinner').classList.add('active');

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Thank you for your message! We\'ll get back to you soon.');
      e.target.reset();
    } catch (error) {
      console.error('Contact form error:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      document.getElementById('loading-spinner').classList.remove('active');
    }
  }

  hideAccountModal() {
    document.getElementById('account-modal').classList.remove('active');
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new StudyBuddyApp();
});