import { Post } from "../models/posts";

/**
 * Filtra posts que contengan la palabra `query` como palabra completa en su contenido.
 * - La búsqueda es case insensitive.
 * - Ignora la puntuación adyacente a las palabras.
 * - Solo coincide con palabras completas (no subcadenas).
 * - Retorna un arreglo vacío si `posts` está vacío, `query` es vacío, o no hay coincidencias.
 */
export function filterPostsByWord(posts: Post[], query: string): Post[] {
  if (posts.length === 0 || query === "") {
    return [];
  }

  const lowerQuery = query.toLowerCase();

  return posts.filter((post) => {
    // Eliminar puntuación y separar en palabras
    const words = post.content
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);

    return words.includes(lowerQuery);
  });
}
