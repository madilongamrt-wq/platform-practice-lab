
import { useEffect, useRef, useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';
import { hasInstallPrompt, requestInstall } from './pwa';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function InstallLab() {
  const [installed, setInstalled] = useState(isStandalone);
  const [ready, setReady] = useState(hasInstallPrompt);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const available = () => setReady(hasInstallPrompt());
    const completed = () => {
      setInstalled(true);
      setOpen(false);
    };
    const mode = window.matchMedia('(display-mode: standalone)');
    const modeChanged = () => setInstalled(isStandalone());
    window.addEventListener('lab-install-available', available);
    window.addEventListener('lab-installed', completed);
    mode.addEventListener('change', modeChanged);
    return () => {
      window.removeEventListener('lab-install-available', available);
      window.removeEventListener('lab-installed', completed);
      mode.removeEventListener('change', modeChanged);
    };
  }, []);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  const installNow = async () => {
    setBusy(true);
    setMessage('');
    try {
      const outcome = await requestInstall();
      setMessage(outcome === 'accepted'
        ? 'Installation requested. Follow your browser to finish, then open Lab from your home screen.'
        : outcome === 'dismissed'
          ? 'Installation was cancelled. You can try again from your browser menu.'
          : 'Use the browser menu steps below to add the lab to your home screen.');
    } catch {
      setMessage('The browser could not open installation. Use the menu steps below.');
    } finally {
      setBusy(false);
      setReady(hasInstallPrompt());
    }
  };

  if (installed) return null;

  return <>
    <button className="pwa-install-trigger" onClick={() => { setOpen(true); setMessage(''); }}>
      <Download size={16} /> Install lab
    </button>
    <dialog ref={dialog} className="pwa-dialog" aria-labelledby="pwa-title"
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>
      <button className="pwa-close" aria-label="Close installation instructions" onClick={() => setOpen(false)}>
        <X size={19} />
      </button>
      <span className="pwa-app-icon"><Smartphone size={27} /></span>
      <span className="eyebrow">TAKE YOUR PRACTICE WITH YOU</span>
      <h2 id="pwa-title">Install Platform Practice Lab</h2>
      <p>Add the lab to your home screen and open it in its own app window. No app-store account or installation fee.</p>
      {ready && <button className="primary pwa-native-install" disabled={busy} onClick={installNow}>
        <Download size={17} /> {busy ? 'Opening browser…' : 'Install now'}
      </button>}
      <div className="pwa-instruction">
        <h3>Android · Chrome</h3>
        <p>Open this page in Chrome. Open the three-dot menu, then choose Add to Home screen or Install app. Confirm Install when offered.</p>
      </div>
      <div className="pwa-instruction">
        <h3><Share2 size={15} /> iPhone · Safari</h3>
        <p>Open this page in Safari. Open Share, choose Add to Home Screen, enable Open as Web App if shown, then tap Add.</p>
      </div>
      <div className="pwa-instruction">
        <h3>Computer · Chrome or Edge</h3>
        <p>Use the install icon in the address bar or the browser menu. If installation is unavailable, continue using the website.</p>
      </div>
      <p className="pwa-connection">An internet connection is required for sign-in, exercises, and saving progress. Offline visits show a reconnect screen. No answers or sign-in responses are stored by the offline cache.</p>
      <p className="pwa-tip">If you opened this inside ChatGPT or another app, use its menu to open the link in Chrome or Safari first.</p>
      {message && <p role="status" className="pwa-message">{message}</p>}
      <button className="secondary wide" onClick={() => setOpen(false)}>Done</button>
    </dialog>
  </>;
}
