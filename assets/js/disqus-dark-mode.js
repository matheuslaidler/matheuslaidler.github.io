// Force Disqus to use dark mode colors
(function() {
  const fixDisqusDarkMode = () => {
    const isDarkMode = document.documentElement.getAttribute('data-mode') === 'dark' ||
                       (window.matchMedia('(prefers-color-scheme: dark)').matches && 
                        !document.documentElement.getAttribute('data-mode'));
    
    if (!isDarkMode) return;

    // Wait for Disqus iframe to load
    setTimeout(() => {
      const disqusIframe = document.querySelector('iframe[src*="disqus"]');
      if (disqusIframe) {
        try {
          const iframeDoc = disqusIframe.contentDocument || disqusIframe.contentWindow.document;
          
          if (iframeDoc) {
            // Force white text color on all elements
            const style = iframeDoc.createElement('style');
            style.textContent = `
              body, body * {
                color: rgba(255, 255, 255, 0.85) !important;
                background-color: transparent !important;
              }
              a, a * {
                color: #73ffe8 !important;
              }
              a:visited {
                color: #73ffe8 !important;
              }
            `;
            iframeDoc.head.appendChild(style);
          }
        } catch (e) {
          // CORS policy may prevent access to iframe
          console.log('Cannot access Disqus iframe due to CORS');
        }
      }
    }, 2000);

    // Also watch for mode changes
    const observer = new MutationObserver(() => {
      const currentMode = document.documentElement.getAttribute('data-mode');
      if (currentMode === 'dark' || (!currentMode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        fixDisqusDarkMode();
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  };

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixDisqusDarkMode);
  } else {
    fixDisqusDarkMode();
  }

  // Also run when Disqus is reloaded
  window.addEventListener('message', (e) => {
    if (e.data && e.data.action === 'disqus.loaded') {
      setTimeout(fixDisqusDarkMode, 500);
    }
  });
})();
