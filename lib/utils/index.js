// lib/utils/index.js - Modern JavaScript Utility Library
const crypto = require('crypto');

// Advanced async utilities with modern patterns
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retry = async (fn, attempts = 3, delay = 1000, backoff = 2) => {
  let lastError;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await sleep(delay * Math.pow(backoff, i));
      }
    }
  }

  throw lastError;
};

// Advanced memoization with WeakMap for objects and Map for primitives
const memoize = (fn, getKey = (...args) => JSON.stringify(args)) => {
  const cache = new WeakMap();
  const primitiveCache = new Map();

  return (...args) => {
    const key = getKey(...args);

    // Check for object arguments
    for (const arg of args) {
      if (typeof arg === 'object' && arg !== null) {
        if (cache.has(arg)) {
          return cache.get(arg);
        }
      }
    }

    // Check for primitive arguments
    if (primitiveCache.has(key)) {
      return primitiveCache.get(key);
    }

    const result = fn(...args);

    // Cache based on argument types
    for (const arg of args) {
      if (typeof arg === 'object' && arg !== null) {
        cache.set(arg, result);
        break;
      }
    }

    if (args.every(arg => typeof arg !== 'object' || arg === null)) {
      primitiveCache.set(key, result);
    }

    return result;
  };
};

// Advanced debounce with immediate execution option
const debounce = (func, wait, immediate = false) => {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
};

// Advanced throttle with leading/trailing options
const throttle = (func, limit, options = {}) => {
  const { leading = true, trailing = true } = options;
  let lastFunc;
  let lastRan;

  return function(...args) {
    if (!lastRan) {
      if (leading) {
        func(...args);
      }
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (trailing && (Date.now() - lastRan) >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

// Advanced pipeline operator simulation
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

// Advanced curry function
const curry = (fn, arity = fn.length) => {
  const curried = (...args) => {
    if (args.length >= arity) {
      return fn(...args);
    }
    return (...moreArgs) => curried(...args, ...moreArgs);
  };
  return curried;
};

// Advanced compose function
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);

// Advanced object utilities
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Advanced object merging with deep merge
const deepMerge = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return deepMerge(target, ...sources);
};

const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

// Advanced array utilities
const chunk = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

const partition = (array, predicate) => {
  return array.reduce((result, item) => {
    result[predicate(item) ? 0 : 1].push(item);
    return result;
  }, [[], []]);
};

const flatten = (array, depth = Infinity) => {
  if (depth === 0) return array;
  return array.reduce((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item, depth - 1) : item);
  }, []);
};

// Advanced string utilities
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const camelCase = (str) => {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
};

const kebabCase = (str) => {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

const snakeCase = (str) => {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
};

// Advanced functional utilities
const tap = (value, fn) => {
  fn(value);
  return value;
};

const tapAsync = async (value, fn) => {
  await fn(value);
  return value;
};

const when = (condition, fn) => {
  return (...args) => condition ? fn(...args) : args[0];
};

const unless = (condition, fn) => {
  return (...args) => !condition ? fn(...args) : args[0];
};

// Advanced validation utilities
const isEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Performance monitoring utilities
const measurePerformance = async (name, fn) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
  return result;
};

const measureMemory = (fn) => {
  const before = process.memoryUsage();
  const result = fn();
  const after = process.memoryUsage();

  const memoryUsed = {
    rss: after.rss - before.rss,
    heapTotal: after.heapTotal - before.heapTotal,
    heapUsed: after.heapUsed - before.heapUsed,
    external: after.external - before.external
  };

  console.log('Memory usage:', memoryUsed);
  return result;
};

// Advanced error handling utilities
const to = async (promise) => {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    return [error, null];
  }
};

// Advanced class utilities
const createClass = (methods) => {
  return class {
    constructor(...args) {
      Object.assign(this, methods);
      if (this.initialize) {
        this.initialize(...args);
      }
    }
  };
};

// Advanced iterator utilities
const range = function*(start, end, step = 1) {
  for (let i = start; i < end; i += step) {
    yield i;
  }
};

const zip = (...arrays) => {
  const length = Math.min(...arrays.map(arr => arr.length));
  return Array.from({ length }, (_, i) => arrays.map(arr => arr[i]));
};

const enumerate = function*(iterable) {
  let index = 0;
  for (const item of iterable) {
    yield [index++, item];
  }
};

// Modern fetch utilities with advanced features
const enhancedFetch = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Advanced date utilities
const formatDate = (date, options = {}) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }).format(new Date(date));
};

const relativeTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

module.exports = {
  // Async utilities
  sleep,
  retry,
  to,
  enhancedFetch,

  // Function utilities
  memoize,
  debounce,
  throttle,
  pipe,
  compose,
  curry,
  tap,
  tapAsync,
  when,
  unless,

  // Object utilities
  deepClone,
  deepMerge,
  isObject,

  // Array utilities
  chunk,
  groupBy,
  partition,
  flatten,

  // String utilities
  capitalize,
  camelCase,
  kebabCase,
  snakeCase,

  // Validation utilities
  isEmail,
  isURL,
  isUUID,

  // Performance utilities
  measurePerformance,
  measureMemory,

  // Class utilities
  createClass,

  // Iterator utilities
  range,
  zip,
  enumerate,

  // Date utilities
  formatDate,
  relativeTime
};
