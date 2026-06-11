export interface ConversationContext {
  id: string;
  userId: string;
  messages: Message[];
  userPreferences: UserPreferences;
  sessionStart: Date;
  lastActivity: Date;
  topics: string[];
  context: string;
}

export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isButton?: boolean;
  isFile?: boolean;
  fileName?: string;
  context?: string;
  webUsed?: Array<{ url: string; title?: string }>;
  file?: File;
  image?: string;
  originalText?: string;
  originalLanguage?: string;
  targetLanguage?: string;
}

export interface UserPreferences {
  colorTheme: string;
  fontSettings: FontSettings;
  themeSettings: ThemeSettings;
  greetingSettings: GreetingSettings;
  language: string;
  customizations: {
    [key: string]: any;
  };
}

export interface FontSettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing: number;
}

export interface ThemeSettings {
  mode: 'light' | 'dark' | 'auto';
  background: string;
  surface: string;
  primary: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
}

export interface GreetingSettings {
  message: string;
  animation: string;
  showEmoji: boolean;
  emoji: string;
  delay: number;
}

class ConversationManager {
  private static instance: ConversationManager;
  private conversations: Map<string, ConversationContext> = new Map();
  private currentContext: ConversationContext | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  // Create a new conversation context
  public createContext(userId: string): ConversationContext {
    const context: ConversationContext = {
      id: this.generateId(),
      userId,
      messages: [],
      userPreferences: this.getDefaultPreferences(),
      sessionStart: new Date(),
      lastActivity: new Date(),
      topics: [],
      context: ''
    };

    this.conversations.set(context.id, context);
    this.currentContext = context;
    this.saveToStorage();
    return context;
  }

  // Get existing context or create new one
  public getContext(userId: string): ConversationContext {
    // Find existing context for user
    const existingContext = Array.from(this.conversations.values())
      .find(ctx => ctx.userId === userId);

    if (existingContext) {
      this.currentContext = existingContext;
      existingContext.lastActivity = new Date();
      this.saveToStorage();
      return existingContext;
    }

    return this.createContext(userId);
  }

  // Add message to current context
  public addMessage(message: Message): void {
    // If no current context exists, create one for default user
    if (!this.currentContext) {
      console.warn('No current context found, creating default context');
      this.getContext('default-user');
    }

    if (!this.currentContext) return;

    this.currentContext.messages.push(message);
    this.currentContext.lastActivity = new Date();
    
    // Extract topics from message
    this.extractTopics(message.text);
    
    // Build context from recent messages
    this.updateContext();
    
    this.saveToStorage();
  }

  // Get conversation history
  public getHistory(limit?: number): Message[] {
    if (!this.currentContext) return [];
    
    const messages = this.currentContext.messages;
    return limit ? messages.slice(-limit) : messages;
  }

  // Get contextual information for AI
  public getContextualInfo(): string {
    if (!this.currentContext) return '';

    const recentMessages = this.getHistory(10);
    const topics = this.currentContext.topics.slice(-5);
    
    let contextInfo = '';
    
    if (topics.length > 0) {
      contextInfo += `Recent topics discussed: ${topics.join(', ')}\n`;
    }
    
    if (recentMessages.length > 0) {
      contextInfo += `Recent conversation context: ${this.currentContext.context}\n`;
    }
    
    return contextInfo;
  }

  // Update user preferences
  public updatePreferences(preferences: Partial<UserPreferences>): void {
    if (!this.currentContext) return;

    this.currentContext.userPreferences = {
      ...this.currentContext.userPreferences,
      ...preferences
    };
    
    this.saveToStorage();
  }

  // Get user preferences
  public getPreferences(): UserPreferences {
    return this.currentContext?.userPreferences || this.getDefaultPreferences();
  }

  // Clear conversation history
  public clearHistory(): void {
    if (this.currentContext) {
      this.currentContext.messages = [];
      this.currentContext.context = '';
      this.currentContext.topics = [];
      this.saveToStorage();
    }
  }

  // Get all conversations for user
  public getUserConversations(userId: string): ConversationContext[] {
    return Array.from(this.conversations.values())
      .filter(ctx => ctx.userId === userId)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  // Private methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      colorTheme: '#3498db',
      fontSettings: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 1.5,
        letterSpacing: 0
      },
      themeSettings: {
        mode: 'light',
        background: '#ffffff',
        surface: '#f8f9fa',
        primary: '#3498db',
        text: '#333333',
        textSecondary: '#666666',
        border: '#e9ecef',
        shadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      },
      greetingSettings: {
        message: "Hello! I am Anuvadini chatbot. How can I help you today?",
        animation: "bounce",
        showEmoji: true,
        emoji: "🤖",
        delay: 1000
      },
      language: 'en',
      customizations: {}
    };
  }

  private extractTopics(text: string): void {
    if (!this.currentContext) return;

    // Simple topic extraction (can be enhanced with NLP)
    const keywords = text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'them', 'were', 'here', 'there', 'what', 'when', 'where', 'which', 'while'].includes(word));

    // Add unique keywords as topics
    keywords.forEach(keyword => {
      if (!this.currentContext!.topics.includes(keyword)) {
        this.currentContext!.topics.push(keyword);
      }
    });

    // Keep only recent topics (last 20)
    if (this.currentContext.topics.length > 20) {
      this.currentContext.topics = this.currentContext.topics.slice(-20);
    }
  }

  private updateContext(): void {
    if (!this.currentContext) return;

    const recentMessages = this.getHistory(5);
    this.currentContext.context = recentMessages
      .map(msg => `${msg.sender}: ${msg.text}`)
      .join('\n');
  }

  private saveToStorage(): void {
    try {
      // Create a deep copy of conversations and remove non-serializable properties
      const serializableConversations = Array.from(this.conversations.entries()).map(([id, context]) => {
        return [
          id,
          {
            ...context,
            messages: context.messages.map(msg => {
              // Remove File objects as they can't be serialized
              const { file, ...serializableMsg } = msg;
              return serializableMsg;
            })
          }
        ];
      });

      const data = {
        conversations: serializableConversations,
        currentContextId: this.currentContext?.id || null
      };
      
      const jsonString = JSON.stringify(data);
      localStorage.setItem('chatbot_conversations', jsonString);
      // console.log('[ConversationManager] Saved to localStorage:', {
      //   conversationCount: this.conversations.size,
      //   currentContextId: this.currentContext?.id,
      //   messageCount: this.currentContext?.messages.length || 0
      // });
    } catch (error) {
      console.error('[ConversationManager] Failed to save conversation data:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('chatbot_conversations');
      if (data) {
        // console.log('[ConversationManager] Loading from localStorage...');
        const parsed = JSON.parse(data);
        this.conversations = new Map(parsed.conversations);
        
        if (parsed.currentContextId) {
          this.currentContext = this.conversations.get(parsed.currentContextId) || null;
        }
        
        // Convert date strings back to Date objects
        this.conversations.forEach(context => {
          context.sessionStart = new Date(context.sessionStart);
          context.lastActivity = new Date(context.lastActivity);
          context.messages.forEach(msg => {
            msg.timestamp = new Date(msg.timestamp);
          });
        });
        
        // console.log('[ConversationManager] Loaded from localStorage:', {
        //   conversationCount: this.conversations.size,
        //   currentContextId: this.currentContext?.id,
        //   messageCount: this.currentContext?.messages.length || 0,
        //   messages: this.currentContext?.messages.map(m => ({ 
        //     id: m.id, 
        //     sender: m.sender, 
        //     text: m.text.substring(0, 50) 
        //   }))
        // });
      } else {
        // console.log('[ConversationManager] No data in localStorage');
      }
    } catch (error) {
      console.error('[ConversationManager] Failed to load conversation data:', error);
    }
  }
}

export default ConversationManager;
