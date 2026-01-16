"use client";

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import Notification from '@/components/Notification';
import { useAuth } from '@/contexts/AuthContext';
import { tradesService } from '@/lib/tradesService';
import { formatCurrency } from '@/lib/utils';
import styles from './positions.module.css';

export default function Positions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({});
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingPosition, setClosingPosition] = useState(null);
  const [closeData, setCloseData] = useState({ exitPrice: '', exitDate: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    type: 'long',
    quantity: '',
    entryPrice: '',
    stopLoss: '',
    strategy: '',
    riskAmount: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (user) {
      loadPositions();
    }
  }, [user]);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const allTrades = await tradesService.getTrades();
      // Filter for open positions (no exit price or exit price is 0)
      const openPositions = allTrades.filter(trade => !trade.exitPrice || trade.exitPrice === 0);
      setPositions(openPositions);
      
      // Initialize current prices with entry prices
      const prices = {};
      openPositions.forEach(pos => {
        prices[pos.id] = pos.entryPrice.toString();
      });
      setCurrentPrices(prices);
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUnrealizedPL = (position, currentPrice) => {
    const price = parseFloat(currentPrice) || position.entryPrice;
    const quantity = parseFloat(position.quantity);
    const entry = parseFloat(position.entryPrice);
    
    if (position.type === 'long') {
      return (price - entry) * quantity;
    } else {
      return (entry - price) * quantity;
    }
  };

  const calculateDaysHeld = (entryDate) => {
    const entry = new Date(entryDate);
    const today = new Date();
    const diffTime = Math.abs(today - entry);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCurrentPriceChange = (positionId, value) => {
    setCurrentPrices({
      ...currentPrices,
      [positionId]: value
    });
  };

  const fetchPrice = async (symbol, positionId) => {
    try {
      const response = await fetch(`/api/quote?symbol=${symbol}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentPrices(prev => ({
          ...prev,
          [positionId]: data.price.toString()
        }));
        return true;
      } else {
        const error = await response.json();
        console.error('Failed to fetch price for', symbol, ':', error.error);
        setNotification({ message: `Could not fetch price for ${symbol}: ${error.error}`, type: 'error' });
        return false;
      }
    } catch (error) {
      console.error('Error fetching price for', symbol, error);
      setNotification({ message: `Error fetching price for ${symbol}. Please enter manually.`, type: 'error' });
      return false;
    }
  };

  const fetchAllPrices = async () => {
    setFetchingPrices(true);
    try {
      await Promise.all(
        positions.map(pos => fetchPrice(pos.symbol, pos.id))
      );
    } finally {
      setFetchingPrices(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      const quantity = parseFloat(formData.quantity);
      const entryPrice = parseFloat(formData.entryPrice);
      const stopLoss = formData.stopLoss ? parseFloat(formData.stopLoss) : null;
      const riskAmount = formData.riskAmount ? parseFloat(formData.riskAmount) : null;
      
      const tradeData = {
        ...formData,
        quantity,
        entryPrice,
        exitPrice: 0, // Open position has no exit price
        profitLoss: 0,
        stopLoss,
        riskAmount,
        riskRewardRatio: null,
        strategy: formData.strategy || 'Untagged',
      };

      await tradesService.addTrade(tradeData);
      
      setShowAddModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        symbol: '',
        type: 'long',
        quantity: '',
        entryPrice: '',
        stopLoss: '',
        strategy: '',
        riskAmount: '',
        notes: '',
      });
      await loadPositions();
    } catch (error) {
      console.error('Error adding position:', error);
      setNotification({ message: 'Failed to add position. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleClosePosition = (position) => {
    setClosingPosition(position);
    setCloseData({
      exitPrice: currentPrices[position.id] || position.entryPrice.toString(),
      exitDate: new Date().toISOString().split('T')[0]
    });
    setShowCloseModal(true);
  };

  const handleCloseSubmit = async (e) => {
    e.preventDefault();
    if (!closingPosition) return;

    try {
      setSubmitting(true);
      const exitPrice = parseFloat(closeData.exitPrice);
      const quantity = parseFloat(closingPosition.quantity);
      const entryPrice = parseFloat(closingPosition.entryPrice);
      
      let profitLoss;
      if (closingPosition.type === 'long') {
        profitLoss = (exitPrice - entryPrice) * quantity;
      } else {
        profitLoss = (entryPrice - exitPrice) * quantity;
      }

      // Calculate R:R if stop loss exists
      let riskRewardRatio = closingPosition.riskRewardRatio;
      if (closingPosition.stopLoss) {
        const risk = Math.abs(entryPrice - closingPosition.stopLoss) * quantity;
        const reward = Math.abs(profitLoss);
        if (risk > 0) riskRewardRatio = reward / risk;
      }

      await tradesService.updateTrade(closingPosition.id, {
        ...closingPosition,
        exitPrice,
        profitLoss,
        riskRewardRatio,
        date: closeData.exitDate, // Update date to exit date
      });

      setShowCloseModal(false);
      setClosingPosition(null);
      setCloseData({ exitPrice: '', exitDate: '' });
      await loadPositions();
      setNotification({ message: 'Position closed successfully!', type: 'success' });
    } catch (error) {
      console.error('Error closing position:', error);
      setNotification({ message: 'Failed to close position. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnrealizedPL = positions.reduce((sum, pos) => {
    return sum + calculateUnrealizedPL(pos, currentPrices[pos.id]);
  }, 0);

  const totalPositionValue = positions.reduce((sum, pos) => {
    const currentPrice = parseFloat(currentPrices[pos.id]) || pos.entryPrice;
    return sum + (currentPrice * pos.quantity);
  }, 0);

  return (
    <Layout>
      <div className={styles.positions}>
        <div className={styles.header}>
          <h1 className={styles.title}>Open Positions</h1>
          <div className={styles.headerButtons}>
            {positions.length > 0 && (
              <button 
                className={styles.refreshButton} 
                onClick={fetchAllPrices}
                disabled={fetchingPrices}
              >
                {fetchingPrices ? 'Updating...' : '🔄 Update Prices'}
              </button>
            )}
            <button 
              className={styles.addButton} 
              onClick={() => setShowAddModal(true)}
            >
              + Add Position
            </button>
          </div>
        </div>

        {!loading && positions.length > 0 && (
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Open Positions</span>
              <span className={styles.summaryValue}>{positions.length}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Total Position Value</span>
              <span className={styles.summaryValue}>${formatCurrency(totalPositionValue)}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Unrealized P&L</span>
              <span className={`${styles.summaryValue} ${totalUnrealizedPL >= 0 ? styles.profit : styles.loss}`}>
                ${formatCurrency(totalUnrealizedPL)}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <Spinner text="Loading positions..." />
        ) : positions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No open positions.</p>
            <p className={styles.emptyHint}>Add a trade without an exit price to track open positions.</p>
          </div>
        ) : (
          <div className={styles.positionsGrid}>
            {positions.map((position) => {
              const unrealizedPL = calculateUnrealizedPL(position, currentPrices[position.id]);
              const currentPrice = parseFloat(currentPrices[position.id]) || position.entryPrice;
              const plPercent = ((currentPrice - position.entryPrice) / position.entryPrice * 100) * (position.type === 'long' ? 1 : -1);
              const daysHeld = calculateDaysHeld(position.date);

              return (
                <div key={position.id} className={styles.positionCard}>
                  <div className={styles.positionHeader}>
                    <div className={styles.symbolSection}>
                      <span className={styles.symbol}>{position.symbol}</span>
                      <span className={position.type === 'long' ? styles.longBadge : styles.shortBadge}>
                        {position.type.toUpperCase()}
                      </span>
                      {position.strategy && (
                        <span className={styles.strategyBadge}>{position.strategy}</span>
                      )}
                    </div>
                    <button 
                      className={styles.closeButton}
                      onClick={() => handleClosePosition(position)}
                    >
                      Close Position
                    </button>
                  </div>

                  <div className={styles.positionDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Entry Date:</span>
                      <span className={styles.detailValue}>{position.date}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Days Held:</span>
                      <span className={styles.detailValue}>{daysHeld} days</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Quantity:</span>
                      <span className={styles.detailValue}>{position.quantity}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Entry Price:</span>
                      <span className={styles.detailValue}>${formatCurrency(position.entryPrice)}</span>
                    </div>
                    {position.stopLoss && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Stop Loss:</span>
                        <span className={styles.detailValue}>${formatCurrency(position.stopLoss)}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.currentPriceSection}>
                    <label className={styles.priceLabel}>Current Price:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentPrices[position.id] || ''}
                      onChange={(e) => handleCurrentPriceChange(position.id, e.target.value)}
                      className={styles.priceInput}
                      placeholder="0.00"
                    />
                    <button
                      className={styles.fetchButton}
                      onClick={() => fetchPrice(position.symbol, position.id)}
                      title="Fetch current price"
                    >
                      🔄
                    </button>
                  </div>

                  <div className={styles.positionFooter}>
                    <div className={styles.plSection}>
                      <span className={styles.plLabel}>Unrealized P&L:</span>
                      <div className={styles.plValues}>
                        <span className={`${styles.plAmount} ${unrealizedPL >= 0 ? styles.profit : styles.loss}`}>
                          ${formatCurrency(Math.abs(unrealizedPL))}
                        </span>
                        <span className={`${styles.plPercent} ${plPercent >= 0 ? styles.profit : styles.loss}`}>
                          ({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {position.notes && (
                    <div className={styles.notes}>
                      <span className={styles.notesLabel}>Notes:</span>
                      <p className={styles.notesText}>{position.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showCloseModal && closingPosition && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2>Close Position: {closingPosition.symbol}</h2>
              <form onSubmit={handleCloseSubmit}>
                <div className={styles.formGroup}>
                  <label>Exit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeData.exitPrice}
                    onChange={(e) => setCloseData({ ...closeData, exitPrice: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Exit Date</label>
                  <input
                    type="date"
                    value={closeData.exitDate}
                    onChange={(e) => setCloseData({ ...closeData, exitDate: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.modalActions}>
                  <button 
                    type="button" 
                    className={styles.cancelButton}
                    onClick={() => setShowCloseModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={submitting}
                  >
                    {submitting ? 'Closing...' : 'Close Position'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2>Add New Position</h2>
              <form onSubmit={handleAddSubmit}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Date</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Symbol</label>
                    <input
                      type="text"
                      name="symbol"
                      value={formData.symbol}
                      onChange={handleChange}
                      placeholder="e.g., AAPL"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Type</label>
                    <select name="type" value={formData.type} onChange={handleChange}>
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Entry Price</label>
                    <input
                      type="number"
                      name="entryPrice"
                      value={formData.entryPrice}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Stop Loss (Optional)</label>
                    <input
                      type="number"
                      name="stopLoss"
                      value={formData.stopLoss}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Strategy</label>
                    <select name="strategy" value={formData.strategy} onChange={handleChange}>
                      <option value="">Select Strategy</option>
                      <option value="Breakout">Breakout</option>
                      <option value="Momentum">Momentum</option>
                      <option value="Pullback">Pullback</option>
                      <option value="Reversal">Reversal</option>
                      <option value="Scalp">Scalp</option>
                      <option value="Swing">Swing</option>
                      <option value="Position">Position</option>
                      <option value="Pattern">Pattern</option>
                      <option value="News">News</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Risk Amount (Optional)</label>
                    <input
                      type="number"
                      name="riskAmount"
                      value={formData.riskAmount}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Notes (Optional)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Add any notes about this position..."
                    rows="3"
                  />
                </div>

                <div className={styles.modalActions}>
                  <button 
                    type="button" 
                    className={styles.cancelButton}
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={submitting}
                  >
                    {submitting ? 'Adding...' : 'Add Position'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </Layout>
  );
}
