export class OnboardingManager {
  constructor(databaseManager, pageManager) {
    this.database = databaseManager;
    this.pageManager = pageManager;
    this.currentStep = 1;
    this.totalSteps = 4;
    this.formData = {};
    
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.form = document.getElementById('onboarding-form');
    this.steps = document.querySelectorAll('.onboarding-step');
    this.stepIndicators = document.querySelectorAll('.step');
    this.prevBtn = document.getElementById('prev-step');
    this.nextBtn = document.getElementById('next-step');
    this.completeBtn = document.getElementById('complete-onboarding');
  }

  attachEventListeners() {
    this.prevBtn.addEventListener('click', () => this.previousStep());
    this.nextBtn.addEventListener('click', () => this.nextStep());
    this.form.addEventListener('submit', (e) => this.completeOnboarding(e));

    // Avatar selection
    document.querySelectorAll('.avatar-option').forEach(avatar => {
      avatar.addEventListener('click', () => this.selectAvatar(avatar));
    });
  }

  selectAvatar(avatarElement) {
    // Remove previous selection
    document.querySelectorAll('.avatar-option').forEach(av => {
      av.classList.remove('selected');
    });

    // Select new avatar
    avatarElement.classList.add('selected');
    document.getElementById('selected-avatar').value = avatarElement.dataset.avatar;
  }

  validateStep(stepNumber) {
    const step = document.querySelector(`[data-step="${stepNumber}"]`);
    
    switch (stepNumber) {
      case 1:
        const displayName = document.getElementById('display-name').value.trim();
        return displayName.length > 0;
      
      case 2:
        const selectedAvatar = document.getElementById('selected-avatar').value;
        return selectedAvatar.length > 0;
      
      case 3:
        const education = document.querySelector('input[name="education"]:checked');
        return education !== null;
      
      case 4:
        const goals = document.querySelectorAll('input[name="goals"]:checked');
        return goals.length > 0;
      
      default:
        return true;
    }
  }

  nextStep() {
    if (!this.validateStep(this.currentStep)) {
      alert('Please complete all required fields before continuing.');
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateStepDisplay();
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateStepDisplay();
    }
  }

  updateStepDisplay() {
    // Update step visibility
    this.steps.forEach((step, index) => {
      step.classList.toggle('active', index + 1 === this.currentStep);
    });

    // Update step indicators
    this.stepIndicators.forEach((indicator, index) => {
      indicator.classList.remove('active', 'completed');
      if (index + 1 < this.currentStep) {
        indicator.classList.add('completed');
      } else if (index + 1 === this.currentStep) {
        indicator.classList.add('active');
      }
    });

    // Update navigation buttons
    this.prevBtn.style.display = this.currentStep === 1 ? 'none' : 'inline-flex';
    this.nextBtn.style.display = this.currentStep === this.totalSteps ? 'none' : 'inline-flex';
    this.completeBtn.style.display = this.currentStep === this.totalSteps ? 'inline-flex' : 'none';
  }

  collectFormData() {
    const displayName = document.getElementById('display-name').value.trim();
    const avatar = document.getElementById('selected-avatar').value;
    const education = document.querySelector('input[name="education"]:checked')?.value;
    const goals = Array.from(document.querySelectorAll('input[name="goals"]:checked'))
      .map(input => input.value);
    const customGoal = document.getElementById('custom-goal').value.trim();

    return {
      displayName,
      avatar,
      education,
      goals,
      customGoal
    };
  }

  async completeOnboarding(e) {
    e.preventDefault();
    
    if (!this.validateStep(this.currentStep)) {
      alert('Please complete all required fields.');
      return;
    }

    const formData = this.collectFormData();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!user) {
      alert('User session expired. Please log in again.');
      return;
    }

    // Show loading
    document.getElementById('loading-spinner').classList.add('active');

    try {
      const result = await this.database.createUserProfile(user.uid, formData);
      
      if (result.success) {
        // Store profile data locally
        localStorage.setItem('userProfile', JSON.stringify(formData));
        
        // Navigate to dashboard
        this.pageManager.showPage('dashboard-page');
        
        // Update dashboard with user data
        this.updateDashboard(formData);
      } else {
        alert('Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      document.getElementById('loading-spinner').classList.remove('active');
    }
  }

  updateDashboard(profileData) {
    const userAvatar = document.getElementById('user-avatar');
    const userGreeting = document.getElementById('user-greeting');
    
    if (userAvatar) userAvatar.textContent = profileData.avatar;
    if (userGreeting) userGreeting.textContent = `Hi, ${profileData.displayName}!`;
  }
}