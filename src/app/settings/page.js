"use client";

import Layout from '@/components/Layout';
import styles from './settings.module.css';

export default function Settings() {
  return (
    <Layout>
      <div className={styles.settings}>
        <h1 className={styles.title}>Settings</h1>

        <div className={styles.section}>
          <h2>About</h2>
          <p className={styles.description}>
            Trading Journal - A simple and effective way to track your trades and improve your trading performance.
          </p>
          <p className={styles.description}>
            Your trade data is securely stored in Firebase and synced across all your devices.
          </p>
          <p className={styles.description}>
            Version 1.0.0
          </p>
        </div>

        <div className={styles.section}>
          <h2>Features</h2>
          <ul className={styles.featureList}>
            <li>Track all your trades with detailed information</li>
            <li>View comprehensive analytics and performance metrics</li>
            <li>Monitor P&L and win rates</li>
            <li>Cloud storage with Firebase - access from anywhere</li>
            <li>Google and email authentication</li>
            <li>Dark mode interface for comfortable viewing</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
