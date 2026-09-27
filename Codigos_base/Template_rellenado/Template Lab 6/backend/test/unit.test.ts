import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterPostsByWord } from "../src/utils/filterPostsByWord";
import { Post } from "../src/models/posts";
import mongoose from "mongoose";

// Helper para crear posts de prueba rápidamente
function makePost(content: string): Post {
  return {
    content,
    author: "test",
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: 0,
    dislikes: 0,
  };
}

describe("filterPostsByWord", () => {
  // ========== Requerimiento 1: Búsqueda de palabras en el contenido ==========

  it("encuentra posts que contienen la palabra buscada", () => {
    const posts = [
      makePost("Hoy es un buen día"),
      makePost("No hay nada que hacer"),
      makePost("Buen provecho a todos"),
    ];
    const result = filterPostsByWord(posts, "buen");
    assert.equal(result.length, 2);
  });

  it("la búsqueda es case insensitive", () => {
    const posts = [
      makePost("PALABRA importante"),
      makePost("otra Palabra aquí"),
      makePost("también palabra minúscula"),
    ];
    const result = filterPostsByWord(posts, "palabra");
    assert.equal(result.length, 3);
  });

  it("la búsqueda ignora la puntuación adyacente", () => {
    const posts = [
      makePost("Es Bakemon, no Pokemon"),
      makePost("El bakemon. es genial"),
      makePost("¡Bakemon!"),
    ];
    const result = filterPostsByWord(posts, "bakemon");
    assert.equal(result.length, 3);
  });

  it("solo coincide con palabras completas, no subcadenas", () => {
    const posts = [
      makePost("El girasol es bonito"),
      makePost("El sol brilla fuerte"),
      makePost("Un parasol grande"),
    ];
    const result = filterPostsByWord(posts, "sol");
    assert.equal(result.length, 1);
    assert.equal(result[0].content, "El sol brilla fuerte");
  });

  // ========== Requerimiento 2: Casos de arreglo vacío ==========

  it("retorna arreglo vacío si posts está vacío", () => {
    const result = filterPostsByWord([], "algo");
    assert.deepEqual(result, []);
  });

  it("retorna arreglo vacío si query es un string vacío", () => {
    const posts = [makePost("Hola mundo")];
    const result = filterPostsByWord(posts, "");
    assert.deepEqual(result, []);
  });

  it("retorna arreglo vacío si ningún post contiene la palabra", () => {
    const posts = [
      makePost("Hoy es un buen día"),
      makePost("Todo está genial"),
    ];
    const result = filterPostsByWord(posts, "inexistente");
    assert.deepEqual(result, []);
  });
});
