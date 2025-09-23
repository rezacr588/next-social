// Comprehensive tests for AI Content Moderation System
import { test, expect } from "@playwright/test";

test.describe("AI Content Moderation System", () => {
  // Test basic moderation functionality
  test.describe("Core Moderation Features", () => {
    test("should analyze and approve clean content", async ({ request }) => {
      const response = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
        data: {
          action: "analyze_text",
          content:
            "This is a wonderful day! I love sharing positive thoughts with the community.",
          context: {
            contentType: "post",
            contentId: "test-1",
          },
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.action).toBe("approved");
      expect(data.data.scores.toxicity).toBeLessThan(0.3);
      expect(data.data.processingTime).toBeLessThan(200);
    });

    test("should block toxic content", async ({ request }) => {
      const response = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
        data: {
          action: "analyze_text",
          content:
            "You are such an idiot! I hate everyone here! This community is toxic and abusive!",
          context: {
            contentType: "comment",
            contentId: "test-2",
          },
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.action).toBe("block");
      expect(data.data.scores.toxicity).toBeGreaterThan(0.7);
      expect(data.data.appealable).toBe(true);
    });

    test("should flag spam content", async ({ request }) => {
      const response = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
        data: {
          action: "analyze_text",
          content:
            "Buy now! Limited time offer! Visit our website! Get rich quick! Click here for amazing deals!",
          context: {
            contentType: "post",
            contentId: "test-3",
          },
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(["block", "flag"]).toContain(data.data.action);
      expect(data.data.scores.spam).toBeGreaterThan(0.5);
    });

    test("should warn for borderline content", async ({ request }) => {
      const response = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
        data: {
          action: "analyze_text",
          content:
            "This is kind of stupid, but whatever. Some people are just annoying.",
          context: {
            contentType: "comment",
            contentId: "test-4",
          },
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(["warn", "approved"]).toContain(data.data.action);
    });
  });

  // Test image moderation
  test.describe("Image Moderation", () => {
    test("should approve safe images", async ({ request }) => {
      const response = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
        data: {
          action: "analyze_image",
          imageUrl: "https://example.com/cute-puppy.jpg",
          context: {
            contentType: "image",
            contentId: "img-1",
          },
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.action).toBe("approved");
      expect(data.data.scores.nsfw).toBeLessThan(0.3);
    });

    test("should block inappropriate images", async ({ request }) => {
      const response = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
        data: {
          action: "analyze_image",
          imageUrl: "https://example.com/nsfw-content.jpg",
          context: {
            contentType: "image",
            contentId: "img-2",
          },
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.action).toBe("block");
      expect(data.data.scores.nsfw).toBeGreaterThan(0.6);
    });
  });

  // Test user reputation system
  test.describe("User Reputation System", () => {
    test("should track user reputation", async ({ request }) => {
      const response = await request.get(
        "/api/moderation?type=user_status&userId=1",
        {
          headers: {
            Authorization: "Bearer test-token-admin",
          },
        }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.reputation).toBeGreaterThanOrEqual(0);
      expect(data.data.trustLevel).toBeTruthy();
      expect(data.data.permissions).toBeDefined();
      expect(typeof data.data.permissions.canPost).toBe("boolean");
    });

    test("should show different trust levels affect permissions", async ({
      request,
    }) => {
      // Test with different reputation scores by analyzing different content types
      const cleanResponse = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-user",
        },
        data: {
          action: "analyze_text",
          content: "Thank you for sharing this valuable information!",
          context: { contentType: "post", contentId: "rep-test-1" },
        },
      });

      const toxicResponse = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-user",
        },
        data: {
          action: "analyze_text",
          content:
            "This is absolutely terrible and toxic content that should be blocked!",
          context: { contentType: "post", contentId: "rep-test-2" },
        },
      });

      expect(cleanResponse.status()).toBe(200);
      expect(toxicResponse.status()).toBe(200);

      const cleanData = await cleanResponse.json();
      const toxicData = await toxicResponse.json();

      // Clean content should be approved
      expect(cleanData.data.action).toBe("approved");

      // Toxic content should be blocked or flagged
      expect(["block", "flag"]).toContain(toxicData.data.action);
    });
  });

  // Test appeals system
  test.describe("Appeals System", () => {
    test("should allow users to create appeals", async ({ request }) => {
      // First get a moderation action
      const moderationResponse = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-user",
        },
        data: {
          action: "analyze_text",
          content: "This might be flagged incorrectly as bad content",
          context: { contentType: "post", contentId: "appeal-test-1" },
        },
      });

      const moderationData = await moderationResponse.json();

      if (moderationData.data.action !== "approved") {
        // Create an appeal
        const appealResponse = await request.post("/api/moderation", {
          headers: {
            Authorization: "Bearer test-token-user",
          },
          data: {
            action: "create_appeal",
            actionId: moderationData.data.logId,
            reason:
              "This content was flagged incorrectly. It contains no harmful material.",
          },
        });

        expect(appealResponse.status()).toBe(200);
        const appealData = await appealResponse.json();

        expect(appealData.success).toBe(true);
        expect(appealData.data.status).toBe("pending");
        expect(appealData.data.userMessage).toBeTruthy();
      }
    });

    test("should allow admins to resolve appeals", async ({ request }) => {
      // Create an appeal first
      const appealResponse = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-user",
        },
        data: {
          action: "create_appeal",
          actionId: "test-action-id",
          reason: "This was a false positive",
        },
      });

      const appealData = await appealResponse.json();

      if (appealData.success) {
        // Resolve the appeal as admin
        const resolveResponse = await request.post("/api/moderation", {
          headers: {
            Authorization: "Bearer test-token-admin",
          },
          data: {
            action: "resolve_appeal",
            appealId: appealData.data.id,
            resolution: "approved",
            reviewNote: "Appeal approved - content was indeed appropriate",
          },
        });

        expect(resolveResponse.status()).toBe(200);
        const resolveData = await resolveResponse.json();

        expect(resolveData.success).toBe(true);
        expect(resolveData.data.status).toBe("approved");
      }
    });
  });

  // Test moderation statistics
  test.describe("Moderation Statistics", () => {
    test("should provide public statistics", async ({ request }) => {
      const response = await request.get(
        "/api/moderation?type=statistics&public=true"
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.daily).toBeDefined();
      expect(data.data.systemHealth).toBeDefined();
      expect(data.data.systemHealth.status).toBe("operational");
    });

    test("should provide detailed admin statistics", async ({ request }) => {
      const response = await request.get("/api/moderation?type=statistics", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.total).toBeDefined();
      expect(data.data.daily).toBeDefined();
      expect(data.data.weekly).toBeDefined();
      expect(data.data.appeals).toBeDefined();
    });

    test("should track moderation performance metrics", async ({ request }) => {
      // Generate some moderation activity
      const testContents = [
        "This is great content!",
        "Spam message buy now click here!",
        "You are terrible and I hate you!",
        "Nice work on this project.",
        "Another spam message with deals and offers!",
      ];

      for (const content of testContents) {
        await request.post("/api/moderation", {
          headers: {
            Authorization: "Bearer test-token-admin",
          },
          data: {
            action: "analyze_text",
            content,
            context: { contentType: "test", contentId: `perf-${Date.now()}` },
          },
        });
      }

      // Check statistics
      const statsResponse = await request.get(
        "/api/moderation?type=statistics",
        {
          headers: {
            Authorization: "Bearer test-token-admin",
          },
        }
      );

      const statsData = await statsResponse.json();

      expect(statsData.success).toBe(true);
      expect(statsData.data.daily.actions).toBeGreaterThan(0);
      expect(statsData.data.total.actions).toBeGreaterThan(0);
    });
  });

  // Test error handling
  test.describe("Error Handling", () => {
    test("should handle missing authentication", async ({ request }) => {
      const response = await request.post("/api/moderation", {
        data: {
          action: "analyze_text",
          content: "Test content",
        },
      });

      expect(response.status()).toBe(401);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    test("should handle invalid requests", async ({ request }) => {
      const response = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
        data: {
          action: "invalid_action",
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBe("Bad request");
    });

    test("should handle missing content", async ({ request }) => {
      const response = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
        data: {
          action: "analyze_text",
          // Missing content field
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toContain("Content is required");
    });

    test("should gracefully handle system errors", async ({ request }) => {
      // This would test the fail-open behavior when the moderation system has errors
      // In a real implementation, you might temporarily break something to test this
      const response = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
        data: {
          action: "analyze_text",
          content: "Test content for error handling",
          context: {
            contentType: "test",
            contentId: "error-test-1",
            forceError: true, // This would be handled in the actual implementation
          },
        },
      });

      // Even with errors, the system should respond (fail-open approach)
      expect([200, 500]).toContain(response.status());
    });
  });

  // Integration tests with existing post system
  test.describe("Integration with Post System", () => {
    test("should moderate content when creating posts", async ({ request }) => {
      const response = await request.post("/api/posts", {
        headers: {
          Authorization: "Bearer test-token-user",
          "Content-Type": "application/json",
        },
        data: {
          content: "This is a wonderful post about technology and innovation!",
          mediaType: "text",
        },
      });

      // Should succeed for clean content
      expect(response.status()).toBe(201);
      const data = await response.json();

      expect(data.success).toBe(true);
      // Check if moderation info is included in response
      if (data.moderation) {
        expect(data.moderation.text.action).toBe("approved");
      }
    });

    test("should block inappropriate posts", async ({ request }) => {
      const response = await request.post("/api/posts", {
        headers: {
          Authorization: "Bearer test-token-user",
          "Content-Type": "application/json",
        },
        data: {
          content:
            "You are all idiots and I hate this toxic community! Everyone here is stupid!",
          mediaType: "text",
        },
      });

      // Should be blocked
      expect(response.status()).toBe(403);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBe("Content blocked");
      expect(data.moderation).toBeDefined();
      expect(data.moderation.appealable).toBe(true);
    });

    test("should moderate images in posts", async ({ request }) => {
      const response = await request.post("/api/posts", {
        headers: {
          Authorization: "Bearer test-token-user",
          "Content-Type": "application/json",
        },
        data: {
          content: "Check out this image!",
          mediaUrl: "https://example.com/nsfw-image.jpg",
          mediaType: "image",
        },
      });

      // Should be blocked for inappropriate image
      expect(response.status()).toBe(403);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBe("Image blocked");
    });
  });

  // Performance tests
  test.describe("Performance Tests", () => {
    test("should process text moderation quickly", async ({ request }) => {
      const startTime = Date.now();

      const response = await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-admin",
        },
        data: {
          action: "analyze_text",
          content:
            "This is a performance test for the moderation system to ensure it responds quickly.",
          context: { contentType: "performance-test" },
        },
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.processingTime).toBeLessThan(200); // Should process in under 200ms
      expect(responseTime).toBeLessThan(1000); // Total response time under 1 second
    });

    test("should handle concurrent moderation requests", async ({
      request,
    }) => {
      const promises = [];
      const testContents = [
        "Content 1 for concurrent testing",
        "Content 2 for concurrent testing",
        "Content 3 for concurrent testing",
        "Content 4 for concurrent testing",
        "Content 5 for concurrent testing",
      ];

      // Send multiple requests concurrently
      for (let i = 0; i < testContents.length; i++) {
        promises.push(
          request.post("/api/moderation", {
            headers: {
              Authorization: "Bearer test-token-admin",
            },
            data: {
              action: "analyze_text",
              content: testContents[i],
              context: {
                contentType: "concurrent-test",
                contentId: `concurrent-${i}`,
              },
            },
          })
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      for (const response of responses) {
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });
  });

  // Real-world scenario tests
  test.describe("Real-world Scenarios", () => {
    test("should handle mixed content appropriately", async ({ request }) => {
      const mixedContents = [
        {
          content:
            "I really love this community! Everyone is so helpful and kind.",
          expected: "approved",
        },
        {
          content: "This is getting annoying, but I guess it's okay.",
          expected: ["approved", "warn"],
        },
        {
          content: "CLICK HERE FOR AMAZING DEALS! BUY NOW! LIMITED TIME OFFER!",
          expected: ["block", "flag"],
        },
        {
          content: "You people are all morons and this place is toxic garbage!",
          expected: "block",
        },
      ];

      for (const test of mixedContents) {
        const response = await request.post("/api/moderation", {
          headers: {
            Authorization: "Bearer test-token-admin",
          },
          data: {
            action: "analyze_text",
            content: test.content,
            context: { contentType: "mixed-test" },
          },
        });

        expect(response.status()).toBe(200);
        const data = await response.json();

        if (Array.isArray(test.expected)) {
          expect(test.expected).toContain(data.data.action);
        } else {
          expect(data.data.action).toBe(test.expected);
        }
      }
    });

    test("should maintain user reputation across multiple interactions", async ({
      request,
    }) => {
      const userId = "reputation-test-user";

      // Start with positive content
      await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-user",
        },
        data: {
          action: "analyze_text",
          content: "Thank you for this wonderful platform!",
          context: { contentType: "reputation-test", userId },
        },
      });

      // Add some problematic content
      await request.post("/api/moderation", {
        headers: {
          Authorization: "Bearer test-token-user",
        },
        data: {
          action: "analyze_text",
          content: "This is kind of stupid and annoying.",
          context: { contentType: "reputation-test", userId },
        },
      });

      // Check final reputation status
      const statusResponse = await request.get(
        `/api/moderation?type=user_status`,
        {
          headers: {
            Authorization: "Bearer test-token-user",
          },
        }
      );

      expect(statusResponse.status()).toBe(200);
      const statusData = await statusResponse.json();

      expect(statusData.success).toBe(true);
      expect(statusData.data.reputation).toBeDefined();
      expect(statusData.data.trustLevel).toBeDefined();
    });
  });
});
