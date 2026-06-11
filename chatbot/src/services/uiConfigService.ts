// AI-chatbot-wrapper/src/services/uiConfigService.ts

interface UIConfigColors {
  layoutBackground?: string;
  minimizedBackground?: string;
  inputBackground?: string;
  inputFontColor?: string;
  primaryButton?: string;
  messageInboxColor?: string;
}

interface UIConfigFont {
  fontFamily?: string;
  fontSize?: number;
}

interface UIConfigGreeting {
  message?: string;
  animation?: string;
  delay?: number;
  showEmoji?: boolean;
  emoji?: string;
}

interface UIConfigBasicInfo {
  agentName?: string;
  logo?: string;
}

interface UIConfigAppearance {
  themeName?: string;
  customColors?: UIConfigColors;
}

export interface UIConfig {
  basicInfo?: UIConfigBasicInfo;
  appearance?: UIConfigAppearance;
  font?: UIConfigFont;
  greeting?: UIConfigGreeting;
}

interface UIConfigResponse {
  doc_id: string;
  ui_config: UIConfig;
  updated_at?: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/**
 * Fetch UI configuration from backend for a specific doc_id
 */
export async function fetchUIConfig(docId: string): Promise<UIConfig | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/ui-config/${docId}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch UI config for ${docId}: ${response.status}`);
      return null;
    }
    
    const data: UIConfigResponse = await response.json();
    console.log('✅ Loaded UI config for', docId, data.ui_config);
    return data.ui_config;
  } catch (error) {
    console.error('Error fetching UI config:', error);
    return null;
  }
}

/**
 * Apply UI configuration to the chatbot
 */
export function applyUIConfig(config: UIConfig): void {
  if (!config) return;
  
  // Apply basic info
  if (config.basicInfo) {
    if (config.basicInfo.agentName) {
      // Store agent name for use in chatbot header
      localStorage.setItem('chatbot_agent_name', config.basicInfo.agentName);
    }
    if (config.basicInfo.logo) {
      // Store logo for use in chatbot header
      localStorage.setItem('chatbot_logo', config.basicInfo.logo);
    }
  }
  
  // Apply appearance (theme and colors)
  if (config.appearance) {
    const { themeName, customColors } = config.appearance;
    
    // Apply theme colors
    if (themeName) {
      const themeColors = getThemeColors(themeName);
      if (themeColors) {
        applyThemeColors(themeColors);
      }
    }
    
    // Override with custom colors if provided
    if (customColors) {
      const root = document.documentElement;
      if (customColors.layoutBackground) {
        root.style.setProperty('--chatbot-bg', customColors.layoutBackground);
      }
      if (customColors.minimizedBackground) {
        root.style.setProperty('--chatbot-minimized-bg', customColors.minimizedBackground);
      }
      if (customColors.inputBackground) {
        root.style.setProperty('--chatbot-input-bg', customColors.inputBackground);
      }
      if (customColors.inputFontColor) {
        root.style.setProperty('--chatbot-text-color', customColors.inputFontColor);
      }
      if (customColors.primaryButton) {
        root.style.setProperty('--chatbot-primary-color', customColors.primaryButton);
      }
      if (customColors.messageInboxColor) {
        root.style.setProperty('--chatbot-message-bg', customColors.messageInboxColor);
      }
    }
  }
  
  // Apply font settings
  if (config.font) {
    const root = document.documentElement;
    if (config.font.fontFamily) {
      root.style.setProperty('--chatbot-font-family', config.font.fontFamily);
    }
    if (config.font.fontSize) {
      root.style.setProperty('--chatbot-font-size', `${config.font.fontSize}px`);
    }
  }
  
  // Apply greeting settings
  if (config.greeting) {
    // Store greeting config for use in chatbot
    localStorage.setItem('chatbot_greeting', JSON.stringify(config.greeting));
  }
  
  console.log('✅ Applied UI configuration');
}

/**
 * Get theme colors by theme name
 */
function getThemeColors(themeName: string): Record<string, string> | null {
  const themes: Record<string, Record<string, string>> = {
    'Cosmic Chills': {
      '--chatbot-bg': '#f5f7fa',
      '--chatbot-primary-color': '#82ca9d',
      '--chatbot-secondary-color': '#6a5acd',
      '--chatbot-text-color': '#1a1a1a',
      '--chatbot-message-bg': '#ffffff',
      '--chatbot-input-bg': '#f9fafb',
    },
    'Cosmic Depth': {
      '--chatbot-bg': '#1a1a2e',
      '--chatbot-primary-color': '#0f3460',
      '--chatbot-secondary-color': '#533483',
      '--chatbot-text-color': '#ffffff',
      '--chatbot-message-bg': 'rgba(255,255,255,0.1)',
      '--chatbot-input-bg': 'rgba(255,255,255,0.05)',
    },
    'Sunset Bliss': {
      '--chatbot-bg': '#fff4e6',
      '--chatbot-primary-color': '#ff9a76',
      '--chatbot-secondary-color': '#ff6b9d',
      '--chatbot-text-color': '#1a1a1a',
      '--chatbot-message-bg': '#ffffff',
      '--chatbot-input-bg': '#f9fafb',
    },
    'Stary Night': {
      '--chatbot-bg': '#1a2332',
      '--chatbot-primary-color': '#6c95e8',
      '--chatbot-secondary-color': '#4169e1',
      '--chatbot-text-color': '#ffffff',
      '--chatbot-message-bg': 'rgba(255,255,255,0.1)',
      '--chatbot-input-bg': 'rgba(255,255,255,0.05)',
    },
    'Mint Breeze': {
      '--chatbot-bg': '#d4f1e8',
      '--chatbot-primary-color': '#81c9ad',
      '--chatbot-secondary-color': '#ff69b4',
      '--chatbot-text-color': '#1a1a1a',
      '--chatbot-message-bg': '#ffffff',
      '--chatbot-input-bg': '#f9fafb',
    },
  };
  
  return themes[themeName] || null;
}

/**
 * Apply theme colors to CSS variables
 */
function applyThemeColors(colors: Record<string, string>): void {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * Load and apply UI configuration for a doc_id
 */
export async function loadAndApplyUIConfig(docId: string): Promise<void> {
  const config = await fetchUIConfig(docId);
  if (config) {
    applyUIConfig(config);
  }
}
