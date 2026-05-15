export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Proxy error';
    return Response.json({ error: { message } }, { status: 500 });
  }
}
