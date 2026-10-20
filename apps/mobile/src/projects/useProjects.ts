import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { mergeProjects, ProjectMeta, ProjectScope } from './projectWorkspace';
import { projectRepository } from './projectServices';

export function useProjects(scope: ProjectScope) {
  const [rows, setRows] = useState<ProjectMeta[]>([]), [loading, setLoading] = useState(true), [message, setMessage] = useState(''), [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current, active = () => generation.current === request;
    setLoading(true); setMessage(''); setError('');
    let local: ProjectMeta[] = [], localError = '';
    try { local = await projectRepository.local(scope); if (active()) setRows(mergeProjects(local, [])); }
    catch { localError = 'No se pudo leer todo el historial local; se conserva sin modificar.'; }
    try {
      try { await projectRepository.sync(scope); } catch (failure) { if (active()) setMessage((failure as Error).message); }
      const remote = await projectRepository.remote(scope);
      try { local = await projectRepository.local(scope); } catch { /* The account remains readable without local storage. */ }
      if (active()) { setRows(mergeProjects(local, remote)); setError(localError); }
    } catch (failure) { if (active()) setError([localError, (failure as Error).message].filter(Boolean).join(' ')); }
    finally { if (active()) setLoading(false); }
  }, [scope.owner, scope.countryCode]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { generation.current++; }; }, [refresh]));
  return { rows, loading, message, error, refresh };
}
