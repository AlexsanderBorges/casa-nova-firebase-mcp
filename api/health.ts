export default function handler() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "casa-nova-firebase-mcp"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
