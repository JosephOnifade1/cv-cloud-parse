// Fallback worker stub for PDF.js
// This is loaded when CDN fails
self.onmessage = function(e) {
  // Simple stub that just returns an error
  self.postMessage({
    type: 'error',
    data: 'PDF worker not available - falling back to simple mode'
  });
};