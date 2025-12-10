// Force Disqus to use dark mode colors
(function() {
  console.log('Disqus dark mode script loaded');
  
  const isDarkMode = () => {
    const mode = document.documentElement.getAttribute('data-mode');
    if (mode) return mode === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const fixDisqusDarkMode = () => {
    if (!isDarkMode()) return;

    console.log('Fixing Disqus dark mode...');

    // Try to access and modify iframe
    setTimeout(() => {
      try {
        // Find all iframes that might contain Disqus
        const iframes = document.querySelectorAll('iframe[id*="disqus"]');
        
        iframes.forEach(iframe => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            if (iframeDoc && iframeDoc.body) {
              console.log('Accessed Disqus iframe, injecting styles...');
              
              // Remove any existing styles
              const existingStyle = iframeDoc.getElementById('disqus-dark-mode-style');
              if (existingStyle) existingStyle.remove();
              
              // Create and inject new style
              const style = iframeDoc.createElement('style');
              style.id = 'disqus-dark-mode-style';
              style.textContent = `
                * {
                  color: rgba(255, 255, 255, 0.85) !important;
                }
                body, body * {
                  color: rgba(255, 255, 255, 0.85) !important;
                  background-color: transparent !important;
                }
                a, a *, 
                .dsq-comment-text a,
                #disqus_thread a {
                  color: #73ffe8 !important;
                }
                a:visited, a:visited * {
                  color: #73ffe8 !important;
                }
                .dsq-comment-text {
                  color: rgba(255, 255, 255, 0.85) !important;
                }
              `;
              
              iframeDoc.head.appendChild(style);
              console.log('Disqus dark mode styles injected successfully');
            }
          } catch (e) {
            console.log('Cannot access iframe (CORS):', e.message);
          }
        });
      } catch (e) {
        console.log('Error fixing Disqus:', e.message);
      }
    }, 1500);
  };

  // Initial fix
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(fixDisqusDarkMode, 500);
    });
  } else {
    fixDisqusDarkMode();
  }

  // Watch for Disqus reload (when switching themes)
  const reloadObserver = () => {
    setTimeout(fixDisqusDarkMode, 800);
  };

  if (document.querySelector('.mode-toggle')) {
    window.addEventListener('message', (e) => {
      if (e.data && e.data.direction) {
        console.log('Theme toggle detected, fixing Disqus...');
        reloadObserver();
      }
    });
  }

  // Try multiple times as iframe loads gradually
  const attempts = [500, 1500, 3000, 5000];
  attempts.forEach(delay => {
    setTimeout(fixDisqusDarkMode, delay);
  });
})();

