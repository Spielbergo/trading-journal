import styles from './Spinner.module.css';

export default function Spinner({ text = 'Loading...', size = 'medium' }) {
  const sizeClass = size === 'large' ? styles.spinnerLarge : size === 'small' ? styles.spinnerSmall : '';
  
  return (
    <div className={styles.spinnerContainer}>
      <div className={`${styles.spinner} ${sizeClass}`}></div>
      {text && <p className={styles.spinnerText}>{text}</p>}
    </div>
  );
}
