import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  items as fallbackItems,
  claims as fallbackClaims,
  users as fallbackUsers,
  categories as fallbackCategories,
  locations as fallbackLocations,
  activityFeed as fallbackActivity,
} from '../data/mockData';
import { api } from '../data/api';
import { rankMatches } from '../utils/matcher';
import { useAuth } from './AuthContext';

const PortalDataContext = createContext(null);

export function PortalDataProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState(fallbackItems);
  const [categories, setCategories] = useState(fallbackCategories);
  const [locations, setLocations] = useState(fallbackLocations);
  const [aiMatches, setAiMatches] = useState([]);
  const [claims, setClaims] = useState(fallbackClaims);
  const [handovers, setHandovers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState(fallbackUsers);
  const [auditLogs, setAuditLogs] = useState([]);
  const [matchingConfig, setMatchingConfig] = useState({
    threshold: 0.30,
    notifyThreshold: 0.45,
    textWeight: 0.65,
    contextWeight: 0.35,
    defaultAlgorithm: 'sbert',
  });
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(fallbackActivity);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshPortalData = useCallback(async () => {
    try {
      const data = await api.bootstrap();
      if (Array.isArray(data.items)) setItems(data.items);
      if (Array.isArray(data.categories) && data.categories.length > 0) setCategories(data.categories);
      if (Array.isArray(data.locations) && data.locations.length > 0) setLocations(data.locations);
      if (Array.isArray(data.aiMatches)) setAiMatches(data.aiMatches);
      if (Array.isArray(data.claims)) setClaims(data.claims);
      if (Array.isArray(data.handovers)) setHandovers(data.handovers);
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      if (Array.isArray(data.users) && data.users.length > 0) setUsers(data.users);
      if (Array.isArray(data.auditLogs)) {
        setAuditLogs(data.auditLogs);
        if (data.auditLogs.length > 0) {
          setActivity(
            data.auditLogs.slice(0, 12).map((a) => ({
              id: a.id,
              type: a.action.includes('CLAIM')
                ? 'claim'
                : a.action.includes('HANDOVER')
                ? 'return'
                : a.action.includes('MATCH')
                ? 'match'
                : 'report',
              message: `${a.actorName}: ${a.details}`,
              time: new Date(a.createdAt).toLocaleString(),
            }))
          );
        }
      }
      if (data.matchingConfig) setMatchingConfig(data.matchingConfig);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.warn('Bootstrap fallback active:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPortalData();
  }, [refreshPortalData, user?.id, user?.role]);

  const addItem = useCallback(
    async (payload) => {
      const res = await api.createItem(payload);
      await refreshPortalData();
      showToast(
        `${payload.type === 'lost' ? 'Lost' : 'Found'} report ${res.item.reportCode || ''} submitted! ${
          res.matchCount > 0 ? `${res.matchCount} AI match(es) detected.` : ''
        }`.trim()
      );
      return { item: res.item, matchCount: res.matchCount };
    },
    [refreshPortalData, showToast]
  );

  const updateItem = useCallback(
    async (itemId, updates) => {
      const res = await api.updateItem(itemId, updates);
      await refreshPortalData();
      showToast('Report updated successfully.');
      return res.item;
    },
    [refreshPortalData, showToast]
  );

  const updateItemStatus = useCallback(
    async (itemId, status) => {
      const res = await api.updateItem(itemId, { status });
      await refreshPortalData();
      showToast(`Item status updated to "${res.item?.status || status}".`);
      return res.item;
    },
    [refreshPortalData, showToast]
  );

  const deleteItem = useCallback(
    async (itemId) => {
      await api.deleteItem(itemId);
      await refreshPortalData();
      showToast('Report removed.');
    },
    [refreshPortalData, showToast]
  );

  const submitClaim = useCallback(
    async (payload) => {
      const res = await api.createClaim(payload);
      await refreshPortalData();
      showToast(`Ownership claim ${res.claim.claimCode || ''} submitted for verification.`);
      return res.claim;
    },
    [refreshPortalData, showToast]
  );

  const reviewClaim = useCallback(
    async (claimId, decision, _adminName, options = {}) => {
      const res = await api.reviewClaim(claimId, {
        decision,
        ...options,
      });
      await refreshPortalData();
      showToast(
        `Claim ${res.claim?.claimCode || claimId} marked as ${res.claim?.status || decision}.`
      );
      return res.claim;
    },
    [refreshPortalData, showToast]
  );

  const recordHandover = useCallback(
    async (itemId, handoverData) => {
      await api.completeHandover({
        itemId,
        ...handoverData,
      });
      await refreshPortalData();
      showToast('Handover completed and item marked as Returned.');
    },
    [refreshPortalData, showToast]
  );

  const updateHandover = useCallback(
    async (handoverId, updates) => {
      await api.updateHandover(handoverId, updates);
      await refreshPortalData();
      showToast(`Handover record updated (${updates.status || 'saved'}).`);
    },
    [refreshPortalData, showToast]
  );

  const submitMatchFeedback = useCallback(
    async (matchId, payload) => {
      await api.submitMatchFeedback(matchId, payload);
      await refreshPortalData();
      const labelMap = {
        relevant: 'Relevant Match',
        not_my_item: 'Not My Item',
        incorrect: 'Incorrect Match',
      };
      showToast(`Feedback saved: "${labelMap[payload.feedbackType] || payload.feedbackType}".`);
    },
    [refreshPortalData, showToast]
  );

  const markNotificationRead = useCallback(
    async (notifId) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
      await api.markNotificationRead(notifId).catch(() => {});
    },
    []
  );

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await api.markAllNotificationsRead().catch(() => {});
    showToast('All notifications marked as read.');
  }, [showToast]);

  const updateUserRole = useCallback(
    async (userId, role, isActive) => {
      await api.updateUser(userId, {
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      });
      await refreshPortalData();
      showToast('User account permissions updated.');
    },
    [refreshPortalData, showToast]
  );

  const updateMatchingConfig = useCallback(
    async (newConfig) => {
      const res = await api.updateMatchingConfig(newConfig);
      await refreshPortalData();
      showToast('AI matching configuration updated and matches refreshed.');
      return res.matchingConfig;
    },
    [refreshPortalData, showToast]
  );

  const addCampusLocation = useCallback(
    async (name, building = '') => {
      await api.addLocation({ name, building });
      await refreshPortalData();
      showToast(`Added campus location "${name}".`);
    },
    [refreshPortalData, showToast]
  );

  const getMatchesForItem = useCallback(
    (itemId, options = {}) => {
      const target = items.find((i) => i.id === itemId);
      if (!target) return [];
      const ranked = rankMatches(target, items, {
        threshold: matchingConfig.threshold,
        textWeight: matchingConfig.textWeight,
        contextWeight: matchingConfig.contextWeight,
        ...options,
      });
      const persistedMap = new Map(aiMatches.map((m) => [m.id, m.status]));
      return ranked.map((m) => ({
        ...m,
        status: persistedMap.get(`match-${m.lostItemId}-${m.foundItemId}`) || 'active',
      }));
    },
    [items, matchingConfig, aiMatches]
  );

  return (
    <PortalDataContext.Provider
      value={{
        items,
        categories,
        locations,
        aiMatches,
        matches: aiMatches,
        claims,
        handovers,
        notifications,
        users,
        auditLogs,
        matchingConfig,
        stats,
        activity,
        isLoading,
        toast,
        showToast,
        refreshPortalData,
        addItem,
        updateItem,
        updateItemStatus,
        deleteItem,
        submitClaim,
        reviewClaim,
        recordHandover,
        updateHandover,
        submitMatchFeedback,
        markNotificationRead,
        markAllNotificationsRead,
        updateUserRole,
        updateMatchingConfig,
        addCampusLocation,
        getMatchesForItem,
      }}
    >
      {children}
      {toast && (
        <div
          className={`portal-toast portal-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="portal-toast__close"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </PortalDataContext.Provider>
  );
}

export function usePortalData() {
  const ctx = useContext(PortalDataContext);
  if (!ctx) {
    throw new Error('usePortalData must be used within a PortalDataProvider');
  }
  return ctx;
}
