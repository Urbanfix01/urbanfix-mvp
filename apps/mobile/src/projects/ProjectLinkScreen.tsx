import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useProjectOwner } from './ProjectSession';
import { projectRepository } from './projectServices';
import { metadata } from './projectWorkspace';
import { withStartupDeadline } from '../navigation/accountBoot';
import { Action, Notice, ProjectHeader, TEAL, ui } from './ProjectUI';

export default function ProjectLinkScreen({ navigation, route }: any) {
  const owner = useProjectOwner(), { projectId, countryCode } = route.params;
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setError('');
    void withStartupDeadline(() => projectRepository.get({ owner, countryCode }, projectId), { signal: controller.signal }).then(record => {
      if (!active) return;
      if (!record) throw Error('Unavailable project');
      navigation.replace('ProjectDetail', { row: metadata(record) });
    }).catch(() => { if (active) setError('No pudimos abrir este proyecto en tu cuenta y país. Revisá la conexión o volvé a Mis proyectos.'); });
    return () => { active = false; controller.abort(); };
  }, [owner, countryCode, projectId, attempt, navigation]);
  return <View style={ui.root}>
    <ProjectHeader title="Abrir proyecto" back={() => navigation.goBack()} />
    <View style={ui.content}>{error ? <><Notice text={error} /><Action title="Reintentar" onPress={() => setAttempt(value => value + 1)} /><Action title="Mis proyectos" onPress={() => navigation.popToTop()} /></> : <ActivityIndicator accessibilityLabel="Abriendo proyecto" color={TEAL} />}</View>
  </View>;
}
