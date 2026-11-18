export async function request(path = '', method = 'GET', task) {
  const response = await fetch('/api/tasks' + path, {
    method,
    ...(task ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) } : {}),
  });
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
