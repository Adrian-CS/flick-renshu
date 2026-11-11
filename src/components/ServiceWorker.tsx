'use client';
import { useEffect, useState } from 'react';

/**
 * Registra /sw.js (solo en la build de producción) y avisa cuando hay una versión nueva.
 * Las PWA de iOS casi no buscan actualizaciones solas: se busca al volver a primer plano.
 */
export function ServiceWorker() {
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const hadController = navigator.serviceWorker.controller !== null;
    const onChange = () => {
      // la primera instalación también cambia el controlador: ahí no hay nada que avisar
      if (hadController) setUpdated(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChange);

    let reg: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker
      .register('/sw.js')
      .then((r) => (reg = r))
      .catch(() => {
        /* sin modo offline */
      });
    const onVisible = () => {
      if (document.visibilityState === 'visible') reg?.update().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!updated) return null;
  return (
    <div className="update-banner" role="status">
      Hay una versión nueva.
      <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
        Recargar
      </button>
    </div>
  );
}
