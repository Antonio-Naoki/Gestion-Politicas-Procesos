import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse as JSON first
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const json = await res.json();
        console.error("API Error Response (JSON):", json);
        throw new Error(`${res.status}: ${json.message || JSON.stringify(json)}`);
      } else {
        // Fallback to text
        const text = await res.text();
        console.error("API Error Response (Text):", text);
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
    } catch (parseError) {
      // If parsing fails, use the original status text
      console.error("Error parsing API error response:", parseError);
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  console.log(`API Request: ${method} ${url}`, data);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);

  // Check if there's content to parse
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      const jsonData = await res.json();
      console.log(`API Response (JSON): ${method} ${url}`, jsonData);
      return jsonData;
    } catch (error) {
      console.warn(`Failed to parse JSON response for ${method} ${url}:`, error);
      return { success: true, status: res.status };
    }
  } else if (res.status !== 204) { // No Content
    try {
      const textData = await res.text();
      console.log(`API Response (Text): ${method} ${url}`, textData);
      return textData.length ? textData : { success: true, status: res.status };
    } catch (error) {
      console.warn(`Failed to parse text response for ${method} ${url}:`, error);
      return { success: true, status: res.status };
    }
  }

  return { success: true, status: res.status };
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
