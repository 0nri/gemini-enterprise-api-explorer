import { AgentspaceConfig } from '@/components/ConfigSidebar';

export function getBaseUrl(location: string): string {
  if (location === 'global') {
    return 'https://discoveryengine.googleapis.com';
  }
  return `https://${location}-discoveryengine.googleapis.com`;
}

export function getDefaultConfig(): AgentspaceConfig {
  return {
    projectNumber: '',
    location: 'us',
    engineId: '',
    assistantId: 'default_assistant',
  };
}

export function loadConfigFromStorage(): AgentspaceConfig | null {
  if (typeof window === 'undefined') return null;
  
  const saved = localStorage.getItem('agentspace-config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved config:', e);
    }
  }
  return null;
}
