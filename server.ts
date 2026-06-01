import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Crucial: parse JSON request bodies
  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy endpoint to bypass browser CORS constraints
  app.post("/api/chat-proxy", async (req, res) => {
    try {
      console.log("Proxying request to n8n webhook...");
      const response = await fetch("https://bimp-primary.up.railway.app/webhook/website-chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "*/*"
        },
        body: JSON.stringify(req.body),
      });

      // Get status and headers
      const status = response.status;
      const contentType = response.headers.get("content-type") || "";

      console.log(`n8n webhook responded with status: ${status}, content-type: ${contentType}`);

      if (contentType.includes("application/json")) {
        const data = await response.json();
        return res.status(status).json(data);
      } else {
        const text = await response.text();
        return res.status(status).send(text);
      }
    } catch (error: any) {
      console.error("Error inside chat-proxy:", error);
      return res.status(500).json({ 
        error: "Failed to communicate with n8n backend chatbot via server-side proxy.", 
        details: error.message 
      });
    }
  });

  // Setup static files or Vite middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring Vite middleware for development mode");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Configuring static folder for production mode");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
