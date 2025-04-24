// analytics.js - User tracking module for Mastermind
const APP_VERSION = '3.0.3'; // Match your current app version

class MastermindAnalytics {
  constructor(options = {}) {
    this.trackingId = options.trackingId || null;
    this.enabled = options.enabled !== false;
    this.debugMode = options.debugMode || false;
    this.sessionStartTime = Date.now();
    this.gameCount = 0;
    this.initialized = false;
    this.sessionId = this._generateSessionId();
    this.localStorage = options.localStorage !== false && this._isLocalStorageAvailable();
    this.eventQueue = [];
    this.flushInterval = options.flushInterval || 30000; // 30 seconds
    this.maxQueueSize = options.maxQueueSize || 20;
    this.flushTimeoutId = null;
    
    // Initialize user data
    this._initializeUserData();
  }

  // Initialize the analytics system with Google Analytics or other service
  initialize(trackingId) {
    if (trackingId) {
      this.trackingId = trackingId;
    }
    
    if (!this.trackingId) {
      this._debug('Analytics initialized in local-only mode (no tracking ID provided)');
      this.initialized = true;
      return;
    }
    
    // Load Google Analytics (GA4)
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.trackingId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      
      window.gtag('js', new Date());
      window.gtag('config', this.trackingId, {
        'send_page_view': false,
        'user_id': this.userData.userId
      });
      
      this.initialized = true;
      this._debug('Analytics initialized with tracking ID: ' + this.trackingId);
      
      // Start scheduled flushing of events
      this._scheduleFlush();
      
      // Track session start
      this.trackEvent('session', 'start', {
        appVersion: APP_VERSION,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        language: document.documentElement.lang || 'unknown',
        userType: this._getUserType()
      });
      
      // Add event listeners for session tracking
      window.addEventListener('beforeunload', () => {
        this.trackEvent('session', 'end', {
          duration: this._getSessionDuration()
        });
        this.flush(true); // Force immediate flush when page is unloaded
      });
      
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
      this.initialized = false;
    }
  }

  // Track an event
  trackEvent(category, action, params = {}) {
    if (!this.enabled) return;
    
    const event = {
      timestamp: Date.now(),
      category,
      action,
      params: { ...params },
      sessionId: this.sessionId
    };
    
    this._debug('Tracking event:', event);
    
    // Add to queue
    this.eventQueue.push(event);
    
    // Check if we should flush immediately
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush();
    }
    
    // Store locally regardless of remote analytics
    this._storeEventLocally(event);
    
    return event;
  }

  // Track a game start event
  trackGameStart(gameOptions) {
    this.gameStartTime = Date.now();
    this.gameCount++;
    
    return this.trackEvent('game', 'start', {
      gameId: this._generateGameId(),
      gameCount: this.gameCount,
      mode: gameOptions.mode,
      codeLength: gameOptions.codeLength,
      language: gameOptions.language
    });
  }

  // Track a game end event
  trackGameEnd(result, attempts, giveUp = false) {
    const gameDuration = this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0;
    
    return this.trackEvent('game', 'end', {
      result: result, // 'win', 'loss', 'abandoned'
      attempts: attempts,
      duration: gameDuration,
      giveUp: giveUp
    });
  }

  // Track user interactions with the game
  trackInteraction(interactionType, details = {}) {
    return this.trackEvent('interaction', interactionType, details);
  }

  // Track errors
  trackError(errorType, errorDetails = {}) {
    return this.trackEvent('error', errorType, errorDetails);
  }

  // Track performance metrics
  trackPerformance(metricName, value, details = {}) {
    return this.trackEvent('performance', metricName, {
      value: value,
      ...details
    });
  }

  // Flush events to analytics service
  flush(immediate = false) {
    if (!this.initialized || this.eventQueue.length === 0) return;
    
    this._debug(`Flushing ${this.eventQueue.length} events${immediate ? ' (immediate)' : ''}`);
    
    // Clone and clear the queue
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];
    
    // Clear the scheduled flush if immediate
    if (immediate && this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }
    
    // Send events to Google Analytics or other service
    if (this.trackingId && window.gtag) {
      eventsToSend.forEach(event => {
        window.gtag('event', `${event.category}_${event.action}`, {
          ...event.params,
          'session_id': event.sessionId,
          'timestamp': event.timestamp
        });
      });
    }
    
    // Schedule the next flush if not immediate
    if (!immediate) {
      this._scheduleFlush();
    }
  }

  // Export analytics data
  exportData() {
    if (!this.localStorage) return null;
    
    try {
      const data = localStorage.getItem('mastermind_analytics');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      return null;
    }
  }

  // Clear stored analytics data
  clearData() {
    if (!this.localStorage) return;
    
    try {
      localStorage.removeItem('mastermind_analytics');
      localStorage.removeItem('mastermind_user');
      this._debug('Analytics data cleared');
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
    }
  }

  // Reset session
  resetSession() {
    this.sessionId = this._generateSessionId();
    this.sessionStartTime = Date.now();
    this.gameCount = 0;
    this._debug('Session reset, new session ID: ' + this.sessionId);
  }

  // Enable or disable analytics
  setEnabled(enabled) {
    this.enabled = enabled;
    this._debug(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
    
    // Store user preference
    if (this.localStorage) {
      try {
        const userData = JSON.parse(localStorage.getItem('mastermind_user') || '{}');
        userData.analyticsEnabled = enabled;
        localStorage.setItem('mastermind_user', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to save analytics preference:', error);
      }
    }
  }

  // Set debug mode
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  // Private helper methods
  _initializeUserData() {
    this.userData = {
      userId: null,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      visits: 1,
      analyticsEnabled: true
    };
    
    if (this.localStorage) {
      try {
        // Try to load existing user data
        const storedData = localStorage.getItem('mastermind_user');
        
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          this.userData = {
            ...this.userData,
            ...parsedData,
            lastSeen: Date.now(),
            visits: (parsedData.visits || 0) + 1
          };
        } else {
          // First time user, generate ID
          this.userData.userId = this._generateUserId();
        }
        
        // Save updated user data
        localStorage.setItem('mastermind_user', JSON.stringify(this.userData));
        
        // Update enabled state from user preferences
        this.enabled = this.userData.analyticsEnabled !== false;
        
      } catch (error) {
        console.error('Failed to initialize user data:', error);
        this.userData.userId = this._generateUserId();
      }
    } else {
      // No localStorage, generate temporary ID
      this.userData.userId = this._generateUserId();
    }
  }

  _storeEventLocally(event) {
    if (!this.localStorage) return;
    
    try {
      const storedData = localStorage.getItem('mastermind_analytics');
      const events = storedData ? JSON.parse(storedData) : [];
      
      // Add the new event
      events.push(event);
      
      // Keep only the last 100 events to avoid storage issues
      const trimmedEvents = events.slice(-100);
      
      localStorage.setItem('mastermind_analytics', JSON.stringify(trimmedEvents));
    } catch (error) {
      console.error('Failed to store event locally:', error);
    }
  }

  _scheduleFlush() {
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
    }
    
    this.flushTimeoutId = setTimeout(() => {
      this.flush();
    }, this.flushInterval);
  }

  _generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  }

  _generateGameId() {
    return 'game_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  }

  _generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  }

  _getSessionDuration() {
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  _getUserType() {
    if (!this.localStorage) return 'unknown';
    
    try {
      const userData = JSON.parse(localStorage.getItem('mastermind_user') || '{}');
      
      if (!userData.firstSeen) return 'new';
      
      const daysSinceFirstVisit = Math.floor((Date.now() - userData.firstSeen) / (1000 * 60 * 60 * 24));
      
      if (daysSinceFirstVisit < 1) return 'new';
      if (userData.visits <= 2) return 'casual';
      if (userData.visits > 10) return 'power';
      
      return 'returning';
    } catch (error) {
      console.error('Failed to determine user type:', error);
      return 'unknown';
    }
  }

  _isLocalStorageAvailable() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  _debug(message, data) {
    if (!this.debugMode) return;
    
    if (data) {
      console.log(`[Analytics] ${message}`, data);
    } else {
      console.log(`[Analytics] ${message}`);
    }
  }
}

// Create singleton instance
const analytics = new MastermindAnalytics({
  debugMode: true, // Set to false in production
  localStorage: true
});

// Export the analytics instance
window.analytics = analytics;