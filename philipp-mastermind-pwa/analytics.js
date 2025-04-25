// analytics.js - User tracking module for Mastermind

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
		
		// Get browser info
		const browserInfo = this._detectBrowserInfo();
		
		// Track session start with enhanced data
		window.gtag('event', 'session_start', {
		  'app_version': window.APP_VERSION || '3.0.8',
		  'screen_size': `${window.innerWidth}x${window.innerHeight}`,
		  'language': document.documentElement.lang || 'unknown',
		  'user_type': this._getUserType(),
		  'browser': browserInfo.browser,
		  'browser_version': browserInfo.browserVersion,
		  'os': browserInfo.os,
		  'device_type': browserInfo.deviceType,
		  'session_id': this.sessionId,
		  'user_id': this.userData.userId
		});
		
		// Add event listeners for session tracking
		window.addEventListener('beforeunload', () => {
		  window.gtag('event', 'session_end', {
			'duration': this._getSessionDuration(),
			'session_id': this.sessionId
		  });
		  this.flush(true);
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
    
    // New game ID that includes the unique device identifier
    const gameId = `${this._generateGameId()}_${this.userData.uniqueId}`;
    
    // Record this game in user history
    if (this.localStorage && this.userData.gameHistory) {
      // Add new game to history
      this.userData.gameHistory.push({
        gameId: gameId,
        startTime: this.gameStartTime,
        options: gameOptions
      });
      
      // Keep only last 20 games to avoid storage limits
      if (this.userData.gameHistory.length > 20) {
        this.userData.gameHistory = this.userData.gameHistory.slice(-20);
      }
      
      // Save updated user data
      try {
        localStorage.setItem('mastermind_user', JSON.stringify(this.userData));
      } catch (e) {
        console.error('Failed to save game history:', e);
      }
    }
    
    return this.trackEvent('game', 'start', {
      gameId: gameId,
      gameCount: this.gameCount,
      uniqueId: this.userData.uniqueId,
      mode: gameOptions.mode,
      codeLength: gameOptions.codeLength,
      language: gameOptions.language
    });
  }

  // Track a game end event
  trackGameEnd(result, attempts, giveUp = false) {
    const gameDuration = this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0;
    
    // Update the last game in history
    if (this.localStorage && this.userData.gameHistory && this.userData.gameHistory.length > 0) {
      const lastGameIndex = this.userData.gameHistory.length - 1;
      this.userData.gameHistory[lastGameIndex].endTime = Date.now();
      this.userData.gameHistory[lastGameIndex].result = result;
      this.userData.gameHistory[lastGameIndex].attempts = attempts;
      this.userData.gameHistory[lastGameIndex].duration = gameDuration;
      
      // Save updated user data
      try {
        localStorage.setItem('mastermind_user', JSON.stringify(this.userData));
      } catch (e) {
        console.error('Failed to update game history:', e);
      }
    }
    
    return this.trackEvent('game', 'end', {
      result: result, // 'win', 'loss', 'abandoned'
      attempts: attempts,
      duration: gameDuration,
      giveUp: giveUp,
      uniqueId: this.userData.uniqueId
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
	  
	  // Send events to Google Analytics
	  if (this.trackingId && window.gtag) {
		eventsToSend.forEach(event => {
		  // Convert our event format to GA4 format
		  window.gtag('event', `${event.category}_${event.action}`, {
			...event.params,
			'session_id': event.sessionId,
			'timestamp': event.timestamp,
			'user_id': this.userData.userId,
			'device_id': this.userData.uniqueId
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
  
  // Get player statistics
  getPlayerStats() {
    if (!this.localStorage || !this.userData.gameHistory) {
      return null;
    }
    
    try {
      const stats = {
        totalGames: this.userData.gameHistory.length,
        wins: 0,
        losses: 0,
        abandoned: 0,
        averageAttempts: 0,
        averageDuration: 0,
        preferredMode: null,
        preferredCodeLength: null
      };
      
      // Count modes and code lengths
      const modes = {};
      const codeLengths = {};
      let totalAttempts = 0;
      let totalDuration = 0;
      let completedGames = 0;
      
      this.userData.gameHistory.forEach(game => {
        // Count result types
        if (game.result === 'win') stats.wins++;
        else if (game.result === 'loss') stats.losses++;
        else if (game.result === 'abandoned') stats.abandoned++;
        
        // Count modes
        if (game.options && game.options.mode) {
          modes[game.options.mode] = (modes[game.options.mode] || 0) + 1;
        }
        
        // Count code lengths
        if (game.options && game.options.codeLength) {
          codeLengths[game.options.codeLength] = (codeLengths[game.options.codeLength] || 0) + 1;
        }
        
        // Calculate averages
        if (game.attempts && game.duration) {
          totalAttempts += game.attempts;
          totalDuration += game.duration;
          completedGames++;
        }
      });
      
      // Find preferred mode
      let maxModeCount = 0;
      for (const mode in modes) {
        if (modes[mode] > maxModeCount) {
          maxModeCount = modes[mode];
          stats.preferredMode = mode;
        }
      }
      
      // Find preferred code length
      let maxCodeLengthCount = 0;
      for (const length in codeLengths) {
        if (codeLengths[length] > maxCodeLengthCount) {
          maxCodeLengthCount = codeLengths[length];
          stats.preferredCodeLength = parseInt(length);
        }
      }
      
      // Calculate averages
      if (completedGames > 0) {
        stats.averageAttempts = Math.round((totalAttempts / completedGames) * 10) / 10;
        stats.averageDuration = Math.round(totalDuration / completedGames);
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to generate player stats:', error);
      return null;
    }
  }

  // Private helper methods
  _initializeUserData() {
    this.userData = {
      userId: null,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      visits: 1,
      analyticsEnabled: true,
      uniqueId: null,
      gameHistory: []
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
          // First time user, generate IDs
          this.userData.userId = this._generateUserId();
          this.userData.uniqueId = this._generateFingerprintId();
        }
        
        // Save updated user data
        localStorage.setItem('mastermind_user', JSON.stringify(this.userData));
        
        // Update enabled state from user preferences
        this.enabled = this.userData.analyticsEnabled !== false;
        
      } catch (error) {
        console.error('Failed to initialize user data:', error);
        this.userData.userId = this._generateUserId();
        this.userData.uniqueId = this._generateFingerprintId();
      }
    } else {
      // No localStorage, generate temporary ID
      this.userData.userId = this._generateUserId();
      this.userData.uniqueId = this._generateFingerprintId();
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
  
  // Generate a more unique device fingerprint
  _generateFingerprintId() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      screen.width + "x" + screen.height
    ];
    
    // Create a hash from the components
    let hash = 0;
    const stringToHash = components.join('###');
    for (let i = 0; i < stringToHash.length; i++) {
      const char = stringToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return 'device_' + Math.abs(hash).toString(36);
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
  
  // Function to detect browser information
  _detectBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "Unknown";
    let osName = "Unknown";
    let deviceType = "Unknown";
    
    // Detect OS
    if (userAgent.indexOf("Win") !== -1) osName = "Windows";
    else if (userAgent.indexOf("Mac") !== -1) osName = "macOS";
    else if (userAgent.indexOf("Linux") !== -1) osName = "Linux";
    else if (userAgent.indexOf("Android") !== -1) osName = "Android";
    else if (userAgent.indexOf("like Mac") !== -1) osName = "iOS";
    
    // Detect device type
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      deviceType = "Tablet";
    } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated/.test(userAgent)) {
      deviceType = "Mobile";
    } else {
      deviceType = "Desktop";
    }
    
    // Detect browser
    try {
      if (userAgent.indexOf("Firefox") > -1) {
        browserName = "Firefox";
        const match = userAgent.match(/Firefox\/([0-9.]+)/);
        browserVersion = match ? match[1] : "Unknown";
      } else if (userAgent.indexOf("SamsungBrowser") > -1) {
        browserName = "Samsung Browser";
        const match = userAgent.match(/SamsungBrowser\/([0-9.]+)/);
        browserVersion = match ? match[1] : "Unknown";
      } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
        browserName = "Opera";
        if (userAgent.indexOf("Opera") > -1) {
          const match = userAgent.match(/Opera\/([0-9.]+)/);
          browserVersion = match ? match[1] : "Unknown";
        } else {
          const match = userAgent.match(/OPR\/([0-9.]+)/);
          browserVersion = match ? match[1] : "Unknown";
        }
      } else if (userAgent.indexOf("Trident") > -1) {
        browserName = "Internet Explorer";
        const match = userAgent.match(/rv:([0-9.]+)/);
        browserVersion = match ? match[1] : "Unknown";
      } else if (userAgent.indexOf("Edge") > -1) {
        browserName = "Edge";
        const match = userAgent.match(/Edge\/([0-9.]+)/);
        browserVersion = match ? match[1] : "Unknown";
      } else if (userAgent.indexOf("Chrome") > -1) {
        browserName = "Chrome";
        const match = userAgent.match(/Chrome\/([0-9.]+)/);
        browserVersion = match ? match[1] : "Unknown";
      } else if (userAgent.indexOf("Safari") > -1) {
        browserName = "Safari";
        const match = userAgent.match(/Safari\/([0-9.]+)/);
        browserVersion = match ? match[1] : "Unknown";
      }
    } catch (e) {
      console.error("Error detecting browser info:", e);
    }
    
    return {
      browser: browserName,
      browserVersion: browserVersion,
      os: osName,
      deviceType: deviceType
    };
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