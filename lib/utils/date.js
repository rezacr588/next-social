// Date utility functions
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return new Date(date).toLocaleDateString('en-US', {
    ...defaultOptions,
    ...options,
  });
};

export const formatRelativeTime = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();
  
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;
  
  if (diff < minute) {
    return 'just now';
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}m ago`;
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}h ago`;
  } else if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days}d ago`;
  } else if (diff < month) {
    const weeks = Math.floor(diff / week);
    return `${weeks}w ago`;
  } else if (diff < year) {
    const months = Math.floor(diff / month);
    return `${months}mo ago`;
  } else {
    const years = Math.floor(diff / year);
    return `${years}y ago`;
  }
};

export const isToday = (date) => {
  const today = new Date();
  const target = new Date(date);
  
  return (
    today.getDate() === target.getDate() &&
    today.getMonth() === target.getMonth() &&
    today.getFullYear() === target.getFullYear()
  );
};

export const isThisWeek = (date) => {
  const now = new Date();
  const target = new Date(date);
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  
  return target >= startOfWeek;
};