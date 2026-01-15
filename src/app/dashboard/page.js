"use client";

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { tradesService } from '@/lib/tradesService';
import { layoutService } from '@/lib/layoutService';
import { formatCurrency, sortData } from '@/lib/utils';
import styles from './dashboard.module.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    profitLoss: 0,
    avgWin: 0,
    avgLoss: 0,
    bestTrade: 0,
    worstTrade: 0,
  });

  const [recentTrades, setRecentTrades] = useState([]);
  const [allTrades, setAllTrades] = useState([]);
  const [equityCurveData, setEquityCurveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [sections, setSections] = useState(['chart', 'stats', 'trades']);

  useEffect(() => {
    if (user) {
      loadLayout();
      loadTrades();
    }
  }, [user]);

  const loadLayout = async () => {
    if (!user) return;
    const savedLayout = await layoutService.getLayout(user.uid, 'dashboard');
    if (savedLayout) {
      setSections(savedLayout);
    }
  };

  const loadTrades = async () => {
    try {
      setLoading(true);
      const trades = await tradesService.getTrades();
      setAllTrades(trades);
      setRecentTrades(trades.slice(0, 5));

      // Calculate stats
      if (trades.length > 0) {
        const wins = trades.filter(t => t.profitLoss > 0);
        const losses = trades.filter(t => t.profitLoss < 0);
        const totalPL = trades.reduce((sum, t) => sum + t.profitLoss, 0);
        
        setStats({
          totalTrades: trades.length,
          winRate: trades.length > 0 ? (wins.length / trades.length * 100).toFixed(1) : 0,
          profitLoss: totalPL,
          avgWin: wins.length > 0 ? (wins.reduce((sum, t) => sum + t.profitLoss, 0) / wins.length).toFixed(2) : 0,
          avgLoss: losses.length > 0 ? (losses.reduce((sum, t) => sum + t.profitLoss, 0) / losses.length).toFixed(2) : 0,
          bestTrade: trades.length > 0 ? Math.max(...trades.map(t => t.profitLoss)) : 0,
          worstTrade: trades.length > 0 ? Math.min(...trades.map(t => t.profitLoss)) : 0,
        });

        // Calculate equity curve (sort by date first)
        const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
        let cumulativePL = 0;
        const equityData = sortedTrades.map(trade => {
          cumulativePL += trade.profitLoss;
          return {
            date: trade.date,
            equity: cumulativePL
          };
        });

        setEquityCurveData({
          labels: equityData.map(d => d.date),
          datasets: [
            {
              label: 'Cumulative P&L',
              data: equityData.map(d => d.equity),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    setRecentTrades(sortData(recentTrades, key, direction));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return ' ⇅';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSections(items);
    
    // Save to Firebase
    if (user) {
      try {
        await layoutService.saveLayout(user.uid, 'dashboard', items);
      } catch (error) {
        console.error('Error saving layout:', error);
      }
    }
  };

  const renderSection = (sectionId) => {
    switch (sectionId) {
      case 'chart':
        return equityCurveData && allTrades.length > 0 ? (
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Equity Curve</h2>
            <div className={styles.chartContainer}>
              <Line
                data={equityCurveData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return 'P&L: $' + formatCurrency(context.parsed.y);
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      ticks: {
                        callback: function(value) {
                          return '$' + value.toFixed(0);
                        },
                        color: '#9ca3af'
                      },
                      grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                      }
                    },
                    x: {
                      ticks: {
                        color: '#9ca3af',
                        maxRotation: 45,
                        minRotation: 45
                      },
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        ) : null;

      case 'stats':
        return (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>Total Trades</h3>
              <p className={styles.statValue}>{stats.totalTrades}</p>
            </div>
            <div className={styles.statCard}>
              <h3>Win Rate</h3>
              <p className={styles.statValue}>{stats.winRate}%</p>
            </div>
            <div className={styles.statCard}>
              <h3>Net P&L</h3>
              <p className={`${styles.statValue} ${stats.profitLoss >= 0 ? styles.profit : styles.loss}`}>
                ${formatCurrency(stats.profitLoss)}
              </p>
            </div>
            <div className={styles.statCard}>
              <h3>Avg Win</h3>
              <p className={`${styles.statValue} ${styles.profit}`}>${formatCurrency(stats.avgWin)}</p>
            </div>
            <div className={styles.statCard}>
              <h3>Avg Loss</h3>
              <p className={`${styles.statValue} ${styles.loss}`}>${formatCurrency(stats.avgLoss)}</p>
            </div>
            <div className={styles.statCard}>
              <h3>Best Trade</h3>
              <p className={`${styles.statValue} ${styles.profit}`}>${formatCurrency(stats.bestTrade)}</p>
            </div>
            <div className={styles.statCard}>
              <h3>Worst Trade</h3>
              <p className={`${styles.statValue} ${styles.loss}`}>${formatCurrency(stats.worstTrade)}</p>
            </div>
          </div>
        );

      case 'trades':
        return (
          <div className={styles.recentTrades}>
            <h2>Recent Trades</h2>
            {recentTrades.length === 0 ? (
              <p className={styles.emptyState}>No trades yet. Add your first trade!</p>
            ) : (
              <div className={styles.tradesTable}>
                <div className={styles.tableHeader}>
                  <span onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>Date{getSortIcon('date')}</span>
                  <span onClick={() => handleSort('symbol')} style={{ cursor: 'pointer' }}>Symbol{getSortIcon('symbol')}</span>
                  <span onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>Type{getSortIcon('type')}</span>
                  <span onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>Qty{getSortIcon('quantity')}</span>
                  <span onClick={() => handleSort('entryPrice')} style={{ cursor: 'pointer' }}>Entry{getSortIcon('entryPrice')}</span>
                  <span onClick={() => handleSort('exitPrice')} style={{ cursor: 'pointer' }}>Exit{getSortIcon('exitPrice')}</span>
                  <span onClick={() => handleSort('profitLoss')} style={{ cursor: 'pointer' }}>P&L{getSortIcon('profitLoss')}</span>
                </div>
                {recentTrades.map((trade) => (
                  <div key={trade.id} className={styles.tableRow}>
                    <span>{trade.date}</span>
                    <span>{trade.symbol}</span>
                    <span className={trade.type === 'long' ? styles.longBadge : styles.shortBadge}>
                      {trade.type.toUpperCase()}
                    </span>
                    <span>{trade.quantity}</span>
                    <span>${formatCurrency(trade.entryPrice)}</span>
                    <span>${formatCurrency(trade.exitPrice)}</span>
                    <span className={trade.profitLoss >= 0 ? styles.profit : styles.loss}>
                      ${formatCurrency(trade.profitLoss)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.dashboard}>
          <Spinner text="Loading dashboard..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.dragHint}>💡 Drag sections to rearrange</p>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="dashboard">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {sections.map((sectionId, index) => (
                  <Draggable key={sectionId} draggableId={sectionId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`${styles.draggableSection} ${snapshot.isDragging ? styles.dragging : ''}`}
                      >
                        {renderSection(sectionId)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </Layout>
  );
}
