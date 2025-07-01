export class PageManager {
  constructor() {
    this.currentPage = 'landing-page';
    this.pages = {
      'landing-page': document.getElementById('landing-page'),
      'onboarding-page': document.getElementById('onboarding-page'),
      'dashboard-page': document.getElementById('dashboard-page'),
      'project-viewer-page': document.getElementById('project-viewer-page')
    };
  }

  showPage(pageId) {
    // Hide all pages
    Object.values(this.pages).forEach(page => {
      if (page) page.classList.remove('active');
    });

    // Show selected page
    if (this.pages[pageId]) {
      this.pages[pageId].classList.add('active');
      this.currentPage = pageId;
    }
  }

  getCurrentPage() {
    return this.currentPage;
  }
}