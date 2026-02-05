
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase'; 
import './UserActivity.css';

/**
 * UserActivity Component
 * Displays exercise history and statistics for a logged-in user
 */
const UserActivity = ({ userId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'week', 'month'

  useEffect(() => {
    if (userId) {
      fetchUserActivities();
    }
  }, [userId, filter]);

  /**
   * Fetch activities from Firebase
   */
  const fetchUserActivities = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query
      let q = query(
        collection(db, 'activities'),
        where('userId', '==', userId), // 
        orderBy('timestamp', 'desc')
      );

      // Apply time filter
      if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        q = query(q, where('timestamp', '>=', weekAgo));
      } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        q = query(q, where('timestamp', '>=', monthAgo));
      }

      // Fetch data
      const querySnapshot = await getDocs(q);
      const activitiesData = [];

      querySnapshot.forEach((doc) => {
        activitiesData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setActivities(activitiesData);
      calculateStats(activitiesData);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate aggregate statistics
   */
  const calculateStats = (data) => {
    if (data.length === 0) {
      setStats(null);
      return;
    }

    const totalSessions = data.length;
    const totalReps = data.reduce((sum, activity) => sum + (activity.rep_count || 0), 0);
    const avgROM = data.reduce((sum, activity) => sum + (activity.rom_degree || 0), 0) / totalSessions;
    const bestROM = Math.max(...data.map(a => a.rom_degree || 0));
    const avgRepCount = totalReps / totalSessions;

    // Calculate improvement (compare latest to earliest)
    const latest = data[0];
    const earliest = data[data.length - 1];
    const romImprovement = latest.rom_degree - earliest.rom_degree;
    const repsImprovement = latest.rep_count - earliest.rep_count;

    setStats({
      totalSessions,
      totalReps,
      avgROM: avgROM.toFixed(1),
      bestROM: bestROM.toFixed(1),
      avgRepCount: avgRepCount.toFixed(1),
      romImprovement: romImprovement.toFixed(1),
      repsImprovement: repsImprovement
    });
  };

  /**
   * Format timestamp for display
   */
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      // Firebase Timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Format duration in seconds to readable format
   */
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="user-activity-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-activity-container">
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={fetchUserActivities} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-activity-container">
      <div className="activity-header">
        <h2>Your Exercise History</h2>
        
        {/* Filter buttons */}
        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All Time
          </button>
          <button
            className={filter === 'week' ? 'active' : ''}
            onClick={() => setFilter('week')}
          >
            This Week
          </button>
          <button
            className={filter === 'month' ? 'active' : ''}
            onClick={() => setFilter('month')}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Statistics Summary */}
      {stats && (
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-value">{stats.totalSessions}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalReps}</div>
            <div className="stat-label">Total Reps</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgROM}°</div>
            <div className="stat-label">Avg ROM</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.bestROM}°</div>
            <div className="stat-label">Best ROM</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.romImprovement > 0 ? '+' : ''}{stats.romImprovement}°
            </div>
            <div className="stat-label">ROM Progress</div>
          </div>
        </div>
      )}

      {/* Activities List */}
      <div className="activities-list">
        {activities.length === 0 ? (
          <div className="no-activities">
            <p>No activities recorded yet.</p>
            <p>Complete an exercise session to see your history here!</p>
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} formatDate={formatDate} formatDuration={formatDuration} />
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Individual Activity Card Component
 */
const ActivityCard = ({ activity, formatDate, formatDuration }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="activity-card">
      <div className="activity-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="activity-info">
          <h3>{activity.exerciseType || 'Knee Extension'}</h3>
          <p className="activity-date">{formatDate(activity.timestamp)}</p>
        </div>
        
        <div className="activity-quick-stats">
          <span className="quick-stat">
            <strong>{activity.rep_count || 0}</strong> reps
          </span>
          <span className="quick-stat">
            <strong>{activity.rom_degree?.toFixed(1) || 0}°</strong> ROM
          </span>
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {expanded && (
        <div className="activity-card-details">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Range of Motion</span>
              <span className="detail-value">{activity.rom_degree?.toFixed(1) || 0}°</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Min Angle</span>
              <span className="detail-value">{activity.min_degree?.toFixed(1) || 0}°</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Max Angle</span>
              <span className="detail-value">{activity.max_degree?.toFixed(1) || 0}°</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Reps Completed</span>
              <span className="detail-value">{activity.rep_count || 0}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Rep State</span>
              <span className="detail-value">{activity.rep_state || 'N/A'}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Average ROM</span>
              <span className="detail-value">{activity.averageROM?.toFixed(1) || 0}°</span>
            </div>
          </div>

          {/* Metrics Array (if present) */}
          {activity.metrics && activity.metrics.length > 0 && (
            <div className="metrics-section">
              <h4>Per-Rep Breakdown</h4>
              <div className="metrics-list">
                {activity.metrics.map((metric, index) => (
                  <div key={index} className="metric-item">
                    <span>Rep {index + 1}:</span>
                    <span>{metric.angle?.toFixed(1) || 0}° </span>
                    <span className="metric-detail">
                      (Min: {metric.min_degree?.toFixed(1)}° | Max: {metric.max_degree?.toFixed(1)}°)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserActivity;
