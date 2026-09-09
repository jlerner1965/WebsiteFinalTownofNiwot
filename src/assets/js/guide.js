// Mobile navigation for the Niwot guide. One behaviour, no dependencies.
(function () {
  function wire() {
    var head = document.querySelector('.n-head');
    var btn = head && head.querySelector('.n-burger');
    if (!head || !btn || btn.dataset.wired) return;
    btn.dataset.wired = '1';
    /* Every path that changes the menu goes through here, so the expanded
       state and the accessible name can never disagree. */
    function setOpen(open) {
      head.classList.toggle('n-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    btn.addEventListener('click', function () {
      setOpen(!head.classList.contains('n-open'));
    });
    head.querySelectorAll('.n-nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        setOpen(false);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && head.classList.contains('n-open')) {
        setOpen(false);
        btn.focus();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
