import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "casa-nova-ad182";
const COLLECTION = "gifts";
const ACCESS_TOKEN = process.env.MCP_ACCESS_TOKEN;

function db() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!raw) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not configured."
      );
    }

    initializeApp({
      credential: cert(JSON.parse(raw)),
      projectId: PROJECT_ID
    });
  }

  return getFirestore();
}

function createServer() {
  const server = new McpServer({
    name: "casa-nova-firebase",
    version: "1.0.0"
  });

  server.tool(
    "firebase_health",
    "Check the Casa Nova Firestore connection.",
    {},
    async () => {
      await db().collection(COLLECTION).limit(1).get();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: true,
              projectId: PROJECT_ID,
              collection: COLLECTION
            })
          }
        ]
      };
    }
  );

  server.tool(
    "list_gifts",
    "List gift documents from the Casa Nova gifts collection. Read-only.",
    {
      limit: z.number().int().min(1).max(100).default(100),
      onlyReserved: z.boolean().default(false)
    },
    async ({ limit, onlyReserved }) => {
      let query = db().collection(COLLECTION) as FirebaseFirestore.Query;

      if (onlyReserved) {
        query = query.where("reserved", "==", true);
      }

      const snap = await query.limit(limit).get();

      const gifts = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(gifts, null, 2)
          }
        ]
      };
    }
  );

  server.tool(
    "get_gift",
    "Get one gift by document ID, for example gift-001.",
    {
      giftId: z.string().regex(/^gift-\d{3}$/)
    },
    async ({ giftId }) => {
      const snap = await db()
        .collection(COLLECTION)
        .doc(giftId)
        .get();

      if (!snap.exists) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                found: false,
                giftId
              })
            }
          ]
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                found: true,
                id: snap.id,
                ...snap.data()
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  server.tool(
    "find_gifts_by_reserver",
    "Find gifts matching the exact reservedBy value. Read-only.",
    {
      reservedBy: z.string().min(1).max(200),
      limit: z.number().int().min(1).max(100).default(100)
    },
    async ({ reservedBy, limit }) => {
      const snap = await db()
        .collection(COLLECTION)
        .where("reservedBy", "==", reservedBy)
        .limit(limit)
        .get();

      const gifts = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(gifts, null, 2)
          }
        ]
      };
    }
  );

  server.tool(
    "firebase_project_info",
    "Return non-secret information about the Firebase project used by this MCP.",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              projectId: PROJECT_ID,
              collection: COLLECTION,
              documentPattern: "gift-001 through gift-100",
              writeToolsEnabled: false
            },
            null,
            2
          )
        }
      ]
    })
  );

  return server;
}

function authorized(req: Request) {
  if (!ACCESS_TOKEN) {
    return false;
  }

  return (
    req.headers.get("authorization") ===
    `Bearer ${ACCESS_TOKEN}`
  );
}

export default async function handler(
  req: Request
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version",
        "Access-Control-Allow-Methods":
          "GET, POST, DELETE, OPTIONS"
      }
    });
  }

  if (!authorized(req)) {
    return new Response("Unauthorized", {
      status: 401
    });
  }

  const server = createServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  await server.connect(transport);

  const response = await transport.handleRequest(req);

  const headers = new Headers(response.headers);

  headers.set(
    "Access-Control-Allow-Origin",
    "*"
  );

  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version"
  );

  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
