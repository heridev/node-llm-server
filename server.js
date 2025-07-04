const express = require("express");
const axios = require("axios");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3050;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

app.use("/api/", limiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// LLM Query endpoint
app.post("/api/query", async (req, res) => {
  const { prompt, temperature = 0.3, max_tokens = 800, top_p = 0.9 } = req.body;

  // Validation
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "Invalid or missing prompt",
      code: "INVALID_PROMPT",
    });
  }

  if (prompt.length > 10000) {
    return res.status(400).json({
      error: "Prompt too long (max 10000 characters)",
      code: "PROMPT_TOO_LONG",
    });
  }

  try {
    const response = await callClaude(prompt, {
      temperature,
      max_tokens,
      top_p,
    });

    // Parse and format response for mobile display
    console.log("Response before the formatFormMobile:", response);
    const formattedResponse = formatForMobile(response);
    console.log(
      "Formatted Response after the formatFormMobile:",
      formattedResponse
    );

    res.json({
      success: true,
      data: formattedResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("LLM Query Error:", error);

    // Handle specific error types
    if (error.code === "RATE_LIMIT_EXCEEDED") {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: error.retryAfter || 60,
      });
    }

    if (error.code === "INVALID_REQUEST") {
      return res.status(400).json({
        error: "Invalid request format or parameters",
        code: "INVALID_REQUEST",
      });
    }

    if (error.code === "AUTHENTICATION_ERROR") {
      return res.status(401).json({
        error: "Authentication failed",
        code: "AUTHENTICATION_ERROR",
      });
    }

    if (error.code === "TIMEOUT") {
      return res.status(504).json({
        error: "Request timeout",
        code: "TIMEOUT",
      });
    }

    // Generic server error
    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

async function callClaude(prompt, options = {}) {
  const { temperature = 0.3, max_tokens = 1500, top_p = 0.9 } = options;

  // Already optimized coming from the client app
  // Enhanced prompt for mobile-friendly responses
  //   const enhancedPrompt = `${prompt}

  // Please format your response as a JSON object with the following structure:
  // {
  //   "summary_points": ["bullet point 1", "bullet point 2", "bullet point 3"],
  //   "detailed_flow": "Brief explanation that expands on the key points",
  //   "confidence": 0.85
  // }

  // Keep responses concise for mobile viewing (small screens). Use 3-5 bullet points maximum, each under 15 words. The detailed explanation should be 2-3 sentences maximum.`;

  // As of July 2025, the claude-3-5-haiku-latest model is one of the cheapest
  // some examples of pricing
  // Claude Sonnet 3.7	$3 / MTok	$3.75 / MTok	$6 / MTok	$0.30 / MTok	$15 / MTok
  // claude-3-7-sonnet-latest
  // Claude Haiku 3.5	$0.80 / MTok	$1 / MTok	$1.6 / MTok	$0.08 / MTok	$4 / MTok
  // claude-3-5-haiku-latest
  // the fastest and cheapest as of July 2025
  // claude-3-haiku-20240307
  // https://docs.anthropic.com/en/docs/about-claude/pricing
  const claudeModel = process.env.CLAUDE_MODEL || "claude-3-haiku-20240307";

  const claudeStartTime = Date.now();

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: claudeModel,
        max_tokens: max_tokens,
        temperature: temperature,
        top_p: top_p,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    const claudeEndTime = Date.now();
    const claudeDuration = claudeEndTime - claudeStartTime;

    console.log(`Claude API Response received in ${claudeDuration}ms:`, {
      model: response.data.model,
      inputTokens: response.data.usage?.input_tokens,
      outputTokens: response.data.usage?.output_tokens,
      stopReason: response.data.stop_reason,
    });

    return response.data;
  } catch (error) {
    console.error("Claude API Error:", error.response?.data || error.message);

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"] || 60;
      throw {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit exceeded",
        retryAfter: parseInt(retryAfter),
      };
    }

    if (error.response?.status === 400) {
      throw {
        code: "INVALID_REQUEST",
        message: "Invalid request format or parameters",
      };
    }

    if (error.response?.status === 401) {
      throw {
        code: "AUTHENTICATION_ERROR",
        message: "Authentication failed",
      };
    }

    if (error.code === "ECONNABORTED") {
      throw {
        code: "TIMEOUT",
        message: "Request timeout",
      };
    }

    throw {
      code: "UNKNOWN_ERROR",
      message: error.message || "Unknown error occurred",
    };
  }
}

function formatForMobile(claudeResponse) {
  try {
    // Extract content from Claude's response
    const content = claudeResponse.content[0].text;

    // Try to parse as JSON first
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      // If not JSON, create a structured response from the text
      parsedContent = parseTextResponse(content);
    }

    // Ensure mobile-friendly formatting
    return {
      summary_points: parsedContent.summary_points || ["Response received"],
      detailed_flow:
        parsedContent.detailed_flow || content.substring(0, 200) + "...",
      code_snippets: parsedContent.code_snippets,
      confidence: parsedContent.confidence || 0.8,
      mobile_optimized: true,
    };
  } catch (error) {
    console.error("Response formatting error:", error);
    return {
      summary_points: ["Error processing response"],
      detailed_flow: "Unable to format response properly",
      confidence: 0.5,
      mobile_optimized: true,
    };
  }
}

function parseTextResponse(text) {
  // Simple text parsing for non-JSON responses
  const lines = text.split("\n").filter((line) => line.trim());
  const summary_points = [];
  let detailed_flow = "";

  for (const line of lines) {
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      summary_points.push(line.replace(/^[•\-*]\s*/, "").trim());
    } else if (line.length > 20 && !detailed_flow) {
      detailed_flow = line.trim();
    }
  }

  return {
    summary_points:
      summary_points.length > 0
        ? summary_points.slice(0, 5)
        : [text.substring(0, 50) + "..."],
    detailed_flow: detailed_flow || text.substring(0, 200) + "...",
    confidence: 0.8,
  };
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    code: "NOT_FOUND",
  });
});

app.listen(PORT, () => {
  console.log(`LLM Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Query endpoint: http://localhost:${PORT}/api/query`);
});
