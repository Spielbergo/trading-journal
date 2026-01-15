import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.main}>{children}</main>
      </div>
    </ProtectedRoute>
  );
}
