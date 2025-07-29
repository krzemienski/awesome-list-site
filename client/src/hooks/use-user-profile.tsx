import { useState, useEffect } from "react";

interface UserProfile {
  userId: string;
  preferredCategories: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  learningGoals: string[];
  preferredResourceTypes: string[];
  timeCommitment: 'daily' | 'weekly' | 'flexible';
  viewHistory: string[];
  bookmarks: string[];
  completedResources: string[];
  ratings: Record<string, number>;
}

const DEFAULT_PROFILE: UserProfile = {
  userId: '',
  preferredCategories: [],
  skillLevel: 'beginner',
  learningGoals: [],
  preferredResourceTypes: [],
  timeCommitment: 'flexible',
  viewHistory: [],
  bookmarks: [],
  completedResources: [],
  ratings: {},
};

export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate or retrieve user ID
  useEffect(() => {
    let userId = localStorage.getItem('awesome-video-user-id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('awesome-video-user-id', userId);
    }

    // Load existing profile from localStorage
    const savedProfile = localStorage.getItem('awesome-video-user-profile');
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        setUserProfile({ ...parsedProfile, userId });
      } catch (error) {
        console.error('Error parsing saved profile:', error);
        setUserProfile({ ...DEFAULT_PROFILE, userId });
      }
    } else {
      setUserProfile({ ...DEFAULT_PROFILE, userId });
    }

    setIsLoaded(true);
  }, []);

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded && userProfile.userId) {
      localStorage.setItem('awesome-video-user-profile', JSON.stringify(userProfile));
    }
  }, [userProfile, isLoaded]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  const addToViewHistory = (resourceId: string) => {
    setUserProfile(prev => ({
      ...prev,
      viewHistory: prev.viewHistory.includes(resourceId) 
        ? prev.viewHistory 
        : [...prev.viewHistory, resourceId].slice(-100) // Keep last 100 views
    }));
  };

  const toggleBookmark = (resourceId: string) => {
    setUserProfile(prev => ({
      ...prev,
      bookmarks: prev.bookmarks.includes(resourceId)
        ? prev.bookmarks.filter(id => id !== resourceId)
        : [...prev.bookmarks, resourceId]
    }));
  };

  const markCompleted = (resourceId: string) => {
    setUserProfile(prev => ({
      ...prev,
      completedResources: prev.completedResources.includes(resourceId)
        ? prev.completedResources
        : [...prev.completedResources, resourceId]
    }));
  };

  const rateResource = (resourceId: string, rating: number) => {
    setUserProfile(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [resourceId]: rating }
    }));
  };

  const clearProfile = () => {
    const userId = userProfile.userId;
    setUserProfile({ ...DEFAULT_PROFILE, userId });
    localStorage.removeItem('awesome-video-user-profile');
  };

  return {
    userProfile,
    isLoaded,
    updateProfile,
    addToViewHistory,
    toggleBookmark,
    markCompleted,
    rateResource,
    clearProfile,
  };
}