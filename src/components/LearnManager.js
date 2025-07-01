export class LearnManager {
  constructor(databaseManager, authManager) {
    this.database = databaseManager;
    this.auth = authManager;
    this.materials = [];
    this.projects = [];
    this.selectedMaterials = [];
    this.selectedActions = [];
    this.currentQuiz = null;
    this.currentQuestionIndex = 0;
    this.userAnswers = [];
    this.quizScore = 0;
    
    // Flashcard properties
    this.flashcards = [];
    this.currentFlashcardIndex = 0;
    this.isFlashcardFlipped = false;
    
    // Library filter properties
    this.librarySubjectFilter = '';
    
    this.initializeElements();
    this.attachEventListeners();
    this.createQuizModal();
    this.createFlashcardModal();
  }

  initializeElements() {
    // Workspace form elements
    this.subjectSelect = document.getElementById('workspace-subject-select');
    this.materialsContainer = document.getElementById('workspace-materials-container');
    this.actionsContainer = document.getElementById('workspace-actions-container');
    this.projectNameInput = document.getElementById('workspace-project-name');
    this.generateBtn = document.getElementById('generate-workspace-btn');
    this.workspaceForm = document.getElementById('workspace-form');
    
    // Quiz settings elements
    this.quizCheckbox = null; // Will be set when actions are loaded
    this.quizQuestionCountInput = document.getElementById('quiz-question-count');
    this.quizDifficultySelect = document.getElementById('quiz-difficulty');
    this.quizSettingsRow = null; // Will be set when actions are loaded
    
    // Library elements
    this.libraryContent = document.getElementById('library-content');
    
    // Create library filter elements
    this.createLibraryFilterElements();
  }

  createLibraryFilterElements() {
    // Create filter container if it doesn't exist
    const libraryContent = document.getElementById('library-content');
    if (!libraryContent) return;

    // Check if filter already exists
    if (document.getElementById('library-filter-container')) return;

    // Create filter HTML structure
    const filterHTML = `
      <div id="library-filter-container" class="library-filter-container" style="display: none;">
        <div class="library-filter-section">
          <div class="filter-group">
            <label for="library-subject-filter">Filter by Subject:</label>
            <select id="library-subject-filter" class="form-select">
              <option value="">All Subjects</option>
            </select>
          </div>
          <div class="library-stats">
            <span id="library-project-count" class="library-stat">0 projects</span>
          </div>
        </div>
      </div>
    `;

    // Insert filter before library content
    libraryContent.insertAdjacentHTML('beforebegin', filterHTML);

    // Get the filter element and attach event listener
    this.librarySubjectFilterEl = document.getElementById('library-subject-filter');
    this.libraryProjectCountEl = document.getElementById('library-project-count');
    
    if (this.librarySubjectFilterEl) {
      this.librarySubjectFilterEl.addEventListener('change', () => {
        this.librarySubjectFilter = this.librarySubjectFilterEl.value;
        this.renderLibrary();
      });
    }
  }

  createQuizModal() {
    // Create quiz modal if it doesn't exist
    let modal = document.getElementById('quiz-taking-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'quiz-taking-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content quiz-modal-content">
          <div class="modal-header quiz-modal-header">
            <div class="quiz-modal-title">
              <h3 id="quiz-modal-title-text">Quiz</h3>
              <div id="quiz-modal-progress" class="quiz-modal-progress">Question 1 of 5</div>
            </div>
            <button id="close-quiz-taking-modal" class="close-btn">&times;</button>
          </div>
          <div class="modal-body quiz-modal-body">
            <div id="quiz-modal-content" class="quiz-modal-content-area">
              <!-- Quiz content will be populated here -->
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Add event listeners
      document.getElementById('close-quiz-taking-modal').addEventListener('click', () => this.hideQuizModal());
      modal.addEventListener('click', (e) => {
        if (e.target.id === 'quiz-taking-modal') this.hideQuizModal();
      });
    }
    return modal;
  }

  createFlashcardModal() {
    // Create flashcard modal if it doesn't exist
    let modal = document.getElementById('flashcard-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'flashcard-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content flashcard-modal-content">
          <div class="modal-header flashcard-modal-header">
            <div class="flashcard-modal-title">
              <h3 id="flashcard-modal-title-text">Flashcards</h3>
              <div id="flashcard-modal-progress" class="flashcard-modal-progress">Card 1 of 5</div>
            </div>
            <button id="close-flashcard-modal" class="close-btn">&times;</button>
          </div>
          <div class="modal-body flashcard-modal-body">
            <div id="flashcard-modal-content" class="flashcard-modal-content-area">
              <!-- Flashcard content will be populated here -->
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Add event listeners
      document.getElementById('close-flashcard-modal').addEventListener('click', () => this.hideFlashcardModal());
      modal.addEventListener('click', (e) => {
        if (e.target.id === 'flashcard-modal') this.hideFlashcardModal();
      });
    }
    return modal;
  }

  attachEventListeners() {
    if (this.subjectSelect) {
      this.subjectSelect.addEventListener('change', () => this.loadMaterialsForSubject());
    }

    if (this.workspaceForm) {
      this.workspaceForm.addEventListener('submit', (e) => this.handleGenerate(e));
    }

    if (this.generateBtn) {
      this.generateBtn.addEventListener('click', (e) => this.handleGenerate(e));
    }
  }

  async loadUserMaterials() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    try {
      const result = await this.database.getUserMaterials(user.id);
      if (result.success) {
        this.materials = result.data || [];
        this.populateSubjectFilter();
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  }

  async loadUserProjects() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    try {
      const result = await this.database.getUserProjects(user.id);
      if (result.success) {
        this.projects = result.data || [];
        this.populateLibrarySubjectFilter();
        this.renderLibrary();
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  populateSubjectFilter() {
    if (!this.subjectSelect) return;

    // Get unique subjects
    const subjects = [...new Set(this.materials.map(m => m.subject))].filter(s => s && s !== 'untagged');
    
    // Clear existing options except the first one
    this.subjectSelect.innerHTML = '<option value="">Select a subject</option>';

    // Add subjects
    subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = this.getSubjectLabel(subject);
      this.subjectSelect.appendChild(option);
    });
  }

  populateLibrarySubjectFilter() {
    if (!this.librarySubjectFilterEl) return;

    // Get unique subjects from projects
    const subjects = [...new Set(this.projects.map(p => p.subject))].filter(s => s && s !== 'untagged');
    
    // Store current selection
    const currentValue = this.librarySubjectFilterEl.value;
    
    // Clear existing options except the first one
    this.librarySubjectFilterEl.innerHTML = '<option value="">All Subjects</option>';

    // Add subjects
    subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = this.getSubjectLabel(subject);
      this.librarySubjectFilterEl.appendChild(option);
    });

    // Restore previous selection if it still exists
    if (currentValue && subjects.includes(currentValue)) {
      this.librarySubjectFilterEl.value = currentValue;
      this.librarySubjectFilter = currentValue;
    }
  }

  loadMaterialsForSubject() {
    const selectedSubject = this.subjectSelect.value;
    if (!selectedSubject || !this.materialsContainer) return;

    const subjectMaterials = this.materials.filter(m => m.subject === selectedSubject);

    if (subjectMaterials.length === 0) {
      this.materialsContainer.innerHTML = `
        <div class="empty-materials">
          <p>No materials found for this subject</p>
        </div>
      `;
      return;
    }

    const materialsHTML = subjectMaterials.map(material => `
      <label class="material-checkbox-item">
        <input type="checkbox" value="${material.id}" class="material-checkbox">
        <div class="material-checkbox-content">
          <div class="material-checkbox-icon">${this.getFileIcon(material.type)}</div>
          <div class="material-checkbox-info">
            <div class="material-checkbox-name">${material.name}</div>
            <div class="material-checkbox-meta">${this.formatFileSize(material.size)} • ${new Date(material.uploaded_at).toLocaleDateString()}</div>
          </div>
        </div>
      </label>
    `).join('');

    this.materialsContainer.innerHTML = `
      <div class="materials-selection">
        <h4>Select Materials:</h4>
        <div class="materials-checkbox-list">
          ${materialsHTML}
        </div>
      </div>
    `;

    // Add event listeners to checkboxes
    this.materialsContainer.querySelectorAll('.material-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateSelectedMaterials());
    });
  }

  updateSelectedMaterials() {
    const checkboxes = this.materialsContainer.querySelectorAll('.material-checkbox:checked');
    this.selectedMaterials = Array.from(checkboxes).map(cb => cb.value);
    this.updateActionsVisibility();
    window.navigationManager.updateWorkspaceVisibility();
  }

  updateActionsVisibility() {
    if (!this.actionsContainer) return;

    if (this.selectedMaterials.length === 0) {
      this.actionsContainer.style.display = 'none';
      return;
    }

    this.actionsContainer.style.display = 'block';

    // Add event listeners to action checkboxes if not already added
    const actionCheckboxes = this.actionsContainer.querySelectorAll('.action-checkbox');
    actionCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateSelectedActions());
      
      // Set up quiz settings toggle for quiz checkbox
      if (checkbox.value === 'quiz') {
        this.quizCheckbox = checkbox;
        this.setupQuizSettingsToggle();
      }
    });
  }

  setupQuizSettingsToggle() {
    if (!this.quizCheckbox) return;

    // Find the quiz settings row
    this.quizSettingsRow = this.quizCheckbox.closest('.action-checkbox-item').querySelector('.quiz-settings-row');
    
    if (this.quizSettingsRow) {
      // Initially hide the quiz settings
      this.quizSettingsRow.style.display = 'none';
      
      // Add event listener to toggle quiz settings
      this.quizCheckbox.addEventListener('change', () => {
        if (this.quizCheckbox.checked) {
          this.quizSettingsRow.style.display = 'flex';
        } else {
          this.quizSettingsRow.style.display = 'none';
          // Reset quiz settings to defaults when unchecked
          if (this.quizQuestionCountInput) this.quizQuestionCountInput.value = '5';
          if (this.quizDifficultySelect) this.quizDifficultySelect.value = 'medium';
        }
      });
    }
  }

  updateSelectedActions() {
    const checkboxes = this.actionsContainer.querySelectorAll('.action-checkbox:checked');
    this.selectedActions = Array.from(checkboxes).map(cb => cb.value);
    this.updateGenerateButton();
    window.navigationManager.updateWorkspaceVisibility();
  }

  updateGenerateButton() {
    if (!this.generateBtn) return;

    const canGenerate = this.selectedMaterials.length > 0 && 
                       this.selectedActions.length > 0 && 
                       this.projectNameInput?.value.trim();

    this.generateBtn.disabled = !canGenerate;
  }

  async handleGenerate(e) {
    e.preventDefault();

    const projectName = this.projectNameInput?.value.trim();
    if (!projectName) {
      this.showErrorMessage('Please enter a project name');
      return;
    }

    if (this.selectedMaterials.length === 0) {
      this.showErrorMessage('Please select at least one material');
      return;
    }

    if (this.selectedActions.length === 0) {
      this.showErrorMessage('Please select at least one action');
      return;
    }

    const user = this.auth.getCurrentUser();
    if (!user) {
      this.showErrorMessage('User not authenticated');
      return;
    }

    this.showLoading();

    try {
      // Get selected material details and extract file paths
      const selectedMaterialDetails = this.materials.filter(m => 
        this.selectedMaterials.includes(m.id)
      );

      // Map material IDs to file paths
      const filePaths = selectedMaterialDetails
        .filter(material => material.file_path) // Only include materials with file paths
        .map(material => material.file_path);

      if (filePaths.length === 0) {
        this.showErrorMessage('Selected materials do not have valid file paths');
        return;
      }

      // Get quiz settings if quiz action is selected
      let questionCount = 5;
      let difficulty = 'medium';
      
      if (this.selectedActions.includes('quiz')) {
        questionCount = parseInt(this.quizQuestionCountInput?.value) || 5;
        difficulty = this.quizDifficultySelect?.value || 'medium';
      }

      // Prepare request body for backend API
      const requestBody = {
        file_paths: filePaths,
        actions: this.selectedActions,
        project_name: projectName,
        question_count: questionCount,
        difficulty: difficulty
      };

      console.log('🚀 Sending request to backend:', requestBody);

      // Call backend API
      const response = await fetch('https://studdybuddy-yn5k.onrender.com/generate-learning-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const backendResult = await response.json();
      console.log('✅ Backend response:', backendResult);

      if (!backendResult.success) {
        throw new Error(backendResult.error || 'Backend processing failed');
      }

      // Determine subject from first selected material
      const selectedSubject = this.subjectSelect.value;

      // Create project in database
      const projectData = {
        name: projectName,
        subject: selectedSubject,
        materialIds: this.selectedMaterials,
        actions: this.selectedActions,
        quizQuestionCount: this.selectedActions.includes('quiz') ? questionCount : null,
        quizDifficulty: this.selectedActions.includes('quiz') ? difficulty : null
      };

      console.log('💾 Saving project to database:', projectData);

      const projectResult = await this.database.saveProject(user.id, projectData);
      if (!projectResult.success) {
        throw new Error('Failed to save project to database');
      }

      const savedProject = projectResult.data;
      console.log('✅ Project saved with ID:', savedProject.id);

      // Process backend results and update project
      const results = backendResult.results;

      // Save summary if generated
      if (results.summary && this.selectedActions.includes('summary')) {
        console.log('💾 Saving summary...');
        const summaryResult = await this.database.updateProjectSummary(savedProject.id, results.summary);
        if (!summaryResult.success) {
          console.warn('Failed to save summary:', summaryResult.error);
        }
      }

      // Save quiz if generated
      if (results.quiz && this.selectedActions.includes('quiz')) {
        console.log('💾 Saving quiz...');
        const quizData = {
          title: projectName,
          description: `Quiz for ${projectName}`,
          questions: results.quiz,
          questionCount: questionCount,
          difficulty: difficulty
        };

        const quizResult = await this.database.saveQuiz(user.id, quizData);
        if (quizResult.success) {
          // Link quiz to project
          await this.database.updateProjectQuiz(savedProject.id, quizResult.data.id);
        } else {
          console.warn('Failed to save quiz:', quizResult.error);
        }
      }

      // Save flashcards if generated
      if (results.flashcards && this.selectedActions.includes('flashcards')) {
        console.log('💾 Saving flashcards...');
        const flashcardsResult = await this.database.updateProjectFlashcards(savedProject.id, results.flashcards);
        if (!flashcardsResult.success) {
          console.warn('Failed to save flashcards:', flashcardsResult.error);
        }
      }

      // Refresh projects and show success
      await this.loadUserProjects();
      this.resetWorkspaceForm();
      this.showSuccessMessage(`Project "${projectName}" created successfully!`);

      // Navigate to project viewer
      setTimeout(() => {
        this.openProject(savedProject.id);
      }, 1000);

    } catch (error) {
      console.error('❌ Generation error:', error);
      this.showErrorMessage(`Failed to generate project: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  renderLibrary() {
    if (!this.libraryContent) return;

    // Filter projects based on selected subject
    let filteredProjects = this.projects;
    if (this.librarySubjectFilter) {
      filteredProjects = this.projects.filter(project => project.subject === this.librarySubjectFilter);
    }

    // Update project count
    if (this.libraryProjectCountEl) {
      const count = filteredProjects.length;
      this.libraryProjectCountEl.textContent = `${count} project${count !== 1 ? 's' : ''}`;
    }

    // Show/hide filter container based on whether there are projects
    const filterContainer = document.getElementById('library-filter-container');
    if (filterContainer) {
      filterContainer.style.display = this.projects.length > 0 ? 'block' : 'none';
    }

    if (filteredProjects.length === 0) {
      if (this.librarySubjectFilter) {
        // No projects for selected subject
        this.libraryContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📚</div>
            <h4>No projects found</h4>
            <p>No projects found for "${this.getSubjectLabel(this.librarySubjectFilter)}" subject</p>
            <button class="btn btn-ghost btn-sm" onclick="learnManager.clearLibraryFilter()">
              Show All Projects
            </button>
          </div>
        `;
      } else {
        // No projects at all
        this.libraryContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📚</div>
            <h4>Your Learning Library</h4>
            <p>Your generated projects will appear here</p>
          </div>
        `;
      }
      return;
    }

    const projectsHTML = filteredProjects.map(project => {
      const actionsText = project.actions.map(action => 
        action.charAt(0).toUpperCase() + action.slice(1)
      ).join(', ');

      const subjectLabel = this.getSubjectLabel(project.subject);
      const subjectClass = this.getSubjectClass(project.subject);

      return `
        <div class="library-project-card" data-project-id="${project.id}">
          <div class="project-header">
            <h4 class="project-name">${project.name}</h4>
            <div class="project-date">${new Date(project.created_at).toLocaleDateString()}</div>
          </div>
          <div class="project-subject-section">
            <span class="project-subject-tag ${subjectClass}">${subjectLabel}</span>
          </div>
          <div class="project-details">
            <div class="project-materials">
              <span class="project-label">Materials:</span>
              <span class="project-count">${project.material_ids.length} file(s)</span>
            </div>
            <div class="project-actions">
              <span class="project-label">Generated:</span>
              <span class="project-actions-list">${actionsText}</span>
            </div>
          </div>
          <div class="project-card-actions">
            <button class="btn btn-sm btn-primary" onclick="learnManager.openProject('${project.id}')">
              Open Project
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.libraryContent.innerHTML = `
      <div class="library-projects">
        ${projectsHTML}
      </div>
    `;
  }

  clearLibraryFilter() {
    if (this.librarySubjectFilterEl) {
      this.librarySubjectFilterEl.value = '';
      this.librarySubjectFilter = '';
      this.renderLibrary();
    }
  }

  openProject(projectId) {
    this.displayProjectDetails(projectId);
  }

  async displayProjectDetails(projectId) {
    // Find project in local array first
    let project = this.projects.find(p => p.id === projectId);
    
    // If not found locally, fetch from database
    if (!project) {
      try {
        const result = await this.database.getProjectById(projectId);
        if (result.success) {
          project = result.data;
        } else {
          this.showErrorMessage('Project not found');
          return;
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        this.showErrorMessage('Failed to load project');
        return;
      }
    }

    // Get material details for the project
    const projectMaterials = this.materials.filter(m => 
      project.material_ids.includes(m.id)
    );

    // Update project title
    const projectTitle = document.getElementById('project-viewer-title');
    if (projectTitle) {
      projectTitle.textContent = project.name;
    }

    // Populate materials with smaller fancy design
    const materialsContainer = document.getElementById('project-viewer-materials');
    if (materialsContainer) {
      const materialsHTML = projectMaterials.map(material => `
        <div class="fancy-material-card" onclick="window.materialsManager.showMaterialViewer(window.materialsManager.getMaterialById('${material.id}'))">
          <div class="material-card-header">
            <div class="material-icon-fancy">${this.getFileIcon(material.type)}</div>
            <div class="material-type-badge">${this.getFileTypeLabel(material.type)}</div>
          </div>
          <div class="material-info-fancy">
            <h4 class="material-name-fancy">${material.name}</h4>
            <div class="material-meta-fancy">
              <div class="meta-item">
                <span class="meta-icon">📊</span>
                <span class="meta-text">${this.formatFileSize(material.size)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">📅</span>
                <span class="meta-text">${new Date(material.uploaded_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div class="material-card-footer">
            <div class="view-indicator">
              <span class="view-icon">👁️</span>
              <span class="view-text">Click to view</span>
            </div>
          </div>
        </div>
      `).join('');

      materialsContainer.innerHTML = materialsHTML;
    }

    // Show/hide sections based on selected actions
    const summarySection = document.getElementById('project-viewer-summary-section');
    const quizSection = document.getElementById('project-viewer-quiz-section');
    const flashcardsSection = document.getElementById('project-viewer-flashcards-section');

    // Handle summary section with inline display
    if (summarySection) {
      if (project.actions.includes('summary')) {
        summarySection.style.display = 'block';
        await this.loadAndDisplaySummary(project);
      } else {
        summarySection.style.display = 'none';
      }
    }

    if (quizSection) {
      if (project.actions.includes('quiz')) {
        quizSection.style.display = 'block';
        await this.setupQuizSection(project);
      } else {
        quizSection.style.display = 'none';
      }
    }

    if (flashcardsSection) {
      if (project.actions.includes('flashcards')) {
        flashcardsSection.style.display = 'block';
        await this.setupFlashcardsSection(project);
      } else {
        flashcardsSection.style.display = 'none';
      }
    }

    // Switch to project viewer page
    window.navigationManager.showPage('project-viewer-page');
  }

  async setupQuizSection(project) {
    const quizSection = document.getElementById('project-viewer-quiz-section');
    if (!quizSection) return;

    // Replace the placeholder with a take quiz button
    const questionCount = project.quiz_question_count || 5;
    const difficulty = project.quiz_difficulty || 'medium';
    
    quizSection.innerHTML = `
      <h3 class="project-section-title">🧠 Quiz</h3>
      <div class="project-content-card">
        <div class="content-placeholder">
          <div class="content-icon">🧠</div>
          <h4>Interactive Quiz</h4>
          <p>Test your knowledge with ${questionCount} AI-generated questions (${difficulty} difficulty) based on your materials.</p>
          <button class="btn btn-primary" onclick="learnManager.startQuiz('${project.id}')">
            <span class="btn-icon">🎯</span>
            Take Quiz
          </button>
        </div>
      </div>
    `;
  }

  async setupFlashcardsSection(project) {
    const flashcardsSection = document.getElementById('project-viewer-flashcards-section');
    if (!flashcardsSection) return;

    // Replace the placeholder with a study flashcards button
    flashcardsSection.innerHTML = `
      <h3 class="project-section-title">🃏 Flashcards</h3>
      <div class="project-content-card">
        <div class="content-placeholder">
          <div class="content-icon">🃏</div>
          <h4>Study Flashcards</h4>
          <p>Review key concepts with interactive flashcards generated from your materials.</p>
          <button class="btn btn-primary" onclick="learnManager.startFlashcards('${project.id}')">
            <span class="btn-icon">🔄</span>
            Study Flashcards
          </button>
        </div>
      </div>
    `;
  }

  async startFlashcards(projectId) {
    try {
      // Get the project data
      const project = this.projects.find(p => p.id === projectId);
      if (!project) {
        this.showErrorMessage('Project not found');
        return;
      }

      // Get flashcards data
      let flashcardsData = project.flashcards_content;
      
      // If not in local project, fetch from database
      if (!flashcardsData) {
        const result = await this.database.getProjectById(projectId);
        if (!result.success || !result.data.flashcards_content) {
          this.showErrorMessage('Flashcards not found for this project');
          return;
        }
        flashcardsData = result.data.flashcards_content;
      }

      // Parse flashcards if they're stored as a string
      let flashcards = flashcardsData;
      if (typeof flashcardsData === 'string') {
        try {
          // Extract first [...] block from the string using regex
          const match = flashcardsData.match(/\[[\s\S]*\]/);
          if (!match) throw new Error("No JSON array found in flashcards data");
      
          const cleanedFlashcards = match[0];  // exact JSON array
          flashcards = JSON.parse(cleanedFlashcards);
        } catch (parseError) {
          console.error('Error parsing flashcards:', parseError);
          this.showErrorMessage('Failed to parse flashcards data');
          return;
        }
      }

      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        this.showErrorMessage('No flashcards available for this project');
        return;
      }

      // Initialize flashcard state
      this.flashcards = flashcards;
      this.currentFlashcardIndex = 0;
      this.isFlashcardFlipped = false;

      this.showFlashcardModal();
      this.renderFlashcard();
    } catch (error) {
      console.error('Error starting flashcards:', error);
      this.showErrorMessage('Failed to start flashcards');
    }
  }

  showFlashcardModal() {
    const modal = document.getElementById('flashcard-modal');
    if (modal) {
      modal.classList.add('active');
    }
  }

  hideFlashcardModal() {
    const modal = document.getElementById('flashcard-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    // Reset flashcard state
    this.flashcards = [];
    this.currentFlashcardIndex = 0;
    this.isFlashcardFlipped = false;
  }

  renderFlashcard() {
    const modalContent = document.getElementById('flashcard-modal-content');
    const modalTitle = document.getElementById('flashcard-modal-title-text');
    const modalProgress = document.getElementById('flashcard-modal-progress');
    
    if (!modalContent || !this.flashcards || this.flashcards.length === 0) return;

    const currentCard = this.flashcards[this.currentFlashcardIndex];
    
    // Update modal title and progress
    modalTitle.textContent = 'Study Flashcards';
    modalProgress.textContent = `Card ${this.currentFlashcardIndex + 1} of ${this.flashcards.length}`;

    // Format the content for display
    const frontContent = this.formatFlashcardContent(currentCard.front);
    const backContent = this.formatFlashcardContent(currentCard.back);

    modalContent.innerHTML = `
      <div class="flashcard-container">
        <div class="flashcard-card-container">
          <div class="flashcard-card ${this.isFlashcardFlipped ? 'flipped' : ''}" onclick="learnManager.flipFlashcard()">
            <div class="flashcard-front">
              <div class="flashcard-content">
                <div class="flashcard-label">Front</div>
                <div class="flashcard-text">${frontContent}</div>
                <div class="flashcard-hint">Click to flip</div>
              </div>
            </div>
            <div class="flashcard-back">
              <div class="flashcard-content">
                <div class="flashcard-label">Back</div>
                <div class="flashcard-text">${backContent}</div>
                <div class="flashcard-hint">Click to flip back</div>
              </div>
            </div>
          </div>
        </div>
        <div class="flashcard-navigation">
          <button class="flashcard-nav-button flashcard-prev-btn" onclick="learnManager.previousFlashcard()" ${this.currentFlashcardIndex === 0 ? 'disabled' : ''}>
            ← Previous
          </button>
          <div class="flashcard-counter">
            ${this.currentFlashcardIndex + 1} / ${this.flashcards.length}
          </div>
          <button class="flashcard-nav-button flashcard-next-btn" onclick="learnManager.nextFlashcard()" ${this.currentFlashcardIndex === this.flashcards.length - 1 ? 'disabled' : ''}>
            Next →
          </button>
        </div>
      </div>
    `;
  }

  formatFlashcardContent(content) {
    if (!content) return '';

    // Convert markdown-style formatting to HTML
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/\n/g, '<br>') // Line breaks
      .replace(/\|/g, '</td><td>'); // Table cells (basic)

    // Handle simple tables
    if (formatted.includes('</td><td>')) {
      const lines = formatted.split('<br>');
      const tableLines = [];
      let inTable = false;
      
      lines.forEach(line => {
        if (line.includes('</td><td>')) {
          if (!inTable) {
            tableLines.push('<table class="flashcard-table">');
            inTable = true;
          }
          tableLines.push(`<tr><td>${line}</td></tr>`);
        } else {
          if (inTable) {
            tableLines.push('</table>');
            inTable = false;
          }
          tableLines.push(line);
        }
      });
      
      if (inTable) {
        tableLines.push('</table>');
      }
      
      formatted = tableLines.join('<br>');
    }

    return formatted;
  }

  flipFlashcard() {
    this.isFlashcardFlipped = !this.isFlashcardFlipped;
    
    // Update the card flip state
    const card = document.querySelector('.flashcard-card');
    if (card) {
      if (this.isFlashcardFlipped) {
        card.classList.add('flipped');
      } else {
        card.classList.remove('flipped');
      }
    }
  }

  nextFlashcard() {
    if (this.currentFlashcardIndex < this.flashcards.length - 1) {
      this.currentFlashcardIndex++;
      this.isFlashcardFlipped = false;
      this.renderFlashcard();
    }
  }

  previousFlashcard() {
    if (this.currentFlashcardIndex > 0) {
      this.currentFlashcardIndex--;
      this.isFlashcardFlipped = false;
      this.renderFlashcard();
    }
  }

  async startQuiz(projectId) {
    try {
      // Get the quiz data for this project
      const project = this.projects.find(p => p.id === projectId);
      if (!project || !project.quiz_id) {
        this.showErrorMessage('Quiz not found for this project');
        return;
      }

      const quizResult = await this.database.getQuizById(project.quiz_id);
      if (!quizResult.success || !quizResult.data) {
        this.showErrorMessage('Failed to load quiz data');
        return;
      }

      this.currentQuiz = quizResult.data;
      
      // Parse questions if they're stored as a string
      let questions = this.currentQuiz.questions;
      if (typeof questions === 'string') {
        try {
          // Extract first [...] block from the string using regex
          const match = questions.match(/\[[\s\S]*\]/);
          if (!match) throw new Error("No JSON array found in quiz data");
      
          const cleanedQuestions = match[0];  // exact JSON array
          questions = JSON.parse(cleanedQuestions);
        } catch (parseError) {
          console.error('Error parsing quiz questions:', parseError);
          this.showErrorMessage('Failed to parse quiz questions');
          return;
        }
      }

      
      this.currentQuiz.questions = questions;
      this.currentQuestionIndex = 0;
      this.userAnswers = [];
      this.quizScore = 0;

      this.showQuizModal();
      this.renderQuizInterface();
    } catch (error) {
      console.error('Error starting quiz:', error);
      this.showErrorMessage('Failed to start quiz');
    }
  }

  showQuizModal() {
    const modal = document.getElementById('quiz-taking-modal');
    if (modal) {
      modal.classList.add('active');
    }
  }

  hideQuizModal() {
    const modal = document.getElementById('quiz-taking-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    // Reset quiz state
    this.currentQuiz = null;
    this.currentQuestionIndex = 0;
    this.userAnswers = [];
    this.quizScore = 0;
  }

  renderQuizInterface() {
    const modalContent = document.getElementById('quiz-modal-content');
    const modalTitle = document.getElementById('quiz-modal-title-text');
    const modalProgress = document.getElementById('quiz-modal-progress');
    
    if (!modalContent || !this.currentQuiz) return;

    const questions = this.currentQuiz.questions;
    const currentQuestion = questions[this.currentQuestionIndex];
    
    // Fix: Use 'options' instead of 'choices'
    const safeOptions = Array.isArray(currentQuestion.options) ? currentQuestion.options : [];

    // Update modal title and progress
    modalTitle.textContent = this.currentQuiz.title || 'Quiz';
    modalProgress.textContent = `Question ${this.currentQuestionIndex + 1} of ${questions.length}`;

    modalContent.innerHTML = `
      <div class="quiz-question-container">
        <div class="quiz-question-number">Question ${this.currentQuestionIndex + 1}</div>
        <div class="quiz-question-text">${currentQuestion.question}</div>
        <div class="quiz-options-container">
          ${safeOptions.map((option, index) => `
            <div class="quiz-option" onclick="learnManager.selectQuizOption(${index})" data-option-index="${index}">
              <div class="quiz-option-letter">${String.fromCharCode(65 + index)}</div>
              <div class="quiz-option-text">${option}</div>
              <div class="quiz-option-feedback"></div>
            </div>
          `).join('')}
        </div>
        <div class="quiz-navigation">
          <button class="quiz-nav-button quiz-prev-btn" onclick="learnManager.previousQuestion()" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
            ← Previous
          </button>
          <button class="quiz-nav-button quiz-submit-btn" onclick="learnManager.submitQuizAnswer()" disabled>
            ${this.currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question →'}
          </button>
        </div>
      </div>
    `;
  }

  selectQuizOption(optionIndex) {
    // Remove previous selections
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(option => {
      option.classList.remove('selected');
    });

    // Select the clicked option
    options[optionIndex].classList.add('selected');

    // Enable submit button
    const submitBtn = document.querySelector('.quiz-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = false;
    }

    // Store the selected option
    this.selectedOptionIndex = optionIndex;
  }

  async submitQuizAnswer() {
    if (this.selectedOptionIndex === undefined) return;

    const questions = this.currentQuiz.questions;
    const currentQuestion = questions[this.currentQuestionIndex];
    const correctIndex = currentQuestion.correct_answer;
    const isCorrect = this.selectedOptionIndex === correctIndex;

    // Store the answer
    this.userAnswers[this.currentQuestionIndex] = {
      questionIndex: this.currentQuestionIndex,
      selectedOption: this.selectedOptionIndex,
      correctOption: correctIndex,
      isCorrect: isCorrect
    };

    if (isCorrect) {
      this.quizScore++;
    }

    // Show feedback
    this.showQuizAnswerFeedback(this.selectedOptionIndex, correctIndex);

    // Wait a moment then proceed
    setTimeout(() => {
      if (this.currentQuestionIndex < questions.length - 1) {
        this.nextQuestion();
      } else {
        this.showQuizResults();
      }
    }, 2000);
  }

  showQuizAnswerFeedback(selectedIndex, correctIndex) {
    const options = document.querySelectorAll('.quiz-option');
    
    options.forEach((option, index) => {
      option.classList.add('disabled');
      const feedback = option.querySelector('.quiz-option-feedback');
      
      if (index === correctIndex) {
        option.classList.add('correct');
        feedback.textContent = '✓ Correct!';
        feedback.style.color = 'var(--success-500)';
        feedback.style.display = 'block';
      } else if (index === selectedIndex) {
        option.classList.add('incorrect');
        feedback.textContent = '✗ Incorrect';
        feedback.style.color = 'var(--error-500)';
        feedback.style.display = 'block';
      }
    });

    // Disable submit button
    const submitBtn = document.querySelector('.quiz-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
    }
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.selectedOptionIndex = undefined;
    this.renderQuizInterface();
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.selectedOptionIndex = undefined;
      this.renderQuizInterface();
    }
  }

  showQuizResults() {
    const modalContent = document.getElementById('quiz-modal-content');
    const modalTitle = document.getElementById('quiz-modal-title-text');
    const modalProgress = document.getElementById('quiz-modal-progress');
    
    if (!modalContent) return;

    const totalQuestions = this.currentQuiz.questions.length;
    const percentage = Math.round((this.quizScore / totalQuestions) * 100);

    // Update modal header
    modalTitle.textContent = 'Quiz Complete!';
    modalProgress.textContent = `Final Score: ${percentage}%`;

    modalContent.innerHTML = `
      <div class="quiz-results-container">
        <div class="quiz-results-icon">🎉</div>
        <div class="quiz-results-score">${percentage}%</div>
        <div class="quiz-results-text">
          You scored ${this.quizScore} out of ${totalQuestions} questions correctly!
        </div>
        <div class="quiz-results-performance">
          ${this.getPerformanceMessage(percentage)}
        </div>
        <div class="quiz-results-actions">
          <button class="quiz-restart-btn" onclick="learnManager.restartQuiz()">
            🔄 Take Quiz Again
          </button>
          <button class="quiz-close-btn" onclick="learnManager.hideQuizModal()">
            ✓ Close Quiz
          </button>
        </div>
      </div>
    `;
  }

  getPerformanceMessage(percentage) {
    if (percentage >= 90) return "🌟 Excellent work! You've mastered this material!";
    if (percentage >= 80) return "👏 Great job! You have a solid understanding!";
    if (percentage >= 70) return "👍 Good work! Consider reviewing a few topics.";
    if (percentage >= 60) return "📚 Not bad! Some more study would be helpful.";
    return "💪 Keep studying! You'll get there with more practice.";
  }

  restartQuiz() {
    this.currentQuestionIndex = 0;
    this.userAnswers = [];
    this.quizScore = 0;
    this.selectedOptionIndex = undefined;
    this.renderQuizInterface();
  }

  async loadAndDisplaySummary(project) {
    const summaryContainer = document.getElementById('project-summary-container');
    const summaryContent = document.getElementById('project-summary-content');
    
    if (!summaryContainer || !summaryContent) return;

    // Show loading state
    summaryContent.innerHTML = `
      <div class="summary-loading">
        <div class="loading-icon">📝</div>
        <h4>Loading Summary</h4>
        <p>Retrieving your AI-generated summary...</p>
      </div>
    `;

    try {
      // If summary is already in the project object, display it
      if (project.summary_content) {
        this.displaySummaryContent(project.summary_content);
        this.updateSummaryMeta(project.summary_content);
        return;
      }

      // Otherwise, fetch the latest project data
      const result = await this.database.getProjectById(project.id);
      if (result.success && result.data.summary_content) {
        this.displaySummaryContent(result.data.summary_content);
        this.updateSummaryMeta(result.data.summary_content);
      } else {
        // No summary available
        summaryContent.innerHTML = `
          <div class="summary-empty">
            <div class="empty-icon">📝</div>
            <h4>Summary Not Available</h4>
            <p>The summary for this project is not yet available or failed to generate.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading summary:', error);
      summaryContent.innerHTML = `
        <div class="summary-error">
          <div class="error-icon">⚠️</div>
          <h4>Error Loading Summary</h4>
          <p>Failed to load the summary. Please try again later.</p>
        </div>
      `;
    }
  }

  displaySummaryContent(summaryText) {
    const summaryContent = document.getElementById('project-summary-content');
    if (!summaryContent) return;

    // Convert plain text to formatted HTML
    const formattedSummary = this.formatSummaryText(summaryText);
    summaryContent.innerHTML = formattedSummary;
  }

  formatSummaryText(text) {
    if (!text) return '';

    // Split into paragraphs and format
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map(paragraph => {
      const trimmed = paragraph.trim();
      
      // Check if it's a heading (starts with #, ##, etc. or is all caps and short)
      if (trimmed.startsWith('#')) {
        const level = (trimmed.match(/^#+/) || [''])[0].length;
        const text = trimmed.replace(/^#+\s*/, '');
        return `<h${Math.min(level, 6)}>${text}</h${Math.min(level, 6)}>`;
      }
      
      // Check if it's a list item
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split('\n').map(item => {
          const cleaned = item.replace(/^[-*]\s*/, '').trim();
          return cleaned ? `<li>${cleaned}</li>` : '';
        }).filter(item => item);
        return `<ul>${items.join('')}</ul>`;
      }
      
      // Check if it's a numbered list
      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed.split('\n').map(item => {
          const cleaned = item.replace(/^\d+\.\s*/, '').trim();
          return cleaned ? `<li>${cleaned}</li>` : '';
        }).filter(item => item);
        return `<ol>${items.join('')}</ol>`;
      }
      
      // Regular paragraph
      return `<p>${trimmed}</p>`;
    }).join('');
  }

  updateSummaryMeta(summaryText) {
    const wordCountEl = document.getElementById('summary-word-count');
    const generatedTimeEl = document.getElementById('summary-generated-time');
    
    if (wordCountEl && summaryText) {
      const wordCount = summaryText.split(/\s+/).length;
      wordCountEl.textContent = `• ${wordCount} words`;
    }
    
    if (generatedTimeEl) {
      generatedTimeEl.textContent = '• Generated';
    }
  }

  // Copy summary to clipboard
  copySummary() {
    const summaryContent = document.getElementById('project-summary-content');
    if (!summaryContent) return;

    const textContent = summaryContent.innerText || summaryContent.textContent;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textContent).then(() => {
        this.showSuccessMessage('Summary copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy summary:', err);
        this.showErrorMessage('Failed to copy summary');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = textContent;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.showSuccessMessage('Summary copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy summary:', err);
        this.showErrorMessage('Failed to copy summary');
      }
      document.body.removeChild(textArea);
    }
  }

  // Download summary as text file
  downloadSummary() {
    const summaryContent = document.getElementById('project-summary-content');
    const projectTitle = document.getElementById('project-viewer-title');
    
    if (!summaryContent) return;

    const textContent = summaryContent.innerText || summaryContent.textContent;
    const fileName = `${projectTitle?.textContent || 'Summary'}_Summary.txt`;
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showSuccessMessage('Summary downloaded successfully!');
  }

  getFileTypeLabel(fileType) {
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('wordprocessingml') || fileType.includes('msword')) return 'Word';
    if (fileType.includes('image')) return 'Image';
    if (fileType.includes('text')) return 'Text';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'PPT';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'Excel';
    return 'File';
  }

  resetWorkspaceForm() {
    if (this.subjectSelect) this.subjectSelect.value = '';
    if (this.projectNameInput) this.projectNameInput.value = '';
    if (this.materialsContainer) {
      this.materialsContainer.innerHTML = `
        <div class="empty-materials">
          <p>Select a subject to see available materials</p>
        </div>
      `;
    }
    if (this.actionsContainer) this.actionsContainer.style.display = 'none';
    
    this.selectedMaterials = [];
    this.selectedActions = [];
    
    // Reset action checkboxes
    const actionCheckboxes = document.querySelectorAll('.action-checkbox');
    actionCheckboxes.forEach(checkbox => {
      checkbox.checked = false;
    });

    // Reset quiz settings
    if (this.quizQuestionCountInput) this.quizQuestionCountInput.value = '5';
    if (this.quizDifficultySelect) this.quizDifficultySelect.value = 'medium';
    if (this.quizSettingsRow) this.quizSettingsRow.style.display = 'none';

    this.updateGenerateButton();
  }

  // Utility methods
  getFileIcon(fileType) {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('doc')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📃';
    return '📁';
  }

  getSubjectLabel(subject) {
    const labels = {
      math: 'Mathematics',
      science: 'Science',
      history: 'History',
      english: 'English'
    };
    return labels[subject] || subject;
  }

  getSubjectClass(subject) {
    const predefinedSubjects = ['math', 'science', 'history', 'english', 'untagged'];
    return predefinedSubjects.includes(subject) ? subject : 'custom';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

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

// Make learnManager globally available
window.learnManager = null;