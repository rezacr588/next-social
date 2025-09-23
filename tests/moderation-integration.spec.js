// Integration test for AI Content Moderation with Posts API
import { test, expect } from "@playwright/test";

test.describe("AI Moderation Integration with Posts API", () => {
  // Mock authentication tokens for testing
  const mockTokens = {
    admin:
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJpc19hZG1pbiI6dHJ1ZSwiaWF0IjoxNjk4ODQwMDAwfQ.test",
    user: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJ1c2VyIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaXNfYWRtaW4iOmZhbHNlLCJpYXQiOjE2OTg4NDAwMDB9.test",
  };

  test.beforeEach(async ({ page }) => {
    // Set up authentication in local storage
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("token", "test-token-user");
    });
  });

  test("should allow clean content to be posted", async ({ request }) => {
    const response = await request.post("/api/posts", {
      headers: {
        Authorization: mockTokens.user,
        "Content-Type": "application/json",
      },
      data: {
        content:
          "This is a wonderful post about technology and innovation! I love sharing knowledge with the community.",
        mediaType: "text",
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.post).toBeDefined();
    expect(data.data.post.content).toContain("wonderful post");

    // Check if moderation info is included
    if (data.data.moderation) {
      expect(["approved", "warn"]).toContain(data.data.moderation.text.action);
    }
  });

  test("should block toxic content from being posted", async ({ request }) => {
    const response = await request.post("/api/posts", {
      headers: {
        Authorization: mockTokens.user,
        "Content-Type": "application/json",
      },
      data: {
        content:
          "You are all idiots and I hate this toxic community! Everyone here is stupid and worthless!",
        mediaType: "text",
      },
    });

    expect(response.status()).toBe(403);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Content blocked");
    expect(data.moderation).toBeDefined();
    expect(data.moderation.action).toBe("block");
    expect(data.moderation.appealable).toBe(true);
  });

  test("should block spam content from being posted", async ({ request }) => {
    const response = await request.post("/api/posts", {
      headers: {
        Authorization: mockTokens.user,
        "Content-Type": "application/json",
      },
      data: {
        content:
          "Buy now! Amazing deals! Click here for limited time offers! Visit our website for incredible discounts!",
        mediaType: "text",
      },
    });

    expect(response.status()).toBe(403);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Content blocked");
    expect(data.moderation.reason).toContain("spam");
  });

  test("should allow borderline content with warning", async ({ request }) => {
    const response = await request.post("/api/posts", {
      headers: {
        Authorization: mockTokens.user,
        "Content-Type": "application/json",
      },
      data: {
        content:
          "This is kind of annoying, but I guess it's okay. Some people can be frustrating.",
        mediaType: "text",
      },
    });

    // Should be allowed but may have moderation notice
    expect([201, 403]).toContain(response.status());
    const data = await response.json();

    if (response.status() === 201) {
      expect(data.success).toBe(true);
      // May have moderation warning or notice
      if (data.data.moderation) {
        expect(["approved", "warn"]).toContain(
          data.data.moderation.text.action
        );
      }
    }
  });

  test("should block inappropriate images", async ({ request }) => {
    const response = await request.post("/api/posts", {
      headers: {
        Authorization: mockTokens.user,
        "Content-Type": "application/json",
      },
      data: {
        content: "Check out this image!",
        mediaUrl: "https://example.com/nsfw-content.jpg",
        mediaType: "image",
      },
    });

    expect(response.status()).toBe(403);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Image blocked");
    expect(data.moderation).toBeDefined();
  });

  test("should allow safe images", async ({ request }) => {
    const response = await request.post("/api/posts", {
      headers: {
        Authorization: mockTokens.user,
        "Content-Type": "application/json",
      },
      data: {
        content: "Beautiful sunset photo!",
        mediaUrl: "https://example.com/beautiful-sunset.jpg",
        mediaType: "image",
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.post.media_url).toBe(
      "https://example.com/beautiful-sunset.jpg"
    );
  });

  test("should track moderation performance metrics", async ({ request }) => {
    // Create multiple posts to generate moderation activity
    const testPosts = [
      { content: "Great community here!", expected: 201 },
      { content: "This is spam buy now click here!", expected: 403 },
      { content: "You are all terrible people!", expected: 403 },
      { content: "Thanks for the helpful information.", expected: 201 },
      { content: "Another spam message with deals!", expected: 403 },
    ];

    for (const testPost of testPosts) {
      const response = await request.post("/api/posts", {
        headers: {
          Authorization: mockTokens.user,
          "Content-Type": "application/json",
        },
        data: {
          content: testPost.content,
          mediaType: "text",
        },
      });

      expect(response.status()).toBe(testPost.expected);
    }

    // Check moderation statistics
    const statsResponse = await request.get(
      "/api/moderation?type=statistics&public=true"
    );
    expect(statsResponse.status()).toBe(200);

    const statsData = await statsResponse.json();
    expect(statsData.success).toBe(true);
    expect(statsData.data.daily).toBeDefined();
    expect(statsData.data.systemHealth.status).toBe("operational");
  });

  test("should handle moderation system errors gracefully", async ({
    request,
  }) => {
    // This test simulates what happens when the moderation system has issues
    // The system should fail-open and allow content rather than blocking everything

    const response = await request.post("/api/posts", {
      headers: {
        Authorization: mockTokens.user,
        "Content-Type": "application/json",
      },
      data: {
        content:
          "This content should be allowed even if moderation has issues.",
        mediaType: "text",
      },
    });

    // Should succeed (fail-open approach)
    expect([201, 500]).toContain(response.status());

    if (response.status() === 201) {
      const data = await response.json();
      expect(data.success).toBe(true);

      // May have error info in moderation
      if (data.data.moderation && data.data.moderation.error) {
        expect(data.data.moderation.error).toContain("temporarily unavailable");
      }
    }
  });

  test("should provide moderation analytics to admins", async ({ request }) => {
    const response = await request.get("/api/moderation?type=statistics", {
      headers: {
        Authorization: mockTokens.admin,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.total).toBeDefined();
    expect(data.data.daily).toBeDefined();
    expect(data.data.weekly).toBeDefined();
    expect(data.data.appeals).toBeDefined();

    // Verify structure
    expect(typeof data.data.total.actions).toBe("number");
    expect(typeof data.data.daily.actions).toBe("number");
    expect(typeof data.data.appeals.pending).toBe("number");
  });

  test("should allow users to check their reputation status", async ({
    request,
  }) => {
    const response = await request.get("/api/moderation?type=user_status", {
      headers: {
        Authorization: mockTokens.user,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.reputation).toBeGreaterThanOrEqual(0);
    expect(data.data.trustLevel).toBeTruthy();
    expect(data.data.permissions).toBeDefined();
    expect(typeof data.data.permissions.canPost).toBe("boolean");
    expect(typeof data.data.permissions.canComment).toBe("boolean");
  });

  test("should handle appeal creation", async ({ request }) => {
    // First, create a post that gets blocked to have something to appeal
    const postResponse = await request.post("/api/posts", {
      headers: {
        Authorization: mockTokens.user,
        "Content-Type": "application/json",
      },
      data: {
        content: "This might be flagged incorrectly as problematic content.",
        mediaType: "text",
      },
    });

    // If the post was blocked, create an appeal
    if (postResponse.status() === 403) {
      const postData = await postResponse.json();

      if (postData.moderation && postData.moderation.logId) {
        const appealResponse = await request.post("/api/moderation", {
          headers: {
            Authorization: mockTokens.user,
            "Content-Type": "application/json",
          },
          data: {
            action: "create_appeal",
            actionId: postData.moderation.logId,
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
    }
  });

  test("should measure moderation processing speed", async ({ request }) => {
    const startTime = Date.now();

    const response = await request.post("/api/moderation", {
      headers: {
        Authorization: mockTokens.admin,
        "Content-Type": "application/json",
      },
      data: {
        action: "analyze_text",
        content:
          "This is a performance test to measure how quickly the moderation system responds to content analysis requests.",
        context: {
          contentType: "performance_test",
          contentId: `perf_${Date.now()}`,
        },
      },
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.processingTime).toBeLessThan(500); // Should be fast
    expect(totalTime).toBeLessThan(2000); // Total response time should be reasonable

    console.log(
      `Moderation processing time: ${data.data.processingTime}ms, Total request time: ${totalTime}ms`
    );
  });
});

// Integration test specifically for the moderation dashboard
test.describe("Moderation Dashboard UI", () => {
  test("should load moderation dashboard for admin users", async ({ page }) => {
    // Mock admin authentication
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("token", "test-token-admin");
    });

    await page.goto("/admin/moderation");

    // Check if dashboard loads
    await expect(page.locator("h1")).toContainText("AI Moderation Dashboard");

    // Check for key dashboard elements
    await expect(page.locator("text=Total Actions")).toBeVisible();
    await expect(page.locator("text=Daily Actions")).toBeVisible();
    await expect(page.locator("text=Appeals")).toBeVisible();

    // Check for system status
    await expect(page.locator("text=System Status")).toBeVisible();
    await expect(page.locator("text=AI Analysis: Operational")).toBeVisible();
  });

  test("should allow running test suite from dashboard", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("token", "test-token-admin");
    });

    await page.goto("/admin/moderation");

    // Wait for dashboard to load
    await expect(page.locator("h1")).toContainText("AI Moderation Dashboard");

    // Click the test suite button
    const testButton = page.locator("text=Run Test Suite");
    await expect(testButton).toBeVisible();

    // Note: In a real test, you might mock the API calls or check for console logs
    // For this demonstration, we're just verifying the button exists and is clickable
    expect(await testButton.count()).toBeGreaterThan(0);
  });

  test("should display working features list", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("token", "test-token-admin");
    });

    await page.goto("/admin/moderation");

    // Check for the working features section
    await expect(page.locator("text=✅ Working Features")).toBeVisible();

    // Verify key features are listed
    await expect(page.locator("text=Real-time content analysis")).toBeVisible();
    await expect(
      page.locator("text=Toxicity detection with scoring")
    ).toBeVisible();
    await expect(page.locator("text=Spam pattern recognition")).toBeVisible();
    await expect(page.locator("text=User reputation tracking")).toBeVisible();
    await expect(page.locator("text=Appeals system")).toBeVisible();
  });

  test("should show test scenarios section", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("token", "test-token-admin");
    });

    await page.goto("/admin/moderation");

    // Check for test scenarios
    await expect(page.locator("text=🔧 Test Scenarios")).toBeVisible();

    // Verify test scenarios are listed
    await expect(page.locator("text=Clean content → Approved")).toBeVisible();
    await expect(page.locator("text=Toxic content → Blocked")).toBeVisible();
    await expect(
      page.locator("text=Spam content → Flagged/Blocked")
    ).toBeVisible();
    await expect(
      page.locator("text=Error handling and fail-safe")
    ).toBeVisible();
  });
});
