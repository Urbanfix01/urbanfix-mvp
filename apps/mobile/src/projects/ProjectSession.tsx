import { createContext, useContext } from 'react';

export const ProjectOwnerContext = createContext<string | null>(null);
export function useProjectOwner() {
  const owner = useContext(ProjectOwnerContext);
  if (!owner) throw new Error('Iniciá sesión para consultar tus proyectos.');
  return owner;
}
