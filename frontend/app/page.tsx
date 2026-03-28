async function getBackendMessage() {
  const res = await fetch("http://127.0.0.1:8000/", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch backend");
  }

  return res.json();
}

export default async function Home() {
  const data = await getBackendMessage();

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Database Class Project</h1>
      <p>{data.message}</p>
    </main>
  );
}