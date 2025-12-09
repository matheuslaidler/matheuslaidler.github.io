/* ===== ENHANCED SIDEBAR & TOPBAR INTERACTIONS ===== */

document.addEventListener('DOMContentLoaded', function() {
  // Get the sidebar toggle button and sidebar
  const sidebarToggleBtn = document.getElementById('sidebar-trigger');
  const sidebar = document.getElementById('sidebar');
  
  if (!sidebarToggleBtn || !sidebar) return;

  // Toggle sidebar and rotate chevron
  sidebarToggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Toggle the sidebar display
    sidebar.classList.toggle('active');
    sidebarToggleBtn.classList.toggle('sidebar-open');
    
    // Store state for responsive behavior
    sessionStorage.setItem('sidebarOpen', sidebar.classList.contains('active'));
  });

  // Close sidebar when clicking outside (on mobile)
  document.addEventListener('click', function(e) {
    const isClickInsideSidebar = sidebar.contains(e.target);
    const isClickOnToggle = sidebarToggleBtn.contains(e.target);
    
    if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
      sidebarToggleBtn.classList.remove('sidebar-open');
      sessionStorage.setItem('sidebarOpen', false);
    }
  });

  // Close sidebar when a nav item is clicked (mobile)
  const navLinks = sidebar.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (window.innerWidth < 1200) {
        sidebar.classList.remove('active');
        sidebarToggleBtn.classList.remove('sidebar-open');
        sessionStorage.setItem('sidebarOpen', false);
      }
    });
  });

  // Restore sidebar state on page load
  if (sessionStorage.getItem('sidebarOpen') === 'true' && window.innerWidth < 1200) {
    sidebar.classList.add('active');
    sidebarToggleBtn.classList.add('sidebar-open');
  }

  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (window.innerWidth >= 1200) {
        sidebar.classList.remove('active');
        sidebarToggleBtn.classList.remove('sidebar-open');
        sessionStorage.setItem('sidebarOpen', false);
      }
    }, 250);
  });

  // ===== TECH HOVER EFFECTS =====
  
  // Add glow effect to nav items
  const navItems = sidebar.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    const link = item.querySelector('.nav-link');
    
    link.addEventListener('mouseenter', function() {
      this.style.boxShadow = '0 0 20px rgba(115, 255, 232, 0.3), inset 0 0 15px rgba(115, 255, 232, 0.1)';
    });
    
    link.addEventListener('mouseleave', function() {
      if (!item.classList.contains('active')) {
        this.style.boxShadow = 'none';
      }
    });
  });

  // Avatar hover effect
  const avatar = sidebar.querySelector('#avatar');
  if (avatar) {
    avatar.addEventListener('mouseenter', function() {
      this.style.filter = 'brightness(1.15) contrast(1.1)';
    });
    
    avatar.addEventListener('mouseleave', function() {
      this.style.filter = 'brightness(1) contrast(1)';
    });
  }

  // ===== SEARCH INTERACTIONS =====
  
  const searchTrigger = document.getElementById('search-trigger');
  const searchInput = document.getElementById('search-input');
  const searchCancel = document.getElementById('search-cancel');
  const searchWrapper = document.querySelector('search');

  if (searchTrigger && searchInput) {
    searchTrigger.addEventListener('click', function() {
      searchWrapper.classList.toggle('active');
      searchInput.focus();
    });

    if (searchCancel) {
      searchCancel.addEventListener('click', function() {
        searchInput.value = '';
        searchWrapper.classList.remove('active');
      });
    }

    // Close search when pressing Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && searchWrapper.classList.contains('active')) {
        searchWrapper.classList.remove('active');
        searchInput.blur();
      }
    });
  }

  // ===== MODE TOGGLE EFFECT =====
  
  const modeToggle = sidebar.querySelector('.mode-toggle');
  if (modeToggle) {
    modeToggle.addEventListener('click', function() {
      this.style.animation = 'spin 0.6s ease';
      setTimeout(() => {
        this.style.animation = 'none';
      }, 600);
    });
  }

  // ===== SCROLL EFFECTS =====
  
  const topbar = document.getElementById('topbar-wrapper');
  let lastScrollTop = 0;

  window.addEventListener('scroll', function() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > 50) {
      if (topbar) {
        topbar.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.4)';
      }
    } else {
      if (topbar) {
        topbar.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
      }
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  });

  // ===== BREADCRUMB HOVER EFFECTS =====
  
  const breadcrumbLinks = document.querySelectorAll('#breadcrumb a');
  breadcrumbLinks.forEach(link => {
    link.addEventListener('mouseenter', function() {
      this.style.color = '#73ffe8';
    });
    
    link.addEventListener('mouseleave', function() {
      this.style.color = 'rgba(115, 255, 232, 0.8)';
    });
  });

  // ===== CODE BLOCK HOVER EFFECTS =====
  
  const codeBlocks = document.querySelectorAll('pre');
  codeBlocks.forEach(block => {
    block.addEventListener('mouseenter', function() {
      this.style.boxShadow = '0 0 30px rgba(115, 255, 232, 0.3), inset 0 0 20px rgba(115, 255, 232, 0.08)';
      this.style.borderColor = 'rgba(115, 255, 232, 0.4)';
    });

    block.addEventListener('mouseleave', function() {
      this.style.boxShadow = '0 0 20px rgba(115, 255, 232, 0.1), inset 0 0 20px rgba(115, 255, 232, 0.02)';
      this.style.borderColor = 'rgba(115, 255, 232, 0.2)';
    });
  });

  // ===== HEADING GLOW EFFECTS =====
  
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    heading.addEventListener('mouseenter', function() {
      this.style.color = '#73ffe8';
      this.style.textShadow = '0 0 20px rgba(115, 255, 232, 0.5)';
    });

    heading.addEventListener('mouseleave', function() {
      this.style.color = 'rgba(255, 255, 255, 0.95)';
      this.style.textShadow = 'none';
    });
  });

  // ===== BLOCKQUOTE EFFECTS =====
  
  const blockquotes = document.querySelectorAll('blockquote');
  blockquotes.forEach(quote => {
    quote.addEventListener('mouseenter', function() {
      this.style.borderLeftColor = '#00ff88';
      this.style.boxShadow = '0 0 30px rgba(115, 255, 232, 0.2)';
    });

    quote.addEventListener('mouseleave', function() {
      this.style.borderLeftColor = '#73ffe8';
      this.style.boxShadow = '0 0 20px rgba(115, 255, 232, 0.1)';
    });
  });

  // ===== TABLE ROW HOVER EFFECTS =====
  
  const tableRows = document.querySelectorAll('tbody tr');
  tableRows.forEach(row => {
    row.addEventListener('mouseenter', function() {
      const cells = this.querySelectorAll('td');
      cells.forEach(cell => {
        cell.style.color = '#73ffe8';
      });
    });

    row.addEventListener('mouseleave', function() {
      const cells = this.querySelectorAll('td');
      cells.forEach(cell => {
        cell.style.color = 'rgba(255, 255, 255, 0.8)';
      });
    });
  });

  // ===== PAGE LOAD ANIMATIONS =====
  
  const mainContent = document.querySelector('main');
  if (mainContent) {
    mainContent.style.opacity = '0';
    mainContent.style.animation = 'fadeIn 0.8s ease-out forwards';
  }

  // Animate elements on load
  setTimeout(() => {
    const posts = document.querySelectorAll('.post-preview');
    posts.forEach((post, index) => {
      post.style.opacity = '0';
      post.style.animation = `slideInLeft ${0.5 + index * 0.1}s ease-out forwards`;
    });
  }, 300);
});

// Add animations to CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes glowPulse {
    0%, 100% {
      text-shadow: 0 0 10px rgba(115, 255, 232, 0.5);
    }
    50% {
      text-shadow: 0 0 20px rgba(115, 255, 232, 0.8);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .glow-pulse {
    animation: glowPulse 2s ease-in-out infinite;
  }

  .slide-in {
    animation: slideInLeft 0.5s ease-out;
  }

  .fade-in {
    animation: fadeIn 0.5s ease-out;
  }
`;
document.head.appendChild(style);
