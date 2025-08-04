import { useState, useEffect } from 'react';

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount: number;
}

const STORAGE_KEY = 'awesome-video-search-history';
const MAX_HISTORY_ITEMS = 20;

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }, [history]);

  const addToHistory = (query: string, resultCount: number) => {
    if (!query.trim() || query.length < 2) return;

    const normalizedQuery = query.trim().toLowerCase();
    
    setHistory(prev => {
      // Remove existing entry with same query (case-insensitive)
      const filtered = prev.filter(item => 
        item.query.toLowerCase() !== normalizedQuery
      );

      // Add new entry at the beginning
      const newHistory = [{
        query: query.trim(),
        timestamp: Date.now(),
        resultCount
      }, ...filtered];

      // Keep only the most recent MAX_HISTORY_ITEMS
      return newHistory.slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const removeFromHistory = (query: string) => {
    setHistory(prev => 
      prev.filter(item => item.query !== query)
    );
  };

  // Get recent unique queries for suggestions
  const getRecentQueries = (limit: number = 5) => {
    return history
      .slice(0, limit)
      .map(item => item.query);
  };

  // Get popular queries based on frequency
  const getPopularQueries = (limit: number = 3) => {
    const queryCount = new Map<string, number>();
    
    history.forEach(item => {
      const normalized = item.query.toLowerCase();
      queryCount.set(normalized, (queryCount.get(normalized) || 0) + 1);
    });

    return Array.from(queryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query]) => {
        // Find the original casing
        const original = history.find(item => 
          item.query.toLowerCase() === query
        );
        return original?.query || query;
      });
  };

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
    getRecentQueries,
    getPopularQueries
  };
}