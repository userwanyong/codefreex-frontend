/**
 * Safely parse API response data.
 * Backend may return data as a JSON string or as a direct object.
 */
export function parseResponseData<T>(data: unknown): T {
  if (data == null) {
    throw new Error('Response data is null')
  }
  if (typeof data === 'string') {
    return JSON.parse(data) as T
  }
  return data as T
}
