import { authenticateToken, optionalAuth } from "../../lib/middleware/auth.js";
import { serverPostsService } from "../../lib/services/serverPostsService.js";
import {
  moderationMiddleware,
  addModerationToResponse,
} from "../../lib/moderation/middleware.js";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  serverErrorResponse,
  paginatedResponse,
  methodNotAllowedResponse,
} from "../../lib/utils/apiResponse.js";

const validatePostData = (data) => {
  const errors = [];

  if (!data.content || typeof data.content !== "string") {
    errors.push("Content is required");
  } else if (data.content.trim().length === 0) {
    errors.push("Content cannot be empty");
  } else if (data.content.length > 5000) {
    errors.push("Content cannot exceed 5000 characters");
  }

  if (data.title && data.title.length > 200) {
    errors.push("Title cannot exceed 200 characters");
  }

  if (data.mediaUrl && !/^https?:\/\/.+/.test(data.mediaUrl)) {
    errors.push("Media URL must be a valid HTTP/HTTPS URL");
  }

  if (data.mediaType && !["text", "image", "video"].includes(data.mediaType)) {
    errors.push("Media type must be one of: text, image, video");
  }

  return errors;
};

const handler = async (req, res) => {
  if (req.method === "GET") {
    // Get posts feed (public endpoint with optional auth)
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "created_at",
        sortOrder = "desc",
        userId,
        tag,
        search,
      } = req.query;

      // Validate query parameters
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 50); // Max 50 posts per page

      if (pageNum < 1) {
        return validationErrorResponse(res, ["Page must be a positive number"]);
      }

      if (limitNum < 1) {
        return validationErrorResponse(res, [
          "Limit must be a positive number",
        ]);
      }

      const options = {
        page: pageNum,
        limit: limitNum,
        sortBy: ["created_at", "like_count", "share_count"].includes(sortBy)
          ? sortBy
          : "created_at",
        sortOrder: ["asc", "desc"].includes(sortOrder) ? sortOrder : "desc",
        userId: userId ? parseInt(userId) : undefined,
        tag,
        search,
      };

      const result = await serverPostsService.getAll(options);

      return paginatedResponse(
        res,
        result.posts,
        result.pagination,
        "Posts retrieved successfully"
      );
    } catch (error) {
      console.error("Error fetching posts:", error);
      return serverErrorResponse(res, error);
    }
  } else if (req.method === "POST") {
    // Create new post (requires authentication)
    try {
      if (!req.user) {
        return errorResponse(
          res,
          ["Authentication required"],
          "Authentication failed",
          401
        );
      }

      const { content, title, tags, mediaUrl, mediaType } = req.body || {};

      // Validate input
      const validationErrors = validatePostData({
        content,
        title,
        mediaUrl,
        mediaType,
      });
      if (validationErrors.length > 0) {
        return validationErrorResponse(res, validationErrors);
      }

      const postData = {
        content: content.trim(),
        title: title?.trim(),
        tags: tags
          ? tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        mediaUrl,
        mediaType: mediaType || "text",
        userId: req.user.id,
      };

      const post = await serverPostsService.create(postData);

      // Add moderation information to response
      const responseData = addModerationToResponse(req, { post });

      return successResponse(
        res,
        responseData,
        "Post created successfully",
        201,
        { createdBy: req.user.username }
      );
    } catch (error) {
      console.error("Error creating post:", error);
      return serverErrorResponse(res, error);
    }
  } else {
    return methodNotAllowedResponse(res, ["GET", "POST"]);
  }
};

export default async function postsHandler(req, res) {
  // Apply optional auth for GET requests, required auth for POST
  if (req.method === "GET") {
    return optionalAuth(req, res, () => handler(req, res));
  } else if (req.method === "POST") {
    return authenticateToken(req, res, (req, res) =>
      moderationMiddleware(req, res, () => handler(req, res))
    );
  } else {
    return handler(req, res);
  }
}
