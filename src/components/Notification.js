import { useEffect } from 'react';
import styles from './Notification.module.css';

export default function Notification({ message, type = 'error', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.notification} ${styles[type]}`}>
      <span className={styles.icon}>
        {type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}
      </span>
      <span className={styles.message}>{message}</span>
      <button className={styles.closeButton} onClick={onClose}>×</button>
    </div>
  );
}
