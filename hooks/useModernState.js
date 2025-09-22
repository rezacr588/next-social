// hooks/useModernState.js - Advanced State Management with Modern Patterns
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const useModernState = (initialState) => {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);

  // Update ref when state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Advanced state updater with functional updates
  const updateState = useCallback((updater) => {
    setState(prevState => {
      const newState = typeof updater === 'function' ? updater(prevState) : updater;

      // Deep clone for immutable updates
      if (typeof newState === 'object' && newState !== null) {
        return JSON.parse(JSON.stringify(newState));
      }

      return newState;
    });
  }, []);

  // Selective state update for objects
  const updateField = useCallback((field, value) => {
    setState(prevState => {
      if (typeof prevState === 'object' && prevState !== null && !Array.isArray(prevState)) {
        return { ...prevState, [field]: value };
      }
      return prevState;
    });
  }, []);

  // Batch state updates
  const batchUpdate = useCallback((updates) => {
    setState(prevState => {
      if (typeof prevState === 'object' && prevState !== null && !Array.isArray(prevState)) {
        return { ...prevState, ...updates };
      }
      return prevState;
    });
  }, []);

  // Reset state to initial value
  const resetState = useCallback(() => {
    setState(initialState);
  }, [initialState]);

  // Get current state value (for use in callbacks)
  const getState = useCallback(() => stateRef.current, []);

  // Check if state has changed
  const hasChanged = useCallback((compareFn) => {
    return typeof compareFn === 'function' ? compareFn(stateRef.current, initialState) : stateRef.current !== initialState;
  }, [initialState]);

  // Memoized computed values
  const computed = useMemo(() => {
    if (typeof state === 'object' && state !== null && !Array.isArray(state)) {
      return {
        keys: Object.keys(state),
        values: Object.values(state),
        entries: Object.entries(state),
        size: Object.keys(state).length,
        isEmpty: Object.keys(state).length === 0,
        hasKeys: (...keys) => keys.every(key => state.hasOwnProperty(key))
      };
    }

    if (Array.isArray(state)) {
      return {
        length: state.length,
        isEmpty: state.length === 0,
        first: state[0],
        last: state[state.length - 1],
        includes: (item) => state.includes(item)
      };
    }

    return {
      length: String(state).length,
      isEmpty: !state,
      toString: () => String(state)
    };
  }, [state]);

  return {
    state,
    setState,
    updateState,
    updateField,
    batchUpdate,
    resetState,
    getState,
    hasChanged,
    computed
  };
};

// Advanced reducer hook with middleware support
const useModernReducer = (reducer, initialState, middlewares = []) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const middlewaresRef = useRef(middlewares);

  const enhancedDispatch = useCallback((action) => {
    // Apply middlewares
    let currentAction = action;

    for (const middleware of middlewaresRef.current) {
      if (middleware) {
        currentAction = middleware(currentAction, state);
      }
    }

    dispatch(currentAction);
  }, [state]);

  return [state, enhancedDispatch];
};

// Advanced effect hook with dependencies tracking
const useModernEffect = (effect, deps, options = {}) => {
  const {
    runOnMount = true,
    runOnUnmount = false,
    cleanup = null
  } = options;

  const effectRef = useRef(effect);
  const cleanupRef = useRef(cleanup);
  const depsRef = useRef(deps);

  // Track dependency changes
  const depsChanged = useMemo(() => {
    if (!depsRef.current || !deps) return true;

    return deps.some((dep, index) =>
      depsRef.current[index] !== dep
    );
  }, [deps]);

  useEffect(() => {
    effectRef.current = effect;
    cleanupRef.current = cleanup;
    depsRef.current = deps;
  });

  useEffect(() => {
    if (!runOnMount && !depsChanged) return;

    const result = effectRef.current();

    return () => {
      if (runOnUnmount && cleanupRef.current) {
        cleanupRef.current(result);
      }
    };
  }, deps);
};

// Advanced async operation hook
const useAsyncOperation = (asyncFn, options = {}) => {
  const {
    immediate = false,
    onSuccess,
    onError,
    retryAttempts = 3,
    retryDelay = 1000
  } = options;

  const [state, setState] = useModernState({
    data: null,
    error: null,
    loading: false,
    success: false
  });

  const execute = useCallback(async (...args) => {
    setState({
      data: null,
      error: null,
      loading: true,
      success: false
    });

    let attempts = 0;
    let lastError;

    while (attempts < retryAttempts) {
      try {
        const data = await asyncFn(...args);

        setState({
          data,
          error: null,
          loading: false,
          success: true
        });

        onSuccess?.(data);
        return data;
      } catch (error) {
        lastError = error;
        attempts++;

        if (attempts < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
        }
      }
    }

    setState({
      data: null,
      error: lastError,
      loading: false,
      success: false
    });

    onError?.(lastError);
    throw lastError;
  }, [asyncFn, retryAttempts, retryDelay, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute
  };
};

// Advanced local storage hook with modern patterns
const useLocalStorage = (key, initialValue, options = {}) => {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    sync = false
  } = options;

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      const serializedValue = serialize(valueToStore);
      window.localStorage.setItem(key, serializedValue);

      // Sync across tabs if enabled
      if (sync) {
        window.dispatchEvent(new CustomEvent('localStorageChange', {
          detail: { key, value: valueToStore }
        }));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, serialize, storedValue, sync]);

  // Listen for changes across tabs
  useEffect(() => {
    if (!sync) return;

    const handleStorageChange = (e) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.value);
      }
    };

    window.addEventListener('localStorageChange', handleStorageChange);
    return () => window.removeEventListener('localStorageChange', handleStorageChange);
  }, [key, sync]);

  return [storedValue, setValue];
};

// Advanced intersection observer hook
const useIntersectionObserver = (options = {}) => {
  const {
    threshold = 0,
    rootMargin = '0px',
    triggerOnce = false
  } = options;

  const [entries, setEntries] = useState([]);
  const [ref, setRef] = useState(null);

  const observerCallback = useCallback((observerEntries) => {
    setEntries(observerEntries);

    // Unobserve if triggerOnce is true and element is intersecting
    if (triggerOnce && observerEntries.some(entry => entry.isIntersecting)) {
      observerEntries.forEach(entry => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
        }
      });
    }
  }, [triggerOnce]);

  const observer = useMemo(() => {
    if (typeof window !== 'undefined' && window.IntersectionObserver) {
      return new IntersectionObserver(observerCallback, {
        threshold,
        rootMargin
      });
    }
    return null;
  }, [observerCallback, threshold, rootMargin]);

  useEffect(() => {
    if (ref && observer) {
      observer.observe(ref);
      return () => observer.unobserve(ref);
    }
  }, [ref, observer]);

  return [setRef, entries];
};

// Advanced performance monitoring hook
const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const renderTime = useRef(0);
  const lastRenderTime = useRef(0);

  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current++;
    lastRenderTime.current = performance.now() - startTime.current;
    renderTime.current += lastRenderTime.current;
    startTime.current = performance.now();

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered:`, {
        renderCount: renderCount.current,
        lastRenderTime: `${lastRenderTime.current.toFixed(2)}ms`,
        averageRenderTime: `${(renderTime.current / renderCount.current).toFixed(2)}ms`
      });
    }
  });

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current,
    averageRenderTime: renderCount.current > 0 ? renderTime.current / renderCount.current : 0
  };
};

module.exports = {
  useModernState,
  useModernReducer,
  useModernEffect,
  useAsyncOperation,
  useLocalStorage,
  useIntersectionObserver,
  usePerformanceMonitor
};
