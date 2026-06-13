import { useEffect, useState } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';

export function useSavedState(key, fallback) {
  const [value, setValue] = useState(() => getStorageItem(key, fallback));

  useEffect(() => {
    setStorageItem(key, value);
  }, [key, value]);

  return [value, setValue];
}
