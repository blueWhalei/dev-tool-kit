(function () {
  'use strict';

  var STORAGE_KEY = 'dtk-theme';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function getStoredTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setStoredTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* ignore */ }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var sun = document.querySelector('.icon-sun');
    var moon = document.querySelector('.icon-moon');
    if (sun && moon) {
      sun.style.display = theme === 'dark' ? 'block' : 'none';
      moon.style.display = theme === 'dark' ? 'none' : 'block';
    }
  }

  function initTheme() {
    var stored = getStoredTheme();
    var theme = stored || getSystemTheme();
    applyTheme(theme);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setStoredTheme(next);
  }

  function initScrollReveal() {
    var elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(function (el) { observer.observe(el); });
  }

  function initModal() {
    var overlay = document.getElementById('modal');
    var modalImg = document.getElementById('modalImg');
    if (!overlay || !modalImg) return;

    var items = document.querySelectorAll('.screenshot-item');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var theme = document.documentElement.getAttribute('data-theme') || 'dark';
        var src = item.getAttribute('data-src-' + theme) || item.getAttribute('data-src');
        if (!src) return;
        var visibleImg = item.querySelector('.screenshot-' + (theme === 'dark' ? 'dark' : 'light')) || item.querySelector('img');
        modalImg.src = src;
        modalImg.alt = visibleImg ? visibleImg.alt : '';
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    function closeModal() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      modalImg.src = '';
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
    });
  }

  function initCodeCopy() {
    var wrappers = document.querySelectorAll('.code-block-wrapper');
    wrappers.forEach(function (wrapper) {
      var btn = wrapper.querySelector('.code-copy');
      var code = wrapper.querySelector('code');
      if (!btn || !code) return;

      btn.addEventListener('click', function () {
        var text = code.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            showCopied(btn);
          });
        } else {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); showCopied(btn); } catch (e) { /* ignore */ }
          document.body.removeChild(ta);
        }
      });
    });
  }

  function showCopied(btn) {
    btn.classList.add('copied');
    var svg = btn.querySelector('svg');
    if (svg) {
      var orig = svg.innerHTML;
      svg.innerHTML = '<polyline points="20 6 9 17 4 12" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      setTimeout(function () {
        svg.innerHTML = orig;
        btn.classList.remove('copied');
      }, 1500);
    }
  }

  initTheme();

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('themeToggle');
    if (toggle) toggle.addEventListener('click', toggleTheme);

    initScrollReveal();
    initModal();
    initCodeCopy();
  });
})();
