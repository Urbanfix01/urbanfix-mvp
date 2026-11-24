import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import type { MobileAudience } from '../utils/audience';
import { createMobileLinkQueue } from './mobileLinks';
import { withStartupDeadline } from './accountBoot';

export default function useMobileLinks({ owner, audience, ready, navigate }: { owner: string | null; audience: MobileAudience; ready: boolean; navigate: (name: string, params?: Record<string, unknown>) => void }) {
  const scheme = Constants.expoConfig?.scheme === 'urbanfix-preview' ? 'urbanfix-preview' : 'urbanfix';
  const [queue] = useState(() => createMobileLinkQueue(scheme));
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const [revision, setRevision] = useState(0), [message, setMessage] = useState('');
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true, liveEvents = 0;
    const controller = new AbortController();
    const receive = (url: string, boundOwner: string | null) => {
      if (active && queue.receive(url, boundOwner)) setRevision(value => value + 1);
    };
    const subscription = Linking.addEventListener('url', ({ url }) => { liveEvents++; receive(url, ownerRef.current); });
    void withStartupDeadline(() => Linking.getInitialURL(), { signal: controller.signal }).then(url => {
      if (url && !liveEvents) receive(url, null);
    }).catch(() => {});
    return () => { active = false; controller.abort(); subscription.remove(); };
  }, [queue]);
  useEffect(() => {
    const next = queue.take({ owner, audience, ready });
    if (next?.message) setMessage(next.message);
    if (next?.destination) { setMessage(''); navigate(next.destination.name, next.destination.params); }
  }, [owner, audience, ready, revision, queue, navigate]);
  useEffect(() => { setMessage(''); }, [owner]);
  return { message, dismiss: () => setMessage('') };
}
