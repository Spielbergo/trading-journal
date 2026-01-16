"use client";

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { tradesService } from '@/lib/tradesService';
import { formatCurrency, sortData } from '@/lib/utils';
import styles from './trades.module.css';

export default function Trades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [editingTrade, setEditingTrade] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    type: 'long',
    quantity: '',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    strategy: '',
    riskAmount: '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      console.log('User logged in, loading trades...');
      loadTrades();
    }
  }, [user]);

  const loadTrades = async () => {
    try {
      console.log('Starting loadTrades...');
      setLoading(true);
      const fetchedTrades = await tradesService.getTrades();
      console.log('Trades loaded successfully:', fetchedTrades.length);
      setTrades(fetchedTrades);
      setFilteredTrades(fetchedTrades);
    } catch (error) {
      console.error('Error loading trades:', error);
      alert('Failed to load trades: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter trades based on search and date range
  useEffect(() => {
    // Filter out open positions (only show closed trades)
    let filtered = trades.filter(trade => trade.exitPrice && trade.exitPrice > 0);

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(trade => 
        trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trade.notes && trade.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Strategy filter
    if (strategyFilter) {
      filtered = filtered.filter(trade => trade.strategy === strategyFilter);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(trade => trade.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(trade => trade.date <= endDate);
    }

    setFilteredTrades(filtered);
  }, [trades, searchTerm, startDate, endDate, strategyFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const quantity = parseFloat(formData.quantity);
    const entryPrice = parseFloat(formData.entryPrice);
    const exitPrice = formData.exitPrice ? parseFloat(formData.exitPrice) : 0;
    const stopLoss = formData.stopLoss ? parseFloat(formData.stopLoss) : null;
    const riskAmount = formData.riskAmount ? parseFloat(formData.riskAmount) : null;
    
    // Only calculate P&L if exit price is provided
    let profitLoss = 0;
    if (exitPrice > 0) {
      if (formData.type === 'long') {
        profitLoss = (exitPrice - entryPrice) * quantity;
      } else {
        profitLoss = (entryPrice - exitPrice) * quantity;
      }
    }

    // Calculate risk/reward ratio if stop loss and exit price are provided
    let riskRewardRatio = null;
    if (stopLoss && exitPrice > 0) {
      const risk = Math.abs(entryPrice - stopLoss) * quantity;
      const reward = Math.abs(profitLoss);
      if (risk > 0) {
        riskRewardRatio = reward / risk;
      }
    }

    const tradeData = {
      ...formData,
      quantity,
      entryPrice,
      exitPrice,
      profitLoss,
      stopLoss,
      riskAmount,
      riskRewardRatio,
      strategy: formData.strategy || 'Untagged',
    };

    try {
      setSubmitting(true);
      
      if (editingTrade) {
        // Update existing trade
        await tradesService.updateTrade(editingTrade.id, tradeData);
        setTrades(trades.map(t => t.id === editingTrade.id ? { ...t, ...tradeData } : t));
      } else {
        // Add new trade
        const addedTrade = await tradesService.addTrade(tradeData);
        setTrades([addedTrade, ...trades]);
      }
      
      setShowModal(false);
      setEditingTrade(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        symbol: '',
        type: 'long',
        quantity: '',
        entryPrice: '',
        exitPrice: '',
        stopLoss: '',
        strategy: '',
        riskAmount: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error saving trade:', error);
      alert('Failed to save trade. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (trade) => {
    setEditingTrade(trade);
    setFormData({
      date: trade.date,
      symbol: trade.symbol,
      type: trade.type,
      quantity: trade.quantity.toString(),
      entryPrice: trade.entryPrice.toString(),
      exitPrice: trade.exitPrice.toString(),
      notes: trade.notes || '',
      stopLoss: trade.stopLoss?.toString() || '',
      strategy: trade.strategy || '',
      riskAmount: trade.riskAmount?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this trade?')) {
      return;
    }

    try {
      await tradesService.deleteTrade(id);
      setTrades(trades.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting trade:', error);
      alert('Failed to delete trade. Please try again.');
    }
  };

  const exportToCSV = () => {
    if (filteredTrades.length === 0) {
      alert('No trades to export');
      return;
    }

    const headers = ['Date', 'Symbol', 'Strategy', 'Type', 'Quantity', 'Entry Price', 'Exit Price', 'Stop Loss', 'Risk Amount', 'P/L', 'R:R', 'Notes'];
    const csvData = filteredTrades.map(trade => [
      trade.date,
      trade.symbol,
      trade.strategy || 'Untagged',
      trade.type,
      trade.quantity,
      formatCurrency(trade.entryPrice),
      formatCurrency(trade.exitPrice),
      trade.stopLoss ? formatCurrency(trade.stopLoss) : '',
      trade.riskAmount ? formatCurrency(trade.riskAmount) : '',
      formatCurrency(trade.profitLoss),
      trade.riskRewardRatio ? trade.riskRewardRatio.toFixed(2) : '',
      trade.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trades_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStrategyFilter('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    setFilteredTrades(sortData(filteredTrades, key, direction));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return ' ⇅';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <Layout>
      <div className={styles.trades}>
        <div className={styles.header}>
          <h1 className={styles.title}>Trade History</h1>
          <div className={styles.headerButtons}>
            <button className={styles.exportButton} onClick={exportToCSV}>
              Export CSV
            </button>
            <button className={styles.addButton} onClick={() => { setEditingTrade(null); setShowModal(true); }}>
              + Add Trade
            </button>
          </div>
        </div>

        {!loading && trades.length > 0 && (
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <input
                type="text"
                placeholder="Search by symbol or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.filterGroup}>
              <label>Strategy:</label>
              <select
                value={strategyFilter}
                onChange={(e) => setStrategyFilter(e.target.value)}
                className={styles.strategySelect}
              >
                <option value="">All Strategies</option>
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
                <option value="Untagged">Untagged</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.filterGroup}>
              <label>To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            {(searchTerm || startDate || endDate || strategyFilter) && (
              <button className={styles.clearButton} onClick={clearFilters}>
                Clear Filters
              </button>
            )}
            <div className={styles.resultsCount}>
              Showing {filteredTrades.length} of {trades.length} trades
            </div>
          </div>
        )}

        {loading ? (
          <Spinner text="Loading trades..." />
        ) : trades.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No trades recorded yet.</p>
            <button className={styles.emptyButton} onClick={() => setShowModal(true)}>
              Add Your First Trade
            </button>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No trades match your filters.</p>
            <button className={styles.clearButton} onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className={styles.tradesTable}>
            <div className={styles.tableHeader}>
              <span onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>Date{getSortIcon('date')}</span>
              <span onClick={() => handleSort('symbol')} style={{ cursor: 'pointer' }}>Symbol{getSortIcon('symbol')}</span>
              <span onClick={() => handleSort('strategy')} style={{ cursor: 'pointer' }}>Strategy{getSortIcon('strategy')}</span>
              <span onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>Type{getSortIcon('type')}</span>
              <span onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>Quantity{getSortIcon('quantity')}</span>
              <span onClick={() => handleSort('entryPrice')} style={{ cursor: 'pointer' }}>Entry{getSortIcon('entryPrice')}</span>
              <span onClick={() => handleSort('exitPrice')} style={{ cursor: 'pointer' }}>Exit{getSortIcon('exitPrice')}</span>
              <span onClick={() => handleSort('profitLoss')} style={{ cursor: 'pointer' }}>P&L{getSortIcon('profitLoss')}</span>
              <span onClick={() => handleSort('riskRewardRatio')} style={{ cursor: 'pointer' }}>R:R{getSortIcon('riskRewardRatio')}</span>
              <span>Actions</span>
            </div>
            {filteredTrades.map((trade) => (
              <div key={trade.id} className={styles.tableRow}>
                <span>{trade.date}</span>
                <span className={styles.symbol}>{trade.symbol}</span>
                <span className={styles.strategyBadge}>{trade.strategy || 'Untagged'}</span>
                <span className={trade.type === 'long' ? styles.longBadge : styles.shortBadge}>
                  {trade.type.toUpperCase()}
                </span>
                <span>{trade.quantity}</span>
                <span>${formatCurrency(trade.entryPrice)}</span>
                <span>${formatCurrency(trade.exitPrice)}</span>
                <span className={trade.profitLoss >= 0 ? styles.profit : styles.loss}>
                  ${formatCurrency(trade.profitLoss)}
                </span>
                <span>{trade.riskRewardRatio ? `${trade.riskRewardRatio.toFixed(2)}:1` : '-'}</span>
                <span className={styles.actions}>
                  <button
                    className={styles.editButton}
                    onClick={() => handleEdit(trade)}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(trade.id)}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2>{editingTrade ? 'Edit Trade' : 'Add New Trade'}</h2>
              <form onSubmit={handleSubmit}>
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
                    <label>Exit Price (Optional for open positions)</label>
                    <input
                      type="number"
                      name="exitPrice"
                      value={formData.exitPrice}
                      onChange={handleChange}
                      placeholder="Leave blank for open position"
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
                    placeholder="Add any notes about this trade..."
                    rows="3"
                  />
                </div>

                <div className={styles.modalActions}>
                  <button 
                    type="button" 
                    className={styles.cancelButton} 
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={submitting}
                  >
                    {submitting ? (editingTrade ? 'Updating...' : 'Adding...') : (editingTrade ? 'Update Trade' : 'Add Trade')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
