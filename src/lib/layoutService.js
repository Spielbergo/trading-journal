import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const LAYOUTS_COLLECTION = 'user_layouts';

export const layoutService = {
  // Get user layout preferences
  async getLayout(userId, page) {
    try {
      const docRef = doc(db, LAYOUTS_COLLECTION, `${userId}_${page}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().layout;
      }
      return null;
    } catch (error) {
      console.error('Error getting layout:', error);
      return null;
    }
  },

  // Save user layout preferences
  async saveLayout(userId, page, layout) {
    try {
      const docRef = doc(db, LAYOUTS_COLLECTION, `${userId}_${page}`);
      await setDoc(docRef, {
        layout,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error saving layout:', error);
      throw error;
    }
  },
};
