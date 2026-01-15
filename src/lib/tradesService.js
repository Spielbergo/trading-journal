import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const TRADES_COLLECTION = 'trades';

export const tradesService = {
  // Add a new trade
  async addTrade(tradeData) {
    try {
      const docRef = await addDoc(collection(db, TRADES_COLLECTION), {
        ...tradeData,
        createdAt: Timestamp.now(),
      });
      return { id: docRef.id, ...tradeData };
    } catch (error) {
      console.error('Error adding trade:', error);
      throw error;
    }
  },

  // Get all trades (shared across all users)
  async getTrades() {
    try {
      console.log('Fetching trades from Firestore...');
      console.log('Database instance:', db);
      console.log('Database app name:', db.app.name);
      console.log('Database project ID:', db.app.options.projectId);
      
      const startTime = Date.now();
      
      const q = query(collection(db, TRADES_COLLECTION));
      console.log('Query created for collection:', TRADES_COLLECTION);
      
      const querySnapshot = await getDocs(q);
      
      console.log(`Firestore query completed in ${Date.now() - startTime}ms`);
      console.log('Query snapshot size:', querySnapshot.size);
      console.log('Query snapshot empty:', querySnapshot.empty);
      console.log(`Fetched ${querySnapshot.docs.length} trades`);
      
      const trades = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Sort by createdAt client-side (newest first)
      return trades.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error('Error getting trades:', error);
      throw error;
    }
  },

  // Delete a trade
  async deleteTrade(tradeId) {
    try {
      await deleteDoc(doc(db, TRADES_COLLECTION, tradeId));
    } catch (error) {
      console.error('Error deleting trade:', error);
      throw error;
    }
  },

  // Update a trade
  async updateTrade(tradeId, tradeData) {
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      await updateDoc(tradeRef, {
        ...tradeData,
        updatedAt: Timestamp.now(),
      });
      return { id: tradeId, ...tradeData };
    } catch (error) {
      console.error('Error updating trade:', error);
      throw error;
    }
  },
};
