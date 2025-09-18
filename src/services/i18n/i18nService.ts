/**
 * Internationalization Service (Phase 10)
 * i18n scaffolding with message catalogs and locale switching
 */

// Feature flag check
const isI18nEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_I18N === 'true';
};

// Types for i18n
export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

export interface MessageCatalog {
  [key: string]: string | MessageCatalog;
}

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: Intl.NumberFormatOptions;
  currency?: string;
  timezone?: string;
}

export interface TranslationOptions {
  count?: number;
  context?: string;
  variables?: Record<string, string | number>;
}

/**
 * I18n Service Class
 */
class I18nService {
  private currentLocale: SupportedLocale = 'en';
  private catalogs = new Map<SupportedLocale, MessageCatalog>();
  private fallbackLocale: SupportedLocale = 'en';
  private localeConfigs = new Map<SupportedLocale, LocaleConfig>();

  constructor() {
    this.initializeLocaleConfigs();
    this.loadDefaultCatalogs();
    this.detectAndSetLocale();
  }

  /**
   * Check if i18n is available
   */
  isAvailable(): boolean {
    return isI18nEnabled();
  }

  /**
   * Get current locale
   */
  getCurrentLocale(): SupportedLocale {
    return this.currentLocale;
  }

  /**
   * Set current locale
   */
  async setLocale(locale: SupportedLocale): Promise<void> {
    if (!this.isAvailable()) return;

    if (!this.isLocaleSupported(locale)) {
      throw new Error(`Unsupported locale: ${locale}`);
    }

    this.currentLocale = locale;

    // Load catalog if not already loaded
    if (!this.catalogs.has(locale)) {
      await this.loadCatalog(locale);
    }

    // Update document language
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }

    // Store preference
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('domainflow_locale', locale);
    }
  }

  /**
   * Get supported locales
   */
  getSupportedLocales(): LocaleConfig[] {
    return Array.from(this.localeConfigs.values());
  }

  /**
   * Check if locale is supported
   */
  isLocaleSupported(locale: string): locale is SupportedLocale {
    return this.localeConfigs.has(locale as SupportedLocale);
  }

  /**
   * Translate a message
   */
  t(key: string, options?: TranslationOptions): string {
    if (!this.isAvailable()) {
      return key; // Return key as fallback when disabled
    }

    const catalog = this.catalogs.get(this.currentLocale) || this.catalogs.get(this.fallbackLocale);
    if (!catalog) {
      return key;
    }

    let message = this.getNestedValue(catalog, key);
    
    if (!message) {
      // Try fallback locale
      const fallbackCatalog = this.catalogs.get(this.fallbackLocale);
      if (fallbackCatalog) {
        message = this.getNestedValue(fallbackCatalog, key);
      }
    }

    if (!message) {
      return key; // Return key if no translation found
    }

    // Handle pluralization
    if (options?.count !== undefined) {
      message = this.handlePluralization(message, options.count);
    }

    // Handle variable substitution
    if (options?.variables) {
      message = this.substituteVariables(message, options.variables);
    }

    return message;
  }

  /**
   * Format a number according to current locale
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    if (!this.isAvailable()) {
      return value.toString();
    }

    const localeConfig = this.localeConfigs.get(this.currentLocale);
    const formatOptions = { ...localeConfig?.numberFormat, ...options };
    
    try {
      return new Intl.NumberFormat(this.currentLocale, formatOptions).format(value);
    } catch {
      return value.toString();
    }
  }

  /**
   * Format a date according to current locale
   */
  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    if (!this.isAvailable()) {
      return new Date(date).toLocaleDateString();
    }

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    try {
      return new Intl.DateTimeFormat(this.currentLocale, options).format(dateObj);
    } catch {
      return dateObj.toLocaleDateString();
    }
  }

  /**
   * Format a relative time (e.g., "2 hours ago")
   */
  formatRelativeTime(date: Date | string): string {
    if (!this.isAvailable()) {
      return new Date(date).toLocaleString();
    }

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    
    try {
      const rtf = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        return rtf.format(-diffDays, 'day');
      } else if (diffHours > 0) {
        return rtf.format(-diffHours, 'hour');
      } else if (diffMinutes > 0) {
        return rtf.format(-diffMinutes, 'minute');
      } else {
        return rtf.format(0, 'second');
      }
    } catch {
      return dateObj.toLocaleString();
    }
  }

  /**
   * Get locale-specific configuration
   */
  getLocaleConfig(locale?: SupportedLocale): LocaleConfig | undefined {
    return this.localeConfigs.get(locale || this.currentLocale);
  }

  /**
   * Add or update message catalog
   */
  addCatalog(locale: SupportedLocale, catalog: MessageCatalog): void {
    if (!this.isAvailable()) return;
    
    const existingCatalog = this.catalogs.get(locale) || {};
    this.catalogs.set(locale, { ...existingCatalog, ...catalog });
  }

  /**
   * Get raw message catalog
   */
  getCatalog(locale?: SupportedLocale): MessageCatalog | undefined {
    return this.catalogs.get(locale || this.currentLocale);
  }

  /**
   * Detect and set initial locale
   */
  private detectAndSetLocale(): void {
    if (!this.isAvailable()) return;

    let detectedLocale = this.fallbackLocale;

    // Try localStorage first
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('domainflow_locale');
      if (stored && this.isLocaleSupported(stored)) {
        detectedLocale = stored as SupportedLocale;
      }
    }

    // Try browser language
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0];
      if (this.isLocaleSupported(browserLang)) {
        detectedLocale = browserLang as SupportedLocale;
      }
    }

    this.currentLocale = detectedLocale;
  }

  /**
   * Initialize locale configurations
   */
  private initializeLocaleConfigs(): void {
    const configs: LocaleConfig[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        dateFormat: 'MM/dd/yyyy',
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currency: 'USD'
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        direction: 'ltr',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currency: 'EUR'
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        direction: 'ltr',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currency: 'EUR'
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        direction: 'ltr',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currency: 'EUR'
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        direction: 'ltr',
        dateFormat: 'yyyy/MM/dd',
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currency: 'JPY'
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        direction: 'ltr',
        dateFormat: 'yyyy/MM/dd',
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currency: 'CNY'
      }
    ];

    configs.forEach(config => {
      this.localeConfigs.set(config.code, config);
    });
  }

  /**
   * Load default message catalogs
   */
  private loadDefaultCatalogs(): void {
    // English (baseline)
    const enCatalog: MessageCatalog = {
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        confirm: 'Confirm',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        refresh: 'Refresh'
      },
      analytics: {
        causalGraph: 'Causal Graph',
        confidence: 'Confidence',
        relationships: 'Relationships',
        nodes: 'Nodes',
        edges: 'Edges',
        lastUpdated: 'Last Updated'
      },
      experiments: {
        bandit: 'Bandit Experiments',
        arms: 'Arms',
        rewards: 'Rewards',
        strategy: 'Strategy',
        performance: 'Performance'
      },
      privacy: {
        redacted: '[REDACTED]',
        masked: 'Masked',
        private: 'Private',
        confidential: 'Confidential'
      },
      performance: {
        accelerated: 'Accelerated',
        fallback: 'Fallback',
        optimization: 'Optimization'
      }
    };

    this.catalogs.set('en', enCatalog);

    // Placeholder catalogs for other languages (in production, these would be proper translations)
    const placeholderCatalog = this.createPlaceholderCatalog(enCatalog);
    
    this.catalogs.set('es', placeholderCatalog);
    this.catalogs.set('fr', placeholderCatalog);
    this.catalogs.set('de', placeholderCatalog);
    this.catalogs.set('ja', placeholderCatalog);
    this.catalogs.set('zh', placeholderCatalog);
  }

  /**
   * Create placeholder catalog for development
   */
  private createPlaceholderCatalog(baseCatalog: MessageCatalog): MessageCatalog {
    const placeholder: MessageCatalog = {};
    
    const processCatalog = (source: MessageCatalog, target: MessageCatalog) => {
      Object.keys(source).forEach(key => {
        if (typeof source[key] === 'string') {
          target[key] = `[${source[key]}]`; // Wrap in brackets to indicate placeholder
        } else if (typeof source[key] === 'object') {
          target[key] = {};
          processCatalog(source[key] as MessageCatalog, target[key] as MessageCatalog);
        }
      });
    };

    processCatalog(baseCatalog, placeholder);
    return placeholder;
  }

  /**
   * Load catalog from external source (async)
   */
  private async loadCatalog(locale: SupportedLocale): Promise<void> {
    try {
      // In production, this would fetch from a CDN or API
      // For now, we'll use the placeholder
      if (!this.catalogs.has(locale)) {
        const enCatalog = this.catalogs.get('en')!;
        this.catalogs.set(locale, this.createPlaceholderCatalog(enCatalog));
      }
    } catch (error) {
      console.warn(`Failed to load catalog for ${locale}:`, error);
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: MessageCatalog, path: string): string | undefined {
    const keys = path.split('.');
    let current: any = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Handle pluralization (simple implementation)
   */
  private handlePluralization(message: string, count: number): string {
    // Simple pluralization - look for | separator
    const parts = message.split('|');
    if (parts.length === 2) {
      return count === 1 ? parts[0] : parts[1];
    }
    return message;
  }

  /**
   * Substitute variables in message
   */
  private substituteVariables(message: string, variables: Record<string, string | number>): string {
    let result = message;
    
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = variables[key];
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    });
    
    return result;
  }
}

// Export singleton instance
export const i18nService = new I18nService();

// Availability check function
export const isI18nAvailable = (): boolean => {
  return i18nService.isAvailable();
};

// Convenience function for translation
export const t = (key: string, options?: TranslationOptions): string => {
  return i18nService.t(key, options);
};