export function initLoadingScreen() {
  const L = document.getElementById('sl');
  if (!L) return;

  function dismiss() {
    L.classList.add('out');
    setTimeout(() => {
      L.hidden = true;
      L.style.display = 'none';
      L.style.pointerEvents = 'none';
    }, 350);
  }

  // Automatically dismiss splash screen after quick cosmic intro
  setTimeout(dismiss, 950);

  // Allow clicking anywhere to dismiss instantly
  L.addEventListener('click', dismiss);
}
