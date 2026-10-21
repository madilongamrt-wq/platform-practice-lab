
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let pendingPrompt: InstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pendingPrompt = event as InstallPromptEvent;
  window.dispatchEvent(new Event('lab-install-available'));
});

window.addEventListener('appinstalled', () => {
  pendingPrompt = null;
  window.dispatchEvent(new Event('lab-installed'));
});

export const hasInstallPrompt = () => pendingPrompt !== null;

export async function requestInstall() {
  const prompt = pendingPrompt;
  if (!prompt) return 'unavailable';
  pendingPrompt = null;
  window.dispatchEvent(new Event('lab-install-available'));
  await prompt.prompt();
  const choice = await prompt.userChoice;
  return choice.outcome;
}

export function registerServiceWorker(base = '/') {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const register = () => {
    navigator.serviceWorker.register(base + 'sw.js', { scope: base, updateViaCache: 'none' })
      .catch(() => {
        // Installation metadata and manual home-screen instructions still work
        // when a browser disallows service workers.
      });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
