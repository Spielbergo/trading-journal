"use client";

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { tradesService } from '@/lib/tradesService';
import { layoutService } from '@/lib/layoutService';
import { formatCurrency, sortData } from '@/lib/utils';
import styles from './analytics.module.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    profitFactor: 0,
    avgWin: 0,
    avgLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    totalProfit: 0,
    totalLoss: 0,
    netPL: 0,
    avgRR: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    longTrades: 0,
    shortTrades: 0,
    longWinRate: 0,
    shortWinRate: 0,
  });

  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyChartData, setMonthlyChartData] = useState(null);
  const [winLossChartData, setWinLossChartData] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'month', direction: 'desc' });
  const [sections, setSections] = useState(['performance', 'plBreakdown', 'winLossChart', 'tradeDistribution', 'monthlyPerformance']);

  useEffect(() => {
    if (user) {
      loadLayout();
      loadAnalytics();
    }
  }, [user]);

  const loadLayout = async () => {
    if (!user) return;
    const savedLayout = await layoutService.getLayout(user.uid, 'analytics');
    if (savedLayout) {
      setSections(savedLayout);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const trades = await tradesService.getTrades();
    
      if (trades.length === 0) {
        setLoading(false);
        return;
      }

      const wins = trades.filter(t => t.profitLoss > 0);
      const losses = trades.filter(t => t.profitLoss < 0);
    const longTrades = trades.filter(t => t.type === 'long');
    const shortTrades = trades.filter(t => t.type === 'short');
    
    const totalProfit = wins.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.profitLoss, 0));
    const netPL = totalProfit - totalLoss;

    // Calculate consecutive wins/losses
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    trades.forEach(trade => {
      if (trade.profitLoss > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
      } else if (trade.profitLoss < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
      }
    });

    // Monthly breakdown
    const monthlyMap = {};
    trades.forEach(trade => {
      const month = trade.date.substring(0, 7); // YYYY-MM
      if (!monthlyMap[month]) {
        monthlyMap[month] = { profit: 0, loss: 0, trades: 0 };
      }
      monthlyMap[month].trades++;
      if (trade.profitLoss > 0) {
        monthlyMap[month].profit += trade.profitLoss;
      } else {
        monthlyMap[month].loss += Math.abs(trade.profitLoss);
      }
    });

    const monthly = Object.entries(monthlyMap)
      .map(([month, data]) => ({
        month,
        ...data,
        netPL: data.profit - data.loss,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    setMonthlyData(monthly);

    // Monthly bar chart data
    setMonthlyChartData({
      labels: monthly.map(m => m.month).reverse(),
      datasets: [
        {
          label: 'Net P&L',
          data: monthly.map(m => m.netPL).reverse(),
          backgroundColor: monthly.map(m => m.netPL >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)').reverse(),
          borderColor: monthly.map(m => m.netPL >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)').reverse(),
          borderWidth: 1,
        },
      ],
    });

    // Win/Loss pie chart data
    setWinLossChartData({
      labels: ['Wins', 'Losses'],
      datasets: [
        {
          data: [wins.length, losses.length],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderColor: [
            'rgb(16, 185, 129)',
            'rgb(239, 68, 68)',
          ],
          borderWidth: 2,
        },
      ],
    });

    setAnalytics({
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / trades.length * 100).toFixed(1),
      profitFactor: totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : totalProfit > 0 ? '∞' : '0',
      avgWin: wins.length > 0 ? (totalProfit / wins.length).toFixed(2) : '0',
      avgLoss: losses.length > 0 ? (totalLoss / losses.length).toFixed(2) : '0',
      largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.profitLoss)).toFixed(2) : '0',
      largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.profitLoss)).toFixed(2) : '0',
      totalProfit: totalProfit.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      netPL: netPL.toFixed(2),
      avgRR: wins.length > 0 && losses.length > 0 ? ((totalProfit / wins.length) / (totalLoss / losses.length)).toFixed(2) : '0',
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses,
      longTrades: longTrades.length,
      shortTrades: shortTrades.length,
      longWinRate: longTrades.length > 0 ? (longTrades.filter(t => t.profitLoss > 0).length / longTrades.length * 100).toFixed(1) : '0',
      shortWinRate: shortTrades.length > 0 ? (shortTrades.filter(t => t.profitLoss > 0).length / shortTrades.length * 100).toFixed(1) : '0',
    });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    setMonthlyData(sortData(monthlyData, key, direction));
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
    
    if (user) {
      try {
        await layoutService.saveLayout(user.uid, 'analytics', items);
      } catch (error) {
        console.error('Error saving layout:', error);
      }
    }
  };

  const renderSection = (sectionId) => {
    switch (sectionId) {
      case 'performance':
        return (
          <div className={styles.section}>
            <h2>Performance Metrics</h2>
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <span className={styles.label}>Total Trades</span>
                <span className={styles.value}>{analytics.totalTrades}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Wins</span>
                <span className={`${styles.value} ${styles.success}`}>{analytics.wins}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Losses</span>
                <span className={`${styles.value} ${styles.danger}`}>{analytics.losses}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Win Rate</span>
                <span className={styles.value}>{analytics.winRate}%</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Profit Factor</span>
                <span className={styles.value}>{analytics.profitFactor}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Avg R:R</span>
                <span className={styles.value}>{analytics.avgRR}</span>
              </div>
            </div>
          </div>
        );

      case 'plBreakdown':
        return (
          <div className={styles.section}>
            <h2>P&L Breakdown</h2>
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <span className={styles.label}>Total Profit</span>
                <span className={`${styles.value} ${styles.success}`}>${formatCurrency(analytics.totalProfit)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Total Loss</span>
                <span className={`${styles.value} ${styles.danger}`}>${formatCurrency(analytics.totalLoss)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Net P&L</span>
                <span className={`${styles.value} ${parseFloat(analytics.netPL) >= 0 ? styles.success : styles.danger}`}>
                  ${formatCurrency(analytics.netPL)}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Avg Win</span>
                <span className={`${styles.value} ${styles.success}`}>${formatCurrency(analytics.avgWin)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Avg Loss</span>
                <span className={`${styles.value} ${styles.danger}`}>${formatCurrency(analytics.avgLoss)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Largest Win</span>
                <span className={`${styles.value} ${styles.success}`}>${formatCurrency(analytics.largestWin)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Largest Loss</span>
                <span className={`${styles.value} ${styles.danger}`}>${formatCurrency(analytics.largestLoss)}</span>
              </div>
            </div>
          </div>
        );

      case 'winLossChart':
        return winLossChartData ? (
          <div className={styles.section}>
            <h2>Win/Loss Distribution</h2>
            <div className={styles.chartRow}>
              <div className={styles.pieChartContainer}>
                <Pie
                  data={winLossChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          color: '#9ca3af',
                          padding: 20,
                          font: { size: 14 }
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ) : null;

      case 'tradeDistribution':
        return (
          <div className={styles.section}>
            <h2>Trade Distribution</h2>
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <span className={styles.label}>Long Trades</span>
                <span className={styles.value}>{analytics.longTrades}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Short Trades</span>
                <span className={styles.value}>{analytics.shortTrades}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Long Win Rate</span>
                <span className={styles.value}>{analytics.longWinRate}%</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Short Win Rate</span>
                <span className={styles.value}>{analytics.shortWinRate}%</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Max Consecutive Wins</span>
                <span className={`${styles.value} ${styles.success}`}>{analytics.consecutiveWins}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Max Consecutive Losses</span>
                <span className={`${styles.value} ${styles.danger}`}>{analytics.consecutiveLosses}</span>
              </div>
            </div>
          </div>
        );

      case 'monthlyPerformance':
        return (
          <div className={styles.section}>
            <h2>Monthly Performance</h2>
            {monthlyData.length === 0 ? (
              <p className={styles.emptyState}>No trade data available</p>
            ) : (
              <>
                {monthlyChartData && (
                  <div className={styles.chartContainer}>
                    <Bar
                      data={monthlyChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
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
                            grid: { color: 'rgba(255, 255, 255, 0.05)' }
                          },
                          x: {
                            ticks: { color: '#9ca3af' },
                            grid: { display: false }
                          }
                        }
                      }}
                    />
                  </div>
                )}
                <div className={styles.monthlyTable}>
                  <div className={styles.monthlyHeader}>
                    <span onClick={() => handleSort('month')} style={{ cursor: 'pointer' }}>Month{getSortIcon('month')}</span>
                    <span onClick={() => handleSort('trades')} style={{ cursor: 'pointer' }}>Trades{getSortIcon('trades')}</span>
                    <span onClick={() => handleSort('profit')} style={{ cursor: 'pointer' }}>Profit{getSortIcon('profit')}</span>
                    <span onClick={() => handleSort('loss')} style={{ cursor: 'pointer' }}>Loss{getSortIcon('loss')}</span>
                    <span onClick={() => handleSort('netPL')} style={{ cursor: 'pointer' }}>Net P&L{getSortIcon('netPL')}</span>
                  </div>
                  {monthlyData.map((month) => (
                    <div key={month.month} className={styles.monthlyRow}>
                      <span>{month.month}</span>
                      <span>{month.trades}</span>
                      <span className={styles.success}>${formatCurrency(month.profit)}</span>
                      <span className={styles.danger}>${formatCurrency(month.loss)}</span>
                      <span className={month.netPL >= 0 ? styles.success : styles.danger}>
                        ${formatCurrency(month.netPL)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
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
        <div className={styles.analytics}>
          <Spinner text="Loading analytics..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.analytics}>
        <div className={styles.header}>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.dragHint}>💡 Drag sections to rearrange</p>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="analytics">
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
