// Project URLs
const PROJECTS = {
  eduos: 'https://eduos.chaimode.dev',
  lunchbox: 'https://lunchbox.chaimode.dev',
  chaimode: 'https://chaimode.dev'
};

// Open project in new tab
function openProject(url, inNewTab = true) {
  if (inNewTab) {
    chrome.tabs.create({ url });
  } else {
    chrome.tabs.update({ url });
  }
}

// Open all projects
function openAllProjects() {
  Object.values(PROJECTS).forEach((url, index) => {
    setTimeout(() => {
      chrome.tabs.create({ url });
    }, index * 100); // Stagger opens slightly
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Open buttons
  document.querySelectorAll('.open-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.getAttribute('data-url');
      openProject(url);
    });
  });

  // Project cards (click anywhere on card)
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking the button
      if (e.target.closest('.open-btn')) return;
      
      const project = card.getAttribute('data-project');
      const url = PROJECTS[project];
      if (url) {
        openProject(url);
      }
    });
  });

  // Quick actions
  document.getElementById('open-all').addEventListener('click', () => {
    openAllProjects();
  });

  document.getElementById('new-tab').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://newtab/' });
  });

  // Load saved preferences
  chrome.storage.sync.get(['preferences'], (result) => {
    // Can add saved preferences here later
  });
});

// Keyboard shortcuts handler
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'open-eduos':
      openProject(PROJECTS.eduos);
      break;
    case 'open-lunchbox':
      openProject(PROJECTS.lunchbox);
      break;
    case 'open-chaimode':
      openProject(PROJECTS.chaimode);
      break;
  }
});
