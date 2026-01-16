"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/positions', label: 'Open Positions', icon: '💼' },
    { href: '/trades', label: 'Trades', icon: '📝' },
    { href: '/analytics', label: 'Analytics', icon: '📈' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h1>Trading Journal</h1>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className={styles.user}>
        <div className={styles.userInfo}>
          <span className={styles.userEmail}>{user?.email}</span>
        </div>
        <button onClick={handleSignOut} className={styles.signOutButton}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
