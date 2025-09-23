// AI Content Moderation System
// Mock implementation for demonstration and testing

class ContentAnalyzer {
  constructor() {
    // Mock AI models - in production these would be actual API integrations
    this.toxicityThreshold = 0.7;
    this.spamThreshold = 0.8;
    this.nsfwThreshold = 0.6;

    // Mock toxic patterns for testing
    this.toxicPatterns = [
      /hate|toxic|abusive|harassment/i,
      /kill yourself|die|death threats/i,
      /racism|sexism|discrimination/i,
      /spam|buy now|click here|fake/i,
    ];

    // Mock spam patterns
    this.spamPatterns = [
      /\b(buy|sale|discount|offer|deal)\b.*\b(now|today|limited)\b/i,
      /click here|visit.*website|make money/i,
      /(https?:\/\/[^\s]+){3,}/i, // Multiple URLs
      /(.)\1{10,}/, // Repeated characters
    ];
  }

  async analyzeText(text, context = {}) {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    const analysis = {
      text,
      timestamp: new Date().toISOString(),
      scores: {
        toxicity: this.calculateToxicityScore(text),
        spam: this.calculateSpamScore(text),
        sentiment: this.calculateSentiment(text),
        confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      },
      context: context,
    };

    // Determine action based on scores
    analysis.action = this.determineAction(analysis.scores);
    analysis.reason = this.generateReason(analysis.scores, analysis.action);
    analysis.appealable = analysis.action !== "approved";

    return analysis;
  }

  async analyzeImage(imageUrl) {
    // Mock image analysis
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Simple mock based on filename patterns
    const nsfwScore =
      imageUrl.includes("nsfw") || imageUrl.includes("adult")
        ? 0.9
        : Math.random() * 0.3;
    const violenceScore =
      imageUrl.includes("violence") || imageUrl.includes("weapon")
        ? 0.8
        : Math.random() * 0.2;

    return {
      imageUrl,
      scores: {
        nsfw: nsfwScore,
        violence: violenceScore,
        confidence: Math.random() * 0.2 + 0.8,
      },
      action:
        nsfwScore > this.nsfwThreshold || violenceScore > 0.7
          ? "block"
          : "approved",
      timestamp: new Date().toISOString(),
    };
  }

  calculateToxicityScore(text) {
    let score = 0;
    const words = text.toLowerCase().split(/\s+/);

    // Check against toxic patterns
    for (const pattern of this.toxicPatterns) {
      if (pattern.test(text)) {
        score += 0.3;
      }
    }

    // Check for profanity
    const profanityWords = ["damn", "hell", "crap", "stupid", "idiot"];
    const profanityCount = words.filter((word) =>
      profanityWords.includes(word)
    ).length;
    score += profanityCount * 0.1;

    // Check for caps (aggressive tone)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5) score += 0.2;

    return Math.min(score, 1.0);
  }

  calculateSpamScore(text) {
    let score = 0;

    // Check spam patterns
    for (const pattern of this.spamPatterns) {
      if (pattern.test(text)) {
        score += 0.4;
      }
    }

    // Check for excessive links
    const urlCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
    if (urlCount > 2) score += 0.3;

    // Check for repeated content
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  calculateSentiment(text) {
    // Very basic sentiment analysis
    const positiveWords = [
      "good",
      "great",
      "awesome",
      "love",
      "excellent",
      "amazing",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "hate",
      "horrible",
      "disgusting",
    ];

    const words = text.toLowerCase().split(/\s+/);
    let sentiment = 0;

    words.forEach((word) => {
      if (positiveWords.includes(word)) sentiment += 0.1;
      if (negativeWords.includes(word)) sentiment -= 0.1;
    });

    return Math.max(-1, Math.min(1, sentiment));
  }

  determineAction(scores) {
    if (
      scores.toxicity > this.toxicityThreshold ||
      scores.spam > this.spamThreshold
    ) {
      return "block";
    } else if (scores.toxicity > 0.4 || scores.spam > 0.5) {
      return "flag";
    } else if (scores.toxicity > 0.2 || scores.spam > 0.3) {
      return "warn";
    }
    return "approved";
  }

  generateReason(scores, action) {
    const reasons = [];

    if (scores.toxicity > 0.7) {
      reasons.push("High toxicity detected");
    } else if (scores.toxicity > 0.4) {
      reasons.push("Potentially inappropriate language");
    }

    if (scores.spam > 0.8) {
      reasons.push("Spam content detected");
    } else if (scores.spam > 0.5) {
      reasons.push("Promotional content flagged");
    }

    if (reasons.length === 0) {
      switch (action) {
        case "warn":
          return "Content contains questionable material";
        case "approved":
          return "Content approved";
        default:
          return "Automatic moderation applied";
      }
    }

    return reasons.join(", ");
  }
}

// User Reputation System
class ReputationManager {
  constructor() {
    this.userReputations = new Map();
    this.defaultReputation = 100;
    this.maxReputation = 1000;
    this.minReputation = 0;
  }

  getUserReputation(userId) {
    return this.userReputations.get(userId) || this.defaultReputation;
  }

  updateReputation(userId, action, severity = 1) {
    const currentRep = this.getUserReputation(userId);
    let change = 0;

    switch (action) {
      case "violation":
        change = -10 * severity;
        break;
      case "warning":
        change = -5 * severity;
        break;
      case "positive_contribution":
        change = 5;
        break;
      case "helpful_report":
        change = 10;
        break;
      case "community_service":
        change = 20;
        break;
    }

    const newReputation = Math.max(
      this.minReputation,
      Math.min(this.maxReputation, currentRep + change)
    );

    this.userReputations.set(userId, newReputation);

    return {
      userId,
      previousReputation: currentRep,
      newReputation,
      change,
      trustLevel: this.calculateTrustLevel(newReputation),
    };
  }

  calculateTrustLevel(reputation) {
    if (reputation >= 500) return "trusted";
    if (reputation >= 200) return "established";
    if (reputation >= 100) return "basic";
    if (reputation >= 50) return "new";
    return "restricted";
  }

  canPerformAction(userId, action) {
    const reputation = this.getUserReputation(userId);
    const trustLevel = this.calculateTrustLevel(reputation);

    const permissions = {
      restricted: ["view"],
      new: ["view", "post", "comment"],
      basic: ["view", "post", "comment", "like"],
      established: ["view", "post", "comment", "like", "report"],
      trusted: ["view", "post", "comment", "like", "report", "moderate"],
    };

    return permissions[trustLevel]?.includes(action) || false;
  }
}

// Moderation Action Logger
class ModerationLogger {
  constructor() {
    this.actions = [];
    this.appeals = [];
  }

  logAction(action) {
    const logEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...action,
    };

    this.actions.push(logEntry);
    return logEntry;
  }

  logAppeal(appeal) {
    const appealEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      status: "pending",
      ...appeal,
    };

    this.appeals.push(appealEntry);
    return appealEntry;
  }

  getActionHistory(userId = null, limit = 50) {
    let filtered = this.actions;

    if (userId) {
      filtered = this.actions.filter((action) => action.userId === userId);
    }

    return filtered
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  getAppeals(status = null) {
    let filtered = this.appeals;

    if (status) {
      filtered = this.appeals.filter((appeal) => appeal.status === status);
    }

    return filtered.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  resolveAppeal(appealId, resolution, reviewerId) {
    const appeal = this.appeals.find((a) => a.id === appealId);
    if (appeal) {
      appeal.status = resolution; // 'approved', 'rejected'
      appeal.reviewerId = reviewerId;
      appeal.resolvedAt = new Date().toISOString();
    }
    return appeal;
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  getStatistics() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dailyActions = this.actions.filter(
      (a) => new Date(a.timestamp) > oneDayAgo
    );
    const weeklyActions = this.actions.filter(
      (a) => new Date(a.timestamp) > oneWeekAgo
    );

    return {
      total: {
        actions: this.actions.length,
        appeals: this.appeals.length,
      },
      daily: {
        actions: dailyActions.length,
        blocked: dailyActions.filter((a) => a.action === "block").length,
        flagged: dailyActions.filter((a) => a.action === "flag").length,
        warned: dailyActions.filter((a) => a.action === "warn").length,
      },
      weekly: {
        actions: weeklyActions.length,
        appeals: this.appeals.filter((a) => new Date(a.timestamp) > oneWeekAgo)
          .length,
      },
      appeals: {
        pending: this.appeals.filter((a) => a.status === "pending").length,
        approved: this.appeals.filter((a) => a.status === "approved").length,
        rejected: this.appeals.filter((a) => a.status === "rejected").length,
      },
    };
  }
}

// Main Moderation Manager
class ModerationManager {
  constructor() {
    this.analyzer = new ContentAnalyzer();
    this.reputationManager = new ReputationManager();
    this.logger = new ModerationLogger();
  }

  async moderateContent(content, context = {}) {
    const startTime = Date.now();

    try {
      // Analyze content
      const analysis = await this.analyzer.analyzeText(content, context);

      // Check user reputation
      const userReputation = this.reputationManager.getUserReputation(
        context.userId
      );
      const trustLevel =
        this.reputationManager.calculateTrustLevel(userReputation);

      // Adjust action based on user reputation
      if (trustLevel === "trusted" && analysis.action === "warn") {
        analysis.action = "approved";
        analysis.reason += " (Trusted user override)";
      } else if (
        trustLevel === "restricted" &&
        analysis.action === "approved"
      ) {
        analysis.action = "flag";
        analysis.reason += " (Restricted user - manual review required)";
      }

      // Log the action
      const logEntry = this.logger.logAction({
        userId: context.userId,
        contentId: context.contentId,
        contentType: context.contentType || "text",
        content:
          content.substring(0, 100) + (content.length > 100 ? "..." : ""),
        action: analysis.action,
        reason: analysis.reason,
        scores: analysis.scores,
        automated: true,
        processingTime: Date.now() - startTime,
      });

      // Update user reputation if action taken
      if (analysis.action !== "approved") {
        const severity =
          analysis.action === "block" ? 3 : analysis.action === "flag" ? 2 : 1;
        this.reputationManager.updateReputation(
          context.userId,
          "violation",
          severity
        );
      }

      return {
        ...analysis,
        logId: logEntry.id,
        userReputation: userReputation,
        trustLevel: trustLevel,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("Moderation error:", error);

      // Log error and allow content (fail-open approach)
      const logEntry = this.logger.logAction({
        userId: context.userId,
        contentId: context.contentId,
        content: content.substring(0, 100),
        action: "error",
        reason: "Moderation system error: " + error.message,
        automated: true,
        error: true,
        processingTime: Date.now() - startTime,
      });

      return {
        action: "approved",
        reason: "System temporarily unavailable - content approved",
        error: true,
        logId: logEntry.id,
        processingTime: Date.now() - startTime,
      };
    }
  }

  async moderateImage(imageUrl, context = {}) {
    const analysis = await this.analyzer.analyzeImage(imageUrl);

    const logEntry = this.logger.logAction({
      userId: context.userId,
      contentId: context.contentId,
      contentType: "image",
      content: imageUrl,
      action: analysis.action,
      scores: analysis.scores,
      automated: true,
    });

    if (analysis.action !== "approved") {
      const severity = analysis.action === "block" ? 3 : 2;
      this.reputationManager.updateReputation(
        context.userId,
        "violation",
        severity
      );
    }

    return {
      ...analysis,
      logId: logEntry.id,
    };
  }

  createAppeal(userId, actionId, reason) {
    return this.logger.logAppeal({
      userId,
      actionId,
      reason,
      userMessage: reason,
    });
  }

  resolveAppeal(appealId, resolution, reviewerId, reviewNote) {
    const appeal = this.logger.resolveAppeal(appealId, resolution, reviewerId);
    if (appeal && resolution === "approved") {
      // Restore user reputation if appeal approved
      this.reputationManager.updateReputation(
        appeal.userId,
        "positive_contribution"
      );
    }
    return appeal;
  }

  getStatistics() {
    return this.logger.getStatistics();
  }

  getUserHistory(userId) {
    return this.logger.getActionHistory(userId);
  }

  canUserPost(userId) {
    return this.reputationManager.canPerformAction(userId, "post");
  }

  canUserComment(userId) {
    return this.reputationManager.canPerformAction(userId, "comment");
  }
}

module.exports = {
  ModerationManager,
  ContentAnalyzer,
  ReputationManager,
  ModerationLogger,
};
