import { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: any, res: any) {
  // Add CORS headers for robustness in all deployment environments
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const webhookUrl = "https://bimp-primary.up.railway.app/webhook/website-webhook-skybot";
  try {
    console.log("Vercel Serverless Proxying request to n8n webhook:", webhookUrl);
    
    // In Vercel serverless functions, req.body is automatically parsed if it is JSON
    const requestBody = req.body || {};

    let response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*"
      },
      body: JSON.stringify(requestBody),
    });

    let status = response.status;
    let contentType = response.headers.get("content-type") || "";
    let responseText = await response.text();

    console.log(`n8n POST query returned status: ${status}`);

    // Check if n8n complains that POST is not registered (common when Webhook node in n8n is left at default GET method)
    const isPostNotRegistered = (status === 404 && responseText.includes("not registered for POST requests")) || 
                                (status === 404 && responseText.includes("Did you mean to make a GET request"));

    if (isPostNotRegistered) {
      console.warn("⚠️ n8n expects a GET request. Attempting automated GET fallback with query params in Vercel Serverless...");
      
      // Construct query parameters
      const queryParams = new URLSearchParams();
      if (requestBody && typeof requestBody === 'object') {
        Object.entries(requestBody).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            if (typeof val === 'object') {
              queryParams.append(key, JSON.stringify(val));
              // Flatten second-level parameters to give n8n workflow expressions more versatility
              Object.entries(val).forEach(([subKey, subVal]) => {
                if (subVal !== null && subVal !== undefined && typeof subVal !== 'object') {
                  queryParams.append(subKey, String(subVal));
                }
              });
            } else {
              queryParams.append(key, String(val));
            }
          }
        });
        // Also append the entire raw payload string as standard fallback parameters
        queryParams.append("payload", JSON.stringify(requestBody));
        queryParams.append("body", JSON.stringify(requestBody));
      }

      const getUrl = `${webhookUrl}?${queryParams.toString()}`;
      console.log(`GET Fallback Redirect URL: ${getUrl}`);

      const getResponse = await fetch(getUrl, {
        method: "GET",
        headers: {
          "Accept": "*/*"
        }
      });

      status = getResponse.status;
      contentType = getResponse.headers.get("content-type") || "";
      responseText = await getResponse.text();

      console.log(`n8n GET fallback responded with status: ${status}`);
      
      // If GET was successful or has a clear JSON payload, let's use it
      if (status >= 200 && status < 300) {
        if (contentType.includes("application/json")) {
          return res.status(status).json(JSON.parse(responseText));
        } else {
          return res.status(status).send(responseText);
        }
      } else if (status === 500) {
        // If GET returned 500 (Workflow execution failed), return detailed diagnosis
        console.error("GET fallback returned 500 - Workflow execution failed internally.");
        return res.status(status).json({
          error: "N8N_WORKFLOW_FAILED",
          message: "Workflow execution failed inside n8n",
          diagnostics: {
            httpMethodInN8n: "GET",
            status: 500,
            helpSlovene: `⚠️ Vaš n8n Webhook je nastavljen na metodo **GET** namesto **POST**!\n\n` +
              `Ker je nastavljen na GET, se n8n delovni tok uspešno sproži, vendar se **sesuje s statusom 500 (Workflow execution failed)**. ` +
              `Do te napake pride, ker vaša n8n vozlišča (npr. AI Agent ali HTTP Request) v nadaljevanju toka verjetno poskušajo prebrati podatke iz telesa sporočila (\`body.message\`), ki pa je pri GET metodi prazno!\n\n` +
              `**KAKO POPRAVITI TO NAPAKO V N8N:**\n` +
              `1. Odprite vaš n8n urejevalnik delovnega toka.\n` +
              `2. Dvakrat kliknite na začetno vozlišče **Webhook** (trigger).\n` +
              `3. Spremenite možnost **HTTP Method** iz **GET** v **POST**.\n` +
              `4. Shranite spremembe in zgoraj desno vklopite stikalo **Active** (Aktivno), da bo delovalo neprekinjeno.`
          }
        });
      }
    }

    // Default response processing
    if (status >= 200 && status < 300) {
      if (contentType.includes("application/json")) {
        return res.status(status).json(JSON.parse(responseText));
      } else {
        return res.status(status).send(responseText);
      }
    } else {
      // Parse error message
      let parsedErr: any = null;
      try { parsedErr = JSON.parse(responseText); } catch (_) {}

      return res.status(status).json({
        error: "N8N_ERROR",
        status: status,
        message: parsedErr?.message || responseText || "Neznana napaka pri povezavi z n8n.",
        diagnostics: {
          isPostNotRegistered: isPostNotRegistered,
          helpSlovene: isPostNotRegistered ? 
            `⚠️ Vaš n8n Webhook je nastavljen na metodo **GET** namesto **POST**!\n\n` +
            `**KAKO POPRAVITI TA PROBLEM:**\n` +
            `1. Odprite vaš n8n urejevalnik delovnega toka.\n` +
            `2. Dvakrat kliknite na začetno vozlišče **Webhook** (trigger).\n` +
            `3. Spremenite možnost **HTTP Method** iz **GET** v **POST**.\n` +
            `4. Shranite spremembe in zgoraj desno ponovno vklopite stikalo **Active** (Aktivno).` : null
        }
      });
    }
  } catch (error: any) {
    console.error("Error inside Vercel serverless proxy:", error);
    return res.status(500).json({ 
      error: "Failed to communicate with n8n backend chatbot via Vercel server-side proxy.", 
      details: error.message 
    });
  }
}
