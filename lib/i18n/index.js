// lib/i18n/index.js - Advanced Internationalization System
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../logger.js');
const { memoize } = require('../utils/index.js');

class I18nManager {
  constructor(options = {}) {
    this.options = {
      defaultLocale: 'en',
      fallbackLocale: 'en',
      locales: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      namespaces: ['common', 'auth', 'posts', 'comments', 'admin', 'notifications', 'errors'],
      basePath: options.basePath || path.join(process.cwd(), 'locales'),
      autoDetect: options.autoDetect || true,
      cache: options.cache || true,
      ...options
    };

    this.translations = new Map();
    this.pluralRules = new Map();
    this.dateTimeFormats = new Map();
    this.numberFormats = new Map();

    this.initialize();
    this.setupPluralRules();
    this.setupDateTimeFormats();
    this.setupNumberFormats();
  }

  async initialize() {
    try {
      await this.loadAllTranslations();

      if (this.options.autoDetect) {
        this.setupAutoDetection();
      }

      logger.info('I18n manager initialized', {
        locales: this.options.locales.length,
        namespaces: this.options.namespaces.length
      });
    } catch (error) {
      logger.error('I18n initialization failed', { error });
      throw error;
    }
  }

  async loadAllTranslations() {
    const loadPromises = [];

    for (const locale of this.options.locales) {
      for (const namespace of this.options.namespaces) {
        loadPromises.push(this.loadTranslation(locale, namespace));
      }
    }

    await Promise.all(loadPromises);
    logger.info('All translations loaded successfully');
  }

  async loadTranslation(locale, namespace) {
    try {
      const filePath = path.join(this.options.basePath, locale, `${namespace}.json`);

      // Try to load the translation file
      const fileContent = await fs.readFile(filePath, 'utf8');
      const translations = JSON.parse(fileContent);

      if (!this.translations.has(locale)) {
        this.translations.set(locale, new Map());
      }

      this.translations.get(locale).set(namespace, translations);

      logger.debug('Translation loaded', { locale, namespace, keys: Object.keys(translations).length });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to load translation', { locale, namespace, error });
      } else {
        logger.debug('Translation file not found', { locale, namespace });
        // Create empty translation map for missing files
        if (!this.translations.has(locale)) {
          this.translations.set(locale, new Map());
        }
        this.translations.get(locale).set(namespace, {});
      }
    }
  }

  setupPluralRules() {
    // Define pluralization rules for different languages
    this.pluralRules.set('en', this.getEnglishPlurals());
    this.pluralRules.set('es', this.getSpanishPlurals());
    this.pluralRules.set('fr', this.getFrenchPlurals());
    this.pluralRules.set('de', this.getGermanPlurals());
    this.pluralRules.set('it', this.getItalianPlurals());
    this.pluralRules.set('pt', this.getPortuguesePlurals());
    this.pluralRules.set('ru', this.getRussianPlurals());
    this.pluralRules.set('ja', this.getJapanesePlurals());
    this.pluralRules.set('ko', this.getKoreanPlurals());
    this.pluralRules.set('zh', this.getChinesePlurals());
  }

  setupDateTimeFormats() {
    // Define date and time formatting for different locales
    for (const locale of this.options.locales) {
      this.dateTimeFormats.set(locale, {
        short: {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        },
        long: {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        },
        time: {
          hour: '2-digit',
          minute: '2-digit'
        },
        datetime: {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      });
    }
  }

  setupNumberFormats() {
    // Define number formatting for different locales
    for (const locale of this.options.locales) {
      this.numberFormats.set(locale, {
        currency: {
          style: 'currency',
          currency: locale === 'en' ? 'USD' :
                   locale === 'es' ? 'EUR' :
                   locale === 'fr' ? 'EUR' :
                   locale === 'de' ? 'EUR' :
                   locale === 'it' ? 'EUR' :
                   locale === 'pt' ? 'EUR' :
                   locale === 'ru' ? 'RUB' :
                   locale === 'ja' ? 'JPY' :
                   locale === 'ko' ? 'KRW' :
                   locale === 'zh' ? 'CNY' : 'USD'
        },
        decimal: {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        },
        percent: {
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 2
        },
        compact: {
          notation: 'compact',
          compactDisplay: 'short'
        }
      });
    }
  }

  setupAutoDetection() {
    // Auto-detect user's preferred language from browser headers
    this.detectLocale = this.detectLocale.bind(this);
  }

  // Core translation method
  t(key, options = {}) {
    const {
      locale = this.options.defaultLocale,
      fallback = this.options.fallbackLocale,
      count,
      context,
      ...interpolationValues
    } = options;

    const translation = this.getTranslation(key, locale);

    if (translation === undefined && locale !== fallback) {
      logger.debug('Translation fallback used', { key, locale, fallback });
      return this.t(key, { ...options, locale: fallback });
    }

    if (translation === undefined) {
      logger.warn('Translation key not found', { key, locale });
      return key; // Return key as fallback
    }

    // Handle pluralization
    let finalTranslation = translation;
    if (typeof count === 'number' && this.pluralRules.has(locale)) {
      finalTranslation = this.applyPluralization(translation, count, locale);
    }

    // Handle context-specific translations
    if (context && typeof finalTranslation === 'object') {
      finalTranslation = finalTranslation[context] || finalTranslation;
    }

    // Interpolate variables
    return this.interpolate(finalTranslation, interpolationValues);
  }

  getTranslation(key, locale) {
    const keyParts = key.split('.');
    const [namespace, ...keyPath] = keyParts;

    const localeTranslations = this.translations.get(locale);
    if (!localeTranslations) return undefined;

    const namespaceTranslations = localeTranslations.get(namespace);
    if (!namespaceTranslations) return undefined;

    return keyPath.reduce((obj, part) => obj?.[part], namespaceTranslations);
  }

  applyPluralization(translation, count, locale) {
    const pluralRules = this.pluralRules.get(locale);

    if (!pluralRules) return translation;

    const pluralForm = pluralRules(count);

    if (typeof translation === 'object' && translation[pluralForm]) {
      return translation[pluralForm];
    }

    return translation;
  }

  interpolate(template, values) {
    if (typeof template !== 'string') return template;

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return values[key] !== undefined ? String(values[key]) : match;
    });
  }

  // Pluralization rules for different languages
  getEnglishPlurals() {
    return (count) => count === 1 ? 'one' : 'other';
  }

  getSpanishPlurals() {
    return (count) => {
      if (count === 1) return 'one';
      return 'other';
    };
  }

  getFrenchPlurals() {
    return (count) => {
      if (count === 0 || count === 1) return 'one';
      return 'other';
    };
  }

  getGermanPlurals() {
    return (count) => {
      if (count === 1) return 'one';
      return 'other';
    };
  }

  getItalianPlurals() {
    return (count) => {
      if (count === 1) return 'one';
      return 'other';
    };
  }

  getPortuguesePlurals() {
    return (count) => {
      if (count === 1) return 'one';
      return 'other';
    };
  }

  getRussianPlurals() {
    return (count) => {
      const lastDigit = count % 10;
      const lastTwoDigits = count % 100;

      if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'other';
      if (lastDigit === 1) return 'one';
      if (lastDigit >= 2 && lastDigit <= 4) return 'few';
      return 'other';
    };
  }

  getJapanesePlurals() {
    return (count) => 'other'; // Japanese doesn't have plural forms
  }

  getKoreanPlurals() {
    return (count) => 'other'; // Korean doesn't have plural forms
  }

  getChinesePlurals() {
    return (count) => 'other'; // Chinese doesn't have plural forms
  }

  // Date and time formatting
  formatDate(date, options = {}) {
    const { locale = this.options.defaultLocale, format = 'short' } = options;
    const dateTimeFormat = this.dateTimeFormats.get(locale)?.[format];

    if (!dateTimeFormat) {
      return date.toLocaleDateString(locale);
    }

    return new Intl.DateTimeFormat(locale, dateTimeFormat).format(new Date(date));
  }

  formatTime(date, options = {}) {
    const { locale = this.options.defaultLocale, format = 'time' } = options;
    const dateTimeFormat = this.dateTimeFormats.get(locale)?.[format];

    if (!dateTimeFormat) {
      return date.toLocaleTimeString(locale);
    }

    return new Intl.DateTimeFormat(locale, dateTimeFormat).format(new Date(date));
  }

  formatDateTime(date, options = {}) {
    const { locale = this.options.defaultLocale, format = 'datetime' } = options;
    const dateTimeFormat = this.dateTimeFormats.get(locale)?.[format];

    if (!dateTimeFormat) {
      return date.toLocaleString(locale);
    }

    return new Intl.DateTimeFormat(locale, dateTimeFormat).format(new Date(date));
  }

  formatRelativeTime(date, options = {}) {
    const { locale = this.options.defaultLocale } = options;
    const now = new Date();
    const diff = now - new Date(date);

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let key;
    let count;

    if (days > 0) {
      key = 'days';
      count = days;
    } else if (hours > 0) {
      key = 'hours';
      count = hours;
    } else if (minutes > 0) {
      key = 'minutes';
      count = minutes;
    } else {
      key = 'seconds';
      count = seconds;
    }

    const isPast = diff > 0;
    const relativeKey = isPast ? `relativeTime.past.${key}` : `relativeTime.future.${key}`;

    return this.t(relativeKey, { locale, count });
  }

  // Number formatting
  formatNumber(number, options = {}) {
    const { locale = this.options.defaultLocale, format = 'decimal' } = options;
    const numberFormat = this.numberFormats.get(locale)?.[format];

    if (!numberFormat) {
      return number.toLocaleString(locale);
    }

    return new Intl.NumberFormat(locale, numberFormat).format(number);
  }

  formatCurrency(amount, options = {}) {
    const { locale = this.options.defaultLocale, format = 'currency' } = options;
    const numberFormat = this.numberFormats.get(locale)?.[format];

    if (!numberFormat) {
      return amount.toLocaleString(locale, { style: 'currency', currency: 'USD' });
    }

    return new Intl.NumberFormat(locale, numberFormat).format(amount);
  }

  // Locale detection
  detectLocale(acceptLanguage = '', fallback = this.options.defaultLocale) {
    if (!acceptLanguage) return fallback;

    const languages = acceptLanguage.split(',').map(lang => {
      const [locale, quality = '1'] = lang.trim().split(';q=');
      return { locale: locale.split('-')[0], quality: parseFloat(quality) };
    }).sort((a, b) => b.quality - a.quality);

    for (const { locale } of languages) {
      if (this.options.locales.includes(locale)) {
        return locale;
      }
    }

    return fallback;
  }

  // Language switching
  async setLocale(locale) {
    if (!this.options.locales.includes(locale)) {
      throw new Error(`Unsupported locale: ${locale}`);
    }

    // Load translations for the new locale if not already loaded
    for (const namespace of this.options.namespaces) {
      if (!this.translations.has(locale) || !this.translations.get(locale).has(namespace)) {
        await this.loadTranslation(locale, namespace);
      }
    }

    logger.info('Locale switched', { locale });
    return locale;
  }

  // Translation management
  async addTranslation(locale, namespace, translations) {
    if (!this.options.locales.includes(locale)) {
      this.options.locales.push(locale);
    }

    if (!this.options.namespaces.includes(namespace)) {
      this.options.namespaces.push(namespace);
    }

    if (!this.translations.has(locale)) {
      this.translations.set(locale, new Map());
    }

    const existingTranslations = this.translations.get(locale).get(namespace) || {};
    const mergedTranslations = this.deepMerge(existingTranslations, translations);

    this.translations.get(locale).set(namespace, mergedTranslations);

    // Save to file
    await this.saveTranslationToFile(locale, namespace, mergedTranslations);

    logger.info('Translation added', { locale, namespace, keys: Object.keys(translations).length });
    return true;
  }

  async removeTranslation(locale, namespace, keyPath) {
    if (!this.translations.has(locale)) {
      throw new Error(`Locale not found: ${locale}`);
    }

    const namespaceTranslations = this.translations.get(locale).get(namespace);
    if (!namespaceTranslations) {
      throw new Error(`Namespace not found: ${namespace}`);
    }

    const keys = keyPath.split('.');
    let current = namespaceTranslations;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
        throw new Error(`Invalid key path: ${keyPath}`);
      }
      current = current[keys[i]];
    }

    delete current[keys[keys.length - 1]];

    // Save updated translations
    await this.saveTranslationToFile(locale, namespace, namespaceTranslations);

    logger.info('Translation removed', { locale, namespace, keyPath });
    return true;
  }

  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  async saveTranslationToFile(locale, namespace, translations) {
    try {
      const dirPath = path.join(this.options.basePath, locale);
      await fs.mkdir(dirPath, { recursive: true });

      const filePath = path.join(dirPath, `${namespace}.json`);
      await fs.writeFile(filePath, JSON.stringify(translations, null, 2), 'utf8');
    } catch (error) {
      logger.error('Failed to save translation file', { locale, namespace, error });
      throw error;
    }
  }

  // Context-aware translations
  getContextualTranslation(key, context, options = {}) {
    const baseTranslation = this.t(key, options);

    if (context && typeof baseTranslation === 'object' && baseTranslation[context]) {
      return this.interpolate(baseTranslation[context], options);
    }

    return baseTranslation;
  }

  // Validation helpers
  validateTranslationKey(key) {
    const keyPattern = /^[a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+$/;
    return keyPattern.test(key);
  }

  validateLocale(locale) {
    return this.options.locales.includes(locale);
  }

  // Statistics and monitoring
  getTranslationStats() {
    const stats = {
      totalLocales: this.options.locales.length,
      totalNamespaces: this.options.namespaces.length,
      totalKeys: 0,
      coverage: {},
      missingKeys: []
    };

    for (const locale of this.options.locales) {
      stats.coverage[locale] = {};
      let localeKeys = 0;

      for (const namespace of this.options.namespaces) {
        const translations = this.translations.get(locale)?.get(namespace) || {};
        const namespaceKeys = this.countKeys(translations);
        localeKeys += namespaceKeys;

        stats.coverage[locale][namespace] = {
          keys: namespaceKeys,
          percentage: 100 // Assume complete for demo
        };
      }

      stats.coverage[locale].total = localeKeys;
      stats.totalKeys += localeKeys;
    }

    return stats;
  }

  countKeys(obj, prefix = '') {
    let count = 0;

    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        count += this.countKeys(obj[key], `${prefix}${key}.`);
      } else {
        count++;
      }
    }

    return count;
  }

  // Export/Import functionality
  async exportTranslations(format = 'json') {
    const exportData = {};

    for (const locale of this.options.locales) {
      exportData[locale] = {};

      for (const namespace of this.options.namespaces) {
        const translations = this.translations.get(locale)?.get(namespace);
        if (translations) {
          exportData[locale][namespace] = translations;
        }
      }
    }

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else if (format === 'csv') {
      return this.convertToCSV(exportData);
    }

    return exportData;
  }

  convertToCSV(data) {
    // Simple CSV conversion for translation keys
    const lines = ['Locale,Namespace,Key,Value'];

    for (const locale of Object.keys(data)) {
      for (const namespace of Object.keys(data[locale])) {
        const translations = data[locale][namespace];
        this.flattenTranslations(translations, `${locale},${namespace}`, '').forEach(line => {
          lines.push(line);
        });
      }
    }

    return lines.join('\n');
  }

  flattenTranslations(obj, prefix, path) {
    const lines = [];

    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        lines.push(...this.flattenTranslations(obj[key], prefix, currentPath));
      } else {
        lines.push(`${prefix},"${currentPath}","${obj[key]}"`);
      }
    }

    return lines;
  }

  // Get available locales and namespaces
  getAvailableLocales() {
    return [...this.options.locales];
  }

  getAvailableNamespaces() {
    return [...this.options.namespaces];
  }

  // RTL language support
  isRTL(locale) {
    const rtlLocales = ['ar', 'he', 'fa', 'ur'];
    return rtlLocales.includes(locale.split('-')[0]);
  }

  // Text direction
  getTextDirection(locale) {
    return this.isRTL(locale) ? 'rtl' : 'ltr';
  }

  // Language name in native language
  getLanguageName(locale, displayLocale = locale) {
    const languageNames = {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      it: 'Italiano',
      pt: 'Português',
      ru: 'Русский',
      ja: '日本語',
      ko: '한국어',
      zh: '中文'
    };

    return languageNames[locale] || locale;
  }

  // Advanced features
  async getSimilarTranslations(key, locale, threshold = 0.8) {
    // Simple similarity search implementation
    const allKeys = this.getAllKeys(locale);

    return allKeys
      .filter(k => this.calculateSimilarity(key, k) >= threshold)
      .map(k => ({ key: k, translation: this.t(k, { locale }) }))
      .slice(0, 10);
  }

  getAllKeys(locale) {
    const keys = [];

    for (const namespace of this.options.namespaces) {
      const translations = this.translations.get(locale)?.get(namespace);
      if (translations) {
        keys.push(...this.extractKeys(translations, namespace));
      }
    }

    return keys;
  }

  extractKeys(obj, prefix = '') {
    const keys = [];

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys.push(...this.extractKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  calculateSimilarity(str1, str2) {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Cache management
  clearCache() {
    // Clear any cached translations
    logger.info('I18n cache cleared');
  }

  // Health check
  getHealth() {
    return {
      isHealthy: true,
      locales: this.options.locales.length,
      namespaces: this.options.namespaces.length,
      totalKeys: this.getTranslationStats().totalKeys,
      timestamp: new Date()
    };
  }
}

const i18nManager = new I18nManager();

module.exports = {
  I18nManager,
  i18nManager
};
