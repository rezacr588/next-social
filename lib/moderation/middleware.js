// Moderation middleware for post and comment creation
import { ModerationManager } from "../../lib/moderation/index.js";

const moderationManager = new ModerationManager();

export const moderationMiddleware = async (req, res, next) => {
  // Skip moderation for GET requests
  if (req.method === "GET") {
    return next();
  }

  // Skip if no content to moderate
  if (!req.body.content && !req.body.mediaUrl) {
    return next();
  }

  try {
    const context = {
      userId: req.user?.id,
      username: req.user?.username,
      contentType: req.body.mediaType || "text",
      contentId: req.body.id || `temp_${Date.now()}`,
      userAgent: req.headers["user-agent"],
      ip: req.ip || req.connection.remoteAddress,
    };

    let moderationResult;

    // Moderate text content
    if (req.body.content) {
      moderationResult = await moderationManager.moderateContent(
        req.body.content,
        context
      );

      // Block content if moderation says so
      if (moderationResult.action === "block") {
        return res.status(403).json({
          success: false,
          error: "Content blocked",
          message: moderationResult.reason,
          moderation: {
            action: moderationResult.action,
            reason: moderationResult.reason,
            appealable: moderationResult.appealable,
            logId: moderationResult.logId,
          },
        });
      }

      // Flag content but allow posting with warning
      if (moderationResult.action === "flag") {
        req.moderationResult = moderationResult;
        req.moderationWarning = true;
      }

      // Warn user but allow content
      if (moderationResult.action === "warn") {
        req.moderationResult = moderationResult;
        req.moderationNotice = true;
      }
    }

    // Moderate image content if present
    if (req.body.mediaUrl && req.body.mediaType === "image") {
      const imageResult = await moderationManager.moderateImage(
        req.body.mediaUrl,
        context
      );

      if (imageResult.action === "block") {
        return res.status(403).json({
          success: false,
          error: "Image blocked",
          message: "Image contains inappropriate content",
          moderation: {
            action: imageResult.action,
            scores: imageResult.scores,
            logId: imageResult.logId,
            appealable: true,
          },
        });
      }

      if (imageResult.action === "flag") {
        req.imageModeration = imageResult;
        req.moderationWarning = true;
      }
    }

    // Continue to next middleware/handler
    next();
  } catch (error) {
    console.error("Moderation middleware error:", error);

    // Log the error but don't block the request (fail-open approach)
    console.warn("Moderation system temporarily unavailable, allowing content");
    req.moderationError = error.message;
    next();
  }
};

// Helper function to add moderation info to response
export const addModerationToResponse = (req, responseData) => {
  const moderation = {};

  if (req.moderationResult) {
    moderation.text = {
      action: req.moderationResult.action,
      reason: req.moderationResult.reason,
      processingTime: req.moderationResult.processingTime,
      logId: req.moderationResult.logId,
    };
  }

  if (req.imageModeration) {
    moderation.image = {
      action: req.imageModeration.action,
      scores: req.imageModeration.scores,
      logId: req.imageModeration.logId,
    };
  }

  if (req.moderationWarning) {
    moderation.warning = "Content has been flagged for review";
  }

  if (req.moderationNotice) {
    moderation.notice = "Content contains potentially problematic elements";
  }

  if (req.moderationError) {
    moderation.error = "Moderation system temporarily unavailable";
  }

  if (Object.keys(moderation).length > 0) {
    responseData.moderation = moderation;
  }

  return responseData;
};

export default moderationManager;
