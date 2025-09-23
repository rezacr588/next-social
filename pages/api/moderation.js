// Moderation API endpoints
import { ModerationManager } from "../../lib/moderation/index.js";
import { verifyToken } from "../../lib/auth.js";

const moderationManager = new ModerationManager();

export default async function handler(req, res) {
  try {
    // Verify authentication for most operations
    if (req.method !== "GET" || req.query.public !== "true") {
      const authResult = verifyToken(req);
      if (!authResult.valid) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Valid authentication required",
        });
      }
      req.user = authResult.user;
    }

    switch (req.method) {
      case "POST":
        return await handleModerationRequest(req, res);
      case "GET":
        return await handleGetModerationData(req, res);
      default:
        return res.status(405).json({
          success: false,
          error: "Method not allowed",
          message: `HTTP ${req.method} not supported`,
        });
    }
  } catch (error) {
    console.error("Moderation API error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Moderation system temporarily unavailable",
    });
  }
}

async function handleModerationRequest(req, res) {
  const { action, content, imageUrl, context = {} } = req.body;

  if (!action) {
    return res.status(400).json({
      success: false,
      error: "Bad request",
      message: "Action is required",
    });
  }

  // Add user context
  context.userId = req.user.id;
  context.username = req.user.username;

  let result;

  switch (action) {
    case "analyze_text":
      if (!content) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Content is required for text analysis",
        });
      }
      result = await moderationManager.moderateContent(content, context);
      break;

    case "analyze_image":
      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Image URL is required for image analysis",
        });
      }
      result = await moderationManager.moderateImage(imageUrl, context);
      break;

    case "create_appeal":
      const { actionId, reason } = req.body;
      if (!actionId || !reason) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Action ID and reason are required for appeals",
        });
      }
      result = moderationManager.createAppeal(req.user.id, actionId, reason);
      break;

    case "resolve_appeal":
      // Only allow admins to resolve appeals
      if (!req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "Admin privileges required",
        });
      }
      const { appealId, resolution, reviewNote } = req.body;
      if (!appealId || !resolution) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Appeal ID and resolution are required",
        });
      }
      result = moderationManager.resolveAppeal(
        appealId,
        resolution,
        req.user.id,
        reviewNote
      );
      break;

    default:
      return res.status(400).json({
        success: false,
        error: "Bad request",
        message: `Unknown action: ${action}`,
      });
  }

  return res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  });
}

async function handleGetModerationData(req, res) {
  const { type, userId, limit } = req.query;

  let result;

  switch (type) {
    case "statistics":
      // Public statistics (if public=true) or admin statistics
      if (req.query.public === "true") {
        const stats = moderationManager.getStatistics();
        // Return only safe public stats
        result = {
          daily: {
            totalActions: stats.daily.actions,
            contentBlocked: stats.daily.blocked,
            contentFlagged: stats.daily.flagged,
          },
          systemHealth: {
            status: "operational",
            lastUpdate: new Date().toISOString(),
          },
        };
      } else {
        // Full admin statistics
        if (!req.user.is_admin) {
          return res.status(403).json({
            success: false,
            error: "Forbidden",
            message: "Admin privileges required for detailed statistics",
          });
        }
        result = moderationManager.getStatistics();
      }
      break;

    case "user_history":
      // Users can see their own history, admins can see any user's history
      const targetUserId = userId || req.user.id;
      if (targetUserId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "Can only view own moderation history",
        });
      }
      result = moderationManager.getUserHistory(targetUserId);
      break;

    case "appeals":
      // Only admins can view appeals
      if (!req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "Admin privileges required",
        });
      }
      result = moderationManager.logger.getAppeals();
      break;

    case "user_status":
      // Check if user can perform actions
      const checkUserId = userId || req.user.id;
      if (checkUserId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "Can only check own user status",
        });
      }

      const reputation =
        moderationManager.reputationManager.getUserReputation(checkUserId);
      const trustLevel =
        moderationManager.reputationManager.calculateTrustLevel(reputation);

      result = {
        userId: checkUserId,
        reputation,
        trustLevel,
        permissions: {
          canPost: moderationManager.canUserPost(checkUserId),
          canComment: moderationManager.canUserComment(checkUserId),
          canReport: moderationManager.reputationManager.canPerformAction(
            checkUserId,
            "report"
          ),
          canModerate: moderationManager.reputationManager.canPerformAction(
            checkUserId,
            "moderate"
          ),
        },
      };
      break;

    default:
      return res.status(400).json({
        success: false,
        error: "Bad request",
        message: `Unknown data type: ${type}`,
      });
  }

  return res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  });
}
