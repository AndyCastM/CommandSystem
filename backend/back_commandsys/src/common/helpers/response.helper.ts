export function formatResponse<T>(
  message: string,
  data?: T,
  statusCode: number = 200,
) {
  return {
    statusCode,
    message,
    ...(data && { data }), // agrega "data" solo si existe
    timestamp: new Date().toISOString(),
  };
}
