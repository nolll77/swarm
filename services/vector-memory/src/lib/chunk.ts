export function chunkFile(content: string, size = 1000): string[] {
  const chunks: string[] = [];
  // Split by line to avoid breaking logic mid-line if possible, or simple slicing
  const lines = content.split('\n');
  let currentChunk = "";

  for (const line of lines) {
    if ((currentChunk.length + line.length) > size && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += line + '\n';
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
