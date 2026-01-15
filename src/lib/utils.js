// Format currency with 2 decimal places
export const formatCurrency = (amount) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
};

// Check if email is in whitelist
export const isEmailAllowed = (email) => {
  const allowedEmails = process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '';
  const whitelist = allowedEmails.split(',').map(e => e.trim().toLowerCase());
  return whitelist.includes(email.toLowerCase());
};

// Sort array by key
export const sortData = (data, key, direction) => {
  return [...data].sort((a, b) => {
    let aVal = a[key];
    let bVal = b[key];

    // Handle numeric sorting
    if (typeof aVal === 'number' || typeof bVal === 'number') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // Handle string sorting
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return 0;
  });
};
