import { Post } from "../models/posts";

export function filterPostsByWord(posts: Post[], query: string): Post[] {
  if (posts.length === 0 || query === "") return [];

  const lowerQuery = query.toLowerCase();

  return posts.filter((post) => {
    const words = post.content
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);
    return words.includes(lowerQuery);
  });
}