export class MaterialsManager {
  constructor(databaseManager, authManager) {
    this.database = databaseManager;
    this.auth = authManager;
    this.materials = [];
    this.filteredMaterials = [];
    this.currentMaterialForTag = null;
    this.fileCache = new Map(); // Cache for downloaded files
    this.isLoadingMaterials = false; // Prevent concurrent loading
    
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    // Upload elements
    this.uploadBtn = document.getElementById('upload-btn');
    this.uploadBtnDashboard = document.getElementById('upload-btn-dashboard');
    this.fileInput = document.getElementById('file-upload');
    this.uploadZone = document.getElementById('upload-zone');
    
    // Filter and sort elements
    this.subjectFilter = document.getElementById('subject-filter');
    this.dateFilter = document.getElementById('date-filter');
    this.sortSelect = document.getElementById('sort-select');
    
    // Materials list
    this.materialsList = document.getElementById('materials-list');
    
    // Subject modal
    this.subjectModal = document.getElementById('subject-modal');
    this.subjectForm = document.getElementById('subject-form');
    this.materialSubject = document.getElementById('material-subject');
    this.customSubject = document.getElementById('custom-subject');
    this.customSubjectGroup = document.getElementById('custom-subject-group');

    // Material viewer modal
    this.viewerModal = document.getElementById('material-viewer-modal');
    this.viewerContent = document.getElementById('viewer-content');
    this.viewerMaterialName = document.getElementById('viewer-material-name');
    this.viewerMaterialType = document.getElementById('viewer-material-type');
    this.viewerMaterialSize = document.getElementById('viewer-material-size');
    this.viewerMaterialDate = document.getElementById('viewer-material-date');

    // Rename modal elements
    this.renameModal = this.createRenameModal();
  }

  createRenameModal() {
    // Create rename modal if it doesn't exist
    let modal = document.getElementById('rename-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rename-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Rename Material</h3>
            <button id="close-rename-modal" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <form id="rename-form">
              <div class="form-group">
                <label for="new-material-name">New Name:</label>
                <input type="text" id="new-material-name" required>
              </div>
              <div class="modal-actions">
                <button type="button" id="cancel-rename" class="btn btn-ghost">Cancel</button>
                <button type="submit" class="btn btn-primary">Rename</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  }

  attachEventListeners() {
    // Upload events
    this.uploadBtn?.addEventListener('click', () => this.fileInput.click());
    this.uploadBtnDashboard?.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    
    // Drag and drop
    this.uploadZone?.addEventListener('click', () => this.fileInput.click());
    this.uploadZone?.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone?.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone?.addEventListener('drop', (e) => this.handleDrop(e));
    
    // Filter and sort events
    this.subjectFilter?.addEventListener('change', () => this.applyFilters());
    this.dateFilter?.addEventListener('change', () => this.applyFilters());
    this.sortSelect?.addEventListener('change', () => this.applySorting());
    
    // Subject modal events
    this.subjectForm?.addEventListener('submit', (e) => this.handleSubjectTag(e));
    document.getElementById('close-subject-modal')?.addEventListener('click', () => this.hideSubjectModal());
    document.getElementById('cancel-subject')?.addEventListener('click', () => this.hideSubjectModal());
    
    // Material viewer modal events
    document.getElementById('close-viewer-modal')?.addEventListener('click', () => this.hideViewerModal());
    document.getElementById('download-material')?.addEventListener('click', () => this.downloadMaterial());
    
    // Rename modal events
    document.getElementById('close-rename-modal')?.addEventListener('click', () => this.hideRenameModal());
    document.getElementById('cancel-rename')?.addEventListener('click', () => this.hideRenameModal());
    document.getElementById('rename-form')?.addEventListener('submit', (e) => this.handleRename(e));
    
    // Modal outside click
    this.subjectModal?.addEventListener('click', (e) => {
      if (e.target === this.subjectModal) this.hideSubjectModal();
    });

    this.viewerModal?.addEventListener('click', (e) => {
      if (e.target === this.viewerModal) this.hideViewerModal();
    });

    this.renameModal?.addEventListener('click', (e) => {
      if (e.target === this.renameModal) this.hideRenameModal();
    });
    
    // Custom subject toggle
    this.materialSubject?.addEventListener('change', () => {
      if (this.materialSubject.value === 'other') {
        this.customSubjectGroup.style.display = 'block';
        this.customSubject.required = true;
        this.customSubject.focus();
      } else {
        this.customSubjectGroup.style.display = 'none';
        this.customSubject.required = false;
        this.customSubject.value = '';
      }
    });
  }

  // Drag and Drop Methods
  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('drag-over');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    this.processFiles(files);
  }

  // File Upload Methods
  async handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    this.processFiles(files);
    this.fileInput.value = '';
  }

  async processFiles(files) {
    console.log('🔄 Starting processFiles with files:', files.map(f => f.name));
  
    const user = this.auth.getCurrentUser();
    if (!user) return;
  
    this.showLoading();
    let successCount = 0;
  
    try {
      for (const file of files) {
        console.log('📁 Processing file:', file.name);
  
        const uploadResult = await this.database.uploadFile(user.id, file, file.name);
        if (!uploadResult.success) {
          console.error('❌ File upload failed:', uploadResult.error);
          continue;
        }
  
        const materialData = {
          name: file.name,
          type: file.type || 'unknown',
          size: file.size,
          subject: 'untagged'
        };
  
        const result = await this.database.saveMaterial(user.id, materialData, uploadResult.filePath);
  
        if (result.success) {
          const material = result.data?.[0];
          if (material?.id) {
            this.fileCache.set(material.id, file);
            successCount++;
            console.log('✅ Saved material with ID:', material.id);
          }
        } else {
          console.error('❌ Failed to save material metadata:', result.error);
        }
      }
  
      if (successCount > 0) {
        console.log('🔄 Reloading materials from database after upload...');
        await this.loadUserMaterials();  // Safe reload
        this.showSuccessMessage(`Successfully uploaded ${successCount} file(s)`);
      } else {
        this.showErrorMessage('Failed to upload files. Please try again.');
      }
  
    } catch (error) {
      console.error('⚠️ Upload error:', error);
      this.showErrorMessage('An unexpected error occurred while uploading.');
    } finally {
      this.hideLoading();
    }
  }

  // Subject Filter Methods
  updateSubjectFilter() {
    if (!this.subjectFilter) return;

    // Get all unique subjects from materials
    const allSubjects = [...new Set(this.materials.map(material => material.subject))];
    
    // Separate predefined and custom subjects
    const predefinedSubjects = ['math', 'science', 'history', 'english'];
    const customSubjects = allSubjects.filter(subject => 
      subject && subject !== 'untagged' && !predefinedSubjects.includes(subject)
    ).sort();

    // Store current selection
    const currentValue = this.subjectFilter.value;

    // Clear existing options except the first one
    this.subjectFilter.innerHTML = '<option value="">All Subjects</option>';

    // Add predefined subjects
    predefinedSubjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = this.getSubjectLabel(subject);
      this.subjectFilter.appendChild(option);
    });

    // Add custom subjects if any exist
    if (customSubjects.length > 0) {
      // Add separator
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '── Custom Subjects ──';
      this.subjectFilter.appendChild(separator);

      // Add custom subjects
      customSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        this.subjectFilter.appendChild(option);
      });
    }

    // Add untagged option
    if (allSubjects.includes('untagged')) {
      const option = document.createElement('option');
      option.value = 'untagged';
      option.textContent = 'Untagged';
      this.subjectFilter.appendChild(option);
    }

    // Restore previous selection if it still exists
    if (currentValue && allSubjects.includes(currentValue)) {
      this.subjectFilter.value = currentValue;
    }
  }

  // Subject Tagging Methods
  showSubjectModal(material) {
    this.currentMaterialForTag = material;
    this.subjectModal.classList.add('active');
    this.materialSubject.value = material.subject || '';
    
    // Hide custom subject initially
    this.customSubjectGroup.style.display = 'none';
    this.customSubject.required = false;
    this.customSubject.value = '';
    
    // If current subject is a custom one (not in predefined list), show it
    const predefinedSubjects = ['math', 'science', 'history', 'english', 'untagged'];
    if (material.subject && !predefinedSubjects.includes(material.subject)) {
      this.materialSubject.value = 'other';
      this.customSubjectGroup.style.display = 'block';
      this.customSubject.required = true;
      this.customSubject.value = material.subject;
    }
  }

  hideSubjectModal() {
    this.subjectModal.classList.remove('active');
    this.subjectForm.reset();
    this.customSubjectGroup.style.display = 'none';
    this.customSubject.required = false;
    this.currentMaterialForTag = null;
  }

  async handleSubjectTag(e) {
    e.preventDefault();
    
    if (!this.currentMaterialForTag) return;

    let subject = this.materialSubject.value;
    if (subject === 'other') {
      subject = this.customSubject.value.trim();
      if (!subject) {
        this.showErrorMessage('Please enter a custom subject name.');
        return;
      }
    }

    if (!subject) {
      this.showErrorMessage('Please select or enter a subject.');
      return;
    }

    this.showLoading();

    try {
      const result = await this.database.updateMaterialSubject(
        this.currentMaterialForTag.id, 
        subject
      );
      
      if (result.success) {
        // Update local material
        const materialIndex = this.materials.findIndex(m => m.id === this.currentMaterialForTag.id);
        if (materialIndex !== -1) {
          this.materials[materialIndex].subject = subject;
        }
        
        this.updateSubjectFilter();
        this.applyFilters();
        this.hideSubjectModal();
        this.showSuccessMessage('Subject tag added successfully!');
      } else {
        this.showErrorMessage('Failed to add subject tag. Please try again.');
      }
    } catch (error) {
      console.error('Subject tag error:', error);
      this.showErrorMessage('Failed to add subject tag. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  // Rename Methods
  showRenameModal(material) {
    this.currentMaterialForRename = material;
    const nameInput = document.getElementById('new-material-name');
    if (nameInput) {
      nameInput.value = material.name;
    }
    this.renameModal.classList.add('active');
  }

  hideRenameModal() {
    this.renameModal.classList.remove('active');
    this.currentMaterialForRename = null;
  }

  async handleRename(e) {
    e.preventDefault();
    
    if (!this.currentMaterialForRename) return;

    const newName = document.getElementById('new-material-name').value.trim();
    if (!newName) {
      this.showErrorMessage('Please enter a new name.');
      return;
    }

    this.showLoading();

    try {
      const result = await this.database.updateMaterialName(
        this.currentMaterialForRename.id, 
        newName
      );
      
      if (result.success) {
        // Update local material
        const materialIndex = this.materials.findIndex(m => m.id === this.currentMaterialForRename.id);
        if (materialIndex !== -1) {
          this.materials[materialIndex].name = newName;
        }
        
        this.applyFilters();
        this.hideRenameModal();
        this.showSuccessMessage('Material renamed successfully!');
      } else {
        this.showErrorMessage('Failed to rename material. Please try again.');
      }
    } catch (error) {
      console.error('Rename error:', error);
      this.showErrorMessage('Failed to rename material. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  // Delete Methods
  async deleteMaterial(materialId) {
    const material = this.getMaterialById(materialId);
    if (!material) return;

    if (!confirm(`Are you sure you want to delete "${material.name}"? This action cannot be undone.`)) {
      return;
    }

    this.showLoading();

    try {
      const result = await this.database.deleteMaterial(materialId);
      
      if (result.success) {
        // Remove from local array
        this.materials = this.materials.filter(m => m.id !== materialId);
        
        // Remove from cache
        this.fileCache.delete(materialId);
        
        this.updateSubjectFilter();
        this.applyFilters();
        this.showSuccessMessage('Material deleted successfully!');
      } else {
        this.showErrorMessage('Failed to delete material. Please try again.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      this.showErrorMessage('Failed to delete material. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  // Material Viewer Methods
  async showMaterialViewer(material) {
    this.currentViewingMaterial = material;
    
    // Update modal header
    this.viewerMaterialName.textContent = material.name;
    this.viewerMaterialType.textContent = this.getFileTypeLabel(material.type);
    this.viewerMaterialSize.textContent = this.formatFileSize(material.size);
    this.viewerMaterialDate.textContent = new Date(material.uploaded_at).toLocaleDateString();
    
    // Clear previous content
    this.viewerContent.innerHTML = '<div class="loading-content">Loading preview...</div>';
    
    // Show modal
    this.viewerModal.classList.add('active');
    
    // Load content
    await this.loadMaterialContent(material);
  }

  hideViewerModal() {
    this.viewerModal.classList.remove('active');
    this.currentViewingMaterial = null;
  }

  async loadMaterialContent(material) {
    try {
      let fileBlob = null;
      
      // Check if file is in cache first
      if (this.fileCache.has(material.id)) {
        fileBlob = this.fileCache.get(material.id);
      } else if (material.file_path) {
        // Download from Supabase Storage
        const downloadResult = await this.database.downloadFile(material.file_path);
        if (downloadResult.success) {
          fileBlob = downloadResult.data;
          // Cache the downloaded file
          this.fileCache.set(material.id, fileBlob);
        }
      }

      if (!fileBlob) {
        this.loadUnsupportedContent(material);
        return;
      }

      const fileType = material.type.toLowerCase();
      const fileName = material.name.toLowerCase();
      
      if (fileType.includes('image')) {
        this.loadImageContent(fileBlob, material);
      } else if (fileType.includes('text') || fileType === 'text/plain') {
        this.loadTextContent(fileBlob, material);
      } else if (fileType.includes('pdf')) {
        this.loadPDFContent(fileBlob, material);
      } else if (this.isWordDocument(fileType, fileName)) {
        await this.loadWordContent(fileBlob, material);
      } else {
        this.loadUnsupportedContent(material);
      }
    } catch (error) {
      console.error('Error loading material content:', error);
      this.loadUnsupportedContent(material);
    }
  }

  isWordDocument(fileType, fileName) {
    return fileType.includes('wordprocessingml') || 
           fileType.includes('msword') ||
           fileName.endsWith('.docx') ||
           fileName.endsWith('.doc');
  }

  loadImageContent(fileBlob, material) {
    const url = URL.createObjectURL(fileBlob);
    this.viewerContent.innerHTML = `
      <img src="${url}" alt="${material.name}" class="file-preview" onload="URL.revokeObjectURL('${url}')">
    `;
  }

  async loadTextContent(fileBlob, material) {
    try {
      const text = await fileBlob.text();
      this.viewerContent.innerHTML = `
        <div class="text-preview">${this.escapeHtml(text)}</div>
      `;
    } catch (error) {
      console.error('Error reading text file:', error);
      this.loadUnsupportedContent(material);
    }
  }

  loadPDFContent(fileBlob, material) {
    const url = URL.createObjectURL(fileBlob);
    this.viewerContent.innerHTML = `
      <iframe src="${url}" style="width: 100%; height: 100%; border: none; border-radius: 8px;"></iframe>
    `;
    
    // Clean up URL after a delay to allow iframe to load
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async loadWordContent(fileBlob, material) {
    try {
      // For DOCX files, we'll use a different approach
      if (material.name.toLowerCase().endsWith('.docx')) {
        await this.loadDocxContent(fileBlob, material);
      } else {
        // For older .doc files, show a message that they need to be downloaded
        this.loadWordDownloadMessage(material);
      }
    } catch (error) {
      console.error('Error loading Word document:', error);
      this.loadWordDownloadMessage(material);
    }
  }

  async loadDocxContent(fileBlob, material) {
    try {
      // Import mammoth.js dynamically for DOCX conversion
      const mammoth = await this.loadMammothLibrary();
      
      if (!mammoth) {
        this.loadWordDownloadMessage(material);
        return;
      }

      // Convert DOCX to HTML
      const arrayBuffer = await fileBlob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      if (result.value) {
        this.viewerContent.innerHTML = `
          <div class="docx-preview">
            <div class="docx-content">${result.value}</div>
            ${result.messages.length > 0 ? `
              <div class="docx-messages">
                <details>
                  <summary>Conversion Notes</summary>
                  <ul>
                    ${result.messages.map(msg => `<li>${msg.message}</li>`).join('')}
                  </ul>
                </details>
              </div>
            ` : ''}
          </div>
        `;
      } else {
        this.loadWordDownloadMessage(material);
      }
    } catch (error) {
      console.error('Error converting DOCX:', error);
      this.loadWordDownloadMessage(material);
    }
  }

  async loadMammothLibrary() {
    try {
      // Try to load mammoth.js from CDN
      if (window.mammoth) {
        return window.mammoth;
      }

      // Dynamically load mammoth.js
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          resolve(window.mammoth);
        };
        script.onerror = () => {
          console.warn('Failed to load mammoth.js library');
          resolve(null);
        };
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('Error loading mammoth library:', error);
      return null;
    }
  }

  loadWordDownloadMessage(material) {
    const fileIcon = this.getFileIcon(material.type);
    this.viewerContent.innerHTML = `
      <div class="word-document-preview">
        <div class="file-icon">${fileIcon}</div>
        <h4>Word Document Preview</h4>
        <p>This Word document can be downloaded and opened in Microsoft Word or a compatible application.</p>
        <div class="word-preview-actions">
          <button class="btn btn-primary" onclick="materialsManager.downloadMaterial()">
            <span class="btn-icon">⬇️</span>
            Download Document
          </button>
        </div>
        <div class="word-preview-note">
          <p><strong>Note:</strong> For DOCX files, we attempt to show a preview. For older DOC files, download is required.</p>
        </div>
      </div>
    `;
  }

  loadUnsupportedContent(material) {
    const fileIcon = this.getFileIcon(material.type);
    this.viewerContent.innerHTML = `
      <div class="unsupported-file">
        <div class="file-icon">${fileIcon}</div>
        <h4>Preview not available</h4>
        <p>This file type cannot be previewed in the browser.</p>
        <p>Use the download button to view the file in an external application.</p>
      </div>
    `;
  }

  async downloadMaterial() {
    if (!this.currentViewingMaterial) {
      this.showErrorMessage('No material selected for download.');
      return;
    }

    try {
      let fileBlob = null;
      
      // Check cache first
      if (this.fileCache.has(this.currentViewingMaterial.id)) {
        fileBlob = this.fileCache.get(this.currentViewingMaterial.id);
      } else if (this.currentViewingMaterial.file_path) {
        // Download from storage
        const downloadResult = await this.database.downloadFile(this.currentViewingMaterial.file_path);
        if (downloadResult.success) {
          fileBlob = downloadResult.data;
        }
      }

      if (!fileBlob) {
        this.showErrorMessage('File not available for download.');
        return;
      }

      // Create download link
      const url = URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.currentViewingMaterial.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      this.showErrorMessage('Failed to download file.');
    }
  }

  // Filter and Sort Methods
  applyFilters() {
    console.log('🔍 Applying filters to materials array with length:', this.materials.length);
    
    let filtered = [...this.materials];

    // Subject filter
    const subjectFilter = this.subjectFilter?.value;
    if (subjectFilter) {
      filtered = filtered.filter(material => material.subject === subjectFilter);
    }

    // Date filter
    const dateFilter = this.dateFilter?.value;
    if (dateFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(material => {
        const materialDate = new Date(material.uploaded_at);
        
        switch (dateFilter) {
          case 'today':
            return materialDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return materialDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return materialDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    this.filteredMaterials = filtered;
    console.log('📋 Filtered materials array length:', this.filteredMaterials.length);
    this.applySorting();
  }

  applySorting() {
    const sortBy = this.sortSelect?.value || 'recent';
    
    this.filteredMaterials.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.uploaded_at) - new Date(a.uploaded_at);
        case 'oldest':
          return new Date(a.uploaded_at) - new Date(b.uploaded_at);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    console.log('📊 About to render materials. Filtered array length:', this.filteredMaterials.length);
    this.renderMaterials();
  }

  // Render Methods
  renderMaterials() {
    console.log('🎨 Rendering materials...');
    
    if (!this.materialsList) return;

    // Clear existing content to prevent duplicates
    this.materialsList.innerHTML = '';
    console.log('🧹 Cleared materials list container');

    if (this.filteredMaterials.length === 0) {
      this.materialsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <h4>No materials found</h4>
          <p>Try adjusting your filters or upload new materials</p>
        </div>
      `;
      console.log('📭 Rendered empty state');
      return;
    }

    const materialsHTML = this.filteredMaterials.map(material => {
      const fileIcon = this.getFileIcon(material.type);
      const fileSize = this.formatFileSize(material.size);
      const uploadDate = new Date(material.uploaded_at).toLocaleDateString();
      const subjectLabel = this.getSubjectLabel(material.subject);

      return `
        <div class="material-card" data-id="${material.id}" onclick="materialsManager.showMaterialViewer(materialsManager.getMaterialById('${material.id}'))">
          <div class="material-header">
            <div class="material-icon">${fileIcon}</div>
            <div class="material-info">
              <h4 class="material-name">${material.name}</h4>
              <div class="material-meta">
                <span class="material-size">${fileSize}</span>
                <span class="material-date">${uploadDate}</span>
              </div>
            </div>
          </div>
          
          <div class="material-subject">
            <span class="subject-tag ${this.getSubjectClass(material.subject)}">${subjectLabel}</span>
          </div>
          
          <div class="material-actions" onclick="event.stopPropagation()">
            <button class="action-btn rename-btn" onclick="materialsManager.showRenameModal(materialsManager.getMaterialById('${material.id}'))" title="Rename">
              <span class="action-icon">✏️</span>
            </button>
            <button class="action-btn tag-btn" onclick="materialsManager.showSubjectModal(materialsManager.getMaterialById('${material.id}'))" title="Add Tag">
              <span class="action-icon">🏷️</span>
            </button>
            <button class="action-btn delete-btn" onclick="materialsManager.deleteMaterial('${material.id}')" title="Delete">
              <span class="action-icon">🗑️</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.materialsList.innerHTML = materialsHTML;
    console.log('✅ Rendered', this.filteredMaterials.length, 'material cards');
  }

  // Data Loading Methods
  async loadUserMaterials() {
    console.log('📥 Loading user materials from database...');
  
    if (this.isLoadingMaterials) {
      console.log('⏸️ Already loading materials. Skipping.');
      return;
    }
  
    this.isLoadingMaterials = true;
  
    try {
      this.materials = [];  // Clear previous data to prevent duplication
      const user = this.auth.getCurrentUser();
      if (!user) return;
  
      const result = await this.database.getUserMaterials(user.id);
  
      if (result.success) {
        const fetchedMaterials = result.data || [];
  
        // De-duplicate by ID
        const uniqueMaterials = Array.from(
          new Map(fetchedMaterials.map(m => [m.id, m])).values()
        );
  
        // Optional: Log duplicates
        const ids = fetchedMaterials.map(m => m.id);
        const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
        if (duplicates.length > 0) {
          console.warn('🚨 Duplicate material IDs detected:', duplicates);
        }
  
        this.materials = uniqueMaterials;
        console.log('📊 Loaded materials. Unique count:', this.materials.length);
  
        this.updateSubjectFilter();
        this.applyFilters();
      }
    } catch (error) {
      console.error('❌ Error loading materials:', error);
    } finally {
      this.isLoadingMaterials = false;
    }
  }

  // Utility Methods
  getMaterialById(id) {
    return this.materials.find(material => material.id === id);
  }

  getFileIcon(fileType) {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('doc') || fileType.includes('wordprocessingml')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📃';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📊';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📈';
    return '📁';
  }

  getFileTypeLabel(fileType) {
    if (fileType.includes('pdf')) return 'PDF Document';
    if (fileType.includes('wordprocessingml') || fileType.includes('msword')) return 'Word Document';
    if (fileType.includes('image')) return 'Image';
    if (fileType.includes('text')) return 'Text File';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'Presentation';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'Spreadsheet';
    return 'Document';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getSubjectLabel(subject) {
    const labels = {
      math: 'Mathematics',
      science: 'Science',
      history: 'History',
      english: 'English',
      other: 'Other',
      untagged: 'Untagged'
    };
    return labels[subject] || subject;
  }

  getSubjectClass(subject) {
    const predefinedSubjects = ['math', 'science', 'history', 'english', 'untagged'];
    return predefinedSubjects.includes(subject) ? subject : 'custom';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .auth-error');
    existingMessages.forEach(msg => msg.remove());

    const messageEl = document.createElement('div');
    messageEl.className = type === 'success' ? 'success-message' : 'auth-error';
    messageEl.textContent = message;
    
    // Insert at the top of page container
    const pageContainer = document.querySelector('.page-container');
    if (pageContainer) {
      pageContainer.insertBefore(messageEl, pageContainer.firstChild);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.remove();
        }
      }, 5000);
    }
  }
}

// Make materialsManager globally available for onclick handlers
window.materialsManager = null;